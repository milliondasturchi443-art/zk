-- ============================================================================
-- ZK — 000004 row level security, grants and hard privileges
-- Principle: students may only ever read/write their own records, published
-- content, and nothing that contains answer keys. Answer keys are reachable
-- exclusively through SECURITY DEFINER RPCs.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select, update on table public.profiles to authenticated;

create policy profiles_select_own_or_admin
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.fn_is_admin());

create policy profiles_update_own_or_admin
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.fn_is_admin())
  with check (id = auth.uid() or public.fn_is_admin());

create policy profiles_delete_admin
  on public.profiles for delete
  to authenticated
  using (public.fn_is_admin());

-- no insert policy on purpose: rows are created by the auth trigger only.

-- ---------------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------------
alter table public.courses enable row level security;

revoke all on table public.courses from anon;
revoke all on table public.courses from authenticated;
grant select, insert, update, delete on table public.courses to authenticated;

create policy courses_select_published_or_admin
  on public.courses for select
  to authenticated
  using (public.fn_is_admin() or status = 'published');

create policy courses_insert_admin
  on public.courses for insert
  to authenticated
  with check (public.fn_is_admin());

create policy courses_update_admin
  on public.courses for update
  to authenticated
  using (public.fn_is_admin())
  with check (public.fn_is_admin());

create policy courses_delete_admin
  on public.courses for delete
  to authenticated
  using (public.fn_is_admin());

-- ---------------------------------------------------------------------------
-- course_modules
-- ---------------------------------------------------------------------------
alter table public.course_modules enable row level security;

revoke all on table public.course_modules from anon;
revoke all on table public.course_modules from authenticated;
grant select, insert, update, delete on table public.course_modules to authenticated;

create policy modules_select_published_or_admin
  on public.course_modules for select
  to authenticated
  using (
    public.fn_is_admin()
    or (
      status = 'published'
      and exists (
        select 1 from public.courses c
         where c.id = course_id and c.status = 'published'
      )
    )
  );

create policy modules_insert_admin
  on public.course_modules for insert
  to authenticated
  with check (public.fn_is_admin());

create policy modules_update_admin
  on public.course_modules for update
  to authenticated
  using (public.fn_is_admin())
  with check (public.fn_is_admin());

create policy modules_delete_admin
  on public.course_modules for delete
  to authenticated
  using (public.fn_is_admin());

-- ---------------------------------------------------------------------------
-- lessons
-- ---------------------------------------------------------------------------
alter table public.lessons enable row level security;

revoke all on table public.lessons from anon;
revoke all on table public.lessons from authenticated;
grant select, insert, update, delete on table public.lessons to authenticated;

create policy lessons_select_published_or_admin
  on public.lessons for select
  to authenticated
  using (
    public.fn_is_admin()
    or (
      status = 'published'
      and exists (
        select 1
          from public.course_modules m
          join public.courses c on c.id = m.course_id
         where m.id = module_id
           and m.status = 'published'
           and c.status = 'published'
      )
    )
  );

create policy lessons_insert_admin
  on public.lessons for insert
  to authenticated
  with check (public.fn_is_admin());

create policy lessons_update_admin
  on public.lessons for update
  to authenticated
  using (public.fn_is_admin())
  with check (public.fn_is_admin());

create policy lessons_delete_admin
  on public.lessons for delete
  to authenticated
  using (public.fn_is_admin());

-- ---------------------------------------------------------------------------
-- questions (prompt readable when published — answer key is NOT in this table)
-- ---------------------------------------------------------------------------
alter table public.questions enable row level security;

revoke all on table public.questions from anon;
revoke all on table public.questions from authenticated;
grant select, insert, update, delete on table public.questions to authenticated;

create policy questions_select_published_or_admin
  on public.questions for select
  to authenticated
  using (
    public.fn_is_admin()
    or (
      status = 'published'
      and exists (
        select 1 from public.courses c
         where c.id = course_id and c.status = 'published'
      )
      and (
        lesson_id is null
        or exists (
          select 1
            from public.lessons l
            join public.course_modules m on m.id = l.module_id
           where l.id = lesson_id
             and l.status = 'published'
             and m.status = 'published'
        )
      )
    )
  );

create policy questions_insert_admin
  on public.questions for insert
  to authenticated
  with check (public.fn_is_admin());

create policy questions_update_admin
  on public.questions for update
  to authenticated
  using (public.fn_is_admin())
  with check (public.fn_is_admin());

create policy questions_delete_admin
  on public.questions for delete
  to authenticated
  using (public.fn_is_admin());

-- ---------------------------------------------------------------------------
-- question_options — answer choices for published questions are readable,
-- but correctness never lives in this table.
-- ---------------------------------------------------------------------------
alter table public.question_options enable row level security;

revoke all on table public.question_options from anon;
revoke all on table public.question_options from authenticated;
grant select, insert, update, delete on table public.question_options to authenticated;

create policy question_options_select_published_or_admin
  on public.question_options for select
  to authenticated
  using (
    public.fn_is_admin()
    or exists (
      select 1 from public.questions q
       where q.id = question_id
         and q.status = 'published'
         and exists (
           select 1 from public.courses c
            where c.id = q.course_id and c.status = 'published'
         )
    )
  );

create policy question_options_insert_admin
  on public.question_options for insert
  to authenticated
  with check (public.fn_is_admin());

create policy question_options_update_admin
  on public.question_options for update
  to authenticated
  using (public.fn_is_admin())
  with check (public.fn_is_admin());

create policy question_options_delete_admin
  on public.question_options for delete
  to authenticated
  using (public.fn_is_admin());

-- ---------------------------------------------------------------------------
-- question_keys — answer key + explanations: admin and definer RPCs only
-- ---------------------------------------------------------------------------
alter table public.question_keys enable row level security;

revoke all on table public.question_keys from anon;
revoke all on table public.question_keys from authenticated;
grant select, insert, update, delete on table public.question_keys to authenticated;

create policy question_keys_admin_only
  on public.question_keys for select
  to authenticated
  using (public.fn_is_admin());

create policy question_keys_insert_admin
  on public.question_keys for insert
  to authenticated
  with check (public.fn_is_admin());

create policy question_keys_update_admin
  on public.question_keys for update
  to authenticated
  using (public.fn_is_admin())
  with check (public.fn_is_admin());

create policy question_keys_delete_admin
  on public.question_keys for delete
  to authenticated
  using (public.fn_is_admin());

-- ---------------------------------------------------------------------------
-- sessions: no direct table access at all, everything goes through RPCs so
-- that in-progress results and answer references never leak.
-- ---------------------------------------------------------------------------
alter table public.test_sessions enable row level security;
alter table public.test_session_questions enable row level security;

revoke all on table public.test_sessions from anon;
revoke all on table public.test_sessions from authenticated;
revoke all on table public.test_session_questions from anon;
revoke all on table public.test_session_questions from authenticated;

-- ---------------------------------------------------------------------------
-- question_attempts — students read their own history, only the server writes
-- ---------------------------------------------------------------------------
alter table public.question_attempts enable row level security;

revoke all on table public.question_attempts from anon;
revoke all on table public.question_attempts from authenticated;
grant select on table public.question_attempts to authenticated;

create policy attempts_select_own_or_admin
  on public.question_attempts for select
  to authenticated
  using (user_id = auth.uid() or public.fn_is_admin());

-- no insert/update/delete policies on purpose.

-- ---------------------------------------------------------------------------
-- lesson_progress — read own, write only through RPCs
-- ---------------------------------------------------------------------------
alter table public.lesson_progress enable row level security;

revoke all on table public.lesson_progress from anon;
revoke all on table public.lesson_progress from authenticated;
grant select on table public.lesson_progress to authenticated;

create policy lesson_progress_select_own_or_admin
  on public.lesson_progress for select
  to authenticated
  using (user_id = auth.uid() or public.fn_is_admin());

-- ---------------------------------------------------------------------------
-- bookmarks — plain personal data, students manage their own list
-- ---------------------------------------------------------------------------
alter table public.bookmarks enable row level security;

revoke all on table public.bookmarks from anon;
revoke all on table public.bookmarks from authenticated;
grant select, insert, delete on table public.bookmarks to authenticated;

create policy bookmarks_select_own
  on public.bookmarks for select
  to authenticated
  using (user_id = auth.uid());

create policy bookmarks_insert_own
  on public.bookmarks for insert
  to authenticated
  with check (user_id = auth.uid());

create policy bookmarks_delete_own
  on public.bookmarks for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- uploaded_resources
-- ---------------------------------------------------------------------------
alter table public.uploaded_resources enable row level security;

revoke all on table public.uploaded_resources from anon;
revoke all on table public.uploaded_resources from authenticated;
grant select on table public.uploaded_resources to authenticated;

create policy resources_select_admin
  on public.uploaded_resources for select
  to authenticated
  using (public.fn_is_admin());

create policy resources_insert_admin
  on public.uploaded_resources for insert
  to authenticated
  with check (public.fn_is_admin());

create policy resources_delete_admin
  on public.uploaded_resources for delete
  to authenticated
  using (public.fn_is_admin());

-- ---------------------------------------------------------------------------
-- audit_logs — admin read only, writes via definer functions
-- ---------------------------------------------------------------------------
alter table public.audit_logs enable row level security;

revoke all on table public.audit_logs from anon;
revoke all on table public.audit_logs from authenticated;
grant select on table public.audit_logs to authenticated;

create policy audit_select_admin
  on public.audit_logs for select
  to authenticated
  using (public.fn_is_admin());
