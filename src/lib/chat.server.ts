// Server-only helpers for RAG retrieval. Imported only from server routes
// or serverFn handlers — never from client code.
import type { SupabaseClient } from "@supabase/supabase-js";
import { embedOne } from "@/lib/ai/embeddings.server";

export interface MatchedChunk {
  chunk_id: string;
  document_id: string;
  document_title: string;
  chunk_index: number;
  content: string;
  similarity: number;
}

export async function searchChunks(
  supabase: SupabaseClient<any, any, any>,
  query: string,
  matchCount = 6,
): Promise<MatchedChunk[]> {
  const embedding = await embedOne(query);
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: embedding as unknown as string,
    match_count: matchCount,
    min_similarity: 0.3,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as MatchedChunk[];
}
