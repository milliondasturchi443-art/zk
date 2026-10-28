import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';

import { Button } from '../components/Button';
import { MathText } from '../components/MathText';
import { Screen } from '../components/Screen';
import { Badge, Card } from '../components/primitives';
import { ErrorState, LoadingState } from '../components/states';
import { Icon } from '../components/icons';
import {
  fetchLesson,
  fetchLessonQuestionCount,
  fetchLessonState,
  queryKeys,
  setLessonProgress,
  startSession,
} from '../lib/api';
import { describeError } from '../lib/errors';
import { cn } from '../lib/cn';
import type { LessonBlock } from '@zk/shared';

function Block({ block }: { block: LessonBlock }) {
  switch (block.type) {
    case 'heading':
      return <h2 className="zk-title mt-3 text-ink">{block.text}</h2>;
    case 'paragraph':
      return <MathText text={block.text} className="zk-body block text-ink" fontSize={15} />;
    case 'list':
      return (
        <ul className="flex flex-col gap-2">
          {block.items.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="zk-body leading-[22px] text-ink">•</span>
              <MathText text={item} className="zk-body min-w-0 flex-1 text-ink" fontSize={15} />
            </li>
          ))}
        </ul>
      );
    case 'code':
      return (
        <div className="rounded-[10px] border border-line bg-surface p-3">
          <code className="font-mono text-sm text-ink">{block.text}</code>
        </div>
      );
    case 'quote':
      return (
        <div className="border-l-[3px] border-line-strong py-1 pl-3">
          <MathText text={block.text} className="zk-body italic text-muted" fontSize={15} />
        </div>
      );
    default:
      return null;
  }
}

export function LessonPage() {
  const navigate = useNavigate();
  const { lessonId = '' } = useParams<{ lessonId: string }>();
  const queryClient = useQueryClient();

  const lessonQuery = useQuery({
    queryKey: queryKeys.lesson(lessonId),
    queryFn: () => fetchLesson(lessonId),
  });

  const countQuery = useQuery({
    queryKey: [...queryKeys.lesson(lessonId), 'count'],
    queryFn: () => fetchLessonQuestionCount(lessonId),
  });

  const stateQuery = useQuery({
    queryKey: [...queryKeys.lesson(lessonId), 'state'],
    queryFn: () => fetchLessonState(lessonId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.lesson(lessonId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.course('english') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.course('math') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.progress });
  };

  const stateMutation = useMutation({
    mutationFn: (state: 'in_progress' | 'completed') => setLessonProgress(lessonId, state),
    onSuccess: invalidate,
  });

  const quizMutation = useMutation({
    mutationFn: () => {
      const lesson = lessonQuery.data;
      if (!lesson?.subject) throw new Error('course_not_available');
      return startSession({
        subject: lesson.subject,
        kind: 'lesson_quiz',
        courseId: lesson.course_id,
        lessonId: lesson.id,
        questionCount: 20,
        feedbackMode: 'immediate',
        includeAttempted: true,
      });
    },
    onSuccess: (session) => {
      invalidate();
      navigate(`/session/${session.id}`);
    },
  });

  if (lessonQuery.isLoading) return <LoadingState label="Loading lesson…" />;
  if (lessonQuery.isError) {
    return (
      <Screen testID="lesson-error">
        <ErrorState error={lessonQuery.error} onRetry={() => lessonQuery.refetch()} />
        <Button label="Back" variant="secondary" onPress={() => navigate(-1)} />
      </Screen>
    );
  }

  const lesson = lessonQuery.data;
  if (!lesson) return null;

  const questionCount = countQuery.data ?? 0;
  const state = stateQuery.data?.state ?? null;
  const error = stateMutation.error ?? quizMutation.error;

  return (
    <Screen
      testID="lesson-screen"
      footer={
        <div className="flex flex-col gap-3">
          <Button
            testID="start-lesson-quiz"
            label={
              questionCount > 0
                ? `Start lesson quiz (${questionCount})`
                : 'Quiz not available yet'
            }
            onPress={() => quizMutation.mutate()}
            loading={quizMutation.isPending}
            disabled={questionCount === 0}
          />
          <div className="flex gap-3">
            <Button
              testID="mark-in-progress"
              label={state === 'in_progress' ? 'Marked as in progress' : 'Mark as started'}
              variant="secondary"
              onPress={() => stateMutation.mutate('in_progress')}
              loading={stateMutation.isPending && stateMutation.variables === 'in_progress'}
              disabled={state === 'in_progress'}
              className="flex-1"
            />
            <Button
              testID="mark-complete"
              label={state === 'completed' ? 'Completed' : 'Mark complete'}
              variant={state === 'completed' ? 'secondary' : 'primary'}
              onPress={() => stateMutation.mutate('completed')}
              loading={stateMutation.isPending && stateMutation.variables === 'completed'}
              disabled={state === 'completed'}
              className="flex-1"
            />
          </div>
          {error ? (
            <p className="zk-small text-center text-danger">{describeError(error).message}</p>
          ) : null}
        </div>
      }
    >
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate(-1)}
          className="zk-pressable text-ink"
        >
          <Icon name="chevron-back" size={22} />
        </button>
        <span className="zk-caption uppercase text-faint">Lesson</span>
        <span className="w-[22px]" />
      </div>

      <h1 className="zk-display text-ink">{lesson.title}</h1>
      <p className="zk-body mt-2 text-muted">{lesson.summary}</p>

      <div className="my-4 flex flex-wrap gap-2">
        <Badge label={`${lesson.estimated_minutes} min`} />
        <Badge label={questionCount > 0 ? `${questionCount} quiz questions` : 'No quiz yet'} />
        {state ? (
          <Badge
            label={state === 'completed' ? 'Completed' : 'In progress'}
            tone={state === 'completed' ? 'success' : 'warning'}
          />
        ) : null}
      </div>

      {stateQuery.data ? (
        <Card className="mb-5 flex justify-around">
          <div className="flex flex-col items-center gap-0.5">
            <span className="zk-title text-ink">{stateQuery.data.attempt_count}</span>
            <span className="zk-caption text-muted">quiz answers</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="zk-title text-ink">{stateQuery.data.correct_count}</span>
            <span className="zk-caption text-muted">correct</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="zk-title text-ink">
              {stateQuery.data.attempt_count > 0
                ? `${Math.round(
                    (stateQuery.data.correct_count / stateQuery.data.attempt_count) * 100,
                  )}%`
                : '—'}
            </span>
            <span className="zk-caption text-muted">accuracy</span>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3">
        {lesson.content.length === 0 ? (
          <p className={cn('zk-small italic text-muted')}>
            This lesson has no written content yet. Start the quiz below to practise the topic.
          </p>
        ) : (
          lesson.content.map((block, index) => <Block key={index} block={block} />)
        )}
      </div>
    </Screen>
  );
}
