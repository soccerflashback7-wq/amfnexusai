import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Search, Trash2, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  listDocuments,
  createDocumentUpload,
  ingestDocument,
  deleteDocument,
} from "@/lib/documents.functions";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Documents — Nexus AI" }] }),
  component: DocumentsPage,
});

function statusBadge(status: string) {
  switch (status) {
    case "ready":
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Ready
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Processing
        </Badge>
      );
    case "uploading":
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Uploading
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" /> Failed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatBytes(n: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentsPage() {
  const list = useServerFn(listDocuments);
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);

  const documentsQuery = useQuery({
    queryKey: ["documents"],
    queryFn: () => list(),
    refetchInterval: (q) => {
      const docs = (q.state.data as any)?.documents ?? [];
      const pending = docs.some((d: any) => d.status === "processing" || d.status === "uploading");
      return pending ? 3000 : false;
    },
  });

  const docs = (documentsQuery.data?.documents ?? []).filter((d: any) =>
    d.title.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="The source-of-truth knowledge base powering your assistant."
        actions={
          <Button className="rounded-full" onClick={() => setUploadOpen(true)}>
            <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload
          </Button>
        }
      />

      <Card className="border-border/60 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search documents…"
              className="rounded-full pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5"
              onClick={() => qc.invalidateQueries({ queryKey: ["documents"] })}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <span>
              {docs.filter((d: any) => d.status === "ready").length} of {docs.length} indexed
            </span>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Chunks</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {documentsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Loading documents…
                  </TableCell>
                </TableRow>
              ) : docs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                    <FileText className="mx-auto mb-3 h-6 w-6 text-muted-foreground/60" />
                    No documents yet. Upload your first PDF, Markdown, or text file.
                  </TableCell>
                </TableRow>
              ) : (
                docs.map((d: any) => (
                  <motion.tr
                    key={d.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b transition-colors hover:bg-muted/40"
                  >
                    <TableCell>
                      <div className="font-medium">{d.title}</div>
                      {d.description && (
                        <div className="text-xs text-muted-foreground">{d.description}</div>
                      )}
                      {d.status === "failed" && d.error_message && (
                        <div className="mt-1 text-xs text-destructive">{d.error_message}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatBytes(d.size_bytes)}
                    </TableCell>
                    <TableCell>{statusBadge(d.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.chunk_count}</TableCell>
                    <TableCell className="text-right">
                      <DeleteButton id={d.id} title={d.title} />
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </Card>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}

function DeleteButton({ id, title }: { id: string; title: string }) {
  const del = useServerFn(deleteDocument);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => del({ data: { document_id: id } }),
    onSuccess: () => {
      toast.success(`Deleted "${title}"`);
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 text-destructive hover:text-destructive"
      disabled={m.isPending}
      onClick={() => {
        if (confirm(`Delete "${title}"? This cannot be undone.`)) m.mutate();
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

function UploadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createUpload = useServerFn(createDocumentUpload);
  const ingest = useServerFn(ingestDocument);
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setFile(null);
    setTitle("");
    setDescription("");
    setBusy(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!file) {
      toast.error("Choose a file");
      return;
    }
    setBusy(true);
    try {
      const { document, upload } = await createUpload({
        data: {
          title: title || file.name,
          description: description || null,
          filename: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
        },
      });

      const { error: upErr } = await supabase.storage
        .from("documents")
        .uploadToSignedUrl(upload.path, upload.token, file, {
          contentType: file.type || "application/octet-stream",
        });
      if (upErr) throw new Error(upErr.message);

      toast.success("Upload complete — processing…");
      qc.invalidateQueries({ queryKey: ["documents"] });
      onOpenChange(false);
      reset();

      // Kick off ingestion in the background; UI polls for status.
      ingest({ data: { document_id: document.id } })
        .then(() => {
          toast.success(`"${document.title}" is ready`);
          qc.invalidateQueries({ queryKey: ["documents"] });
        })
        .catch((e: Error) => {
          toast.error(`Ingestion failed: ${e.message}`);
          qc.invalidateQueries({ queryKey: ["documents"] });
        });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>
            Add a PDF, Markdown, or text file. We'll extract, chunk, and embed it for AI search.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.markdown,text/plain,text/markdown,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
              }}
            />
            <p className="text-xs text-muted-foreground">Max 50 MB. PDF, Markdown, or plain text.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description (optional)</Label>
            <Textarea
              id="desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy || !file}>
            {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
            Upload &amp; ingest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
