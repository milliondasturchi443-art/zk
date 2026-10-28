import { useState } from 'react';

import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { resetPasswordSchema } from '@zk/shared';

import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { useAuth } from '../lib/auth';
import { describeError } from '../lib/errors';
import { zodResolver } from '../lib/zodResolver';

type FormValues = z.infer<typeof resetPasswordSchema>;

/**
 * Reached through the emailed recovery link. The session is already
 * established by the auth provider before this renders.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { updatePassword, session } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onBlur',
  });

  const onSubmit = handleSubmit(async (values) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await updatePassword(values.password);
      navigate('/', { replace: true });
    } catch (caught) {
      const described = describeError(caught);
      setError(`${described.title}. ${described.message}`);
    } finally {
      setSubmitting(false);
    }
  });

  if (!session) {
    return (
      <Screen testID="reset-expired-screen">
        <div className="flex flex-col items-center pb-6 pt-8">
          <Logo size={48} />
        </div>
        <div className="mt-4 flex flex-col items-center gap-3 rounded-[20px] border border-line bg-surface p-6">
          <h1 className="zk-subtitle text-ink">Link expired or already used</h1>
          <p className="zk-body text-center text-muted">
            Open a fresh reset link from the sign in screen to choose a new password.
          </p>
          <Button
            label="Request a new link"
            variant="secondary"
            onPress={() => navigate('/forgot-password', { replace: true })}
          />
          <Button
            label="Back to sign in"
            variant="ghost"
            onPress={() => navigate('/sign-in', { replace: true })}
          />
        </div>
      </Screen>
    );
  }

  return (
    <Screen testID="reset-password-screen">
      <div className="flex flex-col items-center pb-6 pt-8">
        <Logo size={48} />
      </div>
      <h1 className="zk-title mb-5 text-center text-ink">Choose a new password</h1>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              testID="reset-password"
              label="New password"
              icon="lock-closed-outline"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              type="password"
              autoComplete="new-password"
              hint="At least 8 characters with a letter and a number"
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              testID="reset-confirm"
              label="Confirm new password"
              icon="lock-closed-outline"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.confirmPassword?.message}
              type="password"
              autoComplete="new-password"
            />
          )}
        />

        {error ? (
          <p className="zk-small rounded-[10px] bg-danger-surface p-3 text-center text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          testID="reset-submit"
          label="Save password"
          type="button"
          onPress={() => void onSubmit()}
          loading={submitting}
        />
      </form>
    </Screen>
  );
}
