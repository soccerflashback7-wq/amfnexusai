# Architecture

Production foundation for an AI knowledge assistant — UI shell, auth, and data layer.
AI features and document ingestion are NOT implemented yet (next phase).

## Layout
- `app/` — TanStack file-based routes live in `src/routes/`
- `components/` — shared UI (`app-sidebar`, `top-nav`, `page-header`) + `components/ui/` shadcn primitives
- `hooks/` — `use-auth`, `use-theme`, `use-mobile`
- `lib/` — utilities, error reporting, server-fn modules (`*.functions.ts`)
- `services/` — external service clients (placeholder for next phase)
- `ai/` — AI prompt templates, embeddings helpers (placeholder for next phase)
- `database/` — migrations and schema docs (managed via Lovable Cloud)
- `middleware/` — TanStack middlewares (auth attacher lives in `integrations/supabase/`)
- `utils/` — pure helpers
- `types/` — shared TS types

## Routing
- `/` — public marketing landing
- `/login` — auth (email + password; ready for Google OAuth)
- `/_authenticated/*` — protected app shell (sidebar + top nav)
  - `/dashboard`, `/chat`, `/documents`, `/analytics`, `/settings`, `/admin`

## Auth
- Supabase Auth via Lovable Cloud
- Session managed in `useAuth` (root `AuthProvider`)
- `_authenticated` layout redirects to `/login` if no session
- Root `AuthSync` invalidates router + queries on auth state change

## Design system
- Slate & Steel palette in `src/styles.css` (oklch tokens, light + dark)
- Sora (display) + Manrope (body)
- Soft shadows via `--shadow-soft` / `--shadow-elevated`
- All colors are semantic tokens — no hard-coded hex/Tailwind colors in components

## Next phase (not yet built)
- pgvector schema + RLS
- Document ingestion + storage
- Lovable AI chat with RAG
- Roles table (admin/member) per security guidance
