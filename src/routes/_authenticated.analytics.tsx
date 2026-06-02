import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, MessagesSquare, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalytics } from "@/lib/analytics.functions";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Nexus AI" }] }),
  component: AnalyticsPage,
});

const STATUS_COLORS: Record<string, string> = {
  ready: "hsl(160 60% 45%)",
  processing: "hsl(45 90% 55%)",
  uploading: "hsl(220 60% 60%)",
  failed: "hsl(0 70% 55%)",
};

function AnalyticsPage() {
  const fn = useServerFn(getAnalytics);
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => fn(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description={`Usage and knowledge base insights${data ? ` — last ${data.windowDays} days` : ""}.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<MessagesSquare className="h-4 w-4 text-muted-foreground" />}
          label="Questions asked"
          value={data?.totals.questions ?? 0}
          loading={isLoading}
        />
        <StatCard
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          label="Answers generated"
          value={data?.totals.answers ?? 0}
          loading={isLoading}
        />
        <StatCard
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          label="Total documents"
          value={data?.totals.documents ?? 0}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 shadow-[var(--shadow-soft)] lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-base tracking-tight">
              Conversation volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {isLoading ? (
                <Skeleton />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.timeseries ?? []}>
                    <defs>
                      <linearGradient id="qFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="aFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(220 15% 55%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(220 15% 55%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => format(parseISO(v), "MMM d")}
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelFormatter={(v) => format(parseISO(v as string), "PPP")}
                    />
                    <Area
                      type="monotone"
                      dataKey="questions"
                      stroke="var(--primary)"
                      fill="url(#qFill)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="answers"
                      stroke="hsl(220 15% 55%)"
                      fill="url(#aFill)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-[var(--shadow-soft)]">
          <CardHeader>
            <CardTitle className="font-display text-base tracking-tight">
              Document status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {isLoading ? (
                <Skeleton />
              ) : (data?.statusBreakdown ?? []).every((s) => s.count === 0) ? (
                <EmptyChart label="No documents yet" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.statusBreakdown ?? []}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {(data?.statusBreakdown ?? []).map((s) => (
                        <Cell
                          key={s.status}
                          fill={STATUS_COLORS[s.status] ?? "hsl(220 10% 50%)"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
              {(data?.statusBreakdown ?? []).map((s) => (
                <div key={s.status} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: STATUS_COLORS[s.status] }}
                  />
                  <span className="capitalize text-muted-foreground">{s.status}</span>
                  <span className="font-medium">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 shadow-[var(--shadow-soft)]">
        <CardHeader>
          <CardTitle className="font-display text-base tracking-tight">
            Top documents by indexed chunks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {isLoading ? (
              <Skeleton />
            ) : (data?.topDocuments ?? []).length === 0 ? (
              <EmptyChart label="No indexed documents yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.topDocuments ?? []}
                  layout="vertical"
                  margin={{ left: 12, right: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis
                    type="number"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="title"
                    width={160}
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 22) + "…" : v)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="chunks" fill="var(--primary)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <Card className="border-border/60 shadow-[var(--shadow-soft)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="font-display text-3xl font-semibold tracking-tight">
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            value.toLocaleString()
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Skeleton() {
  return <div className="h-full w-full animate-pulse rounded-xl bg-muted/30" />;
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
      <CheckCircle2 className="mr-2 h-4 w-4" /> {label}
    </div>
  );
}
