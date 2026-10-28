import { useState } from 'react';

import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { signInSchema } from '@zk/shared';

import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { useAuth } from '../lib/auth';
import { describeError } from '../lib/errors';
import { zodResolver } from '../lib/zodResolver';

type FormValues = z.infer<typeof signInSchema>;

export function SignInPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  const onSubmit = handleSubmit(async (values) => {
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await signIn(values.email, values.password);
      navigate('/', { replace: true });
    } catch (error) {
      const described = describeError(error);
      setFormError(`${described.title}. ${described.message}`);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Screen testID="sign-in-screen">
      <div className="flex flex-col items-center pb-8 pt-10">
        <Logo size={56} testID="auth-logo" />
      </div>

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
              testID="sign-in-email"
              label="Email"
              icon="mail-outline"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
              type="email"
              inputMode="email"
              autoComplete="email"
              enterKeyHint="next"
              placeholder="you@example.com"
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              testID="sign-in-password"
              label="Password"
              icon="lock-closed-outline"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              type="password"
              autoComplete="current-password"
              enterKeyHint="go"
              onSubmitEditing={() => void onSubmit()}
              placeholder="Your password"
            />
          )}
        />

        {formError ? (
          <p
            className="zk-small rounded-[10px] bg-danger-surface p-3 text-center text-danger"
            role="alert"
            data-testid="sign-in-error"
          >
            {formError}
          </p>
        ) : null}

        <Button
          testID="sign-in-submit"
          label="Login / Sign In"
          type="button"
          onPress={() => void onSubmit()}
          loading={submitting}
        />

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="zk-small text-faint">or</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <Link to="/forgot-password" className="zk-body text-center text-ink underline">
          Forgot Password?
        </Link>

        <div className="flex items-center justify-center gap-2 pt-2">
          <span className="zk-body text-ink">Get started?</span>
          <Link to="/sign-up" className="zk-body font-bold text-ink" data-testid="go-sign-up">
            Sign Up
          </Link>
        </div>
      </form>
    </Screen>
  );
}
