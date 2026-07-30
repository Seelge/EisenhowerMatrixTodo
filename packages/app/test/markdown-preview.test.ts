import { describe, expect, it } from 'vitest';

import { renderMarkdownPreview } from '../src/views/task/markdown-preview.ts';

describe('renderMarkdownPreview', () => {
  it('returns empty for blank input', () => {
    expect(renderMarkdownPreview('')).toBe('');
    expect(renderMarkdownPreview('   \n')).toBe('');
  });

  it('escapes raw HTML', () => {
    const html = renderMarkdownPreview('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders headings, emphasis, lists, and safe links', () => {
    const src = [
      '# Title',
      '',
      'Hello **bold** and *italic* and `code`',
      '',
      '- one',
      '- two',
      '',
      'See [docs](https://example.com/x)',
      'Skip [bad](javascript:alert(1))',
    ].join('\n');
    const html = renderMarkdownPreview(src);
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('href="https://example.com/x"');
    expect(html).not.toMatch(/href=["']javascript:/i);
  });

  it('renders fenced code blocks', () => {
    const html = renderMarkdownPreview('```\nconst x = 1;\n```');
    expect(html).toContain('<pre><code>');
    expect(html).toContain('const x = 1;');
  });
});
