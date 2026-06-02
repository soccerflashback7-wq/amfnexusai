import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  MessagesSquare,
  Users,
  Sparkles,
  ArrowUpRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDashboardStats } from "@/lib/analytics.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Nexus AI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const statsFn = useServerFn(getDashboardStats);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => statsFn(),
  });

  const counts = data?.counts;
  const stats = [
    {
      label: "Indexed documents",
      value: counts?.documents ?? 0,
      icon: FileText,
      hint: counts?.documents ? "Across your knowledge base" : "Upload to begin",
    },
    {
      label: "Conversations",
      value: counts?.conversations ?? 0,
      icon: MessagesSquare,
      hint: data?.isAdmin ? "Across all teammates" : "Your conversations",
    },
    {
      label: "Approved teammates",
      value: counts?.teammates ?? 0,
      icon: Users,
      hint: "Active members",
    },
    {
      label: "Questions (24h)",
      value: counts?.queriesToday ?? 0,
      icon: Sparkles,
      hint: "Asked in the last day",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="A snapshot of your knowledge base activity."
        actions={
          <Button className="rounded-full" asChild>
            <Link to="/chat">
              New conversation <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
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
                <div className="font-display text-3xl font-semibold tracking-tight">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    s.value.toLocaleString()
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 shadow-[var(--shadow-soft)] lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display tracking-tight">Recent conversations</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/chat">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <SkeletonRows />
            ) : (data?.recentConversations ?? []).length === 0 ? (
              <EmptyState text="No conversations yet — start one in Chat." />
            ) : (
              <ul className="divide-y divide-border/60">
                {data!.recentConversations.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/chat">Open</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-[var(--shadow-soft)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display tracking-tight">Recent documents</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/documents">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <SkeletonRows />
            ) : (data?.recentDocuments ?? []).length === 0 ? (
              <EmptyState text="Upload a document to get started." />
            ) : (
              <ul className="space-y-3">
                {data!.recentDocuments.map((d) => (
                  <li key={d.id} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {d.status === "ready" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : d.status === "failed" ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {d.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {d.chunk_count} chunks
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/40" />
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-32 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
      {text}
    </div>
  );
}
