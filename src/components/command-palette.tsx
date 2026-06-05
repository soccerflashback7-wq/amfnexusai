import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  FileText,
  MessagesSquare,
  Sparkles,
  LayoutDashboard,
  BarChart3,
  Settings,
  ShieldCheck,
  Search,
  Loader2,
  Upload,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { globalSearch } from "@/lib/search.functions";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function useDebounced<T>(value: T, ms = 200): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const search = useServerFn(globalSearch);
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 220);

  // Reset query when closed
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const enabled = debounced.trim().length >= 2;
  const { data, isFetching } = useQuery({
    queryKey: ["global-search", debounced],
    queryFn: () => search({ data: { query: debounced, semantic: true } }),
    enabled,
    staleTime: 30_000,
  });

  const go = (path: string) => {
    onOpenChange(false);
    navigate({ to: path });
  };

  const navItems = useMemo(
    () => [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { label: "Chat", icon: MessagesSquare, path: "/chat" },
      { label: "Documents", icon: FileText, path: "/documents" },
      { label: "Analytics", icon: BarChart3, path: "/analytics" },
      { label: "Settings", icon: Settings, path: "/settings" },
      { label: "Admin", icon: ShieldCheck, path: "/admin" },
    ],
    [],
  );

  const hasResults =
    (data?.documents.length ?? 0) +
      (data?.conversations.length ?? 0) +
      (data?.chunks.length ?? 0) >
    0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search documents, conversations, or ask anything…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!enabled && (
          <CommandGroup heading="Navigate">
            {navItems.map((item) => (
              <CommandItem
                key={item.path}
                value={item.label}
                onSelect={() => go(item.path)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </CommandItem>
            ))}
            <CommandItem value="Upload document" onSelect={() => go("/documents")}>
              <Upload className="mr-2 h-4 w-4" />
              Upload a document
            </CommandItem>
          </CommandGroup>
        )}

        {enabled && isFetching && !data && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching…
          </div>
        )}

        {enabled && data && !hasResults && !isFetching && (
          <CommandEmpty>No results for "{debounced}".</CommandEmpty>
        )}

        {enabled && data && data.documents.length > 0 && (
          <CommandGroup heading="Documents">
            {data.documents.map((d) => (
              <CommandItem
                key={d.id}
                value={`doc-${d.id}-${d.title}`}
                onSelect={() => go("/documents")}
              >
                <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">{d.title}</span>
                  {d.description && (
                    <span className="truncate text-xs text-muted-foreground">
                      {d.description}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {enabled && data && data.conversations.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Conversations">
              {data.conversations.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`conv-${c.id}-${c.title}`}
                  onSelect={() => go("/chat")}
                >
                  <MessagesSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{c.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {enabled && data && data.chunks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Knowledge base">
              {data.chunks.map((c, i) => (
                <CommandItem
                  key={`${c.document_id}-${c.chunk_index}-${i}`}
                  value={`chunk-${c.document_id}-${i}-${c.snippet.slice(0, 30)}`}
                  onSelect={() => go("/documents")}
                  className="items-start"
                >
                  <Sparkles className="mr-2 mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-medium text-muted-foreground">
                      {c.document_title}
                      <span className="ml-1.5 text-[10px]">
                        ({(c.similarity * 100).toFixed(0)}% match)
                      </span>
                    </span>
                    <span className="line-clamp-2 text-sm">{c.snippet}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {enabled && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              <CommandItem
                value={`ask-${debounced}`}
                onSelect={() => go("/chat")}
              >
                <Search className="mr-2 h-4 w-4" />
                Ask Nexus: "{debounced}"
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
