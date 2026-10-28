-- ============================================================================
-- ZK — 000002 schema
-- Foreign keys, unique constraints and indexes for every hot query path.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text not null check (char_length(full_name) between 1 and 120),
  phone       text check (phone is null or char_length(phone) between 3 and 30),
  role        public.user_role not null default 'student',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- course catalogue
-- ---------------------------------------------------------------------------
create table public.courses (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
  title           text not null check (char_length(title) between 1 and 160),
  description     text not null default '',
  subject         public.subject not null,
  cover_image_path text,
  status          public.content_status not null default 'draft',
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  published_at    timestamptz
);

create index courses_subject_status_idx on public.courses (subject, status);
create index courses_status_sort_idx on public.courses (status, sort_order);

create table public.course_modules (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.courses (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 160),
  description  text not null default '',
  sort_order   integer not null default 0,
  status       public.content_status not null default 'draft',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  published_at timestamptz
);

create index modules_course_idx on public.course_modules (course_id, sort_order);

create table public.lessons (
  id                uuid primary key default gen_random_uuid(),
  module_id         uuid not null references public.course_modules (id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 160),
  summary           text not null default '',
  content           jsonb not null default '[]'::jsonb,
  estimated_minutes integer not null default 10 check (estimated_minutes between 1 and 600),
  sort_order        integer not null default 0,
  status            public.content_status not null default 'draft',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  published_at      timestamptz
);

create index lessons_module_idx on public.lessons (module_id, sort_order);
create index lessons_status_idx on public.lessons (status);

-- ---------------------------------------------------------------------------
-- question bank
-- ---------------------------------------------------------------------------
create table public.questions (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid not null references public.courses (id) on delete cascade,
  lesson_id        uuid references public.lessons (id) on delete set null,
  subject          public.subject not null,
  topic            text not null check (char_length(topic) between 1 and 80),
  subtopic         text,
  difficulty       public.difficulty_level not null default 'medium',
  kind             public.question_kind not null,
  prompt           text not null default '',
  stimulus         text,
  directions       text,
  status           public.content_status not null default 'draft',
  points           integer not null default 1 check (points > 0),
  source_note      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  published_at     timestamptz
);

create index questions_browse_idx on public.questions (subject, status, topic);
create index questions_course_idx on public.questions (course_id, status);
create index questions_lesson_idx on public.questions (lesson_id);
create index questions_difficulty_idx on public.questions (subject, difficulty, status);
create index questions_updated_idx on public.questions (updated_at desc);

-- Answer choices. Safe to expose for published questions: correctness lives in
-- `question_keys`, which students can never read directly.
create table public.question_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  label       text not null check (label ~ '^[A-Z]$'),
  text        text not null,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (question_id, label),
  unique (question_id, position)
);

create index question_options_question_idx on public.question_options (question_id, position);

-- Answer key + explanations. Readable only by admins and by the SECURITY
-- DEFINER session RPCs (grading, post-completion review).
create table public.question_keys (
  question_id       uuid primary key references public.questions (id) on delete cascade,
  correct_option_id uuid references public.question_options (id) on delete set null,
  numeric_answer    numeric,
  numeric_tolerance numeric not null default 0 check (numeric_tolerance >= 0),
  explanation       text,
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- practice / test sessions
-- ---------------------------------------------------------------------------
create table public.test_sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  kind               public.session_kind not null default 'practice',
  subject            public.subject not null,
  course_id          uuid references public.courses (id) on delete set null,
  lesson_id          uuid references public.lessons (id) on delete set null,
  status             public.session_status not null default 'in_progress',
  feedback_mode      public.feedback_mode not null default 'immediate',
  time_limit_seconds integer check (time_limit_seconds is null or time_limit_seconds > 0),
  started_at         timestamptz not null default now(),
  completed_at       timestamptz,
  duration_seconds   integer,
  question_count     integer not null default 0,
  answered_count     integer not null default 0,
  correct_count      integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (answered_count >= 0 and correct_count >= 0 and question_count >= 0),
  check (correct_count <= answered_count),
  check (answered_count <= question_count)
);

create index test_sessions_user_idx on public.test_sessions (user_id, created_at desc);
create index test_sessions_open_idx on public.test_sessions (user_id, status);

-- Server-side only: snapshot (student safe) + answer_ref (never leaves the
-- database before submission / completion). Served through SECURITY DEFINER
-- RPCs, no direct table grants for the `authenticated` role.
create table public.test_session_questions (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.test_sessions (id) on delete cascade,
  question_id    uuid not null references public.questions (id) on delete restrict,
  position       integer not null,
  snapshot       jsonb not null,
  answer_ref     jsonb not null,
  response       jsonb,
  is_correct     boolean,
  answered_at    timestamptz,
  time_spent_ms  integer not null default 0 check (time_spent_ms >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (session_id, position),
  unique (session_id, question_id)
);

create index test_session_questions_session_idx on public.test_session_questions (session_id, position);

-- ---------------------------------------------------------------------------
-- attempt ledger — the single source of truth for progress analytics
-- ---------------------------------------------------------------------------
create table public.question_attempts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  question_id        uuid not null references public.questions (id) on delete restrict,
  session_id         uuid references public.test_sessions (id) on delete cascade,
  session_question_id uuid unique references public.test_session_questions (id) on delete cascade,
  subject            public.subject not null,
  topic              text not null,
  difficulty         public.difficulty_level not null,
  response           jsonb not null,
  is_correct         boolean not null,
  time_spent_ms      integer not null default 0 check (time_spent_ms >= 0),
  created_at         timestamptz not null default now()
);

create index attempts_user_time_idx on public.question_attempts (user_id, created_at desc);
create index attempts_user_subject_idx on public.question_attempts (user_id, subject, is_correct);
create index attempts_user_topic_idx on public.question_attempts (user_id, topic);
create index attempts_question_idx on public.question_attempts (question_id);

create table public.lesson_progress (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  lesson_id      uuid not null references public.lessons (id) on delete cascade,
  state          public.lesson_state not null default 'in_progress',
  correct_count  integer not null default 0,
  attempt_count  integer not null default 0,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index lesson_progress_user_idx on public.lesson_progress (user_id, state);

create table public.bookmarks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create index bookmarks_user_idx on public.bookmarks (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- administration
-- ---------------------------------------------------------------------------
create table public.uploaded_resources (
  id           uuid primary key default gen_random_uuid(),
  uploader_id  uuid references auth.users (id) on delete set null,
  bucket       text not null,
  path         text not null,
  filename     text not null,
  mime_type    text,
  size_bytes   bigint not null default 0 check (size_bytes >= 0),
  title        text not null default '',
  created_at   timestamptz not null default now(),
  unique (bucket, path)
);

create index uploaded_resources_uploader_idx on public.uploaded_resources (uploader_id);

create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users (id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index audit_logs_time_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
