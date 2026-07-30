/**
 * Minimal safe Markdown → HTML for the notes preview toggle.
 *
 * Intentionally small (no dependency): headings, lists, bold/italic,
 * inline code, fenced blocks, and http(s) links. Everything is HTML-
 * escaped first so raw tags never pass through.
 */

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function inlineFormat(escaped: string): string {
  let s = escaped;
  // code first so emphasis markers inside code stay literal
  s = s.replaceAll(/`([^`\n]+)`/g, '<code>$1</code>');
  s = s.replaceAll(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replaceAll(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  s = s.replaceAll(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>',
  );
  return s;
}

/**
 * Render a Markdown subset to an HTML string safe for `dangerouslySetInnerHTML`.
 */
export function renderMarkdownPreview(source: string): string {
  if (source.trim() === '') return '';

  const lines = source.replaceAll(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  let inCode = false;
  const codeBuf: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const closeList = (): void => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i] ?? '';

    if (line.startsWith('```')) {
      if (inCode) {
        out.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
        codeBuf.length = 0;
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      i += 1;
      continue;
    }

    if (inCode) {
      codeBuf.push(line);
      i += 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      closeList();
      const level = heading[1]!.length;
      out.push(`<h${level}>${inlineFormat(escapeHtml(heading[2]!))}</h${level}>`);
      i += 1;
      continue;
    }

    const ul = /^[-*]\s+(.+)$/.exec(line);
    if (ul) {
      if (listType !== 'ul') {
        closeList();
        out.push('<ul>');
        listType = 'ul';
      }
      out.push(`<li>${inlineFormat(escapeHtml(ul[1]!))}</li>`);
      i += 1;
      continue;
    }

    const ol = /^(\d+)\.\s+(.+)$/.exec(line);
    if (ol) {
      if (listType !== 'ol') {
        closeList();
        out.push('<ol>');
        listType = 'ol';
      }
      out.push(`<li>${inlineFormat(escapeHtml(ol[2]!))}</li>`);
      i += 1;
      continue;
    }

    if (line.trim() === '') {
      closeList();
      i += 1;
      continue;
    }

    closeList();
    out.push(`<p>${inlineFormat(escapeHtml(line))}</p>`);
    i += 1;
  }

  if (inCode) {
    out.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
  }
  closeList();
  return out.join('');
}
