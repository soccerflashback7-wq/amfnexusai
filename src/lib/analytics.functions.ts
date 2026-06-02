import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Aggregated dashboard stats for the current user (admins see global counts).
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Check admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin" || r.role === "super_admin");

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const docsQuery = supabase.from("documents").select("id", { count: "exact", head: true });
    const convsQuery = supabase
      .from("conversations")
      .select("id", { count: "exact", head: true });
    const msgsTodayQuery = supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("role", "user")
      .gte("created_at", last24h);

    if (!isAdmin) {
      convsQuery.eq("user_id", userId);
    }

    const teammatesQuery = supabase
      .from("profiles")
      .select("user_id", { count: "exact", head: true })
      .eq("status", "approved");

    const [docs, convs, msgs, teammates, recentDocs, recentConvs] = await Promise.all([
      docsQuery,
      convsQuery,
      msgsTodayQuery,
      teammatesQuery,
      supabase
        .from("documents")
        .select("id,title,status,created_at,chunk_count")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("conversations")
        .select("id,title,updated_at")
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

    return {
      isAdmin,
      counts: {
        documents: docs.count ?? 0,
        conversations: convs.count ?? 0,
        teammates: teammates.count ?? 0,
        queriesToday: msgs.count ?? 0,
      },
      recentDocuments: recentDocs.data ?? [],
      recentConversations: recentConvs.data ?? [],
    };
  });

// Time series + top lists for analytics page.
export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin" || r.role === "super_admin");

    const days = 14;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    since.setUTCHours(0, 0, 0, 0);

    // Pull message timestamps for the window. RLS already scopes to user
    // (or admin reads all via "is_admin" policy).
    const { data: messages, error: mErr } = await supabase
      .from("messages")
      .select("id, role, created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);

    // Bucket per day
    const buckets = new Map<string, { date: string; questions: number; answers: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { date: key, questions: 0, answers: 0 });
    }
    for (const m of messages ?? []) {
      const key = m.created_at.slice(0, 10);
      const b = buckets.get(key);
      if (!b) continue;
      if (m.role === "user") b.questions++;
      else if (m.role === "assistant") b.answers++;
    }
    const timeseries = Array.from(buckets.values());

    // Document status breakdown
    const { data: docs } = await supabase
      .from("documents")
      .select("id, title, status, chunk_count, created_at")
      .order("created_at", { ascending: false });

    const statusCounts: Record<string, number> = {
      ready: 0,
      processing: 0,
      uploading: 0,
      failed: 0,
    };
    for (const d of docs ?? []) {
      statusCounts[d.status] = (statusCounts[d.status] ?? 0) + 1;
    }
    const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    // Top documents by chunk_count as a proxy for richness
    const topDocuments = [...(docs ?? [])]
      .sort((a, b) => (b.chunk_count ?? 0) - (a.chunk_count ?? 0))
      .slice(0, 5)
      .map((d) => ({ id: d.id, title: d.title, chunks: d.chunk_count ?? 0 }));

    const totalQuestions = timeseries.reduce((s, b) => s + b.questions, 0);
    const totalAnswers = timeseries.reduce((s, b) => s + b.answers, 0);

    return {
      isAdmin,
      windowDays: days,
      timeseries,
      statusBreakdown,
      topDocuments,
      totals: {
        questions: totalQuestions,
        answers: totalAnswers,
        documents: docs?.length ?? 0,
      },
    };
  });
