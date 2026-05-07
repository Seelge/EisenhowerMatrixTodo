/**
 * English string table — the only locale shipped in the first release.
 *
 * Keys are flat dotted strings (`scope.name`) so they remain stable as
 * the table grows; the `as const` narrowing turns them into a literal
 * union for `t()` to enforce at the type level.
 *
 * Add new strings here. Subsequent locales will live in sibling files
 * (`strings.de.ts`, etc.) and must satisfy `Record<StringKey, string>`.
 */
export const strings = {
  'app.title': 'Eisenhower Matrix Todo',
  'app.home.heading': 'Eisenhower Matrix',
  'app.home.placeholder': 'The matrix view is not built yet.',
  'app.error.fallback.message': 'Something went wrong.',
  'app.error.fallback.retry': 'Reload',
} as const satisfies Record<string, string>;

export type StringKey = keyof typeof strings;
