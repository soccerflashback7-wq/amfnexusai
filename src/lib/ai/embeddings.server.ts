// Server-only helpers for calling the Lovable AI Gateway embeddings endpoint.
// Uses openai/text-embedding-3-small at 1536 dims (matches vector(1536) column
// and is within pgvector's HNSW dimension limit).

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
export const EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const EMBEDDING_DIMS = 1536;

export interface EmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  usage: { prompt_tokens: number; total_tokens: number };
}

async function callEmbeddings(input: string | string[]): Promise<EmbeddingResponse> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input,
      dimensions: EMBEDDING_DIMS,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Embedding request failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function embedOne(text: string): Promise<number[]> {
  const r = await callEmbeddings(text);
  return r.data[0].embedding;
}

export async function embedMany(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  // Batch in groups of 32 to stay safely under provider limits.
  const out: number[][] = [];
  const batchSize = 32;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const r = await callEmbeddings(batch);
    const sorted = [...r.data].sort((a, b) => a.index - b.index);
    out.push(...sorted.map((d) => d.embedding));
  }
  return out;
}
