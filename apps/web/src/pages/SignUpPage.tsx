import { useState } from 'react';

import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { signUpSchema } from '@zk/shared';

import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { Icon } from '../components/icons';
import { useAuth } from '../lib/auth';
import { describeError } from '../lib/errors';
import { requireSupabase } from '../lib/supabase';
import { zodResolver } from '../lib/zodResolver';

type FormValues = z.infer<typeof signUpSchema>;

export function SignUpPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [awaitingVerification, setAwaitingVerification] = useState<string | null>(null);
  const [resendState, setResendState] = useState<{ busy: boolean; message: string | null }>({
    busy: false,
    message: null,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptedTerms: false,
    },
    mode: 'onBlur',
  });

  const onSubmit = handleSubmit(async (values) => {
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const result = await signUp({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
      });
      if (result.needsEmailVerification) {
        setAwaitingVerification(values.email);
      } else {
        navigate('/', { replace: true });
      }
    } catch (error) {
      const described = describeError(error);
      setFormError(`${described.title}. ${described.message}`);
    } finally {
      setSubmitting(false);
    }
  });

  const resend = async () => {
    if (!awaitingVerification || resendState.busy) return;
    setResendState({ busy: true, message: null });
    try {
      const { error } = await requireSupabase().auth.resend({
        type: 'signup',
        email: awaitingVerification,
      });
      if (error) throw error;
      setResendState({ busy: false, message: 'Verification email sent again.' });
    } catch (error) {
      setResendState({ busy: false, message: describeError(error).message });
    }
  };

  if (awaitingVerification) {
    return (
      <Screen testID="verify-email-screen">
        <div className="flex flex-col items-center pb-5 pt-6">
          <Logo size={56} />
        </div>
        <div className="mt-6 flex flex-col items-center gap-3 rounded-[20px] border border-line bg-surface p-6">
          <Icon name="mail-open-outline" size={28} className="text-ink" />
          <h1 className="zk-title text-ink">Verify your email</h1>
          <p className="zk-body text-center text-muted">
            We sent a confirmation link to {awaitingVerification}. Open it on this device, then sign
            in.
          </p>
          {resendState.message ? (
            <p className="zk-small text-center text-muted">{resendState.message}</p>
          ) : null}
          <Button
            label="Resend email"
            variant="secondary"
            loading={resendState.busy}
            onPress={() => void resend()}
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
    <Screen testID="sign-up-screen">
      <div className="flex flex-col items-center pb-5 pt-6">
        <Logo size={48} />
      </div>

      <form
        className="flex flex-col gap-3.5"
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
              testID="sign-up-name"
              label="Full name"
              icon="person-outline"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.fullName?.message}
              autoCapitalize="words"
              autoComplete="name"
              placeholder="Jane Student"
            />
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              testID="sign-up-email"
              label="Email"
              icon="mail-outline"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              testID="sign-up-password"
              label="Password"
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
              testID="sign-up-confirm"
              label="Confirm password"
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

        <Controller
          control={control}
          name="acceptedTerms"
          render={({ field: { onChange, value } }) => (
            <label className="flex cursor-pointer items-start gap-2 py-1 pr-2">
              <input
                type="checkbox"
                data-testid="sign-up-terms"
                checked={Boolean(value)}
                onChange={() => onChange(!value)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-ink"
              />
              <span className="zk-small leading-[19px] text-muted">
                I accept the{' '}
                <Link to="/legal?doc=terms" className="text-ink underline">
                  Terms
                </Link>{' '}
                and{' '}
                <Link to="/legal?doc=privacy" className="text-ink underline">
                  Privacy Policy
                </Link>
              </span>
            </label>
          )}
        />
        {errors.acceptedTerms ? (
          <p className="zk-small text-center text-danger">{errors.acceptedTerms.message}</p>
        ) : null}

        {formError ? (
          <p
            className="zk-small rounded-[10px] bg-danger-surface p-3 text-center text-danger"
            role="alert"
            data-testid="sign-up-error"
          >
            {formError}
          </p>
        ) : null}

        <Button
          testID="sign-up-submit"
          label="Create account"
          type="button"
          onPress={() => void onSubmit()}
          loading={submitting}
        />

        <div className="flex items-center justify-center gap-2 pt-2">
          <span className="zk-small text-muted">Already registered?</span>
          <Link to="/sign-in" className="zk-small font-bold text-ink">
            Sign In
          </Link>
        </div>
      </form>
    </Screen>
  );
}
