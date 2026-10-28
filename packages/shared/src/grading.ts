import type { AnswerResponse } from './types';

/**
 * Answer evaluation.
 *
 * This module is a faithful TypeScript mirror of the server-side implementation
 * in `supabase/migrations/20261025000005_session_api.sql`
 * (`fn_normalize_numeric` / `fn_evaluate_response`).
 *
 * The database remains authoritative: grading always happens inside the
 * `submit_answer` RPC. The mirror exists so the contract can be unit tested and
 * so the admin console can preview correctness while editing a question.
 */

export type AnswerRef =
  | { type: 'mcq'; option_id: string | null }
  | { type: 'numeric'; value: string | number | null; tolerance?: string | number | null };


const FRACTION_RE = /^-?\d+(?:\.\d+)?\/-?\d+(?:\.\d+)?$/;
const DECIMAL_RE = /^[+-]?(\d+(?:\.\d+)?|\.\d+)$/;

/** Mirrors `fn_normalize_numeric(text)`; returns null when not parseable. */
export function normalizeNumeric(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  let value = typeof raw === 'number' ? String(raw) : raw;
  value = value.trim();
  value = value.replace(/,/g, '');
  value = value.replace(/ /g, '');
  value = value.replace(/ /g, '');
  value = value.replace(/−/g, '-');
  if (value === '') return null;

  if (FRACTION_RE.test(value)) {
    const slash = value.indexOf('/');
    const numerator = Number(value.slice(0, slash));
    const denominator = Number(value.slice(slash + 1));
    if (denominator === 0) return null;
    return numerator / denominator;
  }

  if (DECIMAL_RE.test(value)) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

/** Returns true when a numeric response is well formed. */
export function isValidNumericResponse(raw: string | number | null | undefined): boolean {
  return normalizeNumeric(raw) !== null;
}

/** Mirrors `fn_evaluate_response(jsonb, jsonb)`. */
export function evaluateResponse(ref: AnswerRef | null, response: AnswerResponse | null): boolean {
  if (!ref || !response) return false;

  if (ref.type === 'mcq') {
    const chosen = 'option_id' in response ? response.option_id : undefined;
    if (!ref.option_id || !chosen) return false;
    return ref.option_id === chosen;
  }

  if (ref.type === 'numeric') {
    if (ref.value === null || ref.value === undefined) return false;
    const target = typeof ref.value === 'number' ? ref.value : Number(ref.value);
    if (!Number.isFinite(target)) return false;
    const tolerance = Number(ref.tolerance ?? 0);
    const value = normalizeNumeric('value' in response ? response.value : null);
    if (value === null) return false;
    return Math.abs(value - target) <= tolerance;
  }

  return false;
}

export function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Percentage (0-100) rounded to one decimal, or null when nothing was answered. */
export function accuracyPercent(correct: number, total: number): number | null {
  if (!total || total <= 0) return null;
  return round((100 * correct) / total, 1);
}

/** Fraction (0-1) rounded to four decimals, or null when nothing was answered. */
export function accuracyRatio(correct: number, total: number): number | null {
  if (!total || total <= 0) return null;
  return round(correct / total, 4);
}

export interface ScoreSummary {
  questionCount: number;
  answered: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  accuracy: number | null;
}

export function summarizeSession(input: {
  question_count: number;
  answered_count: number;
  correct_count: number;
}): ScoreSummary {
  const questionCount = Math.max(0, input.question_count);
  const answered = Math.min(questionCount, Math.max(0, input.answered_count));
  const correct = Math.min(answered, Math.max(0, input.correct_count));
  return {
    questionCount,
    answered,
    correct,
    incorrect: answered - correct,
    unanswered: questionCount - answered,
    accuracy: accuracyPercent(correct, answered),
  };
}

/** Mirrors the expiry rule enforced by `submit_answer` / `get_test_session`. */
export function isSessionExpired(
  startedAt: string | Date,
  timeLimitSeconds: number | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!timeLimitSeconds || timeLimitSeconds <= 0) return false;
  const start = typeof startedAt === 'string' ? new Date(startedAt) : startedAt;
  if (Number.isNaN(start.getTime())) return false;
  return now.getTime() - start.getTime() > timeLimitSeconds * 1000;
}

export function secondsRemaining(
  startedAt: string | Date,
  timeLimitSeconds: number | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!timeLimitSeconds || timeLimitSeconds <= 0) return null;
  const start = typeof startedAt === 'string' ? new Date(startedAt) : startedAt;
  if (Number.isNaN(start.getTime())) return null;
  return Math.max(0, timeLimitSeconds - Math.floor((now.getTime() - start.getTime()) / 1000));
}

export const SESSION_TRANSITIONS: Record<string, string[]> = {
  in_progress: ['completed', 'abandoned'],
  completed: [],
  abandoned: [],
};

/** Session state machine check used by the client and by the tests. */
export function canTransition(from: string, to: string): boolean {
  return (SESSION_TRANSITIONS[from] ?? []).includes(to);
}

export function canSubmitAnswer(state: {
  status: string;
  answered: boolean;
  expired: boolean;
}): { ok: boolean; reason?: 'session_completed' | 'already_answered' | 'time_expired' } {
  if (state.status !== 'in_progress') return { ok: false, reason: 'session_completed' };
  if (state.expired) return { ok: false, reason: 'time_expired' };
  if (state.answered) return { ok: false, reason: 'already_answered' };
  return { ok: true };
}
