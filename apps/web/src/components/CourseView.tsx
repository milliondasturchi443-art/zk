import { useQuery } from '@tanstack/react-query';
import type { CourseModuleDto, LessonProgressDto, Subject } from '@zk/shared';
import { useNavigate } from 'react-router';

import { fetchCourseOverview, queryKeys } from '../lib/api';
import { cn } from '../lib/cn';
import { Screen } from './Screen';
import { Icon } from './icons';
import { Badge, Card, ProgressBar } from './primitives';
import { EmptyState, ErrorState, LoadingState } from './states';

function stateLabel(state: LessonProgressDto['state']): {
  label: string;
  tone: 'neutral' | 'success' | 'warning';
} {
  if (state === 'completed') return { label: 'Completed', tone: 'success' };
  if (state === 'in_progress') return { label: 'In progress', tone: 'warning' };
  return { label: 'Not started', tone: 'neutral' };
}

function LessonRow({ lesson }: { lesson: LessonProgressDto }) {
  const navigate = useNavigate();
  const state = stateLabel(lesson.state);
  const attempts = lesson.attempt_count;
  return (
    <Card
      testID={`lesson-${lesson.id}`}
      onPress={() => navigate(`/lesson/${lesson.id}`)}
      className="gap-2 py-4"
      accessibilityLabel={`${lesson.title}, ${state.label}`}
    >
      <div className="flex items-start gap-3">
        <h3 className="zk-subtitle min-w-0 flex-1 text-ink">{lesson.title}</h3>
        <Badge label={state.label} tone={state.tone} />
      </div>
      <p className="zk-small line-clamp-2 text-muted">{lesson.summary}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="zk-caption text-faint">{lesson.estimated_minutes} min</span>
        <span className="zk-caption text-faint">·</span>
        <span className="zk-caption text-faint">
          {lesson.question_count} {lesson.question_count === 1 ? 'question' : 'questions'}
        </span>
        {attempts > 0 ? (
          <>
            <span className="zk-caption text-faint">·</span>
            <span className="zk-caption text-faint">
              {lesson.correct_count}/{attempts} correct in quizzes
            </span>
          </>
        ) : null}
      </div>
    </Card>
  );
}

function ModuleSection({ module }: { module: CourseModuleDto }) {
  return (
    <section className="mb-6 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="zk-title min-w-0 flex-1 text-ink">{module.title}</h2>
        <span className="zk-caption text-faint">
          {module.lessons.length} {module.lessons.length === 1 ? 'lesson' : 'lessons'}
        </span>
      </div>
      {module.description ? <p className="zk-small text-muted">{module.description}</p> : null}
      <div className="flex flex-col gap-3">
        {module.lessons.length === 0 ? (
          <p className="zk-small italic text-faint">No published lessons in this module yet.</p>
        ) : (
          module.lessons.map((lesson) => <LessonRow key={lesson.id} lesson={lesson} />)
        )}
      </div>
    </section>
  );
}

export function CourseView({ subject }: { subject: Subject }) {
  const query = useQuery({
    queryKey: queryKeys.course(subject),
    queryFn: () => fetchCourseOverview(subject),
  });

  const subjectTitle = subject === 'english' ? 'SAT English' : 'SAT Math';
  const subjectSubtitle =
    subject === 'english' ? 'Reading & Writing' : 'Algebra, Advanced Math & Data';

  if (query.isLoading) return <LoadingState label="Loading course…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const data = query.data;
  if (!data?.course) {
    return (
      <Screen tabBar testID={`${subject}-empty`}>
        <h1 className="zk-display text-ink">{subjectTitle}</h1>
        <EmptyState
          title="No published course yet"
          message="The admin has not published a course for this subject. Content appears here as soon as it is published."
          icon="folder-open-outline"
        />
      </Screen>
    );
  }

  const totalLessons = data.modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const completion = totalLessons ? data.completed_lessons / totalLessons : 0;

  return (
    <Screen tabBar testID={`${subject}-screen`}>
      <h1 className="zk-display text-ink">{subjectTitle}</h1>
      <p className="zk-body mb-5 text-muted">{data.course.description || subjectSubtitle}</p>

      <Card className="mb-6 flex flex-col gap-3">
        <div className="flex justify-between">
          <div className="flex flex-col items-start gap-0.5">
            <span className="zk-title text-ink">{data.completed_lessons}</span>
            <span className="zk-caption text-muted">lessons done</span>
          </div>
          <div className="flex flex-col items-start gap-0.5">
            <span className="zk-title text-ink">{totalLessons}</span>
            <span className="zk-caption text-muted">lessons</span>
          </div>
          <div className="flex flex-col items-start gap-0.5">
            <span className="zk-title text-ink">{data.question_count}</span>
            <span className="zk-caption text-muted">questions</span>
          </div>
        </div>
        <ProgressBar value={completion} />
        <span className="zk-caption text-faint">
          {totalLessons === 0
            ? 'Lessons will appear as they are published.'
            : `${Math.round(completion * 100)}% of lessons completed`}
        </span>
      </Card>

      {data.modules.length === 0 ? (
        <EmptyState
          title="Modules coming soon"
          message="This course has no published modules yet."
          icon="albums-outline"
        />
      ) : (
        data.modules.map((module) => <ModuleSection key={module.id} module={module} />)
      )}

      <div className="mb-2 flex items-start gap-2 px-1">
        <Icon name="information-circle-outline" size={16} className="mt-0.5 shrink-0 text-faint" />
        <p className={cn('zk-caption flex-1 leading-[17px] text-faint')}>
          Lesson quizzes count toward your progress. Practice sessions started from the Practice tab
          do too.
        </p>
      </div>
    </Screen>
  );
}
