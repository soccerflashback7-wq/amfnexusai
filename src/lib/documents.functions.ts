import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { embedMany, embedOne } from "@/lib/ai/embeddings.server";
import { chunkText } from "@/lib/ai/chunking.server";
import { extractText } from "@/lib/ai/text-extraction.server";

// -------------------------------------------------------------------
// List documents (visible to all approved users)
// -------------------------------------------------------------------
export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("documents")
      .select("id,title,description,mime_type,size_bytes,status,error_message,chunk_count,created_at,owner_id")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { documents: data ?? [] };
  });

// -------------------------------------------------------------------
// Create a document record + return signed upload URL for the client
// -------------------------------------------------------------------
const createUploadSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  filename: z.string().min(1).max(255),
  mime_type: z.string().max(120).optional().nullable(),
  size_bytes: z.number().int().nonnegative().max(50 * 1024 * 1024), // 50 MB
});

export const createDocumentUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createUploadSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const safeName = data.filename.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const path = `${userId}/${crypto.randomUUID()}-${safeName}`;

    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .insert({
        owner_id: userId,
        title: data.title,
        description: data.description ?? null,
        storage_path: path,
        mime_type: data.mime_type ?? null,
        size_bytes: data.size_bytes,
        status: "uploading",
      })
      .select()
      .single();
    if (docErr) throw new Error(docErr.message);

    const { data: signed, error: signErr } = await supabase.storage
      .from("documents")
      .createSignedUploadUrl(path);
    if (signErr) throw new Error(signErr.message);

    return { document: doc, upload: signed };
  });

// -------------------------------------------------------------------
// Ingest: download file, extract text, chunk, embed, insert chunks
// -------------------------------------------------------------------
export const ingestDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ document_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: doc, error: dErr } = await supabase
      .from("documents")
      .select("*")
      .eq("id", data.document_id)
      .single();
    if (dErr || !doc) throw new Error(dErr?.message ?? "Document not found");

    await supabase.from("documents").update({ status: "processing", error_message: null }).eq("id", doc.id);

    try {
      const { data: file, error: dlErr } = await supabase.storage.from("documents").download(doc.storage_path);
      if (dlErr || !file) throw new Error(dlErr?.message ?? "Failed to download file");
      const buf = await file.arrayBuffer();

      const text = await extractText(buf, doc.mime_type, doc.title);
      if (!text.trim()) throw new Error("No text content could be extracted from this file.");

      const chunks = chunkText(text);
      if (chunks.length === 0) throw new Error("Document produced no usable chunks.");

      const embeddings = await embedMany(chunks.map((c) => c.content));

      // Replace any prior chunks for idempotency.
      await supabase.from("document_chunks").delete().eq("document_id", doc.id);

      const rows = chunks.map((c, i) => ({
        document_id: doc.id,
        chunk_index: c.index,
        content: c.content,
        token_count: Math.ceil(c.content.length / 4),
        embedding: embeddings[i] as unknown as string, // pgvector accepts number[]; cast satisfies generated types
      }));

      const { error: insErr } = await supabase.from("document_chunks").insert(rows);
      if (insErr) throw new Error(insErr.message);

      await supabase
        .from("documents")
        .update({ status: "ready", chunk_count: chunks.length, error_message: null })
        .eq("id", doc.id);

      return { ok: true, chunk_count: chunks.length };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      await supabase.from("documents").update({ status: "failed", error_message: message }).eq("id", doc.id);
      throw new Error(message);
    }
  });

// -------------------------------------------------------------------
// Delete a document (cascades chunks; also removes the storage object)
// -------------------------------------------------------------------
export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ document_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: doc, error: dErr } = await supabase
      .from("documents")
      .select("id,storage_path")
      .eq("id", data.document_id)
      .single();
    if (dErr || !doc) throw new Error(dErr?.message ?? "Document not found");

    await supabase.storage.from("documents").remove([doc.storage_path]);
    const { error: delErr } = await supabase.from("documents").delete().eq("id", doc.id);
    if (delErr) throw new Error(delErr.message);
    return { ok: true };
  });

// -------------------------------------------------------------------
// Used by chat: embed a query and find similar chunks
// -------------------------------------------------------------------
export async function searchChunks(supabase: ReturnType<typeof requireSupabaseAuth> extends never ? never : any, query: string, matchCount = 6) {
  const embedding = await embedOne(query);
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: embedding as unknown as string,
    match_count: matchCount,
    min_similarity: 0.3,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}
