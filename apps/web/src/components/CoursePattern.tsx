import type { CSSProperties } from 'react';

import { Icon, type IconName } from './icons';

type Slot =
  | { kind: 'icon'; name: IconName; top: string; left: string; size: number; rotate?: string }
  | { kind: 'text'; value: string; top: string; left: string; size: number };

const ENGLISH_SLOTS: Slot[] = [
  { kind: 'icon', name: 'book-outline', top: '10%', left: '6%', size: 34 },
  { kind: 'text', value: 'abc', top: '14%', left: '70%', size: 17 },
  { kind: 'icon', name: 'create-outline', top: '16%', left: '44%', size: 30, rotate: '-18deg' },
  { kind: 'text', value: 'A', top: '40%', left: '8%', size: 22 },
  { kind: 'text', value: 'B', top: '62%', left: '76%', size: 22 },
  { kind: 'icon', name: 'library-outline', top: '58%', left: '14%', size: 30 },
  { kind: 'text', value: 'C D', top: '74%', left: '46%', size: 16 },
  { kind: 'icon', name: 'reader-outline', top: '30%', left: '82%', size: 28 },
  { kind: 'text', value: 'e', top: '78%', left: '18%', size: 20 },
  { kind: 'icon', name: 'document-text-outline', top: '44%', left: '64%', size: 32 },
];

const MATH_SLOTS: Slot[] = [
  { kind: 'text', value: '2+2', top: '12%', left: '6%', size: 20 },
  { kind: 'text', value: '√', top: '16%', left: '74%', size: 26 },
  { kind: 'text', value: '+ −', top: '30%', left: '40%', size: 18 },
  { kind: 'text', value: '=', top: '18%', left: '54%', size: 22 },
  { kind: 'text', value: 'π', top: '52%', left: '10%', size: 24 },
  { kind: 'text', value: 'b', top: '40%', left: '86%', size: 18 },
  { kind: 'text', value: 'x²', top: '66%', left: '70%', size: 22 },
  { kind: 'text', value: '∑', top: '70%', left: '24%', size: 22 },
  { kind: 'text', value: '4+A', top: '78%', left: '58%', size: 18 },
  { kind: 'text', value: 'θ', top: '44%', left: '30%', size: 18 },
];

/** Faint academic decoration that sits behind the course card title. */
export function CoursePattern({ variant }: { variant: 'english' | 'math' }) {
  const slots = variant === 'english' ? ENGLISH_SLOTS : MATH_SLOTS;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none">
      {slots.map((slot, index) => {
        const position: CSSProperties = { top: slot.top, left: slot.left };
        if (slot.kind === 'text') {
          return (
            <span
              key={index}
              style={{ ...position, fontSize: slot.size }}
              className="absolute whitespace-nowrap font-semibold text-ink opacity-[0.07]"
            >
              {slot.value}
            </span>
          );
        }
        return (
          <Icon
            key={index}
            name={slot.name}
            size={slot.size}
            className="absolute text-ink opacity-[0.07]"
            style={{ ...position, transform: slot.rotate ? `rotate(${slot.rotate})` : undefined }}
          />
        );
      })}
    </div>
  );
}
