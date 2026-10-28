import { useNavigate, useSearchParams } from 'react-router';

import { Screen } from '../components/Screen';
import { Icon } from '../components/icons';

const CONTENT: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: 'Terms of Service',
    body: [
      'This is a placeholder document shipped with the ZK development build.',
      'Replace it with reviewed terms before distributing the application to real students.',
      'By creating an account you agree to use the practice material for personal study only.',
      'Practice results produced by this application are unofficial and are not College Board SAT scores.',
      'Do not attempt to disrupt the service, scrape content at scale, or share account credentials.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    body: [
      'This is a placeholder document shipped with the ZK development build.',
      'Replace it with a reviewed policy before collecting personal data from real users.',
      'The account stores your name, email address and optional phone number.',
      'Your answers, practice sessions and progress are stored so that you can review them.',
      'You can request account deletion from the profile screen at any time.',
    ],
  },
};

export function LegalPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const entry = CONTENT[params.get('doc') ?? 'terms'] ?? CONTENT.terms!;

  return (
    <Screen testID="legal-screen">
      <header className="mb-4 flex items-center justify-between">
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate(-1)}
          className="zk-pressable text-ink"
        >
          <Icon name="chevron-back" size={22} />
        </button>
        <span className="zk-subtitle text-ink">{entry.title}</span>
        <span className="w-[22px]" />
      </header>

      <div className="flex flex-col gap-4 pt-2">
        <h1 className="zk-title text-ink">{entry.title}</h1>
        {entry.body.map((paragraph) => (
          <p key={paragraph} className="zk-body text-muted">
            {paragraph}
          </p>
        ))}
      </div>
    </Screen>
  );
}
