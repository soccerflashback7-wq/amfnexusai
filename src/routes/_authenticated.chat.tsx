import { createFileRoute } from "@tanstack/react-router";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "Chat — Nexus AI" }] }),
  component: ChatPage,
});

function ChatPage() {
  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <PageHeader title="Chat" description="Ask Nexus anything about your company knowledge." />

      <div className="flex flex-1 flex-col rounded-2xl border bg-card/40 shadow-[var(--shadow-soft)]">
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="mt-5 font-display text-xl font-semibold tracking-tight">
              How can I help today?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              AI responses will appear here once the assistant is connected. Try a prompt below to
              preview the experience.
            </p>
          </div>
        </div>

        <div className="border-t bg-background/60 p-4">
          <div className="relative mx-auto max-w-3xl">
            <Textarea
              placeholder="Message Nexus AI…"
              rows={1}
              className="min-h-[52px] resize-none rounded-2xl border-border/70 pr-14 text-sm shadow-none focus-visible:ring-1"
            />
            <Button
              size="icon"
              className="absolute bottom-2 right-2 h-9 w-9 rounded-xl"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-muted-foreground">
            Nexus can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
