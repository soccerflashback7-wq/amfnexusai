import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Clock, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useEffect } from "react";

export const Route = createFileRoute("/pending")({
  head: () => ({ meta: [{ title: "Awaiting approval — Nexus AI" }] }),
  component: PendingPage,
});

function PendingPage() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { data } = useProfile();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (data?.profile?.status === "approved") navigate({ to: "/dashboard", replace: true });
  }, [data, navigate]);

  const rejected = data?.profile?.status === "rejected" || data?.profile?.status === "suspended";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--accent),_transparent_60%)] opacity-60" />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
        <Card className="border-border/60 p-8 text-center shadow-[var(--shadow-elevated)]">
          {rejected ? (
            <>
              <XCircle className="mx-auto h-10 w-10 text-destructive" />
              <h1 className="mt-4 font-display text-xl font-semibold">Access denied</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your account is {data?.profile?.status}. Contact your workspace admin if this is a mistake.
              </p>
            </>
          ) : (
            <>
              <Clock className="mx-auto h-10 w-10 text-primary" />
              <h1 className="mt-4 font-display text-xl font-semibold">Awaiting approval</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Hang tight, {user?.email}. An admin will review your request soon. You'll get email access details once approved.
              </p>
            </>
          )}
          <Button variant="outline" className="mt-6 rounded-full" onClick={() => signOut().then(() => navigate({ to: "/login" }))}>
            Sign out
          </Button>
        </Card>
      </motion.div>
    </div>
  );
}
