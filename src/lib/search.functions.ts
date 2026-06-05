import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { searchChunks } from "@/lib/chat.server";

export interface DocumentHit {
  type: "document";
  id: string;
  title: string;
  description: string | null;
  status: string;
  snippet?: string;
  similarity?: number;
}

export interface ConversationHit {
  type: "conversation";
  id: string;
  title: string;
  updated_at: string;
}

export interface ChunkHit {
  type: "chunk";
  document_id: string;
  document_title: string;
  chunk_index: number;
  snippet: string;
  similarity: number;
}

export interface SearchResults {
  documents: DocumentHit[];
  conversations: ConversationHit[];
  chunks: ChunkHit[];
}

export const globalSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string; semantic?: boolean }) => {
    const q = (input?.query ?? "").trim().slice(0, 200);
    return { query: q, semantic: !!input?.semantic };
  })
  .handler(async ({ data, context }): Promise<SearchResults> => {
    const { supabase } = context;
    const q = data.query;
    if (!q) return { documents: [], conversations: [], chunks: [] };

    const like = `%${q.replace(/[%_]/g, (m) => "\\" + m)}%`;

    const [docsRes, convsRes] = await Promise.all([
      supabase
        .from("documents")
        .select("id, title, description, status")
        .or(`title.ilike.${like},description.ilike.${like}`)
        .order("updated_at", { ascending: false })
        .limit(6),
      supabase
        .from("conversations")
        .select("id, title, updated_at")
        .ilike("title", like)
        .order("updated_at", { ascending: false })
        .limit(6),
    ]);

    const documents: DocumentHit[] = (docsRes.data ?? []).map((d) => ({
      type: "document",
      id: d.id,
      title: d.title,
      description: d.description,
      status: d.status,
    }));

    const conversations: ConversationHit[] = (convsRes.data ?? []).map((c) => ({
      type: "conversation",
      id: c.id,
      title: c.title,
      updated_at: c.updated_at,
    }));

    let chunks: ChunkHit[] = [];
    if (data.semantic && q.length >= 3) {
      try {
        const matched = await searchChunks(supabase, q, 5);
        chunks = matched.map((m) => ({
          type: "chunk",
          document_id: m.document_id,
          document_title: m.document_title,
          chunk_index: m.chunk_index,
          snippet: m.content.slice(0, 220),
          similarity: m.similarity,
        }));
      } catch {
        // Semantic search is best-effort; ignore failures
      }
    }

    return { documents, conversations, chunks };
  });
