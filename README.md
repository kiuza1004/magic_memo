# Magic Memo

음성·텍스트·사진으로 자유롭게 기록하면 AI가 자동으로 분류·요약하고, 자연어로 바로 찾아주는 개인 라이프로그 메모 앱.

## 기술 스택

- **Next.js 16** (App Router, Turbopack) + **TypeScript** + **Tailwind v4** + **shadcn/ui**
- **Vercel AI Gateway** → Claude Opus 4.7 (구조화·Vision), Whisper (STT), OpenAI Embeddings
- **Supabase**: Postgres(+pgvector) 저장, Storage(사진/음성), 하이브리드 검색(trgm + cosine)
- 모바일 우선 PWA. 카메라/마이크 권한 사용.

---

## 1. Supabase 셋업

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성 (리전: Seoul 권장).
2. **SQL Editor**에서 `supabase/migrations/0001_init.sql` 내용을 통째로 실행.
   - `vector`, `pg_trgm` 익스텐션 활성화
   - `memos` 테이블 + `search_memos` RPC + 스토리지 버킷(`memo-photos`, `memo-audio`) 생성
3. **Project Settings → API**에서 아래 3개 값 복사:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `publishable` (anon public) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (절대 노출 금지)

## 2. Vercel AI Gateway 키 발급

1. [Vercel 대시보드 → AI Gateway](https://vercel.com/ai-gateway) 진입.
2. API Key 생성 후 `.env.local`의 `AI_GATEWAY_API_KEY`에 저장.
   - 사용 모델: `anthropic/claude-opus-4-7`, `openai/whisper-1`, `openai/text-embedding-3-small`
   - 각 프로바이더에 결제수단/크레딧이 연결돼 있어야 호출이 성공합니다.

> 로컬에서 Vercel 프로젝트를 링크했다면 `vercel env pull .env.local` 한 번으로 가져올 수 있습니다.

## 3. 로컬 실행

```bash
cp .env.example .env.local       # 위 4개 값 채우기
npm install
npm run dev                       # http://localhost:3000
```

모바일에서 테스트하려면 같은 Wi-Fi에서 `npm run dev -- -H 0.0.0.0` 후 `http://<로컬IP>:3000` 접속. (카메라/마이크는 HTTPS 또는 `localhost`에서만 동작)

## 4. Vercel 배포

```bash
npm i -g vercel
vercel link
vercel env add AI_GATEWAY_API_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel --prod
```

Vercel Functions(Fluid Compute) 기본 타임아웃 300초 — 음성/이미지 처리에 충분합니다.

---

## 디렉토리 구조

```
src/
├─ app/
│  ├─ api/memos/
│  │  ├─ route.ts            POST(생성·STT·Vision·구조화·저장) / GET(목록)
│  │  ├─ [id]/route.ts       DELETE
│  │  └─ search/route.ts     POST(자연어 하이브리드 검색)
│  ├─ layout.tsx, page.tsx, manifest.ts
├─ components/
│  ├─ memos-view.tsx         메인 클라이언트 컨테이너
│  ├─ memo-input-sheet.tsx   텍스트/음성/사진 입력 시트
│  ├─ voice-recorder.tsx     MediaRecorder 기반 녹음
│  ├─ photo-input.tsx        카메라/앨범 입력
│  ├─ memo-card.tsx, memo-detail-dialog.tsx
│  ├─ search-bar.tsx, category-filter.tsx
│  └─ ui/                    shadcn/ui 컴포넌트
└─ lib/
   ├─ ai/        structure / embed / transcribe / vision
   ├─ supabase/  admin (server) / client (browser)
   └─ types.ts
supabase/migrations/0001_init.sql
```

## 핵심 동작 흐름

1. 사용자가 **+** 버튼 → 텍스트/음성/사진 중 하나로 기록
2. 서버에서 입력 정규화
   - **음성**: Whisper로 STT → 원문 텍스트
   - **사진**: Claude Vision으로 설명 + OCR + 사물 키워드 추출 → 통합 텍스트
   - **텍스트**: 그대로
3. Claude Opus 4.7 `generateObject` → `{ title, summary, category, tags, importance, action_items, standardized_content }` JSON 구조화
4. OpenAI 임베딩(1536d) 생성 후 Postgres + pgvector에 저장
5. 검색: 자연어 쿼리를 임베딩한 뒤 `search_memos` RPC가 trgm(키워드) 0.4 + cosine(의미) 0.6 가중치로 점수 합산

## 향후 개선

- Supabase Auth 연동 후 RLS 정책으로 멀티 유저 지원
- 음성 입력 후 STT 결과를 사용자에게 미리 보여주고 편집 가능하게
- 캘린더 뷰(일정), 칸반 뷰(할일)
- PWA 푸시 알림으로 액션 아이템 리마인드
