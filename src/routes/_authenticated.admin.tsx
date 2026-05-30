import { createFileRoute } from "@tanstack/react-router";
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
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Nexus AI" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        description="Manage teammates, roles, and workspace integrations."
        actions={<Button className="rounded-full">Invite teammate</Button>}
      />

      <Card className="border-border/60 shadow-[var(--shadow-soft)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">{user?.email}</TableCell>
              <TableCell>
                <Badge>Owner</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">Active</Badge>
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">Today</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
