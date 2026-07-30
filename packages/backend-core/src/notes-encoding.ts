/**
 * Encode unsupported Task fields into `notes` for backends that lack
 * native columns (Google Tasks pattern). Markers are HTML comments so
 * they survive plain-text note UIs and round-trip losslessly.
 *
 * Format: `<!--emt:v1 key=value key2=value2-->` appended after user notes.
 * Values are percent-encoded. Unknown keys are preserved on decode→encode.
 */

export interface EmbeddedFields {
  readonly priority?: string;
  readonly dueTime?: string;
  readonly tags?: readonly string[];
  /** Reserved for recurrence (TODO 11); stored when present. */
  readonly rrule?: string;
}

const MARKER_RE = /<!--emt:v1\s+([\s\S]*?)-->/g;

function encodeValue(value: string): string {
  return encodeURIComponent(value);
}

function decodeValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseBody(body: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of body.trim().split(/\s+/)) {
    if (part === '') continue;
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const key = part.slice(0, eq);
    const raw = part.slice(eq + 1);
    map.set(key, decodeValue(raw));
  }
  return map;
}

function serializeMap(map: Map<string, string>): string {
  const parts: string[] = [];
  for (const [key, value] of map) {
    parts.push(`${key}=${encodeValue(value)}`);
  }
  return parts.join(' ');
}

/**
 * Strip EMT markers from notes and return user-visible text + fields.
 */
export function decodeEmbeddedFields(notes: string): {
  readonly userNotes: string;
  readonly fields: EmbeddedFields;
  readonly extra: ReadonlyMap<string, string>;
} {
  const map = new Map<string, string>();
  const userNotes = notes
    .replace(MARKER_RE, (_full, body: string) => {
      for (const [k, v] of parseBody(body)) map.set(k, v);
      return '';
    })
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();

  const tagsRaw = map.get('tags');
  const fields: EmbeddedFields = {
    ...(map.has('priority') ? { priority: map.get('priority')! } : {}),
    ...(map.has('dueTime') ? { dueTime: map.get('dueTime')! } : {}),
    ...(tagsRaw !== undefined && tagsRaw !== ''
      ? {
          tags: tagsRaw
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t !== ''),
        }
      : {}),
    ...(map.has('rrule') ? { rrule: map.get('rrule')! } : {}),
  };
  return { userNotes, fields, extra: map };
}

/**
 * Write embedded fields into notes. Pass `undefined` for a field to
 * leave any existing marker value; pass `null` to clear it.
 */
export function encodeEmbeddedFields(
  userNotes: string,
  fields: {
    readonly priority?: string | null;
    readonly dueTime?: string | null;
    readonly tags?: readonly string[] | null;
    readonly rrule?: string | null;
  },
  previousNotes = '',
): string {
  const prev = decodeEmbeddedFields(previousNotes);
  const map = new Map(prev.extra);

  const apply = (key: string, value: string | null | undefined): void => {
    if (value === undefined) return;
    if (value === null || value === '') map.delete(key);
    else map.set(key, value);
  };

  apply('priority', fields.priority);
  apply('dueTime', fields.dueTime);
  if (fields.tags !== undefined) {
    if (fields.tags === null || fields.tags.length === 0) map.delete('tags');
    else map.set('tags', fields.tags.join(','));
  }
  apply('rrule', fields.rrule);

  const trimmed = userNotes.replace(/\s+$/u, '');
  if (map.size === 0) return trimmed;
  const marker = `<!--emt:v1 ${serializeMap(map)}-->`;
  return trimmed === '' ? marker : `${trimmed}\n${marker}`;
}
