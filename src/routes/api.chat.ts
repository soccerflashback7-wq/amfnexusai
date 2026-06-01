import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { searchChunks } from "@/lib/chat.server";

const bodySchema = z.object({
  conversation_id: z.string().uuid(),
  message: z.string().min(1).max(8000),
});

const CHAT_MODEL = "google/gemini-3-flash-preview";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization");
          if (!authHeader?.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
          }
          const token = authHeader.slice(7);

          const SUPABASE_URL = process.env.SUPABASE_URL!;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
          const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
          if (!LOVABLE_API_KEY) {
            return new Response(JSON.stringify({ error: "AI is not configured" }), { status: 500 });
          }

          const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });

          const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
          if (claimsErr || !claimsData?.claims?.sub) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
          }
          const userId = claimsData.claims.sub;

          const raw = await request.json();
          const { conversation_id, message } = bodySchema.parse(raw);

          // Verify user owns the conversation
          const { data: conv, error: convErr } = await supabase
            .from("conversations")
            .select("id,user_id")
            .eq("id", conversation_id)
            .single();
          if (convErr || !conv || conv.user_id !== userId) {
            return new Response(JSON.stringify({ error: "Conversation not found" }), { status: 404 });
          }

          // Persist user message
          const { error: insUserErr } = await supabase.from("messages").insert({
            conversation_id,
            role: "user",
            content: message,
          });
          if (insUserErr) {
            return new Response(JSON.stringify({ error: insUserErr.message }), { status: 500 });
          }

          // Load recent history (for multi-turn context)
          const { data: history } = await supabase
            .from("messages")
            .select("role,content")
            .eq("conversation_id", conversation_id)
            .order("created_at", { ascending: true })
            .limit(20);

          // Retrieve relevant chunks
          const matched = await searchChunks(supabase, message, 6);

          const contextBlock = matched.length
            ? matched
                .map(
                  (c, i) =>
                    `[Source ${i + 1}: ${c.document_title} • chunk ${c.chunk_index}]\n${c.content}`,
                )
                .join("\n\n---\n\n")
            : "(no relevant documents found)";

          const systemPrompt = `You are Nexus, an internal company knowledge assistant.
Answer the user's question using ONLY the provided sources when relevant. Cite
sources inline as [1], [2], etc. matching the Source numbers below. If the
sources do not contain the answer, say so plainly and offer general guidance.
Keep answers concise and well-formatted in Markdown.

SOURCES:
${contextBlock}`;

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: CHAT_MODEL,
              stream: true,
              messages: [
                { role: "system", content: systemPrompt },
                ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
              ],
            }),
          });

          if (!aiRes.ok || !aiRes.body) {
            const errText = await aiRes.text().catch(() => "");
            const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
            const errMsg =
              aiRes.status === 429
                ? "Rate limit reached. Please try again in a moment."
                : aiRes.status === 402
                  ? "AI credits exhausted. Please add credits in workspace settings."
                  : `AI gateway error: ${errText || aiRes.statusText}`;
            return new Response(JSON.stringify({ error: errMsg }), { status });
          }

          const citations = matched.map((c, i) => ({
            n: i + 1,
            document_id: c.document_id,
            document_title: c.document_title,
            chunk_index: c.chunk_index,
            similarity: c.similarity,
          }));

          // Stream upstream SSE through to client, capturing assistant text along the way.
          const encoder = new TextEncoder();
          const decoder = new TextDecoder();
          let assistantText = "";

          const stream = new ReadableStream({
            async start(controller) {
              // Emit a custom citations event up front for the UI.
              controller.enqueue(
                encoder.encode(`event: citations\ndata: ${JSON.stringify(citations)}\n\n`),
              );

              const reader = aiRes.body!.getReader();
              let buffer = "";
              try {
                while (true) {
                  const { value, done } = await reader.read();
                  if (done) break;
                  const chunk = decoder.decode(value, { stream: true });
                  buffer += chunk;
                  // Pass through to client as-is
                  controller.enqueue(value);

                  // Parse for assistant text to persist later
                  let nl;
                  while ((nl = buffer.indexOf("\n")) !== -1) {
                    let line = buffer.slice(0, nl);
                    buffer = buffer.slice(nl + 1);
                    if (line.endsWith("\r")) line = line.slice(0, -1);
                    if (!line.startsWith("data: ")) continue;
                    const payload = line.slice(6).trim();
                    if (payload === "[DONE]") continue;
                    try {
                      const parsed = JSON.parse(payload);
                      const delta = parsed.choices?.[0]?.delta?.content;
                      if (typeof delta === "string") assistantText += delta;
                    } catch {
                      // partial chunk; safe to ignore for persistence purposes
                    }
                  }
                }
              } catch (e) {
                console.error("chat stream error:", e);
              } finally {
                controller.close();
                // Persist assistant message (fire-and-forget)
                if (assistantText.trim()) {
                  await supabase.from("messages").insert({
                    conversation_id,
                    role: "assistant",
                    content: assistantText,
                    citations: citations as any,
                  });
                  await supabase
                    .from("conversations")
                    .update({ updated_at: new Date().toISOString() })
                    .eq("id", conversation_id);
                }
              }
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          console.error("/api/chat error:", e);
          return new Response(JSON.stringify({ error: msg }), { status: 500 });
        }
      },
    },
  },
});
