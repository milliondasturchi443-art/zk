alter table public.profiles disable trigger trg_profiles_protect;

do $$
declare
  v_uid uuid;
begin
  v_uid := gen_random_uuid();
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current)
  values (
    v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'admin@zk.local', crypt('Admin123!', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{}',
    now(), now(), '', '', '', '', ''
  );

  -- GoPasswordless GoTrue resolves the sign-in provider by joining
  -- auth.identities. Without this row the password grant fails with
  -- `unexpected_failure` / "Database error querying schema", so mirror what
  -- the Auth Admin API writes. `email` is a generated column here and must
  -- be left to the default.
  insert into auth.identities (user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at)
  values (v_uid, 'email', v_uid::text,
          jsonb_build_object('sub', v_uid::text, 'email', 'admin@zk.local', 'email_verified', true),
          now(), now(), now());

  update public.profiles set role = 'admin', full_name = 'Test Admin' where id = v_uid;
end $$;

alter table public.profiles enable trigger trg_profiles_protect;

select p.id, p.email, p.role from public.profiles p where email = 'admin@zk.local';
