import { describeError } from '../lib/errors';
import { Button } from './Button';
import { Icon, type IconName } from './icons';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      className="flex flex-col items-center justify-center gap-3 py-12"
    >
      <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-line border-t-ink" />
      <span className="zk-small text-muted">{label}</span>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  message,
  icon = 'file-tray-outline',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div role="summary" className="my-4 flex flex-col items-center justify-center gap-2 rounded-[20px] border border-line bg-surface p-6">
      <Icon name={icon} size={26} className="text-faint" />
      <p className="zk-subtitle text-center text-ink">{title}</p>
      <p className="zk-body max-w-[360px] text-center text-muted">{message}</p>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" fullWidth={false} />
      ) : null}
    </div>
  );
}

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({ error, onRetry, compact = false }: ErrorStateProps) {
  const described = describeError(error);
  if (compact) {
    return (
      <div role="status" className="flex flex-wrap items-center gap-2 py-2">
        <Icon name="alert-circle-outline" size={16} className="text-danger" />
        <span className="zk-small flex-1 text-danger">{described.message}</span>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="zk-small text-ink underline underline-offset-2"
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <div role="alert" className="my-4 flex flex-col items-center justify-center gap-2 rounded-[20px] border border-line bg-surface p-6">
      <Icon name="cloud-offline-outline" size={26} className="text-danger" />
      <p className="zk-subtitle text-center text-ink">{described.title}</p>
      <p className="zk-body max-w-[360px] text-center text-muted">{described.message}</p>
      {onRetry ? (
        <Button label="Try again" onPress={onRetry} variant="secondary" fullWidth={false} />
      ) : null}
    </div>
  );
}
