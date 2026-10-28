import type { FieldValues, Path, Resolver } from 'react-hook-form';
import type { ZodType } from 'zod';

/**
 * Minimal Zod -> React Hook Form resolver.
 * Kept in-repo so the form layer has no peer-dependency constraints.
 */
export function zodResolver<T extends FieldValues>(schema: ZodType<T>): Resolver<T> {
  const resolve = async (values: T) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data as T, errors: {} as Record<string, never> };
    }

    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      const key = path === '' ? 'root' : path;
      if (!errors[key]) {
        errors[key] = { type: 'validation', message: issue.message };
      }
    }
    return { values: {} as T, errors: errors as Record<string, never> };
  };
  return resolve as unknown as Resolver<T>;
}

export function fieldError<T extends FieldValues>(
  errors: Partial<Record<Path<T>, { message?: string }>>,
  name: Path<T>,
): string | undefined {
  return errors[name]?.message;
}
