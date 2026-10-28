import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { Button } from '../components/Button';
import { MathText } from '../components/MathText';
import { Screen } from '../components/Screen';
import { Badge, Card } from '../components/primitives';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { Icon } from '../components/icons';
import { fetchMistakes, queryKeys } from '../lib/api';
import type { MistakeReviewItem } from '@zk/shared';

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function responseLabel(item: MistakeReviewItem): string {
  const response = item.response;
  if ('option_id' in response) {
    const match = item.options.find((option) => option.id === response.option_id);
    return match ? `${match.label}. ${match.text}` : 'Unknown choice';
  }
  return String(response.value);
}

function correctLabel(item: MistakeReviewItem): string {
  const correct = item.correct_answer;
  if (correct?.option_id) {
    const match = item.options.find((option) => option.id === correct.option_id);
    return match ? `${match.label}. ${match.text}` : 'Unknown choice';
  }
  return correct ? String(correct.value) : 'Not available';
}

function MistakeCard({ item }: { item: MistakeReviewItem }) {
  return (
    <Card className="flex flex-col gap-3" testID={`mistake-${item.question_id}`}>
      <div className="flex flex-col gap-2">
        <span className="zk-caption text-faint">{formatDate(item.created_at)}</span>
        <div className="flex flex-wrap gap-2">
          <Badge label={item.topic} />
          <Badge label={item.subject === 'english' ? 'English' : 'Math'} />
          <Badge label={item.difficulty} />
        </div>
      </div>

      {item.stimulus ? (
        <MathText text={item.stimulus} className="zk-small text-muted" fontSize={14} />
      ) : null}
      <MathText text={item.prompt} className="text-ink" fontSize={15} />

      <div className="flex flex-col gap-2 rounded-[10px] bg-surface p-3">
        <div className="flex flex-col gap-0.5">
          <span className="zk-caption uppercase text-faint">Your answer</span>
          <MathText text={responseLabel(item)} className="text-danger" fontSize={14} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="zk-caption uppercase text-faint">Correct answer</span>
          <MathText text={correctLabel(item)} className="font-semibold text-success" fontSize={14} />
        </div>
      </div>

      {item.explanation ? (
        <div className="flex items-start gap-2 rounded-[10px] border border-line bg-raised p-3">
          <Icon name="bulb-outline" size={15} className="mt-0.5 shrink-0 text-muted" />
          <MathText text={item.explanation} className="zk-small leading-5 text-ink" fontSize={14} />
        </div>
      ) : null}
    </Card>
  );
}

export function MistakesPage() {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: queryKeys.mistakes,
    queryFn: () => fetchMistakes(50),
  });

  if (query.isLoading) return <LoadingState label="Loading mistakes…" />;

  if (query.isError) {
    return (
      <Screen testID="mistakes-error">
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
        <Button label="Back" variant="secondary" onPress={() => navigate(-1)} />
      </Screen>
    );
  }

  const items = query.data ?? [];

  return (
    <Screen testID="mistakes-screen">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate(-1)}
          className="zk-pressable text-ink"
        >
          <Icon name="chevron-back" size={22} />
        </button>
        <span className="zk-caption uppercase text-faint">Review</span>
        <span className="w-[22px]" />
      </div>

      <h1 className="zk-display text-ink">Mistake review</h1>
      <p className="zk-body mb-5 text-muted">
        Every question you answered incorrectly, newest first. Explanations come from the answer
        key.
      </p>

      {items.length === 0 ? (
        <EmptyState
          title="No mistakes logged"
          message="When you answer a question incorrectly it appears here with the correct answer and an explanation."
          icon="checkmark-done-outline"
          actionLabel="Start practice"
          onAction={() => navigate('/practice')}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <MistakeCard key={item.attempt_id} item={item} />
          ))}
        </div>
      )}
    </Screen>
  );
}
