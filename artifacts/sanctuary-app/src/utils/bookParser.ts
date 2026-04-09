import JSZip from 'jszip';
import type { BookChapter } from '@/lib/types';

// ─── HTML entity & stripping ──────────────────────────────────────────────────

const HTML_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>',
  '&quot;': '"', '&apos;': "'", '&#39;': "'", '&#160;': ' ',
  '&ldquo;': '\u201C', '&rdquo;': '\u201D', '&lsquo;': '\u2018', '&rsquo;': '\u2019',
  '&mdash;': '\u2014', '&ndash;': '\u2013', '&hellip;': '\u2026',
  '&times;': '\u00D7', '&copy;': '\u00A9', '&reg;': '\u00AE',
  '&trade;': '\u2122', '&bull;': '\u2022', '&middot;': '\u00B7',
};

function decodeEntities(s: string): string {
  return s
    .replace(/&[a-zA-Z]+;/g, m => HTML_ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function stripHtml(html: string): string {
  return decodeEntities(
    html
      // Remove entire head, style, script blocks
      .replace(/<head[\s\S]*?<\/head>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<svg[\s\S]*?<\/svg>/gi, '')
      // Block-level elements → paragraph break
      .replace(/<\/?(p|div|section|article|blockquote|figure|figcaption|li|dt|dd|h[1-6])[^>]*>/gi, '\n\n')
      // Inline line breaks
      .replace(/<br\s*\/?>/gi, '\n')
      // Remove all remaining tags
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Collapse excessive blank lines
    .replace(/\n[ \t]*\n[ \t]*\n+/g, '\n\n')
    // Remove leading whitespace from each line (indents from HTML)
    .split('\n').map(l => l.trimStart()).join('\n')
    .trim();
}

// ─── Chapter detection ────────────────────────────────────────────────────────

// Matches common Chinese and English chapter heading formats
const CHAPTER_RE = new RegExp(
  [
    // Chinese novel formats
    '^(?:第[零○〇一二三四五六七八九十百千万亿\\d]+[章节回集部卷篇]',
    '|第[\\d]+章',
    '|[【\\[【][^\\]】]{1,20}[】\\]】]',           // 【第X章】 style
    '|卷[一二三四五六七八九十百千万\\d]+',
    '|序章|楔子|番外|后记|尾声|前言|引子|附录|外传|插曲|间章',
    // English formats
    '|Chapter\\s+[\\dIVXLCDM]+',
    '|CHAPTER\\s+[\\dIVXLCDM]+',
    '|Part\\s+[\\dIVXLCDM]+',
    '|PART\\s+[\\dIVXLCDM]+',
    '|Prologue|Epilogue|Appendix|Introduction|Preface',
    '|[A-Z][A-Z\\s]{2,30})[^\\n]*$',  // ALL-CAPS short line
  ].join(''),
  'u',
);

function detectChapters(text: string): BookChapter[] {
  const lines = text.split('\n');
  const chapters: BookChapter[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];
  let idx = 0;

  const flush = () => {
    const content = currentLines.join('\n').trim();
    if (content) {
      chapters.push({ id: `ch-${idx++}`, title: currentTitle || `Part ${idx}`, content });
    }
    currentLines = [];
  };

  let firstChapterFound = false;
  const preambleLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (CHAPTER_RE.test(trimmed) && trimmed.length <= 60) {
      if (!firstChapterFound && preambleLines.some(l => l.trim())) {
        // Save preamble as a "前言" chapter
        chapters.push({ id: `ch-${idx++}`, title: '前言', content: preambleLines.join('\n').trim() });
      }
      firstChapterFound = true;
      flush();
      currentTitle = trimmed;
    } else {
      if (!firstChapterFound) {
        preambleLines.push(line);
      } else {
        currentLines.push(line);
      }
    }
  }

  flush();

  // If nothing detected (or only 1 tiny chunk), auto-split by size
  const totalLen = text.length;
  if ((chapters.length <= 1 && totalLen > 8000) || chapters.length === 0) {
    const CHUNK = 4000;
    const result: BookChapter[] = [];
    let pos = 0;
    while (pos < text.length) {
      let end = pos + CHUNK;
      if (end < text.length) {
        // Snap to next paragraph break (prefer double newline)
        const snap = text.indexOf('\n\n', end);
        if (snap !== -1 && snap < end + 800) end = snap;
      } else {
        end = text.length;
      }
      const content = text.slice(pos, end).trim();
      if (content) {
        result.push({ id: `ch-${result.length}`, title: `Part ${result.length + 1}`, content });
      }
      pos = end + 1;
    }
    return result.length ? result : [{ id: 'ch-0', title: 'Content', content: text }];
  }

  return chapters.length ? chapters : [{ id: 'ch-0', title: 'Content', content: text }];
}

// ─── TXT parser ───────────────────────────────────────────────────────────────

export async function parseTxt(file: File): Promise<{ title: string; author: string; chapters: BookChapter[] }> {
  const raw = await file.text();

  // Strip BOM
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Extract title/author from filename: "Author - Title.txt" or just "Title.txt"
  const name = file.name.replace(/\.[^.]+$/, '');
  const dashIdx = name.indexOf(' - ');
  const author = dashIdx !== -1 ? name.substring(0, dashIdx).trim() : 'Unknown';
  const title  = dashIdx !== -1 ? name.substring(dashIdx + 3).trim() : name;

  // Try to detect title/author from first few lines of file
  const firstLines = text.split('\n').slice(0, 5).map(l => l.trim()).filter(Boolean);
  const detectedTitle  = firstLines[0] && firstLines[0].length < 60 ? firstLines[0] : title;
  const detectedAuthor = firstLines[1] && firstLines[1].length < 40 && firstLines[1].startsWith('作者') 
    ? firstLines[1].replace(/^作者[：:]\s*/, '') 
    : author;

  const chapters = detectChapters(text);
  return { title: detectedTitle, author: detectedAuthor, chapters };
}

// ─── EPUB parser ──────────────────────────────────────────────────────────────

function resolveEpubPath(base: string, relative: string): string {
  // Handle paths with ../ or ./
  if (!base) return relative;
  const parts = base.split('/');
  parts.pop(); // remove filename
  for (const seg of relative.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

export async function parseEpub(file: File): Promise<{ title: string; author: string; chapters: BookChapter[] }> {
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  // 1. Find OPF via container.xml
  const containerXml = await zip.file('META-INF/container.xml')?.async('string') ?? '';
  const opfMatch = containerXml.match(/full-path="([^"]+)"/i);
  if (!opfMatch) throw new Error('Invalid EPUB: OPF not found in container.xml');
  const opfPath = opfMatch[1];
  const opfDir  = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  // 2. Read OPF
  const opfXml = await zip.file(opfPath)?.async('string') ?? '';
  if (!opfXml) throw new Error('Could not read OPF file');

  // 3. Metadata
  const getTag = (xml: string, tag: string) => {
    const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`, 'i'));
    return m ? decodeEntities(m[1].trim()) : '';
  };
  const title  = getTag(opfXml, 'dc:title')   || file.name.replace(/\.[^.]+$/, '');
  const author = getTag(opfXml, 'dc:creator') || 'Unknown';

  // 4. Manifest: id → href (resolve relative to OPF dir)
  const manifest: Record<string, { href: string; mediaType: string }> = {};
  for (const m of opfXml.matchAll(/<item\b([^>]*)>/gi)) {
    const attrs = m[1];
    const idMatch        = attrs.match(/\bid="([^"]+)"/);
    const hrefMatch      = attrs.match(/\bhref="([^"]+)"/);
    const mediaTypeMatch = attrs.match(/\bmedia-type="([^"]+)"/);
    if (idMatch && hrefMatch) {
      const href = decodeURIComponent(hrefMatch[1]);
      manifest[idMatch[1]] = {
        href: resolveEpubPath(opfPath, href),
        mediaType: mediaTypeMatch?.[1] ?? '',
      };
    }
  }

  // 5. Spine order
  const spineIds: string[] = [];
  for (const m of opfXml.matchAll(/<itemref\b[^>]*\bidref="([^"]+)"/gi)) {
    spineIds.push(m[1]);
  }

  // 6. TOC titles — try EPUB3 nav.xhtml first, then EPUB2 toc.ncx
  const tocTitles: Record<string, string> = {};

  const navItem = Object.values(manifest).find(
    v => v.mediaType.includes('xhtml') && (v.href.includes('nav') || v.href.includes('toc'))
  );
  if (navItem) {
    const navHtml = await zip.file(navItem.href)?.async('string') ?? '';
    // EPUB3 nav: <a href="chapter.xhtml">Chapter Title</a>
    for (const m of navHtml.matchAll(/<a\s[^>]*href="([^"#]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)) {
      const href  = decodeURIComponent(m[1].trim());
      const label = stripHtml(m[2]).trim();
      if (label) {
        tocTitles[href] = label;
        tocTitles[href.split('/').pop() ?? href] = label;
      }
    }
  }

  const ncxItem = Object.values(manifest).find(v => v.href.endsWith('.ncx'));
  if (ncxItem) {
    const ncx = await zip.file(ncxItem.href)?.async('string') ?? '';
    // EPUB2 ncx: navPoint with text + content src
    for (const m of ncx.matchAll(/<navPoint[\s\S]*?<text>([\s\S]*?)<\/text>[\s\S]*?<content\s+src="([^"#]+)/gi)) {
      const label = decodeEntities(m[1].trim());
      const src   = decodeURIComponent(m[2].trim());
      if (label && src) {
        tocTitles[src] = label;
        tocTitles[src.split('/').pop() ?? src] = label;
      }
    }
  }

  // 7. Extract chapters from spine, skipping nav/cover items
  const SKIP_TYPES = ['application/x-dtbncx+xml', 'image/', 'text/css'];
  const SKIP_HREFS_RE = /\b(nav|cover|toc|ncx)\b/i;

  const chapters: BookChapter[] = [];
  for (const id of spineIds) {
    const item = manifest[id];
    if (!item) continue;
    if (SKIP_TYPES.some(t => item.mediaType.startsWith(t))) continue;

    const htmlContent = await zip.file(item.href)?.async('string') ?? '';
    if (!htmlContent) continue;

    const text = stripHtml(htmlContent);
    if (text.trim().length < 30) continue; // Skip empty/tiny pages

    // Determine chapter title
    const hrefBase = item.href.split('/').pop() ?? item.href;
    let chTitle = tocTitles[item.href] ?? tocTitles[hrefBase] ?? '';

    if (!chTitle) {
      // Try heading tag from HTML
      const hMatch = htmlContent.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
      if (hMatch) chTitle = stripHtml(hMatch[1]).trim();
    }

    // Skip if this looks like a nav page and has little content
    if (!chTitle && SKIP_HREFS_RE.test(hrefBase) && text.length < 200) continue;

    chTitle = chTitle || `Chapter ${chapters.length + 1}`;
    chapters.push({ id: `ch-${chapters.length}`, title: chTitle, content: text });
  }

  if (!chapters.length) {
    throw new Error('EPUB parsed but no readable chapters found');
  }

  return { title, author, chapters };
}
