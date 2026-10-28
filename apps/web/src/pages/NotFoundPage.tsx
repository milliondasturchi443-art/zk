import { Link } from 'react-router';

import { Screen } from '../components/Screen';
import { Logo } from '../components/Logo';

export function NotFoundPage() {
  return (
    <Screen testID="not-found-screen">
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Logo size={44} />
        <h1 className="zk-title text-center text-ink">This screen does not exist</h1>
        <p className="zk-body text-center text-muted">
          The link you followed may be out of date, or the page was removed.
        </p>
        <Link to="/" className="zk-body text-ink underline">
          Go to home
        </Link>
      </div>
    </Screen>
  );
}
