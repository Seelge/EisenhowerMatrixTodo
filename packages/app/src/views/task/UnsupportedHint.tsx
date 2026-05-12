/**
 * UnsupportedHint — small info icon next to fields the active backend
 * can't natively round-trip (Step 8.7).
 *
 * The label conveys the same idea as `design-input.md`'s field-mapping
 * note: the field still works — the adapter encodes its value into
 * `notes` on write and decodes it on read — but other clients viewing
 * the task on the same backend won't see it as a first-class field.
 *
 * Rendered as a `<span role="note">` (not a button) since it carries
 * informational text only; the visible icon is decorative and the
 * description follows in a screen-reader-visible inline span. A
 * `title` attribute mirrors the same text for sighted users on
 * pointer hover. No tooltip widget — the design wants this terse.
 */
import type { ReactNode } from 'react';

export interface UnsupportedHintProps {
  /** Accessible description, e.g., "Time of day is stored in the notes…" */
  message: string;
}

export function UnsupportedHint({ message }: UnsupportedHintProps): ReactNode {
  return (
    <span role="note" className="emt-unsupported-hint" data-emt-unsupported-hint="" title={message}>
      <span className="emt-unsupported-hint__icon" aria-hidden="true">
        i
      </span>
      <span className="emt-unsupported-hint__sr">{message}</span>
    </span>
  );
}
