import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FileText, MessagesSquare, Users, Sparkles, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Nexus AI" }],
  }),
  component: Dashboard,
});

const stats = [
  { label: "Indexed documents", value: "—", icon: FileText, hint: "Connect a source to begin" },
  { label: "Conversations", value: "—", icon: MessagesSquare, hint: "No chats yet" },
  { label: "Active teammates", value: "1", icon: Users, hint: "Invite your team" },
  { label: "AI queries today", value: "—", icon: Sparkles, hint: "Coming soon" },
];

function Dashboard() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="A snapshot of your knowledge base activity."
        actions={
          <Button className="rounded-full">
            New conversation <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 * i }}
          >
            <Card className="border-border/60 shadow-[var(--shadow-soft)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </CardTitle>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-semibold tracking-tight">{s.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 shadow-[var(--shadow-soft)] lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display tracking-tight">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              No activity yet — start a conversation to see history here.
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-[var(--shadow-soft)]">
          <CardHeader>
            <CardTitle className="font-display tracking-tight">Getting started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>1. Upload your first documents</p>
            <p>2. Invite teammates from Admin</p>
            <p>3. Ask Nexus a question in Chat</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
