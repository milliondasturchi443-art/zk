import type { CSSProperties } from 'react';

import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Bookmark,
  Calculator,
  Check,
  CheckCheck,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  CloudOff,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  Home,
  Hourglass,
  Inbox,
  Info,
  KeyRound,
  Layers,
  Library,
  Lightbulb,
  Lock,
  LogOut,
  Mail,
  MailOpen,
  Pencil,
  Phone,
  RefreshCw,
  Square,
  Timer,
  User,
  X,
  XCircle,
} from 'lucide-react';

/**
 * Thin adapter over lucide-react that keeps the mobile screens' icon names
 * (`mail-outline`, `chevron-back`, …) so the web port stays a 1:1 copy.
 */
const ICONS = {
  close: X,
  'time-outline': Clock,
  'checkmark-circle': CheckCircle2,
  'close-circle': XCircle,
  'checkmark-done-outline': CheckCheck,
  checkmark: Check,
  'bookmark': Bookmark,
  'bookmark-outline': Bookmark,
  'arrow-forward': ArrowRight,
  'person-outline': User,
  'home-outline': Home,
  'book-outline': BookOpen,
  'reader-outline': BookOpen,
  'library-outline': Library,
  'calculator-outline': Calculator,
  'timer-outline': Timer,
  'stats-chart-outline': BarChart3,
  'chevron-back': ChevronLeft,
  'chevron-forward': ChevronRight,
  'mail-outline': Mail,
  'mail-open-outline': MailOpen,
  'call-outline': Phone,
  'lock-closed-outline': Lock,
  'key-outline': KeyRound,
  'create-outline': Pencil,
  'refresh-circle-outline': RefreshCw,
  'document-text-outline': FileText,
  'eye-outline': Eye,
  'eye-off-outline': EyeOff,
  'bulb-outline': Lightbulb,
  'cloud-offline-outline': CloudOff,
  'alert-circle-outline': AlertCircle,
  'information-circle-outline': Info,
  'folder-open-outline': FolderOpen,
  'albums-outline': Layers,
  'file-tray-outline': Inbox,
  'square-outline': Square,
  'checkbox': CheckSquare,
  'hourglass-outline': Hourglass,
  'log-out': LogOut,
  'circle': Circle,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
  fill?: string;
}

export function Icon({
  name,
  size = 16,
  className,
  style,
  strokeWidth = 2,
  fill = 'none',
}: IconProps) {
  const Component = ICONS[name] ?? Circle;
  return (
    <Component
      size={size}
      className={className}
      style={style}
      strokeWidth={strokeWidth}
      fill={fill}
      aria-hidden="true"
      focusable="false"
    />
  );
}
