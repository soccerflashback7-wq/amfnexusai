import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Nexus AI" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Usage, popular topics, and assistant performance."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {["Queries over time", "Top topics", "Avg. response quality", "Active users"].map((t) => (
          <Card key={t} className="border-border/60 shadow-[var(--shadow-soft)]">
            <CardHeader>
              <CardTitle className="font-display text-base tracking-tight">{t}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-44 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                <BarChart3 className="mr-2 h-4 w-4" /> Awaiting data
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
