import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';

import { Button } from '../components/Button';
import { MathText } from '../components/MathText';
import { Screen } from '../components/Screen';
import { Badge, Card, ProgressBar, SectionTitle } from '../components/primitives';
import { ErrorState, LoadingState } from '../components/states';
import { Icon } from '../components/icons';
import { fetchSession, queryKeys } from '../lib/api';
import { cn } from '../lib/cn';
import type { SessionQuestionDto } from '@zk/shared';

function answerLabel(question: SessionQuestionDto): string | null {
  const response = question.response;
  if (!response) return null;
  if ('option_id' in response) {
    const match = question.options.find((o) => o.id === response.option_id);
    return match ? `${match.label}. ${match.text}` : null;
  }
  return String(response.value);
}

function correctLabel(question: SessionQuestionDto): string | null {
  if (!question.correct_answer) return null;
  if (question.correct_answer.option_id) {
    const match = question.options.find((o) => o.id === question.correct_answer?.option_id);
    return match ? `${match.label}. ${match.text}` : null;
  }
  return String(question.correct_answer.value);
}

function ReviewItem({ question, index }: { question: SessionQuestionDto; index: number }) {
  const answered = question.answered;
  const correct = question.is_correct === true;
  const tone = !answered ? 'neutral' : correct ? 'success' : 'error';

  return (
    <Card className="flex flex-col gap-3" testID={`review-${index + 1}`}>
      <div className="flex items-center justify-between">
        <span className="zk-subtitle text-ink">Question {index + 1}</span>
        <Badge label={!answered ? 'Unanswered' : correct ? 'Correct' : 'Incorrect'} tone={tone} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge label={question.topic} />
        <Badge label={question.difficulty} />
      </div>

      {question.stimulus ? (
        <MathText text={question.stimulus} className="zk-small text-muted" fontSize={14} />
      ) : null}
      <MathText text={question.prompt} className="text-ink" fontSize={15} />

      <div className="flex flex-col gap-1 rounded-[10px] bg-surface p-3">
        <span className="zk-caption uppercase text-faint">Your answer</span>
        <MathText
          text={answerLabel(question) ?? 'Not answered'}
          className={cn('mb-2 text-ink', !answered && 'italic text-faint')}
          fontSize={14}
        />
        <span className="zk-caption uppercase text-faint">Correct answer</span>
        <MathText
          text={correctLabel(question) ?? '—'}
          className="mb-2 font-semibold text-success"
          fontSize={14}
        />
      </div>

      {question.explanation ? (
        <div className="flex items-start gap-2 rounded-[10px] border border-line bg-raised p-3">
          <Icon name="bulb-outline" size={15} className="mt-0.5 shrink-0 text-muted" />
          <MathText text={question.explanation} className="zk-small text-ink" fontSize={14} />
        </div>
      ) : null}
    </Card>
  );
}

export function ResultPage() {
  const navigate = useNavigate();
  const { sessionId = '' } = useParams<{ sessionId: string }>();

  const query = useQuery({
    queryKey: queryKeys.session(sessionId),
    queryFn: () => fetchSession(sessionId),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const session = query.data;

  const summary = useMemo(() => {
    if (!session) return null;
    const answered = session.answered_count;
    const correct = session.correct_count;
    const accuracy = answered > 0 ? Math.round((1000 * correct) / answered) / 10 : null;
    return { answered, correct, accuracy };
  }, [session]);

  if (query.isLoading) return <LoadingState label="Loading results…" />;
  if (query.isError) {
    return (
      <Screen testID="result-error">
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
        <Button label="Back" variant="secondary" onPress={() => navigate(-1)} />
      </Screen>
    );
  }
  if (!session || !summary) return null;

  if (session.status === 'in_progress') {
    return (
      <Screen testID="result-pending">
        <Card className="mt-6 flex flex-col items-center gap-3">
          <Icon name="hourglass-outline" size={26} className="text-ink" />
          <span className="zk-title text-ink">Session still in progress</span>
          <span className="zk-body text-center text-muted">
            {session.answered_count} of {session.question_count} answered. Finish it to see the
            breakdown.
          </span>
          <Button
            label="Continue session"
            onPress={() => navigate(`/session/${session.id}`, { replace: true })}
            testID="continue-session"
          />
        </Card>
      </Screen>
    );
  }

  const passedAll = summary.answered === session.question_count;
  const minutes = Math.floor((session.duration_seconds ?? 0) / 60);
  const seconds = (session.duration_seconds ?? 0) % 60;

  return (
    <Screen testID="result-screen">
      <h1 className="zk-display text-ink">Results</h1>
      <p className="zk-body mb-5 text-muted">
        {session.kind === 'lesson_quiz'
          ? 'Lesson quiz'
          : session.kind === 'timed_practice'
            ? 'Timed practice'
            : 'Practice'}{' '}
        · {session.subject === 'english' ? 'English' : 'Math'}
      </p>

      <Card className="mb-5 flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="zk-display text-ink" data-testid="score-value">
              {summary.correct}/{session.question_count}
            </span>
            <span className="zk-caption text-muted">correct</span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="zk-title text-ink">
              {summary.accuracy === null ? '—' : `${summary.accuracy}%`}
            </span>
            <span className="zk-caption text-muted">accuracy</span>
          </div>
        </div>
        <ProgressBar
          value={session.question_count ? summary.correct / session.question_count : 0}
          height={8}
        />
        <div className="flex justify-between gap-3">
          <span className="zk-small text-muted">
            {summary.answered}/{session.question_count} answered
            {passedAll ? '' : ` · ${session.question_count - summary.answered} skipped`}
          </span>
          <span className="zk-small text-muted">
            {minutes}:{String(seconds).padStart(2, '0')} elapsed
          </span>
        </div>
      </Card>

      <div className="mb-6 flex flex-col gap-3">
        {session.lesson_id ? (
          <Button
            label="Back to lesson"
            variant="secondary"
            onPress={() => navigate(`/lesson/${session.lesson_id}`, { replace: true })}
            testID="back-to-lesson"
          />
        ) : (
          <Button
            label="New practice set"
            onPress={() => navigate('/practice', { replace: true })}
            testID="new-practice"
          />
        )}
        <Button label="Home" variant="ghost" onPress={() => navigate('/', { replace: true })} />
      </div>

      <SectionTitle title="Question review" />
      <p className="zk-small mb-4 text-muted">
        {session.feedback_mode === 'on_finish'
          ? 'Answers and explanations are revealed now that the session is finished.'
          : 'Your answers, the correct answers and the explanations are shown below.'}
      </p>

      <div className="flex flex-col gap-4">
        {session.questions.map((question, index) => (
          <ReviewItem key={question.id} question={question} index={index} />
        ))}
      </div>
    </Screen>
  );
}
