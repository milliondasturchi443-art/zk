import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { Button } from '../components/Button';
import { MathText } from '../components/MathText';
import { Screen } from '../components/Screen';
import { Badge, Card } from '../components/primitives';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { Icon } from '../components/icons';
import { fetchBookmarks, queryKeys, toggleBookmark } from '../lib/api';

export function BookmarksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.bookmarks,
    queryFn: fetchBookmarks,
  });

  const removeMutation = useMutation({
    mutationFn: (questionId: string) => toggleBookmark(questionId, false),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks });
      void queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    },
  });

  if (query.isLoading) return <LoadingState label="Loading bookmarks…" />;

  if (query.isError) {
    return (
      <Screen testID="bookmarks-error">
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
        <Button label="Back" variant="secondary" onPress={() => navigate(-1)} />
      </Screen>
    );
  }

  const items = query.data ?? [];

  return (
    <Screen testID="bookmarks-screen">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate(-1)}
          className="zk-pressable text-ink"
        >
          <Icon name="chevron-back" size={22} />
        </button>
        <span className="zk-caption uppercase text-faint">Saved</span>
        <span className="w-[22px]" />
      </div>

      <h1 className="zk-display text-ink">Bookmarks</h1>
      <p className="zk-body mb-5 text-muted">
        Questions you saved while practising. Answers are not stored here — this list keeps the
        prompt so you can revisit the idea.
      </p>

      {items.length === 0 ? (
        <EmptyState
          title="No bookmarks yet"
          message="Tap Save on any practice question and it will be collected here."
          icon="bookmark-outline"
          actionLabel="Start practice"
          onAction={() => navigate('/practice')}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <Card key={item.id} className="flex flex-col gap-3" testID={`bookmark-${item.question.id}`}>
              <div className="flex flex-wrap gap-2">
                <Badge label={item.question.subject === 'english' ? 'English' : 'Math'} />
                <Badge label={item.question.topic} />
                <Badge label={item.question.difficulty} />
              </div>
              <MathText text={item.question.prompt} className="text-ink" fontSize={15} />
              <div className="flex flex-col gap-1 rounded-[10px] bg-surface p-3">
                {item.question.question_options.map((option) => (
                  <span key={option.id} className="zk-small text-muted">
                    {option.label}. {option.text}
                  </span>
                ))}
              </div>
              <Button
                label={
                  removeMutation.isPending && removeMutation.variables === item.question.id
                    ? 'Removing…'
                    : 'Remove bookmark'
                }
                variant="secondary"
                onPress={() => removeMutation.mutate(item.question.id)}
                testID={`remove-${item.question.id}`}
              />
            </Card>
          ))}
        </div>
      )}
    </Screen>
  );
}
