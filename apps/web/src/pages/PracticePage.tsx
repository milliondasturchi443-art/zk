import { useMemo, useState, type ReactNode } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { Badge, Card, Chip, SectionTitle } from '../components/primitives';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import {
  fetchPublishedTopics,
  listSessions,
  queryKeys,
  startSession,
  type StartSessionArgs,
} from '../lib/api';
import { describeError } from '../lib/errors';
import { cn } from '../lib/cn';
import type { Difficulty, SessionSummary, Subject } from '@zk/shared';

const SUBJECTS: { value: Subject; label: string }[] = [
  { value: 'english', label: 'English' },
  { value: 'math', label: 'Math' },
];
const COUNTS = [5, 10, 20];
const DIFFICULTIES: { value: Difficulty | null; label: string }[] = [
  { value: null, label: 'Any' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];
const MINUTES = [5, 10, 15];
const FEEDBACK: { value: 'immediate' | 'on_finish'; label: string }[] = [
  { value: 'immediate', label: 'After each answer' },
  { value: 'on_finish', label: 'At the end' },
];

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SessionRow({ session }: { session: SessionSummary }) {
  const navigate = useNavigate();
  const done = session.status === 'completed';
  return (
    <Card
      testID={`session-${session.id}`}
      className="gap-2 py-4"
      onPress={() => navigate(done ? `/result/${session.id}` : `/session/${session.id}`)}
      accessibilityLabel={`${session.subject} session, ${session.correct_count} of ${session.question_count} correct`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="zk-subtitle min-w-0 flex-1 text-ink">
          {session.kind === 'lesson_quiz'
            ? 'Lesson quiz'
            : session.kind === 'timed_practice'
              ? 'Timed practice'
              : 'Practice'}{' '}
          · {session.subject === 'english' ? 'English' : 'Math'}
        </span>
        <Badge label={done ? 'Completed' : 'In progress'} tone={done ? 'success' : 'warning'} />
      </div>
      <p className="zk-caption text-muted">
        {formatDate(session.started_at)} · {session.answered_count}/{session.question_count}{' '}
        answered
        {done ? ` · ${session.correct_count} correct` : ''}
        {session.duration_seconds ? ` · ${Math.round(session.duration_seconds / 60)} min` : ''}
      </p>
    </Card>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="zk-subtitle text-ink">{children}</p>;
}

export function PracticePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [subject, setSubject] = useState<Subject>('english');
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [timed, setTimed] = useState(false);
  const [minutes, setMinutes] = useState(10);
  const [feedbackMode, setFeedbackMode] = useState<'immediate' | 'on_finish'>('immediate');

  const topicsQuery = useQuery({
    queryKey: [...queryKeys.course(subject), 'topics'],
    queryFn: () => fetchPublishedTopics(subject),
  });

  const sessionsQuery = useQuery({
    queryKey: queryKeys.sessions,
    queryFn: () => listSessions(10, 0),
  });

  const startMutation = useMutation({
    mutationFn: (args: StartSessionArgs) => startSession(args),
    onSuccess: (session) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      navigate(`/session/${session.id}`);
    },
  });

  const topics = useMemo(() => topicsQuery.data ?? [], [topicsQuery.data]);
  const startError = startMutation.error ? describeError(startMutation.error) : null;

  const onStart = () => {
    if (startMutation.isPending) return;
    startMutation.mutate({
      subject,
      kind: timed ? 'timed_practice' : 'practice',
      questionCount,
      difficulty,
      topic,
      timeLimitSeconds: timed ? minutes * 60 : null,
      feedbackMode,
      includeAttempted: true,
    });
  };

  return (
    <Screen tabBar testID="practice-screen">
      <h1 className="zk-display text-ink">Practice</h1>
      <p className="zk-body mb-5 text-muted">
        Build a set from published questions, or retake missed ones.
      </p>

      <Card className="mb-6 flex flex-col gap-3">
        <Label>Subject</Label>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={subject === item.value}
              onPress={() => {
                setSubject(item.value);
                setTopic(null);
              }}
            />
          ))}
        </div>

        <Label>Questions</Label>
        <div className="flex flex-wrap gap-2">
          {COUNTS.map((count) => (
            <Chip
              key={count}
              label={String(count)}
              selected={questionCount === count}
              onPress={() => setQuestionCount(count)}
            />
          ))}
        </div>

        <Label>Difficulty</Label>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTIES.map((item) => (
            <Chip
              key={item.label}
              label={item.label}
              selected={difficulty === item.value}
              onPress={() => setDifficulty(item.value)}
            />
          ))}
        </div>

        <Label>Topic (optional)</Label>
        {topicsQuery.isLoading ? (
          <LoadingState label="Loading topics…" />
        ) : topics.length === 0 ? (
          <p className="zk-small text-muted">No topics published for this subject yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Chip label="All" selected={topic === null} onPress={() => setTopic(null)} />
            {topics.map((item) => (
              <Chip
                key={item}
                label={item}
                selected={topic === item}
                onPress={() => setTopic(topic === item ? null : item)}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 py-1">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Label>Timed</Label>
            <p className="zk-small text-muted">Auto-submits when the timer runs out.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={timed}
            aria-label="Timed"
            data-testid="timed-switch"
            onClick={() => setTimed((value) => !value)}
            className={cn(
              'relative h-7 w-12 shrink-0 rounded-full border transition-colors',
              timed ? 'border-primary bg-primary' : 'border-line bg-line',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-canvas shadow transition-all',
                timed ? 'left-6' : 'left-0.5',
              )}
            />
          </button>
        </div>

        {timed ? (
          <div className="flex flex-wrap gap-2">
            {MINUTES.map((value) => (
              <Chip
                key={value}
                label={`${value} min`}
                selected={minutes === value}
                onPress={() => setMinutes(value)}
              />
            ))}
          </div>
        ) : null}

        <Label>Feedback</Label>
        <div className="flex flex-wrap gap-2">
          {FEEDBACK.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={feedbackMode === item.value}
              onPress={() => setFeedbackMode(item.value)}
            />
          ))}
        </div>

        {startError ? <p className="zk-small text-center text-danger">{startError.message}</p> : null}

        <Button
          testID="start-practice"
          label="Start practice"
          onPress={onStart}
          loading={startMutation.isPending}
        />
      </Card>

      <SectionTitle title="Recent sessions" />
      {sessionsQuery.isLoading ? (
        <LoadingState label="Loading sessions…" />
      ) : sessionsQuery.isError ? (
        <ErrorState error={sessionsQuery.error} onRetry={() => sessionsQuery.refetch()} />
      ) : (sessionsQuery.data ?? []).length === 0 ? (
        <EmptyState
          title="No sessions yet"
          message="Start a practice set above and your sessions will be listed here."
          icon="timer-outline"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {(sessionsQuery.data ?? []).map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </div>
      )}
    </Screen>
  );
}
