import { describe, expect, it } from 'vitest';

import { decodeEmbeddedFields, encodeEmbeddedFields } from '../src/notes-encoding.ts';

describe('notes-encoding', () => {
  it('round-trips priority, dueTime, and tags', () => {
    const notes = encodeEmbeddedFields('Hello world', {
      priority: 'high',
      dueTime: '14:30',
      tags: ['work', 'home'],
    });
    expect(notes).toContain('Hello world');
    expect(notes).toContain('<!--emt:v1');
    const decoded = decodeEmbeddedFields(notes);
    expect(decoded.userNotes).toBe('Hello world');
    expect(decoded.fields.priority).toBe('high');
    expect(decoded.fields.dueTime).toBe('14:30');
    expect(decoded.fields.tags).toEqual(['work', 'home']);
  });

  it('escapes special characters in values', () => {
    const notes = encodeEmbeddedFields('', { priority: 'a=b c' });
    const decoded = decodeEmbeddedFields(notes);
    expect(decoded.fields.priority).toBe('a=b c');
  });

  it('clears fields with null', () => {
    const prev = encodeEmbeddedFields('n', { priority: 'high', dueTime: '09:00' });
    const next = encodeEmbeddedFields('n', { priority: null }, prev);
    const decoded = decodeEmbeddedFields(next);
    expect(decoded.fields.priority).toBeUndefined();
    expect(decoded.fields.dueTime).toBe('09:00');
  });

  it('strips markers from user-visible notes', () => {
    const raw = 'Body\n<!--emt:v1 priority=low-->';
    expect(decodeEmbeddedFields(raw).userNotes).toBe('Body');
  });
});
