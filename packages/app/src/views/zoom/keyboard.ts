/**
 * Keyboard resolution for view1 ↔ view2 (Step 7.4).
 *
 * Pure helpers — kept out of the React handler so the per-quadrant
 * arrow-key mapping and the input/textarea guard are unit-testable
 * without happy-dom's focus quirks. The handler in `ZoomController`
 * only owns DOM side-effects (focus moves, `navigate()` calls);
 * everything else routes through this file.
 *
 * Arrow-key mapping follows the visual matrix layout, not DOM order:
 *
 *     +----+----+
 *     | Q2 | Q1 |    top row    = important
 *     +----+----+
 *     | Q4 | Q3 |    bottom row = not important
 *     +----+----+
 *        left col = not urgent · right col = urgent
 *
 * Out-of-grid moves (ArrowUp from Q2/Q1, ArrowLeft from Q2/Q4, etc.)
 * return `undefined` — focus stays put rather than wrapping.
 */
import type { Quadrant } from '@emt/backend-core';

export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

const ARROW_MAP: Record<Quadrant, Partial<Record<ArrowKey, Quadrant>>> = {
  Q2: { ArrowRight: 'Q1', ArrowDown: 'Q4' },
  Q1: { ArrowLeft: 'Q2', ArrowDown: 'Q3' },
  Q4: { ArrowRight: 'Q3', ArrowUp: 'Q2' },
  Q3: { ArrowLeft: 'Q4', ArrowUp: 'Q1' },
};

/**
 * Given the currently focused quadrant cell and an arrow key, return
 * the adjacent quadrant in that direction — or `undefined` if the
 * move would leave the 2 × 2 grid. Focus does not wrap, which is the
 * standard grid pattern (WAI-ARIA APG).
 */
export function resolveArrowQuadrant(from: Quadrant, key: ArrowKey): Quadrant | undefined {
  return ARROW_MAP[from][key];
}

export function isArrowKey(key: string): key is ArrowKey {
  return key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight';
}

/**
 * True when the event target is text-input-like, so the global
 * keyboard handler should leave the event alone (typing `+` into the
 * quick composer must not zoom). `<input type="checkbox">` etc. don't
 * accept text, but the cost of being conservative here is small — the
 * zoom keys are unlikely to be meaningful inside any `<input>`.
 */
export function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * `+` arrives as the `key` value when shift+`=` is pressed on a US
 * layout; some keyboard layouts deliver it directly. `-` and `_` are
 * the unshifted / shifted forms on US. Match both shapes so the
 * binding works across layouts without sniffing `event.code`.
 */
export function isZoomInKey(key: string): boolean {
  return key === '+' || key === '=';
}

export function isZoomOutKey(key: string): boolean {
  return key === '-' || key === '_';
}
