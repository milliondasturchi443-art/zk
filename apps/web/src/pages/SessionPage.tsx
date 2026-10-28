import { useEffect, useMemo, useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';

import { Button } from '../components/Button';
import {
  FeedbackPanel,
  OptionRow,
  Prompt,
  QuestionMeta,
  SessionProgress,
  Stimulus,
  type OptionState,
} from '../components/QuestionParts';
import { TextField } from '../components/TextField';
import { Icon } from '../components/icons';
import { ErrorState, LoadingState } from '../components/states';
import {
  fetchBookmarks,
  fetchSession,
  finishSession,
  queryKeys,
  submitSessionAnswer,
  toggleBookmark,
} from '../lib/api';
import { describeError } from '../lib/errors';
import { cn } from '../lib/cn';
import type { AnswerResponse, SessionQuestionDto } from '@zk/shared';

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function optionStateFor(
  question: SessionQuestionDto,
  optionId: string,
  selectedId: string | null,
): OptionState {
  if (!question.answered) return selectedId === optionId ? 'selected' : 'idle';
  const chosen =
    question.response && 'option_id' in question.response ? question.response.option_id : null;
  const correct = question.correct_answer?.option_id ?? null;
  if (question.is_correct) return chosen === optionId ? 'correct' : 'idle';
  if (chosen === optionId) return 'wrong';
  if (correct === optionId) return 'revealed';
  return 'idle';
}

export function SessionPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [numericValue, setNumericValue] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const finishingRef = useRef(false);

  const sessionQuery = useQuery({
    queryKey: queryKeys.session(sessionId),
    queryFn: () => fetchSession(sessionId),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const bookmarksQuery = useQuery({
    queryKey: queryKeys.bookmarks,
    queryFn: fetchBookmarks,
  });

  const bookmarkedIds = useMemo(() => {
    const set = new Set<string>();
    for (const item of bookmarksQuery.data ?? []) set.add(item.question.id);
    return set;
  }, [bookmarksQuery.data]);

  const session = sessionQuery.data;

  // Session finished elsewhere (timer, or another device) — move to results.
  useEffect(() => {
    if (session && session.status === 'completed') {
      navigate(`/result/${session.id}`, { replace: true });
    }
  }, [session, navigate]);

  const question = session?.questions[index];
  const questionId = question?.id ?? null;
  const openedAtRef = useRef(Date.now());

  // Restore field state from the authoritative payload whenever the visible
  // question changes. Server answers stay authoritative after each submit.
  useEffect(() => {
    const current = session?.questions[index];
    openedAtRef.current = Date.now();
    setSubmitError(null);
    if (!current) {
      setSelectedId(null);
      setNumericValue('');
      return;
    }
    setSelectedId(
      current.response && 'option_id' in current.response ? current.response.option_id : null,
    );
    setNumericValue(
      current.response && 'value' in current.response ? String(current.response.value) : '',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, questionId]);

  const spentMs = () => Math.min(60 * 60 * 1000, Math.max(0, Date.now() - openedAtRef.current));

  const submitMutation = useMutation({
    mutationFn: (args: { sqId: string; response: AnswerResponse; spentMs: number }) =>
      submitSessionAnswer(args.sqId, args.response, args.spentMs),
    onSuccess: () => {
      setSubmitError(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.session(sessionId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.progress });
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.sessions, 'in-progress'] });
    },
    onError: (error) => {
      const described = describeError(error);
      setSubmitError(described.message);
      if (described.code === 'session_time_expired' || described.code === 'session_not_open') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.session(sessionId) });
      }
    },
  });

  const finishMutation = useMutation({
    mutationFn: () => finishSession(sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.session(sessionId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      void queryClient.invalidateQueries({ queryKey: queryKeys.progress });
      navigate(`/result/${sessionId}`, { replace: true });
    },
    onError: (error) => {
      finishingRef.current = false;
      setSubmitError(describeError(error).message);
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: (args: { questionId: string; on: boolean }) =>
      toggleBookmark(args.questionId, args.on),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks }),
  });

  // Countdown for timed sessions.
  const deadlineMs = useMemo(() => {
    if (!session?.time_limit_seconds || !session.started_at) return null;
    return new Date(session.started_at).getTime() + session.time_limit_seconds * 1000;
  }, [session?.time_limit_seconds, session?.started_at]);

  useEffect(() => {
    if (deadlineMs === null || session?.status !== 'in_progress') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadlineMs, session?.status]);

  const remainingSeconds =
    deadlineMs === null ? null : Math.max(0, Math.ceil((deadlineMs - now) / 1000));

  useEffect(() => {
    if (
      deadlineMs !== null &&
      now >= deadlineMs &&
      !finishingRef.current &&
      session?.status === 'in_progress'
    ) {
      finishingRef.current = true;
      finishMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineMs, now, session?.status]);

  const onFinish = () => {
    if (finishMutation.isPending || finishingRef.current) return;
    finishingRef.current = true;
    finishMutation.mutate();
  };

  const onPickOption = (optionId: string) => {
    if (!question || question.answered || submitMutation.isPending) return;
    setSelectedId(optionId);
    submitMutation.mutate({
      sqId: question.id,
      response: { option_id: optionId },
      spentMs: spentMs(),
    });
  };

  const onSubmitNumeric = () => {
    if (!question || question.answered || !numericValue.trim()) return;
    submitMutation.mutate({
      sqId: question.id,
      response: { value: numericValue.trim() },
      spentMs: spentMs(),
    });
  };

  if (sessionQuery.isLoading) return <LoadingState label="Loading session…" />;
  if (sessionQuery.isError) {
    return (
      <div className="flex flex-col justify-center gap-4 p-5">
        <ErrorState error={sessionQuery.error} onRetry={() => sessionQuery.refetch()} />
        <Button label="Back" variant="secondary" onPress={() => navigate(-1)} />
      </div>
    );
  }
  if (!session || !question) return null;

  const revealed = session.feedback_mode === 'immediate';
  const answeredCount = session.answered_count;
  const isLast = index >= session.questions.length - 1;
  const bookmarked = bookmarkedIds.has(question.question_id);
  const correctLabel = (() => {
    if (!question.correct_answer) return null;
    if (question.correct_answer.option_id) {
      const match = question.options.find((o) => o.id === question.correct_answer?.option_id);
      return match ? `${match.label}. ${match.text}` : null;
    }
    return String(question.correct_answer.value);
  })();

  return (
    <div
      className="flex h-[100dvh] flex-col bg-canvas"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          data-testid="session-close"
          aria-label="Close session"
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center text-ink"
        >
          <Icon name="close" size={22} />
        </button>
        <span className="zk-subtitle text-ink">
          Question {index + 1} of {session.questions.length}
        </span>
        <div className="flex min-w-16 justify-end">
          {remainingSeconds !== null ? (
            <span
              aria-label={`${remainingSeconds} seconds remaining`}
              className={cn(
                'flex items-center gap-1 rounded-full border px-2.5 py-0.5',
                remainingSeconds < 60
                  ? 'border-danger bg-danger-surface'
                  : 'border-line bg-surface',
              )}
            >
              <Icon
                name="time-outline"
                size={14}
                className={remainingSeconds < 60 ? 'text-danger' : 'text-ink'}
              />
              <span
                className={cn(
                  'zk-caption font-bold',
                  remainingSeconds < 60 ? 'text-danger' : 'text-ink',
                )}
              >
                {formatClock(remainingSeconds)}
              </span>
            </span>
          ) : null}
        </div>
      </header>

      <div className="px-5 pb-3">
        <SessionProgress answered={answeredCount} total={session.question_count} />
      </div>

      <div className="no-scrollbar overflow-x-auto border-b border-line pb-3">
        <div className="flex gap-2 px-5">
          {session.questions.map((item, position) => (
            <button
              key={item.id}
              type="button"
              data-testid={`jump-${position + 1}`}
              aria-label={`Go to question ${position + 1}${
                item.answered ? ', answered' : ', not answered'
              }`}
              aria-current={position === index ? 'true' : undefined}
              onClick={() => setIndex(position)}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                position === index
                  ? 'border-primary bg-primary'
                  : item.answered
                    ? 'border-line bg-surface'
                    : 'border-line bg-raised',
              )}
            >
              <span
                className={cn(
                  'zk-caption',
                  position === index ? 'font-bold text-on-primary' : 'text-muted',
                )}
              >
                {position + 1}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto p-5 pb-8">
        <QuestionMeta
          directions={question.directions}
          topic={question.topic}
          difficulty={question.difficulty}
          subtopic={question.subtopic}
        />
        <Stimulus text={question.stimulus} />
        <Prompt text={question.prompt} />

        <div className="mb-3 flex justify-end">
          <button
            type="button"
            data-testid="bookmark-toggle"
            aria-pressed={bookmarked}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this question'}
            disabled={bookmarkMutation.isPending}
            onClick={() =>
              bookmarkMutation.mutate({ questionId: question.question_id, on: !bookmarked })
            }
            className="zk-pressable flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5"
          >
            <Icon
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={16}
              className="text-ink"
              fill={bookmarked ? 'currentColor' : 'none'}
            />
            <span className="zk-caption text-ink">{bookmarked ? 'Saved' : 'Save'}</span>
          </button>
        </div>

        {question.kind === 'mcq' ? (
          <div data-testid="options">
            {question.options.map((option) => (
              <OptionRow
                key={option.id}
                option={option}
                state={optionStateFor(question, option.id, selectedId)}
                disabled={question.answered || submitMutation.isPending}
                onPress={() => onPickOption(option.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3" data-testid="numeric-input">
            <TextField
              label="Your answer"
              value={numericValue}
              onChangeText={setNumericValue}
              editable={!question.answered}
              inputMode="decimal"
              placeholder="e.g. 12 or 3/4"
              testID="numeric-answer"
              onSubmitEditing={onSubmitNumeric}
            />
            {!question.answered ? (
              <Button
                label="Submit answer"
                onPress={onSubmitNumeric}
                loading={submitMutation.isPending}
                disabled={!numericValue.trim()}
                testID="submit-numeric"
              />
            ) : null}
            <p className="zk-caption text-faint">
              Accepts decimals or simple fractions, for example 0.5 or 3/4.
            </p>
          </div>
        )}

        {submitError ? (
          <p className="zk-small mt-2 text-center text-danger" role="alert">
            {submitError}
          </p>
        ) : null}

        <FeedbackPanel
          answered={question.answered}
          revealed={revealed && question.is_correct !== null}
          isCorrect={question.is_correct}
          correctAnswerLabel={revealed ? correctLabel : null}
          explanation={revealed ? question.explanation : null}
        />

        <div className="h-6" />
      </div>

      <footer
        className="border-t border-line bg-canvas px-5 pt-3"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
      >
        <div className="mx-auto flex w-full max-w-[720px] gap-3">
          <Button
            label="Previous"
            variant="secondary"
            onPress={() => setIndex((value) => Math.max(0, value - 1))}
            disabled={index === 0}
            className="flex-1"
            testID="prev-question"
          />
          {isLast ? (
            <Button
              label={
                answeredCount < session.question_count
                  ? `Finish (${session.question_count - answeredCount} unanswered)`
                  : 'Finish'
              }
              onPress={onFinish}
              loading={finishMutation.isPending}
              className="flex-1"
              testID="finish-session"
            />
          ) : (
            <Button
              label="Next"
              onPress={() =>
                setIndex((value) => Math.min(session.questions.length - 1, value + 1))
              }
              className="flex-1"
              testID="next-question"
            />
          )}
        </div>
      </footer>
    </div>
  );
}
