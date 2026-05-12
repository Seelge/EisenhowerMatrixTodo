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
  'app.quadrant.empty': 'Nothing here yet.',
  'app.composer.label': 'Add task',
  'app.composer.titleLabel': 'Title',
  'app.composer.titlePlaceholder': 'What needs doing?',
  'app.composer.quadrantLabel': 'Quadrant',
  'app.composer.cancel': 'Cancel',
  'app.composer.submit': 'Add',
  'app.task.heading': 'Task',
  'app.task.fields.title': 'Title',
  'app.task.fields.titlePlaceholder': 'What needs doing?',
  'app.task.fields.notes': 'Notes',
  'app.task.fields.notesPlaceholder': 'Notes (Markdown)',
  'app.task.fields.status': 'Mark complete',
  'app.task.fields.due': 'Due',
  'app.task.fields.dueTime': 'Time',
  'app.task.fields.priority': 'Priority',
  'app.task.fields.priority.none': 'None',
  'app.task.fields.priority.low': 'Low',
  'app.task.fields.priority.normal': 'Normal',
  'app.task.fields.priority.high': 'High',
  'app.task.fields.quadrant': 'Quadrant',
  'app.task.fields.backend': 'Backend',
  'app.task.fields.backend.migrating': 'Migrating…',
  'app.task.fields.backend.error': 'Could not migrate this task. The original copy is unchanged.',
  'app.task.fields.backend.dismiss': 'Dismiss',
  'app.task.fields.backend.staleSource':
    'Migrated, but the original copy lingered. It will be cleaned up later.',
  'app.task.fields.unsupported.dueTime':
    'Time of day is stored in the notes on this backend; native time-of-day is not supported.',
  'app.task.fields.unsupported.priority':
    'Priority is stored in the notes on this backend; native priority is not supported.',
  'app.task.delete.label': 'Delete task',
  'app.task.delete.snackbar': 'Task deleted.',
  'app.task.delete.undo': 'Undo',
  'app.options.heading': 'Options',
  'app.options.back': 'Back to options',
  'app.options.panel.placeholder': 'This panel is coming soon.',
  'app.options.group.backends': 'Backends',
  'app.options.group.backends.summary': 'Connect and configure storage backends.',
  'app.options.group.account': 'Account',
  'app.options.group.account.summary': 'Connected identities per backend.',
  'app.options.group.appearance': 'Appearance',
  'app.options.group.appearance.summary': 'Theme and per-quadrant colors.',
  'app.options.group.defaults': 'Defaults',
  'app.options.group.defaults.summary': 'Default quadrant and sort for new tasks.',
  'app.options.group.data': 'Data',
  'app.options.group.data.summary': 'Export, import, and clear local cache.',
  'app.options.group.about': 'About',
  'app.options.group.about.summary': 'Version, build, and links.',
  'app.options.backends.lastSync.local': 'Always in sync (local writes are direct)',
  'app.options.backends.connect': 'Connect',
  'app.options.backends.comingLater': 'Coming later',
  'app.options.backends.future.google': 'Google Tasks',
  'app.options.backends.future.microsoft': 'Microsoft To-Do',
  'app.task.notFound': 'This task is no longer available.',
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
