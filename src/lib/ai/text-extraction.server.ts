// Extract plain text from an uploaded document buffer.
// Supports: text/plain, text/markdown, application/pdf.

export async function extractText(
  buffer: ArrayBuffer,
  mimeType: string | null | undefined,
  filename: string,
): Promise<string> {
  const mime = (mimeType || "").toLowerCase();
  const ext = filename.toLowerCase().split(".").pop() ?? "";

  if (mime.startsWith("text/") || ext === "txt" || ext === "md" || ext === "markdown") {
    return new TextDecoder("utf-8").decode(buffer);
  }

  if (mime === "application/pdf" || ext === "pdf") {
    const { extractText: pdfExtract, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await pdfExtract(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n\n") : text;
  }

  throw new Error(
    `Unsupported file type "${mime || ext || "unknown"}". Upload .txt, .md, or .pdf files.`,
  );
}
