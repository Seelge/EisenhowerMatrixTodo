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
  'app.matrix.heading': 'Eisenhower Matrix',
  'app.matrix.cell.q1.label': 'Do',
  'app.matrix.cell.q2.label': 'Schedule',
  'app.matrix.cell.q3.label': 'Delegate',
  'app.matrix.cell.q4.label': 'Delete',
  'app.matrix.axis.important': 'Important',
  'app.matrix.axis.urgent': 'Urgent',
  'app.matrix.cell.reset': 'Reset order',
  'app.matrix.fab.add': 'Add task',
  'app.composer.label': 'Add task',
  'app.composer.titleLabel': 'Title',
  'app.composer.titlePlaceholder': 'What needs doing?',
  'app.composer.quadrantLabel': 'Quadrant',
  'app.composer.cancel': 'Cancel',
  'app.composer.submit': 'Add',
  'app.quadrant.heading': 'Quadrant',
  'app.quadrant.placeholder': 'The quadrant view is not built yet.',
  'app.task.heading': 'Task',
  'app.task.placeholder': 'The task focus view is not built yet.',
  'app.task.menu.label': 'Task actions',
  'app.task.menu.moveTo.q1': 'Move to Do',
  'app.task.menu.moveTo.q2': 'Move to Schedule',
  'app.task.menu.moveTo.q3': 'Move to Delegate',
  'app.task.menu.moveTo.q4': 'Move to Delete',
  'app.error.fallback.message': 'Something went wrong.',
  'app.error.fallback.retry': 'Reload',
  'app.connect.banner.label': 'Connect a sync backend',
  'app.connect.banner.message':
    'Connect Google Tasks or Microsoft To-Do to sync your tasks across devices.',
  'app.connect.banner.dismiss': 'Dismiss',
} as const satisfies Record<string, string>;

export type StringKey = keyof typeof strings;
