import { useState } from 'react';

import { cn } from '../lib/cn';
import { Icon, type IconName } from './icons';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  icon?: IconName;
  error?: string;
  hint?: string;
  secureTextEntry?: boolean;
  /** Native input type; defaults to text (email/password/decimal are set by callers). */
  type?: 'text' | 'email' | 'password' | 'tel' | 'decimal' | 'number';
  inputMode?: 'text' | 'email' | 'decimal' | 'numeric' | 'tel';
  autoComplete?: 'off' | 'email' | 'password' | 'name' | 'tel' | 'current-password' | 'new-password';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  multiline?: boolean;
  enterKeyHint?: 'done' | 'go' | 'next' | 'search' | 'send';
  onSubmitEditing?: () => void;
  testID?: string;
  className?: string;
  placeholder?: string;
  name?: string;
}

export function TextField({
  label,
  value,
  onChangeText,
  onBlur,
  icon,
  error,
  hint,
  secureTextEntry,
  type = 'text',
  inputMode,
  autoComplete = 'off',
  autoCapitalize = 'none',
  editable = true,
  multiline = false,
  enterKeyHint,
  onSubmitEditing,
  testID,
  className,
  placeholder,
  name,
}: TextFieldProps) {
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  const hasError = Boolean(error);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="zk-caption ml-1 text-muted" aria-label={`${label} label`}>
        {label}
      </span>
      <div
        className={cn(
          'flex items-center gap-2 rounded-full border bg-surface px-4',
          multiline ? 'min-h-[120px] items-start py-3' : 'min-h-[52px]',
          hasError ? 'border-danger bg-danger-surface' : 'border-line',
          !editable && 'opacity-60',
        )}
      >
        {icon ? (
          <Icon
            name={icon}
            size={16}
            className={cn('mt-0.5 shrink-0', hasError ? 'text-danger' : 'text-muted')}
          />
        ) : null}
        <input
          data-testid={testID}
          aria-label={label}
          name={name}
          type={secureTextEntry && hidden ? 'password' : type}
          inputMode={inputMode}
          value={value}
          onChange={(event) => onChangeText(event.target.value)}
          onBlur={onBlur}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !multiline && onSubmitEditing) {
              event.preventDefault();
              onSubmitEditing();
            }
          }}
          disabled={!editable}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint={enterKeyHint}
          placeholder={placeholder}
          className={cn(
            'min-w-0 flex-1 bg-transparent py-3 text-ink outline-none placeholder:text-faint',
            multiline && 'min-h-[96px] resize-none leading-6',
          )}
          style={multiline ? { verticalAlign: 'top' } : undefined}
        />
        {secureTextEntry ? (
          <button
            type="button"
            aria-label={hidden ? 'Show password' : 'Hide password'}
            onClick={() => setHidden((current) => !current)}
            className="shrink-0 pl-2 text-muted"
          >
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} />
          </button>
        ) : null}
      </div>
      {hasError ? (
        <span className="zk-small ml-1 text-danger" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="zk-small ml-1 text-faint">{hint}</span>
      ) : null}
    </div>
  );
}
