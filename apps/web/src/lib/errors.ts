/** Maps backend errors to honest, user facing messages. */

interface FriendlyError {
  title: string;
  message: string;
  code: string;
  /** True when retrying the same request might succeed. */
  retryable: boolean;
}

const GENERIC: FriendlyError = {
  title: 'Something went wrong',
  message: 'The request could not be completed. Please try again.',
  code: 'unknown',
  retryable: true,
};

const KNOWN: Record<string, FriendlyError> = {
  invalid_credentials: {
    title: 'Incorrect email or password',
    message: 'Check your details and try again.',
    code: 'invalid_credentials',
    retryable: true,
  },
  email_not_confirmed: {
    title: 'Email not verified',
    message: 'Open the verification link we sent you, then sign in again.',
    code: 'email_not_confirmed',
    retryable: false,
  },
  user_already_exists: {
    title: 'Email already registered',
    message: 'An account with this email already exists. Try signing in instead.',
    code: 'user_already_exists',
    retryable: false,
  },
  weak_password: {
    title: 'Password too weak',
    message: 'Use at least 8 characters with a letter and a number.',
    code: 'weak_password',
    retryable: false,
  },
  rate_limited: {
    title: 'Too many attempts',
    message: 'Please wait a moment before trying again.',
    code: 'rate_limited',
    retryable: true,
  },
  network: {
    title: 'No connection',
    message: 'We could not reach the server. Check your connection and retry.',
    code: 'network',
    retryable: true,
  },
  session_expired: {
    title: 'Session expired',
    message: 'Please sign in again to continue.',
    code: 'session_expired',
    retryable: false,
  },
  no_questions_available: {
    title: 'Nothing to practise yet',
    message:
      'No questions match these filters. Change the filters or ask an administrator to publish content.',
    code: 'no_questions_available',
    retryable: false,
  },
  course_not_available: {
    title: 'Course not available',
    message: 'This course has not been published yet.',
    code: 'course_not_available',
    retryable: false,
  },
  lesson_not_available: {
    title: 'Lesson not available',
    message: 'This lesson is missing or no longer published.',
    code: 'lesson_not_available',
    retryable: false,
  },
  session_time_expired: {
    title: 'Time is up',
    message: 'The time limit for this session has passed. Opening your results.',
    code: 'session_time_expired',
    retryable: false,
  },
  session_not_open: {
    title: 'Session already finished',
    message: 'This session is no longer accepting answers.',
    code: 'session_not_open',
    retryable: false,
  },
  invalid_numeric_answer: {
    title: 'Invalid answer',
    message: 'Enter a number, for example 12 or 3/4.',
    code: 'invalid_numeric_answer',
    retryable: false,
  },
  invalid_option: {
    title: 'Invalid option',
    message: 'That choice is not part of this question.',
    code: 'invalid_option',
    retryable: false,
  },
  role_change_forbidden: {
    title: 'Not allowed',
    message: 'Your account cannot change this setting.',
    code: 'role_change_forbidden',
    retryable: false,
  },
  admin_required: {
    title: 'Administrator access required',
    message: 'This action requires an administrator account.',
    code: 'admin_required',
    retryable: false,
  },
  not_authenticated: {
    title: 'Please sign in',
    message: 'Your session is no longer valid. Sign in again.',
    code: 'not_authenticated',
    retryable: false,
  },
  question_prompt_required: {
    title: 'Question incomplete',
    message: 'Add question text before publishing.',
    code: 'question_prompt_required',
    retryable: false,
  },
  question_options_required: {
    title: 'Question incomplete',
    message: 'Add at least two answer choices before publishing.',
    code: 'question_options_required',
    retryable: false,
  },
  question_correct_option_required: {
    title: 'Question incomplete',
    message: 'Mark one answer choice as correct before publishing.',
    code: 'question_correct_option_required',
    retryable: false,
  },
  question_numeric_answer_required: {
    title: 'Question incomplete',
    message: 'Add the correct numeric answer before publishing.',
    code: 'question_numeric_answer_required',
    retryable: false,
  },
  question_subject_mismatch: {
    title: 'Question subject mismatch',
    message: 'The question subject must match the course subject.',
    code: 'question_subject_mismatch',
    retryable: false,
  },
};

function extractCode(error: unknown): string {
  if (!error || typeof error !== 'object') return 'unknown';
  const anyError = error as Record<string, unknown>;

  const code = anyError.code ?? anyError.status ?? anyError.error_code;
  if (typeof code === 'string') {
    // PostgREST / Postgres errors look like "P0001" or a message blob.
    const known = Object.keys(KNOWN).find((key) => code.includes(key));
    if (known) return known;
    if (code === '401' || code === '403') return 'not_authenticated';
    if (code === '429') return 'rate_limited';
    if (code === 'ERR_NETWORK' || code === 'Failed to fetch') return 'network';
  }

  const message = typeof anyError.message === 'string' ? anyError.message : '';
  const lower = message.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('invalid_credentials'))
    return 'invalid_credentials';
  if (lower.includes('email not confirmed')) return 'email_not_confirmed';
  if (lower.includes('already registered') || lower.includes('already been registered'))
    return 'user_already_exists';
  if (lower.includes('password should be') || lower.includes('weak password'))
    return 'weak_password';
  if (lower.includes('rate limit') || lower.includes('too many requests')) return 'rate_limited';
  if (lower.includes('network') || lower.includes('fetch')) return 'network';
  if (lower.includes('jwt') || lower.includes('session')) return 'session_expired';
  if (lower.includes('no_questions_available')) return 'no_questions_available';
  if (lower.includes('course_not_available')) return 'course_not_available';
  if (lower.includes('lesson_not_available')) return 'lesson_not_available';
  if (lower.includes('session_time_expired')) return 'session_time_expired';
  if (lower.includes('session_not_open')) return 'session_not_open';
  if (lower.includes('invalid_numeric_answer')) return 'invalid_numeric_answer';
  if (lower.includes('invalid_option')) return 'invalid_option';

  const knownKey = Object.keys(KNOWN).find((key) => message.includes(key));
  if (knownKey) return knownKey;

  return 'unknown';
}

export function describeError(error: unknown): FriendlyError {
  const code = extractCode(error);
  const known = KNOWN[code];
  if (known) return known;
  const message =
    error && typeof error === 'object' && typeof (error as { message?: string }).message === 'string'
      ? (error as { message: string }).message
      : GENERIC.message;
  // Do not leak internal database detail: keep the generic title, log full detail.
  if (import.meta.env.DEV) {
    console.warn('[zk] request failed', error);
  }
  return { ...GENERIC, message: code === 'unknown' ? GENERIC.message : message };
}

/** Console-only diagnostics; never shown to end users. */
export function logDiagnostic(scope: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(`[zk:${scope}]`, error);
  }
}
