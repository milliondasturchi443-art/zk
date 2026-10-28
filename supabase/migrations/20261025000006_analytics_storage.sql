-- ============================================================================
-- ZK — 000006 analytics, catalogue overview, review and storage
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Student progress (all numbers computed from question_attempts)
-- ---------------------------------------------------------------------------
create or replace function public.get_my_progress()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'totals', coalesce((
      select jsonb_build_object(
        'attempted', count(*),
        'correct', count(*) filter (where is_correct),
        'incorrect', count(*) filter (where not is_correct),
        'accuracy', case
          when count(*) > 0
            then round(100.0 * count(*) filter (where is_correct) / count(*), 1)
          else null end
      )
      from public.question_attempts a
      where a.user_id = v_uid
    ), jsonb_build_object('attempted', 0, 'correct', 0, 'incorrect', 0, 'accuracy', null)),
    'subjects', coalesce((
      select jsonb_agg(t.item order by t.subject)
      from (
        select a.subject,
               jsonb_build_object(
                 'subject', a.subject,
                 'attempted', count(*),
                 'correct', count(*) filter (where a.is_correct),
                 'incorrect', count(*) filter (where not a.is_correct),
                 'accuracy', case
                   when count(*) > 0
                     then round(100.0 * count(*) filter (where a.is_correct) / count(*), 1)
                   else null end
               ) as item
          from public.question_attempts a
         where a.user_id = v_uid
         group by a.subject
      ) t
    ), '[]'::jsonb),
    'topics', coalesce((
      select jsonb_agg(t.item)
      from (
        select a.topic, a.subject,
               jsonb_build_object(
                 'topic', a.topic,
                 'subject', a.subject,
                 'attempted', count(*),
                 'correct', count(*) filter (where a.is_correct),
                 'accuracy', case
                   when count(*) > 0
                     then round(100.0 * count(*) filter (where a.is_correct) / count(*), 1)
                   else null end
               ) as item
          from public.question_attempts a
         where a.user_id = v_uid
         group by a.topic, a.subject
        order by (count(*) filter (where a.is_correct))::numeric / count(*) asc,
                 count(*) desc
        limit 10
      ) t
    ), '[]'::jsonb),
    'lessons', jsonb_build_object(
      'completed', coalesce((select count(*) from public.lesson_progress
                              where user_id = v_uid and state = 'completed'), 0),
      'in_progress', coalesce((select count(*) from public.lesson_progress
                                where user_id = v_uid and state = 'in_progress'), 0),
      'published_total', coalesce((
        select count(*)
          from public.lessons l
          join public.course_modules m on m.id = l.module_id
          join public.courses c on c.id = m.course_id
         where l.status = 'published' and m.status = 'published' and c.status = 'published'
      ), 0)
    ),
    'recent_sessions', coalesce((
      select jsonb_agg(s.item)
      from (
        select jsonb_build_object(
                 'id', ts.id,
                 'kind', ts.kind,
                 'subject', ts.subject,
                 'status', ts.status,
                 'question_count', ts.question_count,
                 'answered_count', ts.answered_count,
                 'correct_count', ts.correct_count,
                 'accuracy', case
                   when ts.answered_count > 0
                     then round(100.0 * ts.correct_count / ts.answered_count, 1)
                   else null end,
                 'duration_seconds', ts.duration_seconds,
                 'started_at', ts.started_at,
                 'completed_at', ts.completed_at
               ) as item
          from public.test_sessions ts
         where ts.user_id = v_uid
         order by ts.created_at desc
         limit 10
      ) s
    ), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(d.item order by d.day)
      from (
        select to_char(a.created_at at time zone 'UTC', 'YYYY-MM-DD') as day,
               jsonb_build_object(
                 'day', to_char(a.created_at at time zone 'UTC', 'YYYY-MM-DD'),
                 'attempted', count(*),
                 'correct', count(*) filter (where a.is_correct)
               ) as item
          from public.question_attempts a
         where a.user_id = v_uid
           and a.created_at >= now() - interval '30 days'
         group by 1
      ) d
    ), '[]'::jsonb),
    'bookmarks', coalesce((
      select count(*) from public.bookmarks where user_id = v_uid
    ), 0),
    'updated_at', now()
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_my_progress() from public;
grant execute on function public.get_my_progress() to authenticated;

-- ---------------------------------------------------------------------------
-- Course overview for a subject (published content + personal progress)
-- ---------------------------------------------------------------------------
create or replace function public.get_course_overview(p_subject public.subject)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_course public.courses%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_course
    from public.courses
   where subject = p_subject and status = 'published'
   order by sort_order, created_at
   limit 1;

  if v_course.id is null then
    return jsonb_build_object('course', null, 'modules', '[]'::jsonb, 'question_count', 0);
  end if;

  return jsonb_build_object(
    'course', jsonb_build_object(
      'id', v_course.id,
      'slug', v_course.slug,
      'title', v_course.title,
      'description', v_course.description,
      'subject', v_course.subject,
      'cover_image_path', v_course.cover_image_path,
      'status', v_course.status,
      'sort_order', v_course.sort_order,
      'published_at', v_course.published_at
    ),
    'modules', coalesce((
      select jsonb_agg(m.item order by m.sort_order, m.created_at)
      from (
        select cm.sort_order, cm.created_at,
               jsonb_build_object(
                 'id', cm.id,
                 'title', cm.title,
                 'description', cm.description,
                 'sort_order', cm.sort_order,
                 'lessons', coalesce((
                   select jsonb_agg(l.item order by l.sort_order, l.created_at)
                   from (
                     select les.sort_order, les.created_at,
                            jsonb_build_object(
                              'id', les.id,
                              'title', les.title,
                              'summary', les.summary,
                              'estimated_minutes', les.estimated_minutes,
                              'sort_order', les.sort_order,
                              'question_count', coalesce((
                                select count(*) from public.questions q
                                 where q.lesson_id = les.id and q.status = 'published'
                              ), 0),
                              'state', lp.state,
                              'correct_count', coalesce(lp.correct_count, 0),
                              'attempt_count', coalesce(lp.attempt_count, 0),
                              'completed_at', lp.completed_at
                            ) as item
                       from public.lessons les
                       left join public.lesson_progress lp
                         on lp.lesson_id = les.id and lp.user_id = v_uid
                      where les.module_id = cm.id and les.status = 'published'
                   ) l
                 ), '[]'::jsonb)
               ) as item
          from public.course_modules cm
         where cm.course_id = v_course.id and cm.status = 'published'
      ) m
    ), '[]'::jsonb),
    'question_count', coalesce((
      select count(*) from public.questions
       where course_id = v_course.id and status = 'published'
    ), 0),
    'completed_lessons', coalesce((
      select count(*)
        from public.lesson_progress lp
        join public.lessons les on les.id = lp.lesson_id
        join public.course_modules cm on cm.id = les.module_id
       where lp.user_id = v_uid
         and cm.course_id = v_course.id
         and lp.state = 'completed'
    ), 0)
  );
end;
$$;

revoke all on function public.get_course_overview(public.subject) from public;
grant execute on function public.get_course_overview(public.subject) to authenticated;

-- ---------------------------------------------------------------------------
-- Incorrect-answer review (uses live answer keys, never exposed elsewhere)
-- ---------------------------------------------------------------------------
create or replace function public.get_mistake_review(p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(t.item)
    from (
      select jsonb_build_object(
               'attempt_id', a.id,
               'question_id', a.question_id,
               'session_id', a.session_id,
               'subject', a.subject,
               'topic', a.topic,
               'difficulty', a.difficulty,
               'created_at', a.created_at,
               'kind', q.kind,
               'prompt', q.prompt,
               'stimulus', coalesce(q.stimulus, ''),
               'options', coalesce((
                 select jsonb_agg(
                          jsonb_build_object('id', o.id, 'label', o.label, 'text', o.text)
                          order by o.position)
                   from public.question_options o
                  where o.question_id = q.id
               ), '[]'::jsonb),
               'response', a.response,
               'is_correct', a.is_correct,
               'correct_answer', case
                 when k.correct_option_id is not null
                   then jsonb_build_object('option_id', k.correct_option_id::text)
                 else jsonb_build_object('value', k.numeric_answer::text)
               end,
               'explanation', k.explanation
             ) as item
        from public.question_attempts a
        join public.questions q on q.id = a.question_id
        left join public.question_keys k on k.question_id = q.id
       where a.user_id = v_uid and a.is_correct = false
       order by a.created_at desc
       limit least(greatest(coalesce(p_limit, 50), 1), 200)
    ) t
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_mistake_review(integer) from public;
grant execute on function public.get_mistake_review(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin overview (guarded server side)
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not public.fn_is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'users', jsonb_build_object(
      'total', (select count(*) from public.profiles),
      'admins', (select count(*) from public.profiles where role = 'admin'),
      'students', (select count(*) from public.profiles where role = 'student')
    ),
    'courses', jsonb_build_object(
      'total', (select count(*) from public.courses),
      'published', (select count(*) from public.courses where status = 'published')
    ),
    'modules', jsonb_build_object(
      'total', (select count(*) from public.course_modules),
      'published', (select count(*) from public.course_modules where status = 'published')
    ),
    'lessons', jsonb_build_object(
      'total', (select count(*) from public.lessons),
      'published', (select count(*) from public.lessons where status = 'published')
    ),
    'questions', jsonb_build_object(
      'total', (select count(*) from public.questions),
      'published', (select count(*) from public.questions where status = 'published'),
      'english', (select count(*) from public.questions where subject = 'english'),
      'math', (select count(*) from public.questions where subject = 'math')
    ),
    'activity', jsonb_build_object(
      'attempts_total', (select count(*) from public.question_attempts),
      'attempts_7d', (select count(*) from public.question_attempts
                       where created_at >= now() - interval '7 days'),
      'attempts_30d', (select count(*) from public.question_attempts
                        where created_at >= now() - interval '30 days'),
      'sessions_30d', (select count(*) from public.test_sessions
                        where created_at >= now() - interval '30 days'),
      'active_students_7d', (select count(distinct user_id) from public.question_attempts
                              where created_at >= now() - interval '7 days')
    ),
    'recent_attempts', coalesce((
      select jsonb_agg(t.item)
      from (
        select jsonb_build_object(
                 'id', a.id,
                 'subject', a.subject,
                 'topic', a.topic,
                 'is_correct', a.is_correct,
                 'created_at', a.created_at,
                 'student', p.full_name
               ) as item
          from public.question_attempts a
          join public.profiles p on p.id = a.user_id
         order by a.created_at desc
         limit 10
      ) t
    ), '[]'::jsonb),
    'recent_sessions', coalesce((
      select jsonb_agg(t.item)
      from (
        select jsonb_build_object(
                 'id', ts.id,
                 'kind', ts.kind,
                 'subject', ts.subject,
                 'status', ts.status,
                 'question_count', ts.question_count,
                 'correct_count', ts.correct_count,
                 'created_at', ts.created_at,
                 'student', p.full_name
               ) as item
          from public.test_sessions ts
          join public.profiles p on p.id = ts.user_id
         order by ts.created_at desc
         limit 10
      ) t
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_admin_overview() from public;
grant execute on function public.get_admin_overview() to authenticated;

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'covers', 'covers', true, 5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resources', 'resources', false, 10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- covers: everyone signed in may read, only admins write
drop policy if exists covers_read on storage.objects;
create policy covers_read on storage.objects
  for select to authenticated
  using (bucket_id = 'covers');

drop policy if exists covers_admin_insert on storage.objects;
create policy covers_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'covers' and public.fn_is_admin());

drop policy if exists covers_admin_update on storage.objects;
create policy covers_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'covers' and public.fn_is_admin())
  with check (bucket_id = 'covers' and public.fn_is_admin());

drop policy if exists covers_admin_delete on storage.objects;
create policy covers_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'covers' and public.fn_is_admin());

-- resources: admins write, signed-in students read
drop policy if exists resources_read on storage.objects;
create policy resources_read on storage.objects
  for select to authenticated
  using (bucket_id = 'resources');

drop policy if exists resources_admin_insert on storage.objects;
create policy resources_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'resources' and public.fn_is_admin());

drop policy if exists resources_admin_update on storage.objects;
create policy resources_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'resources' and public.fn_is_admin())
  with check (bucket_id = 'resources' and public.fn_is_admin());

drop policy if exists resources_admin_delete on storage.objects;
create policy resources_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'resources' and public.fn_is_admin());
