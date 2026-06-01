// Naive but reliable character-based chunker with overlap.
// 1000-char chunks with 150-char overlap is a good general default for RAG.

export interface Chunk {
  index: number;
  content: string;
}

export function chunkText(
  text: string,
  { size = 1000, overlap = 150 }: { size?: number; overlap?: number } = {},
): Chunk[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\s+\n/g, "\n").trim();
  if (!normalized) return [];

  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;
  while (start < normalized.length) {
    const end = Math.min(start + size, normalized.length);
    let slice = normalized.slice(start, end);
    // Try to break on a sentence/paragraph boundary if not at the end.
    if (end < normalized.length) {
      const breakAt = Math.max(
        slice.lastIndexOf("\n\n"),
        slice.lastIndexOf(". "),
        slice.lastIndexOf("\n"),
      );
      if (breakAt > size * 0.5) slice = slice.slice(0, breakAt + 1);
    }
    const content = slice.trim();
    if (content) chunks.push({ index: index++, content });
    start += slice.length - overlap;
    if (slice.length <= overlap) break; // safety
  }
  return chunks;
}
