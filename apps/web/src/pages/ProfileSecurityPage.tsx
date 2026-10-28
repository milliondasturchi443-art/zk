import { useState } from 'react';

import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { changePasswordSchema } from '@zk/shared';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { Icon } from '../components/icons';
import { useAuth } from '../lib/auth';
import { describeError } from '../lib/errors';
import { zodResolver } from '../lib/zodResolver';

type FormValues = z.infer<typeof changePasswordSchema>;

export function ProfileSecurityPage() {
  const navigate = useNavigate();
  const { updatePassword, verifyCurrentPassword } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    mode: 'onBlur',
  });

  const onSubmit = handleSubmit(async (values) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const ok = await verifyCurrentPassword(values.currentPassword);
      if (!ok) {
        setError('Your current password is not correct.');
        return;
      }
      await updatePassword(values.newPassword);
      setSaved(true);
      reset();
    } catch (caught) {
      setError(describeError(caught).message);
    } finally {
      setSaving(false);
    }
  });

  return (
    <Screen testID="security-screen">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate(-1)}
          className="zk-pressable text-ink"
        >
          <Icon name="chevron-back" size={22} />
        </button>
        <span className="zk-caption uppercase text-faint">Security</span>
        <span className="w-[22px]" />
      </div>

      <h1 className="zk-display text-ink">Change password</h1>
      <p className="zk-body mb-5 text-muted">
        You are asked for your current password first. The new password takes effect immediately in
        this browser.
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
          name="currentPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Current password"
              icon="lock-closed-outline"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.currentPassword?.message}
              type="password"
              autoComplete="current-password"
              testID="current-password"
            />
          )}
        />

        <Controller
          control={control}
          name="newPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="New password"
              icon="key-outline"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.newPassword?.message}
              type="password"
              autoComplete="new-password"
              testID="new-password"
              hint="At least 8 characters with a letter and a number"
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Confirm new password"
              icon="key-outline"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.confirmPassword?.message}
              type="password"
              autoComplete="new-password"
              testID="confirm-password"
            />
          )}
        />

        {error ? (
          <p className="zk-small text-center text-danger" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="zk-small text-center text-success" data-testid="password-saved" role="status">
            Password updated.
          </p>
        ) : null}

        <Button
          label="Update password"
          type="button"
          onPress={() => void onSubmit()}
          loading={saving}
          testID="save-password"
        />
        <Button label="Back" variant="ghost" onPress={() => navigate(-1)} />
      </form>
    </Screen>
  );
}
