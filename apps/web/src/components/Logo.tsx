import { cn } from '../lib/cn';

interface LogoProps {
  size?: number;
  className?: string;
  testID?: string;
}

/** The ZK wordmark: bold, black, uppercase. */
export function Logo({ size = 34, className, testID }: LogoProps) {
  return (
    <span
      data-testid={testID}
      role="header"
      aria-label="ZK"
      className={cn('zk-logo block text-ink', className)}
      style={{ fontSize: size, letterSpacing: -size * 0.045 }}
    >
      ZK
    </span>
  );
}

/** Large centred mark used on the auth screens. */
export function LogoMark({ size = 96, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-label="ZK"
      className={cn('zk-logo block text-ink', className)}
      style={{ fontSize: size, letterSpacing: -size * 0.045 }}
    >
      ZK
    </span>
  );
}
