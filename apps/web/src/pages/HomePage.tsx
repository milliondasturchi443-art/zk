import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { CoursePattern } from '../components/CoursePattern';
import { Logo } from '../components/Logo';
import { Screen } from '../components/Screen';
import { Icon } from '../components/icons';
import { Card, ProgressBar } from '../components/primitives';
import { fetchProgress, listSessions, queryKeys } from '../lib/api';

function CourseCard({
  variant,
  title,
  subtitle,
  onPress,
  testID,
}: {
  variant: 'english' | 'math';
  title: string;
  subtitle: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Card
      testID={testID}
      onPress={onPress}
      accessibilityLabel={`${title}, ${subtitle}`}
      className="relative mb-5 flex h-[196px] items-center justify-center overflow-hidden border-line bg-surface"
    >
      <CoursePattern variant={variant} />
      <div className="relative z-10 flex flex-col items-center gap-2">
        <span className="zk-display text-center text-ink">{title}</span>
        <span className="zk-body text-center text-muted">{subtitle}</span>
      </div>
    </Card>
  );
}

export function HomePage() {
  const navigate = useNavigate();

  const { data: progress } = useQuery({
    queryKey: queryKeys.progress,
    queryFn: fetchProgress,
  });

  const { data: sessions } = useQuery({
    queryKey: [...queryKeys.sessions, 'in-progress'],
    queryFn: () => listSessions(20, 0),
  });

  const resume = sessions?.find((session) => session.status === 'in_progress');

  return (
    <Screen tabBar testID="home-screen">
      <div className="mb-6 flex items-center justify-between">
        <Logo size={30} testID="home-logo" />
        <button
          type="button"
          data-testid="open-profile"
          aria-label="Open profile"
          onClick={() => navigate('/profile')}
          className="zk-pressable flex h-[38px] w-[38px] items-center justify-center rounded-full border border-line bg-surface text-ink"
        >
          <Icon name="person-outline" size={18} />
        </button>
      </div>

      <CourseCard
        testID="card-english"
        variant="english"
        title="SAT English"
        subtitle="Reading & Writing"
        onPress={() => navigate('/english')}
      />

      <CourseCard
        testID="card-math"
        variant="math"
        title="SAT Math"
        subtitle="Algebra, Advanced Math, Data"
        onPress={() => navigate('/math')}
      />

      {resume ? (
        <Card
          testID="resume-card"
          onPress={() => navigate(`/session/${resume.id}`)}
          className="mb-5 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pr-3">
              <span className="zk-subtitle text-ink">Continue your practice</span>
              <span className="zk-small text-muted">
                {resume.subject === 'english' ? 'English' : 'Math'} · {resume.answered_count}/
                {resume.question_count} answered
              </span>
            </div>
            <Icon name="arrow-forward" size={18} className="shrink-0 text-ink" />
          </div>
          <ProgressBar
            value={resume.question_count ? resume.answered_count / resume.question_count : 0}
          />
        </Card>
      ) : null}

      <div className="mb-5 flex gap-3">
        <Card className="flex flex-1 flex-col gap-1 py-4">
          <span className="zk-title text-ink">{progress?.totals.attempted ?? 0}</span>
          <span className="zk-caption text-muted">questions attempted</span>
        </Card>
        <Card className="flex flex-1 flex-col gap-1 py-4">
          <span className="zk-title text-ink">
            {progress?.totals.accuracy == null ? '—' : `${progress.totals.accuracy}%`}
          </span>
          <span className="zk-caption text-muted">accuracy so far</span>
        </Card>
      </div>

      <p className="zk-caption mt-auto pt-4 text-center text-faint">
        ZK practice results are unofficial and are not College Board SAT scores.
      </p>
    </Screen>
  );
}
