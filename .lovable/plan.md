
# Vicen AI — Complete System Build Plan

This is a large, multi-system feature. Below is the build broken into shippable phases. I'll execute all phases in this single build unless you'd prefer to stage them.

## Phase 1 — Database & Storage

Create Supabase tables (with RLS + GRANTs):
- `images` — id, title, description, tags[], category, sub_category, url, thumbnail_url, quality_score, popularity_score, relevance_boost, is_active, language, country, width, height, file_size, mime_type, uploaded_by, created_at, updated_at
- `knowledge` — id, topic, raw_content, extracted_facts[], entities[], relationships[], categories[], useful_for[], context_summary, added_by, created_at, updated_at, is_locked, is_visible, is_active
- `logs` — id, admin_name, action, target, topic, timestamp, session_id
- `admin_credentials` — id, username, password_hash, created_at, updated_at (seeded with `vicent_065` / `@_xinyang_065` bcrypt)

Storage bucket: `vicen-images` (private), with `images/` and `thumbs/` paths. RLS: regular users + anon have **no access** to any admin table. All admin CRUD goes through edge functions guarded by admin JWT.

## Phase 2 — Hidden Admin Auth (edge functions)

- `admin-login` — verifies username/password against `admin_credentials`, returns short-lived signed admin JWT (HS256 with server secret `ADMIN_JWT_SECRET`). Tracks failed attempts in-memory per IP → 30s lockout after 5.
- `admin-verify` — middleware helper.
- `admin-update-credentials` — requires current password, updates hash, invalidates session.
- `admin-action` — single guarded endpoint for: upload image (signed URL), edit image, delete image, list images, add knowledge, list/edit/delete/toggle knowledge, stats, logs.

JWT stored in `localStorage` under obfuscated key. "Keep me signed in" extends expiry to 30 days; otherwise session-only.

## Phase 3 — Hidden Entry Point in Settings

- Add version footer "Vicen AI · 1.0.0" at very bottom of existing Settings page.
- 7-tap detector with subtle vibrate on tap 5, "1 more…" on tap 6, flash + slide-in admin login on tap 7.
- If session already valid → toast "No need, Admin System has already been enabled." and silently route to dashboard.

## Phase 4 — Admin Dashboard UI

Route: `/admin` (no nav link anywhere). Sections (all glassmorphism, #00FFB2 accent, Space Mono):
1. Upload Images (drag/drop + URL + metadata form)
2. Manage / Edit / Delete Images
3. Image Library (search + filter)
4. Statistics
5. Activity Logs
6. Add Knowledge + Knowledge Manager (list/edit/delete/toggle)
7. Account Settings
8. Logout (confirm modal)

## Phase 5 — Knowledge Processing

When admin submits knowledge, edge function `process-knowledge` calls Lovable AI (`google/gemini-2.5-flash`) to extract: facts, entities, relationships, categories, useful_for, context_summary. Saved to `knowledge` table. Activity log records topic only.

## Phase 6 — Chat Integration (3-Source Intelligence)

Modify existing `supabase/functions/chat/index.ts`:
1. **Own knowledge** — model's training (baseline).
2. **Web search** — Firecrawl (already wired).
3. **Admin knowledge** — query `knowledge` table where `is_active=true`, rank by keyword/entity overlap with user message, inject top matches as **highest-priority** system context with explicit instruction: *"Admin Knowledge is the final authority. If it conflicts with web results or general knowledge, use Admin Knowledge. Never reveal sources."*
4. **Image retrieval** — when intent is visual (detected via Lovable AI classification or keywords like "show me", "image of", "picture", "logo"), query `images` table, rank by tag/title/description/category match × quality_score × popularity_score × relevance_boost. Return top 3–4 as structured `image_results` array. Track shown IDs per conversation for "show me more" pagination; reply with exhaustion message when empty.

## Phase 7 — Chat UI for Images

- `ChatMessage` renders image cards (numbered 1–4) in a responsive row when assistant message contains `image_results` metadata.
- Card: thumbnail, title, category badge, glassmorphism border, hover scale.
- Click → full-screen modal with prev/next arrows, close button, backdrop dismiss.
- User can ask "what is image 1?" — chat fn receives last `image_results` as context so model can describe by number.

## Technical details

- **No new framework deps** beyond what's installed.
- bcrypt via `https://deno.land/x/[email protected]/mod.ts` in edge functions.
- JWT via `https://deno.land/x/djwt`.
- Admin secret: I'll add `ADMIN_JWT_SECRET` via `add_secret`.
- Thumbnails generated client-side on upload (canvas resize to max 400px).
- All admin tables: `GRANT ALL ON ... TO service_role` only; anon/authenticated denied. Edge functions use service role.
- Image bucket private; admin gets signed URLs for upload, public chat returns short-lived signed URLs for display (or we use a public bucket — I'll make `vicen-images` **public** so chat can render directly; admin actions still gated).

## Scope confirmation

This is ~15–20 files + 6 edge functions + 1 migration. Want me to:
**A)** Build all 7 phases now (single large build), or
**B)** Ship Phases 1–4 (DB + admin panel) first, then 5–7 next turn?

Reply "A" or "B" (or tweak) and I'll proceed.
