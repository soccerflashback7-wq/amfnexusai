import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  MessagesSquare,
  Shield,
  Upload,
  Search,
  Brain,
  Zap,
  Lock,
  GitBranch,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexus AI — Your company's collective intelligence" },
      {
        name: "description",
        content:
          "Nexus AI turns scattered documents, wikis, and tribal knowledge into a single instant-answer assistant for every team. Permissioned, cited, and grounded in your sources.",
      },
      { property: "og:title", content: "Nexus AI — Your company's collective intelligence" },
      {
        property: "og:description",
        content:
          "An AI-powered internal knowledge assistant that searches your documents, cites its sources, and respects every permission.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(ellipse_at_top,_var(--accent),_transparent_60%)] opacity-80" />
        <div className="absolute -left-32 top-40 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-24 top-96 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-display text-base font-semibold tracking-tight">Nexus AI</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">Features</a>
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#security" className="transition-colors hover:text-foreground">Security</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="rounded-full">
            <Link to="/request-access">
              Request access <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-16 pb-20 sm:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Internal beta · v0.1
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-6xl">
            Your company's collective intelligence,
            <span className="block bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              one conversation away.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Nexus AI turns scattered documents, wikis, and tribal knowledge into a single
            instant-answer assistant — grounded in your sources, with citations on every reply.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full px-6">
              <Link to="/request-access">Request access</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-6">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Invite-only · Admin-approved workspaces
          </p>
        </motion.div>

        {/* Product preview */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mx-auto mt-16 max-w-4xl"
        >
          <div className="relative overflow-hidden rounded-2xl border bg-card/80 shadow-[var(--shadow-soft)] backdrop-blur">
            <div className="flex items-center gap-1.5 border-b bg-muted/30 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              <span className="ml-3 text-xs text-muted-foreground">nexus.ai / chat</span>
            </div>
            <div className="space-y-4 p-6">
              <div className="flex justify-end">
                <div className="rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                  What's our policy on remote work in EU offices?
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="max-w-[85%] rounded-2xl bg-muted/60 px-4 py-2.5 text-sm">
                  EU employees may work remotely up to <strong>3 days per week</strong> with manager
                  approval, per the Hybrid Work Policy <sup className="text-primary">[1]</sup>.
                  Full-time remote requires HR review and is approved case-by-case
                  <sup className="text-primary">[2]</sup>.
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/40 pt-2.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                      <BookOpen className="h-2.5 w-2.5" /> [1] Hybrid Work Policy.pdf
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                      <BookOpen className="h-2.5 w-2.5" /> [2] EU Employee Handbook
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">Features</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for the way teams actually work
          </h2>
          <p className="mt-3 text-muted-foreground">
            Less searching. More answering. Nexus reads everything your team writes so you don't have to.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: MessagesSquare,
              title: "Ask anything",
              body: "Conversational answers grounded in your documents — with inline citations on every claim.",
            },
            {
              icon: BookOpen,
              title: "Live knowledge",
              body: "Ingest PDFs, Word docs and Markdown — automatically chunked, embedded, and kept in sync.",
            },
            {
              icon: Shield,
              title: "Permissioned",
              body: "Row-level access controls keep confidential answers confidential. Approval-only sign-up.",
            },
            {
              icon: Brain,
              title: "Semantic search",
              body: "Vector retrieval understands intent — find answers even when nobody used the right words.",
            },
            {
              icon: Zap,
              title: "Real-time streaming",
              body: "Token-by-token responses powered by frontier models, with sub-second time-to-first-token.",
            },
            {
              icon: GitBranch,
              title: "Versioned history",
              body: "Every conversation is saved. Audit who asked what, when, and what the answer cited.",
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.05 * i }}
              className="group rounded-2xl border bg-card/60 p-6 shadow-[var(--shadow-soft)] backdrop-blur transition-colors hover:border-primary/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <f.icon className="h-4.5 w-4.5" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">How it works</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Three steps to a smarter workspace
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Upload,
              step: "01",
              title: "Upload your knowledge",
              body: "Drag in PDFs, Word docs, and Markdown. Nexus extracts, chunks, and embeds automatically.",
            },
            {
              icon: Search,
              step: "02",
              title: "Ask in plain English",
              body: "No keywords, no jargon. Nexus understands intent and retrieves the most relevant passages.",
            },
            {
              icon: Sparkles,
              step: "03",
              title: "Get cited answers",
              body: "Every response links back to the exact source. Trust, verify, drill deeper in one click.",
            },
          ].map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              className="relative rounded-2xl border bg-card/60 p-6 backdrop-blur"
            >
              <span className="absolute right-5 top-5 font-display text-3xl font-semibold text-muted-foreground/20">
                {s.step}
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <s.icon className="h-4.5 w-4.5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section id="security" className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <div className="overflow-hidden rounded-3xl border bg-gradient-to-br from-card/80 to-card/40 p-10 shadow-[var(--shadow-soft)] backdrop-blur sm:p-14">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Lock className="h-5 w-5" />
              </div>
              <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Enterprise-grade by default
              </h2>
              <p className="mt-4 text-muted-foreground">
                Nexus is built with security as the foundation — not a feature. Every document,
                every query, every answer is scoped to who's allowed to see it.
              </p>
            </div>
            <ul className="space-y-3.5">
              {[
                "Row-level security on every table",
                "Admin-approved sign-up — no open registration",
                "Encrypted storage and JWT-authenticated sessions",
                "Granular role-based access control",
                "Complete activity audit log",
                "Sources cited on every AI answer",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">
            Ready to unlock your team's memory?
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-muted-foreground">
            Request access today and we'll get your workspace provisioned within 24 hours.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link to="/request-access">
                Request access <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-7">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-3 w-3" />
            </div>
            <span className="font-display font-medium tracking-tight text-foreground">Nexus AI</span>
            <span className="text-xs">© {new Date().getFullYear()}</span>
          </div>
          <p className="text-xs">Built for teams who refuse to lose what they know.</p>
        </div>
      </footer>
    </div>
  );
}
