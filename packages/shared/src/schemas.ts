import { z } from 'zod';

/** Password policy: length plus at least one letter and one digit. */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
  .max(PASSWORD_MAX, `Password must be at most ${PASSWORD_MAX} characters`)
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(254, 'Email is too long')
  .email('Enter a valid email address');

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, 'Enter your full name')
  .max(120, 'Name is too long')
  .regex(/^[^<>]+$/, 'Name contains unsupported characters');

export const phoneSchema = z
  .string()
  .trim()
  .min(3, 'Enter a valid phone number')
  .max(30, 'Phone number is too long')
  .regex(/^[0-9+()\-\s]+$/, 'Phone number contains unsupported characters');

export const signUpSchema = z
  .object({
    fullName: fullNameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
    acceptedTerms: z
      .boolean()
      .refine((value) => value === true, {
        message: 'You must accept the terms and privacy policy',
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const updateProfileSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema.optional().or(z.literal('')),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ---------------------------------------------------------------------------
// Practice / session inputs
// ---------------------------------------------------------------------------

export const startSessionSchema = z.object({
  subject: z.enum(['english', 'math']),
  kind: z.enum(['practice', 'timed_practice', 'lesson_quiz']).default('practice'),
  courseId: z.string().uuid().optional(),
  lessonId: z.string().uuid().optional(),
  questionCount: z.number().int().min(1).max(50).default(10),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  topic: z.string().trim().min(1).max(80).optional(),
  timeLimitSeconds: z.number().int().min(30).max(7200).nullable().optional(),
  feedbackMode: z.enum(['immediate', 'on_finish']).default('immediate'),
  includeAttempted: z.boolean().default(true),
});

export const submitAnswerSchema = z
  .object({
    optionId: z.string().uuid().optional(),
    value: z.union([z.string().max(64), z.number()]).optional(),
    timeSpentMs: z.number().int().min(0).max(3_600_000).default(0),
  })
  .refine((data) => data.optionId !== undefined || data.value !== undefined, {
    message: 'Select an option or enter a value',
  });

export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;

// ---------------------------------------------------------------------------
// Admin content management
// ---------------------------------------------------------------------------

export const courseSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Lowercase letters, numbers and dashes only'),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).default(''),
  subject: z.enum(['english', 'math']),
  coverImagePath: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

export const moduleSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).default(''),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

const lessonBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heading'), text: z.string().min(1).max(200) }),
  z.object({ type: z.literal('paragraph'), text: z.string().min(1).max(4000) }),
  z.object({
    type: z.literal('list'),
    items: z.array(z.string().min(1).max(1000)).min(1).max(50),
  }),
  z.object({ type: z.literal('code'), text: z.string().min(1).max(4000) }),
  z.object({ type: z.literal('quote'), text: z.string().min(1).max(2000) }),
]);

export const lessonSchema = z.object({
  moduleId: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  summary: z.string().trim().max(500).default(''),
  content: z.array(lessonBlockSchema).max(200),
  estimatedMinutes: z.number().int().min(1).max(600).default(10),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

export const optionSchema = z.object({
  label: z.string().regex(/^[A-Z]$/, 'Use a single uppercase letter'),
  text: z.string().trim().min(1, 'Option text is required').max(1000),
});

export const questionSchema = z
  .object({
    courseId: z.string().uuid(),
    lessonId: z.string().uuid().nullable().optional(),
    subject: z.enum(['english', 'math']),
    topic: z.string().trim().min(1, 'Topic is required').max(80),
    subtopic: z.string().trim().max(80).nullable().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
    kind: z.enum(['mcq', 'numeric']),
    prompt: z.string().trim().min(1, 'Question text is required').max(4000),
    stimulus: z.string().trim().max(8000).nullable().optional(),
    directions: z.string().trim().max(500).nullable().optional(),
    points: z.number().int().min(1).max(100).default(1),
    sourceNote: z.string().trim().max(500).nullable().optional(),
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
    options: z.array(optionSchema).max(8).default([]),
    correctOptionLabel: z.string().regex(/^[A-Z]$/).nullable().optional(),
    numericAnswer: z.union([z.string(), z.number()]).nullable().optional(),
    numericTolerance: z.number().min(0).max(1000).default(0),
    explanation: z.string().trim().max(4000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === 'mcq') {
      if (data.options.length < 2) {
        ctx.addIssue({
          code: 'custom',
          path: ['options'],
          message: 'Multiple choice questions need at least two options',
        });
      }
      if (data.options.length > 0 && new Set(data.options.map((o) => o.label)).size !== data.options.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['options'],
          message: 'Option labels must be unique',
        });
      }
      if (!data.correctOptionLabel) {
        ctx.addIssue({
          code: 'custom',
          path: ['correctOptionLabel'],
          message: 'Choose the correct option',
        });
      } else if (
        data.options.length > 0 &&
        !data.options.some((o) => o.label === data.correctOptionLabel)
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['correctOptionLabel'],
          message: 'The correct answer must match one of the options',
        });
      }
    }
    if (data.kind === 'numeric') {
      if (data.numericAnswer === null || data.numericAnswer === undefined || data.numericAnswer === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['numericAnswer'],
          message: 'Numeric questions need a correct answer',
        });
      } else {
        const parsed =
          typeof data.numericAnswer === 'number'
            ? data.numericAnswer
            : Number(String(data.numericAnswer).trim());
        if (!Number.isFinite(parsed)) {
          ctx.addIssue({
            code: 'custom',
            path: ['numericAnswer'],
            message: 'Enter a valid number (fractions such as 3/4 are allowed)',
          });
        }
      }
    }
    if (data.status === 'published' && !data.explanation) {
      ctx.addIssue({
        code: 'custom',
        path: ['explanation'],
        message: 'Published questions must include an explanation',
      });
    }
  });

export type CourseInput = z.infer<typeof courseSchema>;
export type ModuleInput = z.infer<typeof moduleSchema>;
export type LessonInput = z.infer<typeof lessonSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type LessonBlockInput = z.infer<typeof lessonBlockSchema>;
