alter table public.profiles disable trigger trg_profiles_protect;

do $$
declare
  v_uid uuid;
begin
  v_uid := gen_random_uuid();
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new)
  values (
    v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'admin@zk.local', crypt('Admin123!', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{}',
    now(), now(), '', '', ''
  );
  update public.profiles set role = 'admin', full_name = 'Test Admin' where id = v_uid;
end $$;

alter table public.profiles enable trigger trg_profiles_protect;

select p.id, p.email, p.role from public.profiles p where email = 'admin@zk.local';
