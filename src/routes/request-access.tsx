import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/request-access")({
  head: () => ({
    meta: [
      { title: "Request access — Nexus AI" },
      { name: "description", content: "Request access to your company's Nexus AI workspace." },
    ],
  }),
  component: RequestAccessPage,
});

function RequestAccessPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName, reason },
        },
      });
      if (error) throw error;
      setDone(true);
      await supabase.auth.signOut();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--accent),_transparent_60%)] opacity-60" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">Nexus AI</span>
          </Link>
          <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight">
            Request workspace access
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Tell us who you are. An admin will review your request shortly.
          </p>
        </div>

        <Card className="border-border/60 p-6 shadow-[var(--shadow-elevated)]">
          {done ? (
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <h2 className="mt-4 font-display text-lg font-semibold">Request submitted</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                We've notified your workspace admins. You'll be able to sign in as soon as they approve your account.
              </p>
              <Button className="mt-6 rounded-full" onClick={() => navigate({ to: "/login" })}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Choose a password</Label>
                <Input id="password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reason">Why do you need access?</Label>
                <Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Team, role, what you'd like to use Nexus AI for…" />
              </div>
              <Button type="submit" className="w-full rounded-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit request
              </Button>
            </form>
          )}
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already approved?{" "}
          <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
