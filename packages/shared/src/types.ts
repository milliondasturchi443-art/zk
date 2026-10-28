/** Domain types shared by the mobile app, the admin console and the tests. */

export type Subject = 'english' | 'math';
export type QuestionKind = 'mcq' | 'numeric';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ContentStatus = 'draft' | 'published' | 'archived';
export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';
export type SessionKind = 'practice' | 'timed_practice' | 'lesson_quiz';
export type FeedbackMode = 'immediate' | 'on_finish';
export type LessonState = 'in_progress' | 'completed';
export type UserRole = 'student' | 'admin';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/** Answer choice as delivered to a student (never carries correctness). */
export interface QuestionOptionDto {
  id: string;
  label: string;
  text: string;
}

export interface SessionQuestionDto {
  id: string;
  position: number;
  question_id: string;
  kind: QuestionKind;
  prompt: string;
  stimulus: string;
  directions: string;
  difficulty: Difficulty;
  topic: string;
  subtopic: string | null;
  points: number;
  options: QuestionOptionDto[];
  answered: boolean;
  response: AnswerResponse | null;
  is_correct: boolean | null;
  correct_answer: { option_id?: string; value?: string } | null;
  explanation: string | null;
  time_spent_ms: number;
}

export interface TestSessionDto {
  id: string;
  user_id: string;
  kind: SessionKind;
  subject: Subject;
  course_id: string | null;
  lesson_id: string | null;
  status: SessionStatus;
  feedback_mode: FeedbackMode;
  time_limit_seconds: number | null;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  question_count: number;
  answered_count: number;
  correct_count: number;
  questions: SessionQuestionDto[];
}

export type AnswerResponse =
  | { option_id: string }
  | { value: string | number };

export interface SubmitAnswerResult {
  duplicate: boolean;
  answered: boolean;
  is_correct: boolean | null;
  correct_answer?: { option_id?: string; value?: string } | null;
  explanation?: string | null;
  response: AnswerResponse;
  answered_count: number;
  correct_count: number;
  question_count: number;
}

export interface SessionSummary {
  id: string;
  kind: SessionKind;
  subject: Subject;
  lesson_id: string | null;
  course_id: string | null;
  status: SessionStatus;
  question_count: number;
  answered_count: number;
  correct_count: number;
  accuracy: number | null;
  duration_seconds: number | null;
  started_at: string;
  completed_at: string | null;
}

export interface LessonProgressDto {
  id: string;
  title: string;
  summary: string;
  estimated_minutes: number;
  sort_order: number;
  question_count: number;
  state: LessonState | null;
  correct_count: number;
  attempt_count: number;
  completed_at: string | null;
}

export interface CourseModuleDto {
  id: string;
  title: string;
  description: string;
  sort_order: number;
  lessons: LessonProgressDto[];
}

export interface CourseOverviewDto {
  course: {
    id: string;
    slug: string;
    title: string;
    description: string;
    subject: Subject;
    cover_image_path: string | null;
    status: ContentStatus;
    sort_order: number;
    published_at: string | null;
  } | null;
  modules: CourseModuleDto[];
  question_count: number;
  completed_lessons: number;
}

export interface ProgressTotals {
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number | null;
}

export interface SubjectProgress {
  subject: Subject;
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number | null;
}

export interface TopicProgress {
  topic: string;
  subject: Subject;
  attempted: number;
  correct: number;
  accuracy: number | null;
}

export interface DailyProgress {
  day: string;
  attempted: number;
  correct: number;
}

export interface ProgressDto {
  totals: ProgressTotals;
  subjects: SubjectProgress[];
  topics: TopicProgress[];
  lessons: { completed: number; in_progress: number; published_total: number };
  recent_sessions: SessionSummary[];
  daily: DailyProgress[];
  bookmarks: number;
  updated_at: string;
}

export interface AdminOverviewDto {
  users: { total: number; admins: number; students: number };
  courses: { total: number; published: number };
  modules: { total: number; published: number };
  lessons: { total: number; published: number };
  questions: { total: number; published: number; english: number; math: number };
  activity: {
    attempts_total: number;
    attempts_7d: number;
    attempts_30d: number;
    sessions_30d: number;
    active_students_7d: number;
  };
  recent_attempts: {
    id: string;
    subject: Subject;
    topic: string;
    is_correct: boolean;
    created_at: string;
    student: string;
  }[];
  recent_sessions: {
    id: string;
    kind: SessionKind;
    subject: Subject;
    status: SessionStatus;
    question_count: number;
    correct_count: number;
    created_at: string;
    student: string;
  }[];
}

export interface MistakeReviewItem {
  attempt_id: string;
  question_id: string;
  session_id: string | null;
  subject: Subject;
  topic: string;
  difficulty: Difficulty;
  created_at: string;
  kind: QuestionKind;
  prompt: string;
  stimulus: string;
  options: QuestionOptionDto[];
  response: AnswerResponse;
  is_correct: boolean;
  correct_answer: { option_id?: string; value?: string };
  explanation: string | null;
}

/** Lesson content is stored as an array of structured blocks. */
export type LessonBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'code'; text: string }
  | { type: 'quote'; text: string };
