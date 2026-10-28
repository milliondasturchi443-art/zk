import { useEffect, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { updateProfileSchema } from '@zk/shared';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { Icon } from '../components/icons';
import { ErrorState, LoadingState } from '../components/states';
import { fetchProfile, queryKeys, updateProfile } from '../lib/api';
import { describeError } from '../lib/errors';
import { zodResolver } from '../lib/zodResolver';

type FormValues = z.infer<typeof updateProfileSchema>;

export function ProfileEditPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: queryKeys.profile,
    queryFn: fetchProfile,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { fullName: '', phone: '' },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (profileQuery.data) {
      reset({
        fullName: profileQuery.data.full_name ?? '',
        phone: profileQuery.data.phone ?? '',
      });
    }
  }, [profileQuery.data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateProfile({
        full_name: values.fullName,
        phone: values.phone?.trim() ? values.phone.trim() : null,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      setSaved(true);
    } catch (caught) {
      setError(describeError(caught).message);
    } finally {
      setSaving(false);
    }
  });

  if (profileQuery.isLoading) return <LoadingState label="Loading profile…" />;
  if (profileQuery.isError) {
    return (
      <Screen>
        <ErrorState error={profileQuery.error} onRetry={() => profileQuery.refetch()} />
        <Button label="Back" variant="secondary" onPress={() => navigate(-1)} />
      </Screen>
    );
  }

  return (
    <Screen testID="edit-profile-screen">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate(-1)}
          className="zk-pressable text-ink"
        >
          <Icon name="chevron-back" size={22} />
        </button>
        <span className="zk-caption uppercase text-faint">Account</span>
        <span className="w-[22px]" />
      </div>

      <h1 className="zk-display text-ink">Edit profile</h1>
      <p className="zk-body mb-5 text-muted">
        Your name appears on your account. Email cannot be changed.
      </p>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Full name"
              icon="person-outline"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.fullName?.message}
              autoCapitalize="words"
              autoComplete="name"
              testID="edit-name"
              placeholder="Jane Student"
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Phone (optional)"
              icon="call-outline"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.phone?.message}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              testID="edit-phone"
              placeholder="+15551234567"
              hint="International format, for example +15551234567"
            />
          )}
        />

        <div className="flex flex-col gap-0.5 rounded-[10px] border border-line bg-surface p-3">
          <span className="zk-caption uppercase text-faint">Email</span>
          <span className="zk-body text-muted">{profileQuery.data?.email ?? '—'}</span>
        </div>

        {error ? (
          <p className="zk-small text-center text-danger" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="zk-small text-center text-success" data-testid="profile-saved" role="status">
            Profile updated.
          </p>
        ) : null}

        <Button
          label="Save changes"
          type="button"
          onPress={() => void onSubmit()}
          loading={saving}
          disabled={!isDirty}
          testID="save-profile"
        />
        <Button label="Cancel" variant="ghost" onPress={() => navigate(-1)} />
      </form>
    </Screen>
  );
}
