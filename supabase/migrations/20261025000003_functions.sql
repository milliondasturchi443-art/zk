-- ============================================================================
-- ZK — 000003 helper functions, triggers and audit hooks
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Authorization helpers
-- ---------------------------------------------------------------------------

-- Definer function: never trusts a client supplied role claim, never recurses
-- into profiles RLS.
create or replace function public.fn_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

revoke all on function public.fn_is_admin() from public;
grant execute on function public.fn_is_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Generic updated_at / published_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.fn_touch_content()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.status = 'published' and old.status is distinct from 'published' then
    new.published_at = now();
  end if;
  return new;
end;
$$;

create or replace function public.fn_touch_profile()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles protections: no id swap, no self promotion, no email tampering
-- ---------------------------------------------------------------------------
create or replace function public.fn_profiles_protect()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
begin
  if new.id <> old.id then
    raise exception 'profile_id_immutable' using errcode = '23514';
  end if;
  if new.role is distinct from old.role and not public.fn_is_admin() then
    raise exception 'role_change_forbidden' using errcode = '42501';
  end if;
  if new.email is distinct from old.email and not public.fn_is_admin() then
    raise exception 'email_change_forbidden' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- auth.users hooks — profile provisioning and email sync
-- ---------------------------------------------------------------------------
create or replace function public.fn_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Student'),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.fn_sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  update public.profiles
     set email = new.email,
         updated_at = now()
   where id = new.id
     and email is distinct from new.email;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Question publishing validation (drafts may be incomplete, published may not)
-- ---------------------------------------------------------------------------
-- Shared publish validation: a published question must be fully configured.
create or replace function public.fn_assert_question_publishable(
  p_question_id uuid,
  p_kind public.question_kind,
  p_subject public.subject,
  p_course_id uuid,
  p_prompt text
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_course_subject public.subject;
  v_option_count   integer;
  v_correct_option uuid;
  v_numeric        numeric;
begin
  if coalesce(nullif(trim(p_prompt), ''), '') = '' then
    raise exception 'question_prompt_required' using errcode = '23514';
  end if;

  select c.subject into v_course_subject from public.courses c where c.id = p_course_id;
  if v_course_subject is null or p_subject <> v_course_subject then
    raise exception 'question_subject_mismatch' using errcode = '23514';
  end if;

  if p_kind = 'mcq' then
    select count(*) into v_option_count
      from public.question_options where question_id = p_question_id;
    if v_option_count < 2 then
      raise exception 'question_options_required' using errcode = '23514';
    end if;

    select correct_option_id, numeric_answer
      into v_correct_option, v_numeric
      from public.question_keys where question_id = p_question_id;

    if v_correct_option is null then
      raise exception 'question_correct_option_required' using errcode = '23514';
    end if;
    if not exists (
      select 1 from public.question_options
       where id = v_correct_option and question_id = p_question_id
    ) then
      raise exception 'question_correct_option_invalid' using errcode = '23514';
    end if;
  elsif p_kind = 'numeric' then
    select numeric_answer into v_numeric
      from public.question_keys where question_id = p_question_id;
    if v_numeric is null then
      raise exception 'question_numeric_answer_required' using errcode = '23514';
    end if;
  end if;
end;
$$;

create or replace function public.fn_validate_question_publish()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
begin
  if new.status = 'published' then
    perform public.fn_assert_question_publishable(
      new.id, new.kind, new.subject, new.course_id, new.prompt
    );
  end if;
  return new;
end;
$$;

create or replace function public.fn_validate_question_options()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare
  v_status public.content_status;
  v_kind   public.question_kind;
  v_subject public.subject;
  v_course uuid;
  v_prompt text;
  v_target uuid;
begin
  v_target := case when tg_op = 'DELETE' then old.question_id else new.question_id end;

  select status, kind, subject, course_id, prompt
    into v_status, v_kind, v_subject, v_course, v_prompt
    from public.questions where id = v_target;

  if v_status is distinct from 'published' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  perform public.fn_assert_question_publishable(
    v_target, v_kind, v_subject, v_course, v_prompt
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.fn_validate_question_keys()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare
  v_status public.content_status;
  v_kind   public.question_kind;
  v_subject public.subject;
  v_course uuid;
  v_prompt text;
begin
  select status, kind, subject, course_id, prompt
    into v_status, v_kind, v_subject, v_course, v_prompt
    from public.questions where id = new.question_id;

  if v_status is distinct from 'published' then
    return new;
  end if;

  perform public.fn_assert_question_publishable(
    new.question_id, v_kind, v_subject, v_course, v_prompt
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Audit writer
-- ---------------------------------------------------------------------------
create or replace function public.fn_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_id uuid;
  v_actor uuid := auth.uid();
begin
  if v_actor is null and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'audit_actor_required' using errcode = '42501';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (v_actor, p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.fn_audit(text, text, text, jsonb) from public;
grant execute on function public.fn_audit(text, text, text, jsonb) to authenticated, service_role;

-- Records every publish / archive transition performed through the API.
create or replace function public.fn_audit_content_status()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if new.status is distinct from old.status then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
    values (
      auth.uid(),
      'content.status.' || new.status,
      tg_table_name,
      new.id::text,
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger registration
-- ---------------------------------------------------------------------------
create trigger trg_profiles_touch
  before update on public.profiles
  for each row execute function public.fn_touch_profile();

create trigger trg_profiles_protect
  before update on public.profiles
  for each row execute function public.fn_profiles_protect();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.fn_handle_new_user();

create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.fn_sync_profile_email();

create trigger trg_courses_touch
  before update on public.courses
  for each row execute function public.fn_touch_content();
create trigger trg_courses_audit
  after update on public.courses
  for each row execute function public.fn_audit_content_status();

create trigger trg_modules_touch
  before update on public.course_modules
  for each row execute function public.fn_touch_content();
create trigger trg_modules_audit
  after update on public.course_modules
  for each row execute function public.fn_audit_content_status();

create trigger trg_lessons_touch
  before update on public.lessons
  for each row execute function public.fn_touch_content();
create trigger trg_lessons_audit
  after update on public.lessons
  for each row execute function public.fn_audit_content_status();

create trigger trg_questions_touch
  before update on public.questions
  for each row execute function public.fn_touch_content();
-- deferred so that a question + its options + its key can be written in a
-- single transaction (bulk import, admin publishing flow)
create constraint trigger trg_questions_publish
  after insert or update on public.questions
  deferrable initially deferred
  for each row execute function public.fn_validate_question_publish();
create trigger trg_questions_audit
  after update on public.questions
  for each row execute function public.fn_audit_content_status();

create constraint trigger trg_question_options_validate
  after insert or update or delete on public.question_options
  deferrable initially deferred
  for each row execute function public.fn_validate_question_options();

create trigger trg_question_keys_touch
  before update on public.question_keys
  for each row execute function public.fn_touch_profile();

create constraint trigger trg_question_keys_validate
  after insert or update on public.question_keys
  deferrable initially deferred
  for each row execute function public.fn_validate_question_keys();

create trigger trg_test_sessions_touch
  before update on public.test_sessions
  for each row execute function public.fn_touch_profile();

create trigger trg_tsq_touch
  before update on public.test_session_questions
  for each row execute function public.fn_touch_profile();

create trigger trg_lesson_progress_touch
  before update on public.lesson_progress
  for each row execute function public.fn_touch_profile();
