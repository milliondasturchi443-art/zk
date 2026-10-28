import { Link, Outlet, useLocation } from 'react-router';

import { useAuth } from '../lib/auth';
import { cn } from '../lib/cn';
import { Logo } from './Logo';
import { Icon, type IconName } from './icons';

const TABS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Home', icon: 'home-outline', end: true },
  { to: '/english', label: 'English', icon: 'book-outline' },
  { to: '/math', label: 'Math', icon: 'calculator-outline' },
  { to: '/practice', label: 'Practice', icon: 'timer-outline' },
  { to: '/progress', label: 'Progress', icon: 'stats-chart-outline' },
  { to: '/profile', label: 'Profile', icon: 'person-outline' },
];

function TabLink({ to, label, icon, end = false }: { to: string; label: string; icon: IconName; end?: boolean }) {
  const location = useLocation();
  const active = end
    ? location.pathname === to
    : location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-full flex-col items-center justify-center gap-0.5',
        active ? 'text-ink' : 'text-faint',
      )}
    >
      <Icon name={icon} size={22} strokeWidth={active ? 2.2 : 1.8} />
      <span className="text-[11px] font-semibold leading-none">{label}</span>
    </Link>
  );
}

/** Bottom tab bar shared by the six main screens (fixed on the web). */
export function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto grid h-[62px] w-full max-w-[720px] grid-cols-6 pt-1.5">
        {TABS.map((tab) => (
          <TabLink key={tab.to} {...tab} />
        ))}
      </div>
    </nav>
  );
}

export function ConfigErrorScreen({ message }: { message: string | null }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas p-6 text-center">
      <Logo size={64} />
      <p className="zk-subtitle text-ink">Configuration needed</p>
      <p className="zk-body max-w-[420px] text-muted">{message}</p>
    </div>
  );
}

/** Layout for the six tab screens: content above, tab bar pinned below. */
export function HomeLayout() {
  const { isConfigured, configError } = useAuth();

  if (!isConfigured) {
    return <ConfigErrorScreen message={configError} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <main className="flex-1">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
