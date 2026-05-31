import { GrammarError } from '@/types/ielts';

export interface TextSegment {
  text: string;
  isError: boolean;
  errorIndex?: number;
  errorData?: GrammarError;
}

/**
 * Highlights error words/phrases in text by matching against a list of GrammarError objects.
 * Only marks specific error words, not whole lines.
 */
export function markErrorsInText(text: string, errors: GrammarError[]): TextSegment[] {
  if (!text || errors.length === 0) {
    return [{ text, isError: false }];
  }

  // Sort errors by original length (longest first) to avoid partial matches
  const sortedErrors = [...errors].sort((a, b) =>
    (b.original?.length || 0) - (a.original?.length || 0)
  );

  // Build matches for each error
  const matches: { index: number; length: number; error: GrammarError }[] = [];
  const textLower = text.toLowerCase();

  for (const err of sortedErrors) {
    if (!err.original) continue;
    const searchTerm = err.original.trim().toLowerCase();
    let pos = 0;
    while ((pos = textLower.indexOf(searchTerm, pos)) !== -1) {
      matches.push({
        index: pos,
        length: err.original.trim().length,
        error: err
      });
      pos += 1;
    }
  }

  // Sort matches by position
  matches.sort((a, b) => a.index - b.index);

  // Filter overlapping matches - keep only the first one at each position
  const filteredMatches: { index: number; length: number; error: GrammarError }[] = [];
  for (const m of matches) {
    const overlaps = filteredMatches.some(existing =>
      (m.index >= existing.index && m.index < existing.index + existing.length) ||
      (existing.index >= m.index && existing.index < m.index + m.length)
    );
    if (!overlaps) {
      filteredMatches.push(m);
    }
  }

  // Build segments
  let currentIndex = 0;
  const segments: TextSegment[] = [];

  for (const m of filteredMatches) {
    if (m.index >= currentIndex) {
      // Add text before match
      if (m.index > currentIndex) {
        segments.push({ text: text.slice(currentIndex, m.index), isError: false });
      }
      // Add error segment
      segments.push({
        text: text.slice(m.index, m.index + m.length),
        isError: true,
        errorData: m.error
      });
      currentIndex = m.index + m.length;
    }
  }

  // Add remaining text
  if (currentIndex < text.length) {
    segments.push({ text: text.slice(currentIndex), isError: false });
  }

  return segments.length > 0 ? segments : [{ text, isError: false }];
}

/**
 * Simpler version for string[] errors (e.g. examples array from grammatical_range)
 * Only marks specific error words/phrases, not whole lines.
 */
export function highlightText(text: string, errors: string[]): TextSegment[] {
  if (!text || errors.length === 0) {
    return [{ text, isError: false }];
  }

  // Sort errors by length (longest first) to avoid partial matches
  const sortedErrors = [...errors].sort((a, b) => b.length - a.length);

  // Build matches for each error string
  const matches: { index: number; length: number }[] = [];
  const textLower = text.toLowerCase();

  for (const err of sortedErrors) {
    if (!err) continue;
    const searchTerm = err.trim().toLowerCase();
    if (!searchTerm) continue;
    let pos = 0;
    while ((pos = textLower.indexOf(searchTerm, pos)) !== -1) {
      matches.push({
        index: pos,
        length: err.trim().length
      });
      pos += 1;
    }
  }

  // Sort matches by position
  matches.sort((a, b) => a.index - b.index);

  // Filter overlapping matches - keep only the first one at each position
  const filteredMatches: { index: number; length: number }[] = [];
  for (const m of matches) {
    const overlaps = filteredMatches.some(existing =>
      (m.index >= existing.index && m.index < existing.index + existing.length) ||
      (existing.index >= m.index && existing.index < m.index + m.length)
    );
    if (!overlaps) {
      filteredMatches.push(m);
    }
  }

  // Build segments
  let currentIndex = 0;
  const segments: TextSegment[] = [];

  for (const m of filteredMatches) {
    if (m.index >= currentIndex) {
      // Add text before match
      if (m.index > currentIndex) {
        segments.push({ text: text.slice(currentIndex, m.index), isError: false });
      }
      // Add error segment
      segments.push({
        text: text.slice(m.index, m.index + m.length),
        isError: true
      });
      currentIndex = m.index + m.length;
    }
  }

  // Add remaining text
  if (currentIndex < text.length) {
    segments.push({ text: text.slice(currentIndex), isError: false });
  }

  return segments.length > 0 ? segments : [{ text, isError: false }];
}