-- ============================================================================
-- ZK — 000001 shared enum types
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('student', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'subject') then
    create type public.subject as enum ('english', 'math');
  end if;
  if not exists (select 1 from pg_type where typname = 'content_status') then
    create type public.content_status as enum ('draft', 'published', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'question_kind') then
    create type public.question_kind as enum ('mcq', 'numeric');
  end if;
  if not exists (select 1 from pg_type where typname = 'difficulty_level') then
    create type public.difficulty_level as enum ('easy', 'medium', 'hard');
  end if;
  if not exists (select 1 from pg_type where typname = 'session_status') then
    create type public.session_status as enum ('in_progress', 'completed', 'abandoned');
  end if;
  if not exists (select 1 from pg_type where typname = 'session_kind') then
    create type public.session_kind as enum ('practice', 'timed_practice', 'lesson_quiz');
  end if;
  if not exists (select 1 from pg_type where typname = 'feedback_mode') then
    create type public.feedback_mode as enum ('immediate', 'on_finish');
  end if;
  if not exists (select 1 from pg_type where typname = 'lesson_state') then
    create type public.lesson_state as enum ('in_progress', 'completed');
  end if;
end
$$;
