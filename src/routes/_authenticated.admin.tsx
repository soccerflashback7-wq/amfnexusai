import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, hasAnyRole, type AppRole, type ApprovalStatus } from "@/hooks/use-profile";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Nexus AI" }] }),
  component: AdminPage,
});

const ROLE_OPTIONS: AppRole[] = ["super_admin", "admin", "manager", "employee", "viewer"];

function AdminPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useProfile();
  const isAdmin = hasAnyRole(data?.roles, "admin", "super_admin");

  useEffect(() => {
    if (!isLoading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [isLoading, isAdmin, navigate]);

  if (isLoading || !isAdmin) {
    return (
      <Card className="flex items-center justify-center p-12 text-muted-foreground">
        <ShieldAlert className="mr-2 h-5 w-5" />
        Verifying admin access…
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        description="Review access requests, manage roles, and oversee your workspace."
      />

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Access requests</TabsTrigger>
          <TabsTrigger value="users">Users & roles</TabsTrigger>
          <TabsTrigger value="activity">Activity log</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4">
          <ApprovalRequests />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UserManagement />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusBadge({ status }: { status: ApprovalStatus }) {
  const map: Record<ApprovalStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Pending", variant: "outline" },
    approved: { label: "Approved", variant: "default" },
    rejected: { label: "Rejected", variant: "destructive" },
    suspended: { label: "Suspended", variant: "destructive" },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

function ApprovalRequests() {
  const qc = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["approval_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const decide = useMutation({
    mutationFn: async ({
      id,
      status,
      requested_role,
    }: { id: string; status: ApprovalStatus; requested_role?: AppRole }) => {
      const update: { status: ApprovalStatus; requested_role?: AppRole } = { status };
      if (requested_role) update.requested_role = requested_role;
      const { error } = await supabase.from("approval_requests").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval_requests"] });
      qc.invalidateQueries({ queryKey: ["all_profiles"] });
      toast.success("Request updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
    onSettled: () => setPendingId(null),
  });

  return (
    <Card className="border-border/60 shadow-[var(--shadow-soft)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Requester</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>
          )}
          {!isLoading && requests?.length === 0 && (
            <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No access requests yet.</TableCell></TableRow>
          )}
          {requests?.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <div className="font-medium">{r.full_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{r.email}</div>
              </TableCell>
              <TableCell className="max-w-xs text-sm text-muted-foreground">
                {r.reason ?? <span className="italic">No reason provided</span>}
              </TableCell>
              <TableCell>
                <Select
                  defaultValue={r.requested_role}
                  disabled={r.status !== "pending"}
                  onValueChange={(v) =>
                    supabase.from("approval_requests").update({ requested_role: v as AppRole }).eq("id", r.id)
                      .then(() => qc.invalidateQueries({ queryKey: ["approval_requests"] }))
                  }
                >
                  <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role} value={role}>{role.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell><StatusBadge status={r.status} /></TableCell>
              <TableCell className="text-right">
                {r.status === "pending" ? (
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pendingId === r.id}
                      onClick={() => { setPendingId(r.id); decide.mutate({ id: r.id, status: "rejected" }); }}
                    >
                      {pendingId === r.id && decide.variables?.status === "rejected" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      disabled={pendingId === r.id}
                      onClick={() => { setPendingId(r.id); decide.mutate({ id: r.id, status: "approved" }); }}
                    >
                      {pendingId === r.id && decide.variables?.status === "approved" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Approve
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : "—"}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function UserManagement() {
  const qc = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["all_profiles"],
    queryFn: async () => {
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      const rolesByUser = new Map<string, AppRole[]>();
      for (const r of roles ?? []) {
        const list = rolesByUser.get(r.user_id) ?? [];
        list.push(r.role as AppRole);
        rolesByUser.set(r.user_id, list);
      }
      return (profiles ?? []).map((p) => ({ ...p, roles: rolesByUser.get(p.user_id) ?? [] }));
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ user_id, status }: { user_id: string; status: ApprovalStatus }) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("user_id", user_id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all_profiles"] }); toast.success("Status updated"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const setRole = useMutation({
    mutationFn: async ({ user_id, role, currentRoles }: { user_id: string; role: AppRole; currentRoles: AppRole[] }) => {
      // Replace roles: delete current, insert new single role.
      if (currentRoles.length > 0) {
        const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", user_id);
        if (delErr) throw delErr;
      }
      const { error } = await supabase.from("user_roles").insert({ user_id, role });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all_profiles"] }); toast.success("Role updated"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  return (
    <Card className="border-border/60 shadow-[var(--shadow-soft)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>
          )}
          {users?.map((u) => {
            const currentRole = u.roles[0];
            return (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium">{u.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell>
                  <Select
                    value={currentRole ?? ""}
                    onValueChange={(v) => setRole.mutate({ user_id: u.user_id, role: v as AppRole, currentRoles: u.roles })}
                  >
                    <SelectTrigger className="h-8 w-[160px]">
                      <SelectValue placeholder="No role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role} value={role}>{role.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell><StatusBadge status={u.status} /></TableCell>
                <TableCell className="text-right">
                  <Select
                    value={u.status}
                    onValueChange={(v) => setStatus.mutate({ user_id: u.user_id, status: v as ApprovalStatus })}
                  >
                    <SelectTrigger className="h-8 w-[140px] ml-auto"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function ActivityLog() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["activity_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card className="border-border/60 shadow-[var(--shadow-soft)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>
          )}
          {!isLoading && logs?.length === 0 && (
            <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">No activity recorded yet.</TableCell></TableRow>
          )}
          {logs?.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="text-sm text-muted-foreground">{new Date(l.created_at).toLocaleString()}</TableCell>
              <TableCell className="font-mono text-xs">{l.user_id?.slice(0, 8) ?? "—"}</TableCell>
              <TableCell>{l.action}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
