import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  formatAccuracy,
  formatDuration,
  hasAnyActivity,
  strongestTopics,
  toTrend,
  weakestTopics,
  type SubjectProgress,
} from '@zk/shared';

import { Screen } from '../components/Screen';
import { Badge, Card, ProgressBar, SectionTitle, StatTile } from '../components/primitives';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { fetchProgress, queryKeys } from '../lib/api';

function SubjectRow({ row }: { row: SubjectProgress }) {
  const accuracy = row.accuracy;
  return (
    <Card className="mb-3 flex flex-col gap-2" testID={`subject-progress-${row.subject}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="zk-subtitle min-w-0 flex-1 text-ink">
          {row.subject === 'english' ? 'English' : 'Math'}
        </h3>
        <span className="zk-subtitle text-ink">{formatAccuracy(accuracy)}%</span>
      </div>
      <ProgressBar value={accuracy == null ? 0 : accuracy / 100} />
      <p className="zk-caption text-muted">
        {row.correct} correct of {row.attempted} attempted
      </p>
    </Card>
  );
}

function TopicRow({
  topic,
  subject,
  accuracy,
  attempted,
}: {
  topic: string;
  subject: string;
  accuracy: number;
  attempted: number;
}) {
  return (
    <div
      data-testid={`topic-${topic}`}
      className="flex items-center justify-between gap-3 py-1"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="zk-body truncate font-semibold text-ink">{topic}</span>
        <span className="zk-caption text-muted">
          {subject === 'english' ? 'English' : 'Math'} · {attempted} attempted
        </span>
      </div>
      <span className="zk-subtitle text-ink">{formatAccuracy(accuracy)}%</span>
    </div>
  );
}

function DailyBars({ days }: { days: { day: string; attempted: number }[] }) {
  const max = Math.max(1, ...days.map((entry) => entry.attempted));
  return (
    <Card className="mb-4" testID="daily-chart">
      <div className="flex items-end justify-between gap-1">
        {days.map((entry) => (
          <div key={entry.day} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-3 rounded"
              style={{
                height: Math.max(4, Math.round((entry.attempted / max) * 72)),
                backgroundColor: entry.attempted > 0 ? 'var(--color-ink)' : 'var(--color-line)',
              }}
            />
            <span className="truncate text-[9px] font-medium text-faint">
              {entry.day.slice(8)}
            </span>
            <span className="text-[9px] font-medium text-muted">{entry.attempted}</span>
          </div>
        ))}
      </div>
      <p className="zk-caption mt-2 text-center text-faint">Questions attempted per day (UTC)</p>
    </Card>
  );
}

export function ProgressPage() {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: queryKeys.progress,
    queryFn: fetchProgress,
  });

  if (query.isLoading) return <LoadingState label="Loading progress…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const progress = query.data;
  if (!progress) return null;

  const active = hasAnyActivity(progress);
  const weak = weakestTopics(progress.topics);
  const strong = strongestTopics(progress.topics);
  const trend = toTrend(progress.daily).slice(-14);

  return (
    <Screen tabBar testID="progress-screen">
      <h1 className="zk-display text-ink">Progress</h1>
      <p className="zk-body mb-5 text-muted">
        Every number below comes from the questions you actually answered.
      </p>

      <div className="mb-6 flex gap-3">
        <StatTile label="Attempted" value={String(progress.totals.attempted)} />
        <StatTile label="Correct" value={String(progress.totals.correct)} />
        <StatTile label="Accuracy" value={formatAccuracy(progress.totals.accuracy)} />
      </div>

      {!active ? (
        <EmptyState
          title="No attempts yet"
          message="Answer a practice set or a lesson quiz and your progress will appear here."
          icon="stats-chart-outline"
          actionLabel="Start practice"
          onAction={() => navigate('/practice')}
        />
      ) : (
        <>
          <SectionTitle title="By subject" />
          {progress.subjects.length === 0 ? (
            <p className="zk-small mb-3 text-muted">No subject data yet.</p>
          ) : (
            progress.subjects.map((row) => <SubjectRow key={row.subject} row={row} />)
          )}

          <SectionTitle title="Needs practice" />
          {weak.length === 0 ? (
            <p className="zk-small mb-3 text-muted">
              Nothing to flag yet. Topics appear here after at least three attempts below 70%.
            </p>
          ) : (
            <Card className="mb-4 flex flex-col gap-3">
              {weak.slice(0, 5).map((row) => (
                <TopicRow
                  key={`${row.subject}-${row.topic}`}
                  topic={row.topic}
                  subject={row.subject}
                  accuracy={row.accuracy ?? 0}
                  attempted={row.attempted}
                />
              ))}
            </Card>
          )}

          <SectionTitle title="Strongest topics" />
          {strong.length === 0 ? (
            <p className="zk-small mb-3 text-muted">Play at least three questions in a topic to rank it.</p>
          ) : (
            <Card className="mb-4 flex flex-col gap-3">
              {strong.map((row) => (
                <TopicRow
                  key={`${row.subject}-${row.topic}`}
                  topic={row.topic}
                  subject={row.subject}
                  accuracy={row.accuracy ?? 0}
                  attempted={row.attempted}
                />
              ))}
            </Card>
          )}

          <SectionTitle title="Last 14 days" />
          {trend.length === 0 ? (
            <p className="zk-small mb-3 text-muted">No activity in the last two weeks.</p>
          ) : (
            <DailyBars days={trend} />
          )}
        </>
      )}

      <SectionTitle title="Lessons" />
      <Card className="mb-4 flex justify-around">
        <div className="flex flex-col items-center gap-0.5">
          <span className="zk-title text-ink">{progress.lessons.completed}</span>
          <span className="zk-caption text-muted">completed</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="zk-title text-ink">{progress.lessons.in_progress}</span>
          <span className="zk-caption text-muted">in progress</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="zk-title text-ink">{progress.lessons.published_total}</span>
          <span className="zk-caption text-muted">published</span>
        </div>
      </Card>

      <SectionTitle title="Review" />
      <Card
        className="mb-3 flex items-center justify-between gap-3 py-4"
        onPress={() => navigate('/mistakes')}
        testID="open-mistakes"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="zk-subtitle text-ink">Mistake review</span>
          <span className="zk-small text-muted">Re-read questions you answered incorrectly.</span>
        </div>
        <Badge label="Open" />
      </Card>
      <Card
        className="mb-3 flex items-center justify-between gap-3 py-4"
        onPress={() => navigate('/bookmarks')}
        testID="open-bookmarks"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="zk-subtitle text-ink">Bookmarks</span>
          <span className="zk-small text-muted">
            {progress.bookmarks} saved {progress.bookmarks === 1 ? 'question' : 'questions'}
          </span>
        </div>
        <Badge label="Open" />
      </Card>

      <SectionTitle
        title="Recent sessions"
        actionLabel="All sessions"
        onAction={() => navigate('/practice')}
      />
      {progress.recent_sessions.length === 0 ? (
        <p className="zk-small mb-3 text-muted">No sessions yet.</p>
      ) : (
        <div className="mb-4 flex flex-col gap-3">
          {progress.recent_sessions.slice(0, 3).map((session) => (
            <Card
              key={session.id}
              className="gap-2 py-4"
              onPress={() =>
                navigate(
                  session.status === 'completed'
                    ? `/result/${session.id}`
                    : `/session/${session.id}`,
                )
              }
            >
              <div className="flex items-center justify-between gap-3">
                <span className="zk-subtitle min-w-0 flex-1 text-ink">
                  {session.subject === 'english' ? 'English' : 'Math'} ·{' '}
                  {session.question_count} questions
                </span>
                <Badge
                  label={session.status === 'completed' ? 'Done' : 'In progress'}
                  tone={session.status === 'completed' ? 'success' : 'warning'}
                />
              </div>
              <p className="zk-caption text-muted">
                {session.status === 'completed'
                  ? `${session.correct_count} correct · ${formatAccuracy(session.accuracy)}%`
                  : `${session.answered_count} answered`}
                {' · '}
                {formatDuration(session.duration_seconds)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </Screen>
  );
}
