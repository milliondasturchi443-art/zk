import type { CSSProperties } from 'react';

import { Loader2 } from 'lucide-react';

import { cn } from '../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: CSSProperties;
  className?: string;
  testID?: string;
  type?: 'button' | 'submit';
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  className,
  testID,
  type = 'button',
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      data-testid={testID}
      aria-label={label}
      aria-busy={loading || undefined}
      onClick={onPress}
      disabled={isDisabled}
      style={style}
      className={cn(
        'zk-button zk-pressable inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full px-6',
        fullWidth && 'w-full',
        isDisabled && 'cursor-not-allowed opacity-45',
        variant === 'primary' && 'bg-primary text-on-primary',
        variant === 'secondary' && 'border border-line bg-surface text-ink',
        variant === 'ghost' && 'bg-transparent text-ink underline underline-offset-2',
        variant === 'danger' && 'bg-danger text-on-primary',
        className,
      )}
    >
      {loading ? (
        <Loader2
          size={16}
          className="animate-spin"
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : '#0A0A0A'}
        />
      ) : null}
      <span>{label}</span>
    </button>
  );
}
