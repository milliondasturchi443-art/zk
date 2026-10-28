/** Tiny class name joiner — the web app has no cx/clsx dependency. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
