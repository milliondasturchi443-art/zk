import type { DailyProgress, ProgressDto, TopicProgress } from './types';

/** Honest empty state: no invented percentages, no fake history. */
export function emptyProgress(): ProgressDto {
  return {
    totals: { attempted: 0, correct: 0, incorrect: 0, accuracy: null },
    subjects: [],
    topics: [],
    lessons: { completed: 0, in_progress: 0, published_total: 0 },
    recent_sessions: [],
    daily: [],
    bookmarks: 0,
    updated_at: new Date(0).toISOString(),
  };
}

export function hasAnyActivity(progress: ProgressDto): boolean {
  return progress.totals.attempted > 0;
}

/** Renders "82.5%" or an em dash when there is nothing to measure yet. */
export function formatAccuracy(accuracy: number | null | undefined): string {
  if (accuracy === null || accuracy === undefined) return '—';
  return `${accuracy}%`;
}

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  return String(value);
}

/** Topics that need work: attempted at least `minAttempts` times and below `threshold`. */
export function weakestTopics(
  topics: TopicProgress[],
  minAttempts = 3,
  threshold = 70,
): TopicProgress[] {
  return topics
    .filter((topic) => topic.attempted >= minAttempts && (topic.accuracy ?? 0) < threshold)
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0));
}

/** Strongest topics, used for the "best performing" section. */
export function strongestTopics(topics: TopicProgress[], minAttempts = 3): TopicProgress[] {
  return topics
    .filter((topic) => topic.attempted >= minAttempts)
    .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))
    .slice(0, 5);
}

export interface TrendPoint {
  day: string;
  accuracy: number | null;
  attempted: number;
}

/** Converts raw daily counters into accuracy points for a chart. */
export function toTrend(daily: DailyProgress[]): TrendPoint[] {
  return daily.map((point) => ({
    day: point.day,
    attempted: point.attempted,
    accuracy: point.attempted > 0 ? Math.round((1000 * point.correct) / point.attempted) / 10 : null,
  }));
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—';
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}
