# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ Next.js 16

This is Next.js 16 (App Router, Turbopack, **static export**). APIs and conventions may differ from your training data. Before writing any Next.js-specific code, consult `node_modules/next/dist/docs/` and heed deprecation notices.

## Commands

```bash
npm run dev                # next dev (Turbopack, port 3000)
npm run build              # next build → static files in out/
npm run lint               # eslint
npx tsc --noEmit           # standalone typecheck
```

Stale `.next/` cache occasionally produces phantom TS errors referencing deleted routes. Delete `.next/` (and `out/`) and re-run.

## Architecture

**Zero-backend, zero-env-var architecture.** No server functions, no database, no auth, no secrets in the deployment. The Next.js build emits a fully static `out/` directory (`output: "export"`). Everything happens in the user's browser:

- **API key** lives in `localStorage` (entered via first-launch dialog).
- **Memos** live in IndexedDB.
- **Anthropic Messages API** is called *directly from the browser* via `fetch`, using the `anthropic-dangerous-direct-browser-access: true` header.

Do not reintroduce any `/api/*` route, server-only module, or env var. The v3 rewrite explicitly removed them to escape Vercel-specific deploy issues and make the app host-agnostic.

### Data flow (a single memo from input to storage)

```
client input ─→ structureMemo({ text, imageDataUrl? })  (src/lib/structure.ts)
                       │
                       │  fetch POST https://api.anthropic.com/v1/messages
                       │  headers: x-api-key (from localStorage),
                       │           anthropic-dangerous-direct-browser-access: true
                       │  body: tool_choice: { type: "tool", name: "save_memo" }
                       ▼
            Anthropic API → tool_use block
                       │
                       ▼
            StructuredMemo ─→ idb.addMemo()
```

Search and filtering happen entirely client-side over the IndexedDB list in `memo-sheet.tsx`.

### Why `tool_choice: { type: "tool", name: "save_memo" }`

The system relies on Anthropic tool-use to guarantee structured output. Replacing it with plain text + JSON parsing breaks the schema invariant. The `SAVE_MEMO_TOOL` definition in `src/lib/structure.ts` is the *only* authority for memo fields — if you change the tool schema, you must also update `src/lib/types.ts` (`StructuredMemo` + `CATEGORIES`).

### Input modalities (3 paths, one structure call)

- **voice** (main) — Web Speech API (`window.SpeechRecognition` / `webkitSpeechRecognition`, `lang = "ko-KR"`, continuous + interim). Output is plain text. *No audio is ever uploaded.* The recognizer auto-stops on silence; `voice-recorder.tsx` uses `shouldRecordRef` + `launchRef` to re-launch a fresh instance on every `onend` for up to 10 minutes. Ignore `no-speech` / `aborted` errors.
- **text** — bottom-sheet textarea (`text-quick-input.tsx`). Cmd/Ctrl+Enter submits.
- **photo** — File is downscaled to longest-side 1280px JPEG q=0.85 in `home-screen.tsx::compressImage` before encoding to data URL. (Still useful even without a server function — keeps the request body small and the prompt-token count sane.)

### Memo data shape

`src/lib/types.ts` defines `StructuredMemo` (AI output) and `Memo` (= StructuredMemo + client-side fields: `id`, `created_at`, `source_type`, `raw_input`, `photo_data_url?`). Changing this shape requires updates in **all of**:

1. `src/lib/types.ts` — type + `CATEGORIES` enum
2. `src/lib/structure.ts` — `SAVE_MEMO_TOOL.input_schema` + `SYSTEM_PROMPT` category descriptions
3. `src/components/home-screen.tsx::saveMemo` — `Memo` object construction
4. `src/components/memo-sheet.tsx` — rendering + search index (`CATEGORY_COLOR`, `SOURCE_ICON`, day grouping)

Note: `created_at` is `number` (epoch ms), not ISO string — `new Date(memo.created_at)` for date-fns. `photo_data_url` is the raw data URL.

### Browser-only modules

`src/lib/idb.ts` and `src/lib/key-store.ts` touch `window` / `indexedDB` / `localStorage` and must only be imported from client components. There is no server boundary anymore — every page component is `"use client"`. Do not add `"server-only"` imports; they would break the static export.

### Error surfacing

`src/lib/structure.ts` parses the Anthropic error response and throws `[error_type] message` (e.g. `[authentication_error] invalid x-api-key`). The home screen displays this via sonner `toast.error`. When updating a `toast.loading` by id, explicitly pass `description: undefined` in the success/error call — sonner keeps the previous description otherwise.

## Coding conventions

- **React 19 strict effect rules are enforced by ESLint.** Three rules bite often:
  - `react-hooks/set-state-in-effect` — don't call `setState` synchronously in an effect body. Wrap in `window.setTimeout(..., 0)` with cleanup, use lazy initial state (`useState(() => ...)`), or move to an event handler.
  - `react-hooks/refs` — don't read or write `ref.current` during render. Sync refs inside `useEffect`.
  - `react-hooks/immutability` — `useCallback` can't reference a variable declared after it. Use a `useRef`-held thunk to break self-recursion (see `voice-recorder.tsx::launchRef`).
- All user-facing strings are Korean.
- Tailwind v4 + shadcn/ui. New shadcn components: `npx shadcn@latest add <name>`.
- Don't reintroduce: Supabase, AI Gateway, AI SDK, Whisper, the Anthropic SDK (`@anthropic-ai/sdk`), server routes, or any env var. The SDK pulls in `node:fs/promises` and breaks the static export — always use plain `fetch`.

## Deploy

The build emits `out/` — drop it on any static host (Vercel, Netlify, GitHub Pages, Cloudflare Pages, S3). No environment variables, no server config. Users provide their own API key on first launch.

For Vercel: `output: "export"` is detected automatically; no `vercel.json` needed.
