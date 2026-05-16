/**
 * Inline markdown marker helpers for the note editor's selection toolbar.
 *
 * Extracted from NoteEditor so the component stays focused on UI.
 */

export const MARKERS = {
  bold: '**',
  italic: '_',
  highlight: '==',
} as const;

export type FormatKey = keyof typeof MARKERS;

/** True when text[start..end] is wrapped by `marker` on both sides. */
export function isWrapped(text: string, start: number, end: number, marker: string): boolean {
  const m = marker.length;
  return (
    start >= m &&
    end <= text.length - m &&
    text.substring(start - m, start) === marker &&
    text.substring(end, end + m) === marker
  );
}

/**
 * Toggle `marker` around text[start..end]. If already wrapped, strip; otherwise
 * insert. Returns the new content plus the new selection range.
 */
export function toggleMarker(content: string, start: number, end: number, marker: string): {
  newContent: string;
  newStart: number;
  newEnd: number;
} {
  const m = marker.length;
  if (isWrapped(content, start, end, marker)) {
    return {
      newContent: content.substring(0, start - m) + content.substring(start, end) + content.substring(end + m),
      newStart: start - m,
      newEnd: end - m,
    };
  }
  return {
    newContent: content.substring(0, start) + marker + content.substring(start, end) + marker + content.substring(end),
    newStart: start + m,
    newEnd: end + m,
  };
}

/** Strip every recognized marker from text[start..end]. */
export function clearAllMarkers(content: string, start: number, end: number): string {
  const cleaned = content
    .substring(start, end)
    .replace(/\*\*/g, '')
    .replace(/==/g, '')
    .replace(/_/g, '');
  return content.substring(0, start) + cleaned + content.substring(end);
}
