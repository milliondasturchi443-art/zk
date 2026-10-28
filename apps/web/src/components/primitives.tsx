import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

export function Card({
  children,
  className,
  onPress,
  accessibilityLabel,
  testID,
}: {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}) {
  if (onPress) {
    return (
      <button
        type="button"
        data-testid={testID}
        aria-label={accessibilityLabel}
        onClick={onPress}
        className={cn('zk-card zk-pressable w-full cursor-pointer text-left', className)}
      >
        {children}
      </button>
    );
  }
  return (
    <div data-testid={testID} className={cn('zk-card', className)}>
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="zk-title text-ink">{title}</h2>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          aria-label={actionLabel}
          className="zk-small text-muted underline underline-offset-2"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function ProgressBar({
  value,
  height = 6,
  trackColor,
  fillColor,
}: {
  /** 0..1 */
  value: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
}) {
  const ratio = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      className="w-full overflow-hidden rounded-full"
      style={{ height, backgroundColor: trackColor ?? 'var(--color-line)' }}
    >
      <div
        className="h-full"
        style={{
          width: `${ratio * 100}%`,
          backgroundColor: fillColor ?? 'var(--color-primary)',
          borderRadius: height,
        }}
      />
    </div>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex min-w-[104px] flex-1 flex-col gap-1 rounded-2xl border border-line bg-surface p-4">
      <span className="zk-title text-ink" aria-label={`${label}: ${value}`}>
        {value}
      </span>
      <span className="zk-caption text-muted">{label}</span>
      {hint ? <span className="zk-caption text-faint">{hint}</span> : null}
    </div>
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <span className={cn('zk-small', selected ? 'font-semibold text-on-primary' : 'text-muted')}>
      {label}
    </span>
  );
  const classes = cn(
    'rounded-full border px-4 py-2.5 transition',
    selected ? 'border-primary bg-primary' : 'border-line bg-surface',
    onPress && 'zk-pressable cursor-pointer',
  );
  if (!onPress) {
    return <span className={classes}>{content}</span>;
  }
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onPress}
      className={classes}
    >
      {content}
    </button>
  );
}

const BADGE_TONES = {
  neutral: 'bg-surface text-muted',
  success: 'bg-success-surface text-success',
  error: 'bg-danger-surface text-danger',
  warning: 'bg-warning-surface text-warning',
} as const;

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'error' | 'warning';
}) {
  return (
    <span
      className={cn(
        'zk-caption inline-flex items-center self-start rounded-full px-2.5 py-0.5 font-semibold',
        BADGE_TONES[tone],
      )}
    >
      {label}
    </span>
  );
}
