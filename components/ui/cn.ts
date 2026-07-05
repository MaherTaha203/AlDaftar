/**
 * Minimal class-name combiner: filters falsy values and joins with spaces.
 *
 * This does NOT resolve conflicting Tailwind utilities. When two classes set
 * the same CSS property, the one defined later in the compiled stylesheet
 * wins — argument order here has no effect. Callers must therefore avoid
 * passing a `className` that fights a component's base utilities; each
 * component exposes explicit props (variant, size, width) for the axes meant
 * to vary.
 */
export type ClassValue = string | false | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
