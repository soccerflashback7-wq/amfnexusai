import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Send, Sparkles, Plus, MessageSquare, Loader2, Trash2, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  listConversations,
  createConversation,
  getConversation,
  deleteConversation,
  renameConversation,
} from "@/lib/conversations.functions";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "Chat — Nexus AI" }] }),
  component: ChatPage,
});

interface Citation {
  n: number;
  document_id: string;
  document_title: string;
  chunk_index: number;
  similarity: number;
}

interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

function ChatPage() {
  const listFn = useServerFn(listConversations);
  const createFn = useServerFn(createConversation);
  const getFn = useServerFn(getConversation);
  const deleteFn = useServerFn(deleteConversation);
  const renameFn = useServerFn(renameConversation);
  const qc = useQueryClient();

  const [activeId, setActiveId] = useState<string | null>(null);

  const convsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: () => listFn(),
  });

  const conversations = convsQuery.data?.conversations ?? [];

  // Auto-select first conversation, or create one
  useEffect(() => {
    if (!activeId && convsQuery.isSuccess) {
      if (conversations.length > 0) setActiveId(conversations[0].id);
    }
  }, [activeId, convsQuery.isSuccess, conversations]);

  const newConvMutation = useMutation({
    mutationFn: () => createFn({ data: { title: "New conversation" } }),
    onSuccess: (r) => {
      setActiveId(r.conversation.id);
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const deleteConvMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { conversation_id: id } }),
    onSuccess: (_d, id) => {
      if (activeId === id) setActiveId(null);
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <PageHeader title="Chat" description="Ask Nexus anything about your company knowledge." />

      <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="hidden flex-col rounded-2xl border bg-card/40 shadow-[var(--shadow-soft)] lg:flex">
          <div className="border-b p-3">
            <Button
              size="sm"
              className="w-full rounded-full"
              onClick={() => newConvMutation.mutate()}
              disabled={newConvMutation.isPending}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New chat
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {conversations.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No conversations yet
                </p>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={cn(
                      "group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      activeId === c.id
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-muted/60",
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate">{c.title}</span>
                    <Trash2
                      className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground/60 hover:text-destructive group-hover:block"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete conversation?")) deleteConvMutation.mutate(c.id);
                      }}
                    />
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Conversation */}
        <div className="flex min-h-0 flex-col rounded-2xl border bg-card/40 shadow-[var(--shadow-soft)]">
          {activeId ? (
            <ConversationView
              key={activeId}
              conversationId={activeId}
              getFn={getFn}
              renameFn={renameFn}
            />
          ) : (
            <EmptyChatState
              onStart={() => newConvMutation.mutate()}
              starting={newConvMutation.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyChatState({ onStart, starting }: { onStart: () => void; starting: boolean }) {
  return (
    <div className="flex flex-1 items-center justify-center p-12">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="h-5 w-5" />
        </div>
        <h2 className="mt-5 font-display text-xl font-semibold tracking-tight">
          Start a conversation
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Nexus answers using your indexed documents and cites sources inline.
        </p>
        <Button className="mt-5 rounded-full" onClick={onStart} disabled={starting}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> New chat
        </Button>
      </div>
    </div>
  );
}

function ConversationView({
  conversationId,
  getFn,
  renameFn,
}: {
  conversationId: string;
  getFn: ReturnType<typeof useServerFn<typeof getConversation>>;
  renameFn: ReturnType<typeof useServerFn<typeof renameConversation>>;
}) {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [liveMessages, setLiveMessages] = useState<UIMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const convQuery = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => getFn({ data: { conversation_id: conversationId } }),
  });

  const persisted: UIMessage[] = (convQuery.data?.messages ?? []).map((m: any) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    citations: Array.isArray(m.citations) ? (m.citations as Citation[]) : undefined,
  }));

  const messages = liveMessages.length > 0 ? liveMessages : persisted;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setStreaming(true);

    const base: UIMessage[] = [
      ...persisted,
      { id: `u-${Date.now()}`, role: "user", content: text },
      { id: `a-${Date.now()}`, role: "assistant", content: "" },
    ];
    setLiveMessages(base);

    // Rename conversation from first user message
    if (persisted.length === 0) {
      const title = text.slice(0, 60);
      renameFn({ data: { conversation_id: conversationId, title } }).then(() => {
        qc.invalidateQueries({ queryKey: ["conversations"] });
      });
    }

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ conversation_id: conversationId, message: text }),
      });

      if (!resp.ok || !resp.body) {
        const errText = await resp.text().catch(() => "");
        let errMsg = "Failed to send message";
        try {
          errMsg = JSON.parse(errText).error ?? errMsg;
        } catch {
          /* */
        }
        throw new Error(errMsg);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assistantText = "";
      let citations: Citation[] = [];
      let currentEvent: string | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line === "") {
            currentEvent = null;
            continue;
          }
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
            continue;
          }
          if (line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (currentEvent === "citations") {
            try {
              citations = JSON.parse(payload);
              setLiveMessages((m) => {
                const next = [...m];
                const last = next[next.length - 1];
                if (last?.role === "assistant") last.citations = citations;
                return next;
              });
            } catch {
              /* */
            }
            continue;
          }
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (typeof delta === "string") {
              assistantText += delta;
              setLiveMessages((m) => {
                const next = [...m];
                const last = next[next.length - 1];
                if (last?.role === "assistant") last.content = assistantText;
                return next;
              });
            }
          } catch {
            /* partial */
          }
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setStreaming(false);
      // Refresh persisted messages; clear live overlay
      await qc.invalidateQueries({ queryKey: ["conversation", conversationId] });
      setLiveMessages([]);
    }
  }

  return (
    <>
      <ScrollArea className="flex-1" ref={scrollRef as any}>
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
          {convQuery.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">
                How can I help today?
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Ask a question grounded in your knowledge base.
              </p>
            </div>
          ) : (
            messages.map((m) => <MessageBubble key={m.id} message={m} />)
          )}
          {streaming && messages[messages.length - 1]?.role === "assistant" && !messages[messages.length - 1].content && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t bg-background/60 p-4">
        <div className="relative mx-auto max-w-3xl">
          <Textarea
            placeholder="Message Nexus AI…"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="min-h-[52px] resize-none rounded-2xl border-border/70 pr-14 text-sm shadow-none focus-visible:ring-1"
            disabled={streaming}
          />
          <Button
            size="icon"
            className="absolute bottom-2 right-2 h-9 w-9 rounded-xl"
            aria-label="Send"
            onClick={handleSend}
            disabled={streaming || !input.trim()}
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-muted-foreground">
          Nexus can make mistakes. Verify important information.
        </p>
      </div>
    </>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted/60 text-foreground",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-pre:my-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || "…"}</ReactMarkdown>
          </div>
        )}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/40 pt-2.5">
            {message.citations.map((c) => (
              <Badge key={c.n} variant="secondary" className="gap-1 text-[10px] font-normal">
                <FileText className="h-2.5 w-2.5" /> [{c.n}] {c.document_title}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
