import type {
  CourseOverviewDto,
  Difficulty,
  LessonBlock,
  LessonState,
  MistakeReviewItem,
  ProgressDto,
  SessionSummary,
  Subject,
  SubmitAnswerResult,
  TestSessionDto,
} from '@zk/shared';

import { requireSupabase } from './supabase';

/** Central query keys so cache invalidation stays consistent. */
export const queryKeys = {
  profile: ['profile'] as const,
  progress: ['progress'] as const,
  course: (subject: Subject) => ['course', subject] as const,
  lesson: (lessonId: string) => ['lesson', lessonId] as const,
  session: (sessionId: string) => ['session', sessionId] as const,
  sessions: ['sessions'] as const,
  mistakes: ['mistakes'] as const,
  bookmarks: ['bookmarks'] as const,
};

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const client = requireSupabase();
  const { data, error } = await client.rpc(fn, args ?? {});
  if (error) throw error;
  return data as T;
}

export interface StartSessionArgs {
  subject: Subject;
  kind?: 'practice' | 'timed_practice' | 'lesson_quiz';
  courseId?: string;
  lessonId?: string;
  questionCount?: number;
  difficulty?: Difficulty | null;
  topic?: string | null;
  timeLimitSeconds?: number | null;
  feedbackMode?: 'immediate' | 'on_finish';
  includeAttempted?: boolean;
}

export function startSession(args: StartSessionArgs): Promise<TestSessionDto> {
  return rpc<TestSessionDto>('start_test_session', {
    p_subject: args.subject,
    p_kind: args.kind ?? 'practice',
    p_course_id: args.courseId ?? null,
    p_lesson_id: args.lessonId ?? null,
    p_question_count: args.questionCount ?? 10,
    p_difficulty: args.difficulty ?? null,
    p_topic: args.topic ?? null,
    p_time_limit_seconds: args.timeLimitSeconds ?? null,
    p_feedback_mode: args.feedbackMode ?? 'immediate',
    p_include_attempted: args.includeAttempted ?? true,
  });
}

export function fetchSession(sessionId: string): Promise<TestSessionDto> {
  return rpc<TestSessionDto>('get_test_session', { p_session_id: sessionId });
}

export function submitSessionAnswer(
  sessionQuestionId: string,
  response: { option_id?: string; value?: string | number },
  timeSpentMs: number,
): Promise<SubmitAnswerResult> {
  return rpc<SubmitAnswerResult>('submit_answer', {
    p_session_question_id: sessionQuestionId,
    p_response: response,
    p_time_spent_ms: timeSpentMs,
  });
}

export function finishSession(sessionId: string): Promise<TestSessionDto> {
  return rpc<TestSessionDto>('finish_test_session', { p_session_id: sessionId });
}

export function listSessions(limit = 20, offset = 0): Promise<SessionSummary[]> {
  return rpc<SessionSummary[]>('list_my_sessions', {
    p_limit: limit,
    p_offset: offset,
  });
}

export function fetchProgress(): Promise<ProgressDto> {
  return rpc<ProgressDto>('get_my_progress');
}

export function fetchCourseOverview(subject: Subject): Promise<CourseOverviewDto> {
  return rpc<CourseOverviewDto>('get_course_overview', { p_subject: subject });
}

export function fetchMistakes(limit = 50): Promise<MistakeReviewItem[]> {
  return rpc<MistakeReviewItem[]>('get_mistake_review', { p_limit: limit });
}

export function setLessonProgress(
  lessonId: string,
  state: Extract<LessonState, 'in_progress' | 'completed'>,
): Promise<{ lesson_id: string; state: LessonState }> {
  return rpc('set_lesson_progress', { p_lesson_id: lessonId, p_state: state });
}

// ---------------------------------------------------------------------------
// Direct table access (RLS protects these reads and writes)
// ---------------------------------------------------------------------------

export interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  role: 'student' | 'admin';
  avatar_url: string | null;
  created_at: string;
}

export async function fetchProfile(): Promise<ProfileRow> {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error('not_authenticated');

  const { data, error } = await client
    .from('profiles')
    .select('id, email, full_name, phone, role, avatar_url, created_at')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as ProfileRow;
}

export async function updateProfile(patch: {
  full_name?: string;
  phone?: string | null;
}): Promise<void> {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error('not_authenticated');

  const { error } = await client.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

export interface LessonDetail {
  id: string;
  title: string;
  summary: string;
  content: LessonBlock[];
  estimated_minutes: number;
  module_id: string;
  course_id: string;
  subject: Subject | null;
}

export async function fetchLesson(lessonId: string): Promise<LessonDetail> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('lessons')
    .select(
      'id, title, summary, content, estimated_minutes, module_id, course_modules!inner(course_id, courses!inner(subject))',
    )
    .eq('id', lessonId)
    .single();
  if (error) throw error;

  const row = data as unknown as {
    id: string;
    title: string;
    summary: string;
    content: LessonBlock[];
    estimated_minutes: number;
    module_id: string;
    course_modules: { course_id: string; courses: { subject: Subject } };
  };

  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    content: row.content ?? [],
    estimated_minutes: row.estimated_minutes,
    module_id: row.module_id,
    course_id: row.course_modules?.course_id ?? '',
    subject: row.course_modules?.courses?.subject ?? null,
  };
}

export interface LessonStateRow {
  state: LessonState;
  correct_count: number;
  attempt_count: number;
  completed_at: string | null;
}

export async function fetchLessonState(lessonId: string): Promise<LessonStateRow | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('lesson_progress')
    .select('state, correct_count, attempt_count, completed_at')
    .eq('lesson_id', lessonId)
    .maybeSingle();
  if (error) throw error;
  return (data as LessonStateRow | null) ?? null;
}

export async function fetchLessonQuestionCount(lessonId: string): Promise<number> {
  const client = requireSupabase();
  const { count, error } = await client
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('lesson_id', lessonId)
    .eq('status', 'published');
  if (error) throw error;
  return count ?? 0;
}

export interface BookmarkItem {
  id: string;
  created_at: string;
  question: {
    id: string;
    prompt: string;
    kind: 'mcq' | 'numeric';
    topic: string;
    difficulty: Difficulty;
    subject: Subject;
    question_options: { id: string; label: string; text: string; position: number }[];
  };
}

export async function fetchBookmarks(): Promise<BookmarkItem[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('bookmarks')
    .select(
      'id, created_at, question:questions(id, prompt, kind, topic, difficulty, subject, question_options(id, label, text, position))',
    )
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  // A bookmark can outlive its question (deleted or unpublished) — skip those.
  const rows = (data ?? []) as unknown as (Omit<BookmarkItem, 'question'> & {
    question: BookmarkItem['question'] | null;
  })[];
  return rows.filter((row) => row.question !== null) as BookmarkItem[];
}

export async function toggleBookmark(questionId: string, on: boolean): Promise<void> {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error('not_authenticated');

  if (on) {
    const { error } = await client
      .from('bookmarks')
      .insert({ user_id: userId, question_id: questionId });
    if (error && error.code !== '23505') throw error;
  } else {
    const { error } = await client
      .from('bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('question_id', questionId);
    if (error) throw error;
  }
}

/** Topics already used by published content, for practice filters. */
export async function fetchPublishedTopics(subject: Subject): Promise<string[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('questions')
    .select('topic')
    .eq('subject', subject)
    .eq('status', 'published')
    .limit(500);
  if (error) throw error;
  const topics = new Set<string>();
  for (const row of (data ?? []) as { topic: string }[]) {
    if (row.topic) topics.add(row.topic);
  }
  return Array.from(topics).sort();
}

/** Calls a privileged edge function with the user's own access token. */
export async function callEdgeFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('not_authenticated');

  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base) throw new Error('VITE_SUPABASE_URL is not configured');

  const response = await fetch(`${base}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    const message = payload.error ?? payload.message ?? `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}
