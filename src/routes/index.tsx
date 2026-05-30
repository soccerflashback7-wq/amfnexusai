import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, BookOpen, MessagesSquare, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexus AI — Your company's collective intelligence" },
      {
        name: "description",
        content:
          "An AI-powered internal knowledge assistant. Search documents, chat with your knowledge base, and unlock institutional memory.",
      },
      { property: "og:title", content: "Nexus AI — Your company's collective intelligence" },
      { property: "og:description", content: "AI-powered internal knowledge assistant." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--accent),_transparent_55%)] opacity-70" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-display text-base font-semibold tracking-tight">Nexus AI</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="rounded-full">
            <Link to="/login">
              Get started <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-16 pb-24 sm:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            Internal beta · v0.1
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-6xl">
            Your company's collective intelligence,
            <span className="block text-muted-foreground">one conversation away.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Nexus AI turns scattered documents, wikis, and tribal knowledge into a single
            instant-answer assistant for every team.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full px-6">
              <Link to="/login">Enter workspace</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-6">
              <Link to="/dashboard">View dashboard</Link>
            </Button>
          </div>
        </motion.div>

        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          {[
            { icon: MessagesSquare, title: "Ask anything", body: "Conversational answers grounded in your documents." },
            { icon: BookOpen, title: "Live knowledge", body: "Ingest PDFs, wikis and policies — kept always in sync." },
            { icon: Shield, title: "Permissioned", body: "Row-level access keeps confidential answers confidential." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              className="rounded-2xl border bg-card/70 p-5 shadow-[var(--shadow-soft)] backdrop-blur"
            >
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-display text-base font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
