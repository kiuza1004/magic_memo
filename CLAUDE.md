# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ Next.js 16

This is Next.js 16 (App Router, Turbopack). APIs, conventions, and file structure may differ from your training data. Before writing any Next.js-specific code, consult `node_modules/next/dist/docs/` and heed deprecation notices.

## Commands

```bash
npm run dev                # next dev (Turbopack, port 3000)
npm run build              # next build (also runs TypeScript)
npm run lint               # eslint
npx tsc --noEmit           # standalone typecheck
```

Stale `.next/` cache occasionally produces phantom TS errors referencing deleted routes (e.g. `src/app/api/memos/route.js`). Delete `.next/` and re-run `tsc`.

## Architecture

**Single-secret architecture.** Only `ANTHROPIC_API_KEY` is required. No database, no auth, no object storage. All memos live in the user's browser (IndexedDB). One server route, one outbound API.

### Data flow (a single memo from input to storage)

```
client input ─→ POST /api/structure { text, imageDataUrl? }
                       │
                       ▼
            Anthropic Messages API
            tool_choice: { type: "tool", name: "save_memo" }
                       │
                       ▼
            client receives StructuredMemo ─→ idb.addMemo()
```

The server route (`src/app/api/structure/route.ts`) is the only network call to a backend. It is stateless — no caching, no persistence. Search and filtering happen entirely client-side over the IndexedDB list in `memos-view.tsx`.

### Why `tool_choice: { type: "tool", name: "save_memo" }`

The system relies on Anthropic tool-use to guarantee structured output. Replacing it with plain text + JSON parsing breaks the schema invariant. The tool definition in `route.ts` is the *only* authority for what fields a memo has — if you change the tool schema, you must also update `src/lib/types.ts` (`StructuredMemo`).

### Input modalities (3 tabs share one endpoint)

- **text** — `text` field
- **voice** — Web Speech API (`window.SpeechRecognition`/`webkitSpeechRecognition`, `lang = "ko-KR"`). Output is plain text → `text` field. *No audio is ever uploaded.* The recognizer auto-stops on silence; `voice-recorder.tsx` uses `shouldRecordRef` + `launchRef` to re-launch a fresh instance on every `onend` for up to 10 minutes.
- **photo** — File is downscaled to longest-side 1280px JPEG q=0.85 in `memo-input-sheet.tsx::compressImage` before encoding to data URL. This is required to stay under Vercel's ~4.5MB function body limit; do not skip this step.

### Memo data shape

`src/lib/types.ts` defines `StructuredMemo` (AI output) and `Memo` (= StructuredMemo + client-side fields). Changing this shape requires updates in **all of**:

1. `src/lib/types.ts` — type + `CATEGORIES` enum
2. `src/app/api/structure/route.ts` — `SAVE_MEMO_TOOL.input_schema` + system prompt category descriptions
3. `src/components/memo-input-sheet.tsx` — `Memo` object construction
4. `src/components/memo-card.tsx`, `memo-detail-dialog.tsx` — rendering
5. `src/components/memos-view.tsx::matches` — search index

Note: `created_at` is `number` (epoch ms), not ISO string — `new Date(memo.created_at)` for date-fns. `photo_data_url` is the raw data URL (no signed URLs anywhere).

### Server boundary

`src/lib/anthropic.ts` starts with `import "server-only"` and uses lazy initialization (`getAnthropic()`) so missing env vars throw at request time, not build time. Do not import it from a client component.

`src/lib/idb.ts` is the inverse — browser-only (throws if `window === undefined`). Do not import it from a Server Component or route handler.

### Error surfacing

Server errors from Anthropic SDK are unwrapped in `route.ts` catch block to expose `[error_type] message` (e.g. `[authentication_error] invalid x-api-key`). `src/lib/fetch-json.ts` translates non-JSON / empty bodies into Korean error messages on the client.

## Coding conventions

- **React 19 strict effect rules are enforced by ESLint.** Three rules bite often:
  - `react-hooks/set-state-in-effect` — don't call setState in an effect body. Use lazy initial state (`useState(() => ...)`) or move to an event handler.
  - `react-hooks/refs` — don't read or write `ref.current` during render. Sync refs inside `useEffect`.
  - `react-hooks/immutability` — `useCallback` can't reference a variable declared after it. Use a `useRef`-held thunk to break self-recursion (see `voice-recorder.tsx::launchRef`).
- All user-facing strings are Korean.
- Tailwind v4 + shadcn/ui. New shadcn components: `npx shadcn@latest add <name>`.
- Don't reintroduce Supabase, AI Gateway, AI SDK, Whisper, or any second env var. The v2 rewrite explicitly removed them to fit the Vercel Hobby 60s function limit and reduce setup friction.

## Deploy

Vercel auto-deploys from `main`. After changing env vars in Project Settings, you must trigger a Redeploy — env changes don't auto-rebuild.
