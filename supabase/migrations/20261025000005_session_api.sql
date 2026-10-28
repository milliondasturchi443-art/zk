-- ============================================================================
-- ZK — 000005 server authoritative session API
--
-- All grading, session state transitions and progress aggregation happen here,
-- inside SECURITY DEFINER functions. Clients never receive an answer key
-- before they have submitted an answer (or before the session is finished).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Numeric normalisation (shared contract with packages/shared/src/grading.ts)
-- ---------------------------------------------------------------------------
create or replace function public.fn_normalize_numeric(p_value text)
returns numeric
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v text;
  v_parts text[];
  v_num numeric;
  v_den numeric;
begin
  if p_value is null then
    return null;
  end if;
  v := trim(p_value);
  v := replace(v, ',', '');
  v := replace(v, ' ', '');
  v := replace(v, chr(160), '');
  v := replace(v, chr(8722), '-'); -- unicode minus
  if v = '' then
    return null;
  end if;

  -- simple fraction, e.g. 3/4
  if v ~ '^-?[0-9]+(\.[0-9]+)?/-?[0-9]+(\.[0-9]+)?$' then
    v_parts := split_part(v, '/', 1);
    v_num := v_parts::numeric;
    v_den := split_part(v, '/', 2)::numeric;
    if v_den = 0 then
      return null;
    end if;
    return v_num / v_den;
  end if;

  if v ~ '^[+-]?([0-9]+(\.[0-9]+)?|\.[0-9]+)$' then
    return v::numeric;
  end if;

  return null;
end;
$$;

revoke all on function public.fn_normalize_numeric(text) from public;
grant execute on function public.fn_normalize_numeric(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Response evaluation
--   mcq     response: {"option_id": "<uuid>"}
--   numeric response: {"value": "0.5" | 0.5 | "3/4"}
-- ---------------------------------------------------------------------------
create or replace function public.fn_evaluate_response(p_answer_ref jsonb, p_response jsonb)
returns boolean
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_type text;
  v_target numeric;
  v_tolerance numeric;
  v_value numeric;
begin
  if p_answer_ref is null or p_response is null then
    return false;
  end if;

  v_type := p_answer_ref ->> 'type';

  if v_type = 'mcq' then
    return p_answer_ref ->> 'option_id' is not null
       and p_answer_ref ->> 'option_id' = p_response ->> 'option_id';
  end if;

  if v_type = 'numeric' then
    v_target := (p_answer_ref ->> 'value')::numeric;
    v_tolerance := coalesce((p_answer_ref ->> 'tolerance')::numeric, 0);
    v_value := public.fn_normalize_numeric(p_response ->> 'value');
    if v_value is null or v_target is null then
      return false;
    end if;
    return abs(v_value - v_target) <= v_tolerance;
  end if;

  return false;
end;
$$;

revoke all on function public.fn_evaluate_response(jsonb, jsonb) from public;
grant execute on function public.fn_evaluate_response(jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Sanitised session payload (no answer key unless it has been revealed)
-- ---------------------------------------------------------------------------
create or replace function public.fn_session_payload(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_session public.test_sessions%rowtype;
  v_reveal boolean;
  v_questions jsonb;
begin
  select * into v_session from public.test_sessions where id = p_session_id;
  if not found then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;

  v_reveal := v_session.status = 'completed';

  select coalesce(jsonb_agg(q.item order by q.position), '[]'::jsonb)
    into v_questions
  from (
    select tsq.position,
           (tsq.snapshot || jsonb_build_object(
             'id', tsq.id,
             'position', tsq.position,
             'question_id', tsq.question_id,
             'answered', tsq.answered_at is not null,
             'response', tsq.response,
             'time_spent_ms', tsq.time_spent_ms,
             'is_correct', case
               when tsq.answered_at is null then null
               when v_reveal or v_session.feedback_mode = 'immediate' then tsq.is_correct
               else null
               end,
             'correct_answer', case
               when tsq.answered_at is null and not v_reveal then null
               when v_reveal or v_session.feedback_mode = 'immediate' then
                 case when tsq.answer_ref ->> 'type' = 'mcq'
                      then jsonb_build_object('option_id', tsq.answer_ref ->> 'option_id')
                      else jsonb_build_object('value', tsq.answer_ref ->> 'value') end
               else null
               end,
             'explanation', case
               when tsq.answered_at is null and not v_reveal then null
               when v_reveal or v_session.feedback_mode = 'immediate' then k.explanation
               else null
               end
           )) as item
      from public.test_session_questions tsq
      left join public.question_keys k on k.question_id = tsq.question_id
     where tsq.session_id = p_session_id
  ) q;

  return jsonb_build_object(
    'id', v_session.id,
    'user_id', v_session.user_id,
    'kind', v_session.kind,
    'subject', v_session.subject,
    'course_id', v_session.course_id,
    'lesson_id', v_session.lesson_id,
    'status', v_session.status,
    'feedback_mode', v_session.feedback_mode,
    'time_limit_seconds', v_session.time_limit_seconds,
    'started_at', v_session.started_at,
    'completed_at', v_session.completed_at,
    'duration_seconds', v_session.duration_seconds,
    'question_count', v_session.question_count,
    'answered_count', v_session.answered_count,
    'correct_count', v_session.correct_count,
    'questions', v_questions
  );
end;
$$;

revoke all on function public.fn_session_payload(uuid) from public;
grant execute on function public.fn_session_payload(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Finish a session (idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.fn_finish_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_session public.test_sessions%rowtype;
  v_correct integer;
  v_answered integer;
begin
  select * into v_session from public.test_sessions
   where id = p_session_id for update;
  if not found then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;
  if v_session.user_id <> auth.uid() then
    raise exception 'session_forbidden' using errcode = '42501';
  end if;
  if v_session.status = 'completed' then
    return public.fn_session_payload(p_session_id);
  end if;

  select count(*) filter (where answered_at is not null),
         count(*) filter (where is_correct)
    into v_answered, v_correct
    from public.test_session_questions
   where session_id = p_session_id;

  update public.test_sessions
     set status = 'completed',
         completed_at = now(),
         duration_seconds = greatest(0, floor(extract(epoch from (now() - started_at)))::integer),
         answered_count = v_answered,
         correct_count = v_correct
   where id = p_session_id;

  -- lesson progress bookkeeping
  if v_session.lesson_id is not null then
    if v_answered = v_session.question_count and v_session.question_count > 0 then
      insert into public.lesson_progress (user_id, lesson_id, state, correct_count, attempt_count, completed_at)
      values (v_session.user_id, v_session.lesson_id, 'completed', v_correct, v_answered, now())
      on conflict (user_id, lesson_id) do update
        set state = 'completed',
            correct_count = public.lesson_progress.correct_count + excluded.correct_count,
            attempt_count = public.lesson_progress.attempt_count + excluded.attempt_count,
            completed_at = coalesce(public.lesson_progress.completed_at, now()),
            updated_at = now();
    else
      insert into public.lesson_progress (user_id, lesson_id, state, correct_count, attempt_count)
      values (v_session.user_id, v_session.lesson_id, 'in_progress', v_correct, v_answered)
      on conflict (user_id, lesson_id) do update
        set state = case
                      when public.lesson_progress.state = 'completed' then public.lesson_progress.state
                      else 'in_progress'
                    end,
            correct_count = public.lesson_progress.correct_count + excluded.correct_count,
            attempt_count = public.lesson_progress.attempt_count + excluded.attempt_count,
            updated_at = now();
    end if;
  end if;

  return public.fn_session_payload(p_session_id);
end;
$$;

revoke all on function public.fn_finish_session(uuid) from public;
grant execute on function public.fn_finish_session(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Start a practice / quiz session
-- ---------------------------------------------------------------------------
create or replace function public.start_test_session(
  p_subject public.subject,
  p_kind public.session_kind default 'practice'::public.session_kind,
  p_course_id uuid default null,
  p_lesson_id uuid default null,
  p_question_count integer default 10,
  p_difficulty public.difficulty_level default null,
  p_topic text default null,
  p_time_limit_seconds integer default null,
  p_feedback_mode public.feedback_mode default 'immediate'::public.feedback_mode,
  p_include_attempted boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_course public.courses%rowtype;
  v_limit integer;
  v_session_id uuid;
  v_pos integer := 0;
  v_question record;
  v_snapshot jsonb;
  v_answer_ref jsonb;
  v_total_attempts integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_kind = 'lesson_quiz' and p_lesson_id is null then
    raise exception 'lesson_required' using errcode = '22023';
  end if;

  v_limit := greatest(1, least(coalesce(p_question_count, 10), 50));

  if p_course_id is not null then
    select * into v_course from public.courses
     where id = p_course_id and status = 'published';
  else
    select * into v_course from public.courses
     where subject = p_subject and status = 'published'
     order by sort_order, created_at
     limit 1;
  end if;
  if v_course.id is null then
    raise exception 'course_not_available' using errcode = 'P0002';
  end if;

  if p_lesson_id is not null then
    if not exists (
      select 1
        from public.lessons l
        join public.course_modules m on m.id = l.module_id
       where l.id = p_lesson_id
         and l.status = 'published'
         and m.status = 'published'
         and m.course_id = v_course.id
    ) then
      raise exception 'lesson_not_available' using errcode = 'P0002';
    end if;
  end if;

  insert into public.test_sessions (
    user_id, kind, subject, course_id, lesson_id, feedback_mode,
    time_limit_seconds, question_count
  )
  values (
    v_uid, p_kind, p_subject, v_course.id, p_lesson_id, p_feedback_mode,
    p_time_limit_seconds, 0
  )
  returning id into v_session_id;

  for v_question in
    select q.id, q.kind, q.prompt, q.stimulus, q.directions, q.difficulty,
           q.topic, q.subtopic, q.points, q.lesson_id,
           k.correct_option_id, k.numeric_answer, k.numeric_tolerance
      from public.questions q
      join public.question_keys k on k.question_id = q.id
     where q.status = 'published'
       and q.course_id = v_course.id
       and q.subject = p_subject
       and (p_lesson_id is null or q.lesson_id = p_lesson_id)
       and (p_difficulty is null or q.difficulty = p_difficulty)
       and (p_topic is null or lower(q.topic) = lower(p_topic))
       and (
         p_include_attempted
         or not exists (
           select 1 from public.question_attempts a
            where a.user_id = v_uid and a.question_id = q.id
         )
       )
     order by random()
     limit v_limit
  loop
    v_pos := v_pos + 1;

    v_snapshot := jsonb_build_object(
      'question_id', v_question.id,
      'kind', v_question.kind,
      'prompt', v_question.prompt,
      'stimulus', coalesce(v_question.stimulus, ''),
      'directions', coalesce(v_question.directions, ''),
      'difficulty', v_question.difficulty,
      'topic', v_question.topic,
      'subtopic', v_question.subtopic,
      'points', v_question.points,
      'options', coalesce((
        select coalesce(jsonb_agg(
                 jsonb_build_object('id', o.id, 'label', o.label, 'text', o.text)
                 order by o.position), '[]'::jsonb)
          from public.question_options o
         where o.question_id = v_question.id
      ), '[]'::jsonb)
    );

    if v_question.kind = 'mcq' then
      v_answer_ref := jsonb_build_object('type', 'mcq', 'option_id', v_question.correct_option_id);
    else
      v_answer_ref := jsonb_build_object(
        'type', 'numeric',
        'value', v_question.numeric_answer,
        'tolerance', v_question.numeric_tolerance
      );
    end if;

    insert into public.test_session_questions (
      session_id, question_id, position, snapshot, answer_ref
    )
    values (v_session_id, v_question.id, v_pos, v_snapshot, v_answer_ref);
  end loop;

  if v_pos = 0 then
    delete from public.test_sessions where id = v_session_id;
    raise exception 'no_questions_available' using errcode = 'P0002';
  end if;

  update public.test_sessions
     set question_count = v_pos,
         answered_count = 0,
         correct_count = 0
   where id = v_session_id;

  return public.fn_session_payload(v_session_id);
end;
$$;

revoke all on function public.start_test_session(public.subject, public.session_kind, uuid, uuid, integer, public.difficulty_level, text, integer, public.feedback_mode, boolean) from public;
grant execute on function public.start_test_session(public.subject, public.session_kind, uuid, uuid, integer, public.difficulty_level, text, integer, public.feedback_mode, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Read / resume a session (also finalises an expired timed session)
-- ---------------------------------------------------------------------------
create or replace function public.get_test_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_session public.test_sessions%rowtype;
begin
  select * into v_session from public.test_sessions where id = p_session_id;
  if not found then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;
  if v_session.user_id <> auth.uid() then
    raise exception 'session_forbidden' using errcode = '42501';
  end if;

  if v_session.status = 'in_progress'
     and v_session.time_limit_seconds is not null
     and now() > v_session.started_at + (v_session.time_limit_seconds || ' seconds')::interval then
    return public.fn_finish_session(p_session_id);
  end if;

  return public.fn_session_payload(p_session_id);
end;
$$;

revoke all on function public.get_test_session(uuid) from public;
grant execute on function public.get_test_session(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Submit an answer (server authoritative, idempotent per question)
-- ---------------------------------------------------------------------------
create or replace function public.submit_answer(
  p_session_question_id uuid,
  p_response jsonb,
  p_time_spent_ms integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_tsq public.test_session_questions%rowtype;
  v_session public.test_sessions%rowtype;
  v_correct boolean;
  v_reveal boolean;
  v_correct_answer jsonb;
  v_explanation text;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_response is null or jsonb_typeof(p_response) <> 'object' then
    raise exception 'invalid_response' using errcode = '22023';
  end if;

  select * into v_tsq from public.test_session_questions
   where id = p_session_question_id for update;
  if not found then
    raise exception 'session_question_not_found' using errcode = 'P0002';
  end if;

  select * into v_session from public.test_sessions
   where id = v_tsq.session_id for update;
  if v_session.user_id <> v_uid then
    raise exception 'session_forbidden' using errcode = '42501';
  end if;
  if v_session.status <> 'in_progress' then
    raise exception 'session_not_open' using errcode = '22023';
  end if;
  if v_session.time_limit_seconds is not null
     and now() > v_session.started_at + (v_session.time_limit_seconds || ' seconds')::interval then
    perform public.fn_finish_session(v_session.id);
    raise exception 'session_time_expired' using errcode = '55000';
  end if;

  -- already answered: idempotent, no duplicate attempt row
  if v_tsq.answered_at is not null then
    return jsonb_build_object(
      'duplicate', true,
      'answered', true,
      'is_correct', v_tsq.is_correct,
      'response', v_tsq.response,
      'answered_count', v_session.answered_count,
      'correct_count', v_session.correct_count,
      'question_count', v_session.question_count
    );
  end if;

  if v_tsq.snapshot ->> 'kind' = 'mcq' then
    if not exists (
      select 1 from jsonb_array_elements(v_tsq.snapshot -> 'options') o
       where o ->> 'id' = p_response ->> 'option_id'
    ) then
      raise exception 'invalid_option' using errcode = '22023';
    end if;
  elsif v_tsq.snapshot ->> 'kind' = 'numeric' then
    if p_response ->> 'value' is null
       or public.fn_normalize_numeric(p_response ->> 'value') is null then
      raise exception 'invalid_numeric_answer' using errcode = '22023';
    end if;
  else
    raise exception 'invalid_question_configuration' using errcode = '22023';
  end if;

  v_correct := public.fn_evaluate_response(v_tsq.answer_ref, p_response);

  update public.test_session_questions
     set response = p_response,
         is_correct = v_correct,
         answered_at = now(),
         time_spent_ms = greatest(0, coalesce(p_time_spent_ms, 0))
   where id = v_tsq.id;

  update public.test_sessions
     set answered_count = answered_count + 1,
         correct_count = correct_count + case when v_correct then 1 else 0 end
   where id = v_session.id;

  insert into public.question_attempts (
    user_id, question_id, session_id, session_question_id,
    subject, topic, difficulty, response, is_correct, time_spent_ms
  )
  values (
    v_uid, v_tsq.question_id, v_session.id, v_tsq.id,
    v_session.subject, v_tsq.snapshot ->> 'topic',
    (v_tsq.snapshot ->> 'difficulty')::public.difficulty_level,
    p_response, v_correct, greatest(0, coalesce(p_time_spent_ms, 0))
  )
  on conflict (session_question_id) do nothing;

  v_reveal := v_session.feedback_mode = 'immediate';
  if v_reveal then
    if v_tsq.answer_ref ->> 'type' = 'mcq' then
      v_correct_answer := jsonb_build_object('option_id', v_tsq.answer_ref ->> 'option_id');
    else
      v_correct_answer := jsonb_build_object('value', v_tsq.answer_ref ->> 'value');
    end if;
    select k.explanation into v_explanation
      from public.question_keys k where k.question_id = v_tsq.question_id;
  end if;

  return jsonb_build_object(
    'duplicate', false,
    'answered', true,
    'is_correct', case when v_reveal then v_correct else null end,
    'correct_answer', v_correct_answer,
    'explanation', v_explanation,
    'response', p_response,
    'answered_count', v_session.answered_count + 1,
    'correct_count', v_session.correct_count + case when v_correct then 1 else 0 end,
    'question_count', v_session.question_count
  );
end;
$$;

revoke all on function public.submit_answer(uuid, jsonb, integer) from public;
grant execute on function public.submit_answer(uuid, jsonb, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Finish + collect results
-- ---------------------------------------------------------------------------
create or replace function public.finish_test_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_session public.test_sessions%rowtype;
begin
  select * into v_session from public.test_sessions where id = p_session_id;
  if not found then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;
  if v_session.user_id <> auth.uid() then
    raise exception 'session_forbidden' using errcode = '42501';
  end if;
  if v_session.status not in ('in_progress', 'completed') then
    raise exception 'session_not_open' using errcode = '22023';
  end if;
  return public.fn_finish_session(p_session_id);
end;
$$;

revoke all on function public.finish_test_session(uuid) from public;
grant execute on function public.finish_test_session(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Session history
-- ---------------------------------------------------------------------------
create or replace function public.list_my_sessions(
  p_limit integer default 20,
  p_offset integer default 0
)
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
    select jsonb_agg(s.item)
    from (
      select jsonb_build_object(
               'id', ts.id,
               'kind', ts.kind,
               'subject', ts.subject,
               'lesson_id', ts.lesson_id,
               'course_id', ts.course_id,
               'status', ts.status,
               'question_count', ts.question_count,
               'answered_count', ts.answered_count,
               'correct_count', ts.correct_count,
               'accuracy', case
                 when ts.answered_count > 0
                   then round(ts.correct_count::numeric / ts.answered_count, 4)
                 else null end,
               'duration_seconds', ts.duration_seconds,
               'started_at', ts.started_at,
               'completed_at', ts.completed_at
             ) as item
        from public.test_sessions ts
       where ts.user_id = v_uid
       order by ts.created_at desc
       limit least(greatest(coalesce(p_limit, 20), 1), 100)
       offset greatest(coalesce(p_offset, 0), 0)
    ) s
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.list_my_sessions(integer, integer) from public;
grant execute on function public.list_my_sessions(integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Lesson progress marking outside of a quiz
-- ---------------------------------------------------------------------------
create or replace function public.set_lesson_progress(p_lesson_id uuid, p_state public.lesson_state)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.lessons l
     where l.id = p_lesson_id and l.status = 'published'
  ) then
    raise exception 'lesson_not_available' using errcode = 'P0002';
  end if;

  insert into public.lesson_progress (user_id, lesson_id, state, completed_at)
  values (v_uid, p_lesson_id, p_state, case when p_state = 'completed' then now() else null end)
  on conflict (user_id, lesson_id) do update
    set state = excluded.state,
        completed_at = case
                         when excluded.state = 'completed'
                           then coalesce(public.lesson_progress.completed_at, now())
                         else public.lesson_progress.completed_at
                       end,
        updated_at = now();

  return (
    select jsonb_build_object(
             'lesson_id', lp.lesson_id,
             'state', lp.state,
             'correct_count', lp.correct_count,
             'attempt_count', lp.attempt_count,
             'completed_at', lp.completed_at
           )
      from public.lesson_progress lp
     where lp.user_id = v_uid and lp.lesson_id = p_lesson_id
  );
end;
$$;

revoke all on function public.set_lesson_progress(uuid, public.lesson_state) from public;
grant execute on function public.set_lesson_progress(uuid, public.lesson_state) to authenticated;
