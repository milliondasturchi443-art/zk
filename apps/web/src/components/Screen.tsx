import type { CSSProperties, ReactNode } from 'react';

import { cn } from '../lib/cn';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  footer?: ReactNode;
  background?: string;
  contentStyle?: CSSProperties;
  /** Keeps content clear of the bottom tab bar. */
  tabBar?: boolean;
  testID?: string;
}

/**
 * Page shell: a centred column capped at the mobile content width with an
 * optional pinned footer bar (used by the lesson screen).
 */
export function Screen({
  children,
  scroll = true,
  padded = true,
  footer,
  background,
  contentStyle,
  tabBar = false,
  testID,
}: ScreenProps) {
  return (
    <div
      data-testid={testID}
      className="flex min-h-full w-full flex-col"
      style={{ background: background ?? 'var(--color-canvas)' }}
    >
      <div
        className={cn(
          'mx-auto w-full max-w-[720px]',
          padded && 'px-5 pt-5',
          scroll ? 'flex-1 pb-8' : '',
          tabBar && 'pb-28',
        )}
        style={contentStyle}
      >
        {children}
      </div>
      {footer ? (
        <div className="sticky bottom-0 z-30 w-full border-t border-line bg-canvas">
          <div className="mx-auto w-full max-w-[720px] px-5 pb-4 pt-3">{footer}</div>
        </div>
      ) : null}
    </div>
  );
}
