import type { Difficulty, QuestionOptionDto } from '@zk/shared';

import { cn } from '../lib/cn';
import { MathText } from './MathText';
import { Icon } from './icons';
import { Badge, ProgressBar } from './primitives';

export function QuestionMeta({
  directions,
  topic,
  difficulty,
  subtopic,
}: {
  directions?: string;
  topic: string;
  difficulty: Difficulty;
  subtopic?: string | null;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2">
      {directions ? <p className="zk-small italic text-muted">{directions}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Badge label={topic} />
        <Badge label={difficulty} tone={difficulty === 'hard' ? 'warning' : 'neutral'} />
        {subtopic ? <Badge label={subtopic} /> : null}
      </div>
    </div>
  );
}

export function Stimulus({ text }: { text: string }) {
  if (!text?.trim()) return null;
  return (
    <div
      data-testid="stimulus"
      className="mb-4 rounded-2xl border border-line bg-surface p-4"
    >
      <MathText text={text} className="zk-body text-ink" fontSize={15} />
    </div>
  );
}

export function Prompt({ text }: { text: string }) {
  return <MathText text={text} className="mb-5 block leading-[26px] text-ink" fontSize={17} />;
}

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'revealed';

const OPTION_STYLES: Record<OptionState, string> = {
  idle: 'border-line bg-raised text-ink',
  selected: 'border-ink bg-surface text-ink',
  correct: 'border-success bg-success-surface text-ink',
  wrong: 'border-danger bg-danger-surface text-ink',
  revealed: 'border-danger bg-danger-surface text-ink',
};

export function OptionRow({
  option,
  state,
  disabled,
  onPress,
  testID,
}: {
  option: QuestionOptionDto;
  state: OptionState;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const labelTone =
    state === 'correct'
      ? 'border-success'
      : state === 'wrong' || state === 'revealed'
        ? 'border-danger'
        : state === 'selected'
          ? 'border-ink'
          : 'border-line';

  return (
    <button
      type="button"
      data-testid={testID ?? `option-${option.id}`}
      aria-pressed={state === 'selected'}
      aria-label={`Choice ${option.label}: ${option.text}`}
      disabled={disabled}
      onClick={onPress}
      className={cn(
        'zk-pressable mb-3 flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left',
        OPTION_STYLES[state],
        disabled && 'cursor-default opacity-100',
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-canvas',
          labelTone,
        )}
      >
        <span className="zk-caption font-bold text-ink">{option.label}</span>
      </span>
      <MathText text={option.text} className="min-w-0 flex-1 text-ink" fontSize={15} />
      {state === 'correct' ? (
        <Icon name="checkmark-circle" size={18} className="shrink-0 text-success" fill="currentColor" />
      ) : state === 'wrong' || state === 'revealed' ? (
        <Icon name="close-circle" size={18} className="shrink-0 text-danger" fill="currentColor" />
      ) : null}
    </button>
  );
}

export function FeedbackPanel({
  answered,
  revealed,
  isCorrect,
  correctAnswerLabel,
  explanation,
}: {
  answered: boolean;
  revealed: boolean;
  isCorrect: boolean | null;
  correctAnswerLabel: string | null;
  explanation: string | null;
}) {
  if (!answered) return null;
  if (!revealed) {
    return (
      <div
        data-testid="feedback-saved"
        className="mt-2 flex items-start gap-2 rounded-2xl border border-line bg-surface p-4"
      >
        <Icon name="checkmark-done-outline" size={16} className="mt-0.5 shrink-0 text-muted" />
        <p className="zk-small text-muted">
          Answer saved. Feedback unlocks when the session ends.
        </p>
      </div>
    );
  }
  const ok = isCorrect === true;
  return (
    <div
      data-testid={ok ? 'feedback-correct' : 'feedback-incorrect'}
      role="status"
      aria-live="polite"
      className={cn(
        'mt-2 flex flex-col gap-2 rounded-2xl border p-4',
        ok ? 'border-success bg-success-surface' : 'border-danger bg-danger-surface',
      )}
    >
      <div className="flex items-center gap-2">
        <Icon
          name={ok ? 'checkmark-circle' : 'close-circle'}
          size={18}
          className={ok ? 'text-success' : 'text-danger'}
          fill="currentColor"
        />
        <span className={cn('zk-subtitle', ok ? 'text-success' : 'text-danger')}>
          {ok ? 'Correct' : 'Incorrect'}
        </span>
      </div>
      {!ok && correctAnswerLabel ? (
        <p className="zk-small font-semibold text-ink">Correct answer: {correctAnswerLabel}</p>
      ) : null}
      {explanation ? (
        <MathText text={explanation} className="zk-small text-ink" fontSize={14} />
      ) : null}
    </div>
  );
}

export function SessionProgress({ answered, total }: { answered: number; total: number }) {
  return (
    <div className="flex flex-col gap-2">
      <ProgressBar value={total ? answered / total : 0} height={5} />
      <span className="zk-caption text-muted">
        {answered} of {total} answered
      </span>
    </div>
  );
}
