import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { Badge, Card, SectionTitle } from '../components/primitives';
import { ErrorState, LoadingState } from '../components/states';
import { Icon, type IconName } from '../components/icons';
import { callEdgeFunction, fetchProfile, queryKeys } from '../lib/api';
import { useAuth } from '../lib/auth';
import { describeError } from '../lib/errors';

interface Row {
  key: string;
  icon: IconName;
  label: string;
  hint: string;
  href: string;
}

const ROWS: Row[] = [
  {
    key: 'edit',
    icon: 'create-outline',
    label: 'Edit profile',
    hint: 'Name and phone number',
    href: '/profile/edit',
  },
  {
    key: 'security',
    icon: 'lock-closed-outline',
    label: 'Security',
    hint: 'Change your password',
    href: '/profile/security',
  },
  {
    key: 'mistakes',
    icon: 'refresh-circle-outline',
    label: 'Mistake review',
    hint: 'Questions you answered incorrectly',
    href: '/mistakes',
  },
  {
    key: 'bookmarks',
    icon: 'bookmark-outline',
    label: 'Bookmarks',
    hint: 'Questions you saved',
    href: '/bookmarks',
  },
  {
    key: 'terms',
    icon: 'document-text-outline',
    label: 'Terms & privacy',
    hint: 'Placeholder documents in this build',
    href: '/legal?doc=terms',
  },
];

export function ProfilePage() {
  const navigate = useNavigate();
  const { signOut, session } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.profile,
    queryFn: fetchProfile,
    enabled: Boolean(session),
  });

  const onSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      navigate('/sign-in', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  const onDelete = async () => {
    if (deleteBusy || !password) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await callEdgeFunction('delete-account', { password });
      await signOut();
      navigate('/sign-in', { replace: true });
    } catch (error) {
      setDeleteError(describeError(error).message);
    } finally {
      setDeleteBusy(false);
    }
  };

  if (query.isLoading) return <LoadingState label="Loading profile…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const profile = query.data;

  return (
    <Screen tabBar testID="profile-screen">
      <h1 className="zk-display mb-5 text-ink">Profile</h1>

      <Card className="mb-6 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-line bg-surface">
          <span className="zk-subtitle text-ink">
            {(profile?.full_name ?? '?')
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join('') || '?'}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="zk-title truncate text-ink">
            {profile?.full_name || 'Unnamed student'}
          </span>
          <span className="zk-small truncate text-muted">{profile?.email ?? '—'}</span>
          <div className="mt-0.5 flex flex-wrap gap-2">
            <Badge label={profile?.role === 'admin' ? 'Administrator' : 'Student'} />
            {profile?.phone ? <Badge label={profile.phone} /> : null}
          </div>
        </div>
      </Card>

      <SectionTitle title="Account" />
      <Card className="mb-4 flex flex-col gap-2 p-3">
        {ROWS.map((row) => (
          <Card
            key={row.key}
            className="flex items-center gap-3 rounded-2xl border-line bg-raised px-3 py-3"
            onPress={() => navigate(row.href)}
            accessibilityLabel={`${row.label}, ${row.hint}`}
            testID={`profile-row-${row.key}`}
          >
            <Icon name={row.icon} size={18} className="shrink-0 text-ink" />
            <div className="flex min-w-0 flex-1 flex-col gap-px">
              <span className="zk-body font-semibold text-ink">{row.label}</span>
              <span className="zk-caption text-muted">{row.hint}</span>
            </div>
            <Icon name="chevron-forward" size={16} className="shrink-0 text-faint" />
          </Card>
        ))}
      </Card>

      <SectionTitle title="Session" />
      <Button
        label={signingOut ? 'Signing out…' : 'Sign out'}
        variant="secondary"
        onPress={onSignOut}
        loading={signingOut}
        testID="sign-out"
      />

      <SectionTitle title="Danger zone" />
      {!confirmingDelete ? (
        <Card
          className="mb-6 flex flex-col gap-3"
          onPress={() => setConfirmingDelete(true)}
          testID="delete-account-open"
        >
          <span className="zk-subtitle text-danger">Delete account</span>
          <span className="zk-small text-muted">
            Permanently removes your account, sessions and progress. This cannot be undone.
          </span>
        </Card>
      ) : (
        <Card className="mb-6 flex flex-col gap-3">
          <span className="zk-subtitle text-danger">Confirm deletion</span>
          <span className="zk-small text-muted">
            Enter your password to delete this account and everything attached to it.
          </span>
          <TextField
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            type="password"
            autoComplete="current-password"
            testID="delete-password"
            placeholder="Your password"
          />
          {deleteError ? (
            <p className="zk-small text-center text-danger">{deleteError}</p>
          ) : null}
          <Button
            label="Delete my account"
            variant="danger"
            onPress={onDelete}
            loading={deleteBusy}
            disabled={!password}
            testID="delete-confirm"
          />
          <Button
            label="Cancel"
            variant="ghost"
            onPress={() => {
              setConfirmingDelete(false);
              setPassword('');
              setDeleteError(null);
            }}
          />
        </Card>
      )}
    </Screen>
  );
}
