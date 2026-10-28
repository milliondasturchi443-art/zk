import { useState } from 'react';

import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import { forgotPasswordSchema } from '@zk/shared';

import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { Icon } from '../components/icons';
import { useAuth } from '../lib/auth';
import { describeError } from '../lib/errors';
import { zodResolver } from '../lib/zodResolver';

type FormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onBlur',
  });

  const onSubmit = handleSubmit(async (values) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await sendPasswordReset(values.email);
      setSentTo(values.email);
    } catch (caught) {
      const described = describeError(caught);
      setError(`${described.title}. ${described.message}`);
    } finally {
      setSubmitting(false);
    }
  });

  if (sentTo) {
    return (
      <Screen testID="reset-sent-screen">
        <div className="flex flex-col items-center pb-6 pt-8">
          <Logo size={48} />
        </div>
        <div className="mt-4 flex flex-col items-center gap-3 rounded-[20px] border border-line bg-surface p-6">
          <Icon name="mail-outline" size={26} className="text-ink" />
          <h1 className="zk-subtitle text-ink">Check your inbox</h1>
          <p className="zk-body text-center text-muted">
            If an account exists for {sentTo}, we sent a link to set a new password. The link
            expires — request a new one if it does.
          </p>
          <Link to="/sign-in" className="zk-body text-ink underline">
            Back to sign in
          </Link>
        </div>
      </Screen>
    );
  }

  return (
    <Screen testID="forgot-password-screen">
      <div className="flex flex-col items-center pb-6 pt-8">
        <Logo size={48} />
      </div>
      <h1 className="zk-title text-center text-ink">Reset your password</h1>
      <p className="zk-body mb-5 text-center text-muted">
        Enter the email you registered with and we will send you a reset link.
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
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              testID="forgot-email"
              label="Email"
              icon="mail-outline"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
              type="email"
              inputMode="email"
              autoComplete="email"
              enterKeyHint="go"
              onSubmitEditing={() => void onSubmit()}
              placeholder="you@example.com"
            />
          )}
        />

        {error ? (
          <p className="zk-small rounded-[10px] bg-danger-surface p-3 text-center text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          testID="forgot-submit"
          label="Send reset link"
          type="button"
          onPress={() => void onSubmit()}
          loading={submitting}
        />

        <Link to="/sign-in" className="zk-body text-center text-ink underline">
          Back to sign in
        </Link>
      </form>
    </Screen>
  );
}
