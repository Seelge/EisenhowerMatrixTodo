/**
 * Options sub-routing helpers (Step 9.1).
 *
 * The options surface is out-of-band relative to the matrix /
 * quadrant `ViewState` projection — Routes.tsx detects `/options[...]`
 * directly off `useInternalPath()` and dispatches here. Group names
 * are a closed set; an unknown segment falls back to the index
 * (no group selected) so a manually-typed bad URL doesn't 404.
 */
export const OPTIONS_GROUPS = [
  'backends',
  'account',
  'appearance',
  'defaults',
  'tags',
  'data',
  'about',
] as const;

export type OptionsGroup = (typeof OPTIONS_GROUPS)[number];

const OPTIONS_GROUP_SET = new Set<string>(OPTIONS_GROUPS);

export function isOptionsPath(internalPath: string): boolean {
  const path = stripQuery(internalPath);
  return path === '/options' || path === '/options/' || path.startsWith('/options/');
}

export function parseOptionsGroup(internalPath: string): OptionsGroup | undefined {
  const path = stripQuery(internalPath);
  const match = /^\/options\/([^/]+)\/?$/.exec(path);
  if (!match) return undefined;
  const slug = match[1];
  if (slug !== undefined && OPTIONS_GROUP_SET.has(slug)) return slug as OptionsGroup;
  return undefined;
}

export function optionsGroupPath(group: OptionsGroup): string {
  return `/options/${group}`;
}

export const OPTIONS_INDEX_PATH = '/options';

function stripQuery(path: string): string {
  const i = path.indexOf('?');
  return i === -1 ? path : path.slice(0, i);
}
