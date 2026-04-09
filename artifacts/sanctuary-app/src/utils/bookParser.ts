import JSZip from 'jszip';
import type { BookChapter } from '@/lib/types';

// ─── Text helpers ─────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Chapter detection patterns (Chinese + English)
const CHAPTER_RE = /^(?:第[零一二三四五六七八九十百千万\d]+[章节回集部卷篇]|Chapter\s+\d+|CHAPTER\s+\d+|第\d+章|卷[一二三四五六七八九十]+|Part\s+\d+|PART\s+\d+)[^\n]*/;

function detectChapters(text: string): BookChapter[] {
  const lines = text.split('\n');
  const chapters: BookChapter[] = [];
  let currentTitle = 'Part 1';
  let currentLines: string[] = [];
  let chapterIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (CHAPTER_RE.test(trimmed) && trimmed.length < 80) {
      if (currentLines.some(l => l.trim())) {
        chapters.push({
          id: `ch-${chapterIndex++}`,
          title: currentTitle,
          content: currentLines.join('\n').trim(),
        });
      }
      currentTitle = trimmed;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.some(l => l.trim())) {
    chapters.push({
      id: `ch-${chapterIndex++}`,
      title: currentTitle,
      content: currentLines.join('\n').trim(),
    });
  }

  // If no chapters detected, split into chunks of ~3000 chars for readability
  if (chapters.length <= 1 && text.length > 6000) {
    const CHUNK = 3000;
    const result: BookChapter[] = [];
    for (let i = 0; i < text.length; i += CHUNK) {
      // Snap to next paragraph break
      let end = i + CHUNK;
      const snap = text.indexOf('\n\n', end);
      if (snap !== -1 && snap < end + 500) end = snap;
      result.push({
        id: `ch-${result.length}`,
        title: `Part ${result.length + 1}`,
        content: text.slice(i, end).trim(),
      });
    }
    return result;
  }

  return chapters.length ? chapters : [{ id: 'ch-0', title: 'Content', content: text }];
}

// ─── TXT parser ───────────────────────────────────────────────────────────────

export async function parseTxt(file: File): Promise<{ title: string; author: string; chapters: BookChapter[] }> {
  const text = await file.text();
  const name = file.name.replace(/\.[^.]+$/, '');
  const dashIdx = name.indexOf(' - ');
  const title  = dashIdx !== -1 ? name.substring(dashIdx + 3).trim() : name;
  const author = dashIdx !== -1 ? name.substring(0, dashIdx).trim() : 'Unknown';
  const chapters = detectChapters(text);
  return { title, author, chapters };
}

// ─── EPUB parser ──────────────────────────────────────────────────────────────

export async function parseEpub(file: File): Promise<{ title: string; author: string; chapters: BookChapter[] }> {
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  // 1. Read container.xml to find OPF path
  const containerXml = await zip.file('META-INF/container.xml')?.async('string') ?? '';
  const opfPathMatch = containerXml.match(/full-path="([^"]+\.opf)"/i);
  if (!opfPathMatch) throw new Error('Invalid EPUB: no OPF found');
  const opfPath = opfPathMatch[1];
  const opfDir  = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  // 2. Read OPF
  const opfXml = await zip.file(opfPath)?.async('string') ?? '';

  // 3. Extract metadata
  const titleMatch  = opfXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
  const authorMatch = opfXml.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
  const title  = titleMatch  ? titleMatch[1].trim()  : file.name.replace(/\.[^.]+$/, '');
  const author = authorMatch ? authorMatch[1].trim() : 'Unknown';

  // 4. Build manifest map: id → href
  const manifest: Record<string, string> = {};
  for (const m of opfXml.matchAll(/<item\s[^>]*id="([^"]+)"[^>]*href="([^"]+)"[^>]*/gi)) {
    manifest[m[1]] = m[2];
  }

  // 5. Get spine order
  const spineIds: string[] = [];
  for (const m of opfXml.matchAll(/<itemref\s[^>]*idref="([^"]+)"/gi)) {
    spineIds.push(m[1]);
  }

  // 6. Try to get TOC titles from toc.ncx or nav.xhtml
  const tocTitles: Record<string, string> = {};
  const ncxFile = Object.values(manifest).find(h => h.endsWith('.ncx'));
  if (ncxFile) {
    const ncx = await zip.file(opfDir + ncxFile)?.async('string') ?? '';
    for (const m of ncx.matchAll(/<navPoint[^>]*>[\s\S]*?<text>([^<]+)<\/text>[\s\S]*?<content\s+src="([^"#]+)/gi)) {
      tocTitles[m[2].trim()] = m[1].trim();
    }
  }

  // 7. Extract chapters from spine
  const chapters: BookChapter[] = [];
  for (const id of spineIds) {
    const href = manifest[id];
    if (!href) continue;
    const htmlContent = await zip.file(opfDir + href)?.async('string') ?? '';
    if (!htmlContent) continue;
    const text = stripHtml(htmlContent);
    if (!text.trim()) continue;

    const hrefBase = href.includes('/') ? href.substring(href.lastIndexOf('/') + 1) : href;
    const tocTitle = tocTitles[href] ?? tocTitles[hrefBase] ?? '';

    // Try to detect heading within the content
    const headingMatch = htmlContent.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/i);
    const chapterTitle = tocTitle || (headingMatch ? stripHtml(headingMatch[1]) : '') || `Chapter ${chapters.length + 1}`;

    chapters.push({ id: `ch-${chapters.length}`, title: chapterTitle, content: text });
  }

  return { title, author, chapters: chapters.length ? chapters : [{ id: 'ch-0', title: 'Content', content: 'Could not parse content.' }] };
}
