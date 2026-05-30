import { createFileRoute } from "@tanstack/react-router";
import { Upload, FileText, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Documents — Nexus AI" }] }),
  component: DocumentsPage,
});

function DocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="The source-of-truth knowledge base powering your assistant."
        actions={
          <Button className="rounded-full" disabled>
            <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload (soon)
          </Button>
        }
      />

      <Card className="border-border/60 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search documents…" className="rounded-full pl-9" />
          </div>
          <div className="text-xs text-muted-foreground">0 of 0 indexed</div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={4} className="py-16 text-center text-sm text-muted-foreground">
                <FileText className="mx-auto mb-3 h-6 w-6 text-muted-foreground/60" />
                No documents yet. Upload PDFs, Markdown, or connect a source.
                <div className="mt-3">
                  <Badge variant="secondary">Ingestion coming soon</Badge>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
