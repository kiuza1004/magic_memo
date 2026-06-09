# Magic Memo

음성·텍스트·사진 무엇이든 던지면 AI(Claude)가 자동 분류·요약·태깅하는 개인 라이프로그 PWA.
모든 메모는 브라우저(IndexedDB)에 저장되어 별도의 DB가 필요 없습니다.

## 기능

- **3가지 입력 방식**
  - 텍스트: 자유 형식
  - 음성: 브라우저 내장 Web Speech API로 한국어 실시간 STT
  - 사진: 카메라/갤러리 → Claude Vision으로 분석
- **AI 자동 정리** — Claude Opus 4.7이 `save_memo` tool을 호출해 보장된 구조화 JSON 반환
  - 제목 / 요약 / 카테고리(8종) / 태그(3~5개) / 중요도(1~5) / 할 일 / 정제 본문
- **로컬 저장** — IndexedDB(`magic-memo` DB). 서버 DB 0개
- **즉시 검색** — 제목·태그·카테고리·요약·본문 모두 한 번에 매칭
- **PWA** — `manifest.webmanifest` 포함

## 스택

| 영역 | 도구 |
|---|---|
| 프레임워크 | Next.js 16 (App Router, Turbopack) |
| UI | Tailwind v4, shadcn/ui, lucide-react, sonner |
| AI | `@anthropic-ai/sdk` — Claude Opus 4.7 + tool use |
| 음성 인식 | Web Speech API (`ko-KR`) |
| 저장 | IndexedDB (`idb`) |
| 날짜 | date-fns |

## 빠른 시작

```bash
npm i

# 환경변수 — 단 한 줄
cp .env.example .env.local
# .env.local에 ANTHROPIC_API_KEY=sk-... 입력

npm run dev
# → http://localhost:3000
```

### 환경변수

| 키 | 필수 | 설명 |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | https://console.anthropic.com 에서 발급 |

이게 전부입니다. DB 셋업·OAuth·Storage 버킷 모두 필요 없습니다.

## 아키텍처

```
┌─────────────┐
│   브라우저   │  음성 인식, 사진 캡처, IndexedDB 저장
└──────┬──────┘
       │ POST /api/structure { text, imageDataUrl? }
       ▼
┌─────────────────────────┐
│  Next.js Route Handler  │  단 하나의 서버 함수
│  (Anthropic SDK 호출)   │
└──────┬──────────────────┘
       │ tool_choice: save_memo (구조화 출력 강제)
       ▼
┌──────────────┐
│ Claude 4.7   │
└──────────────┘
```

1. 사용자가 텍스트/음성 텍스트/이미지를 입력
2. 클라이언트가 `/api/structure`로 전송
3. 서버가 Claude에 `tool_choice: { type: 'tool', name: 'save_memo' }`로 요청 → 항상 유효한 구조화 JSON
4. 클라이언트가 결과를 IndexedDB에 저장
5. 검색·필터는 모두 클라이언트 인메모리

## 배포 (Vercel)

1. 이 저장소를 Vercel에 import
2. **Environment Variables**에 `ANTHROPIC_API_KEY` 추가
3. Deploy — Hobby 플랜의 60s 함수 타임아웃 안에서 평균 2~5초로 동작

## 폴더 구조

```
src/
├── app/
│   ├── api/structure/route.ts   # 단 하나의 서버 엔드포인트
│   ├── layout.tsx, page.tsx
│   ├── manifest.ts
│   └── globals.css
├── components/
│   ├── memos-view.tsx           # 메인 리스트 + 검색 + 필터
│   ├── memo-input-sheet.tsx     # 새 메모 작성 시트
│   ├── voice-recorder.tsx       # Web Speech API
│   ├── photo-input.tsx          # 카메라 / 갤러리
│   ├── memo-card.tsx, memo-detail-dialog.tsx
│   ├── search-bar.tsx, category-filter.tsx
│   └── ui/                      # shadcn 컴포넌트
└── lib/
    ├── types.ts                 # Memo, Category, ...
    ├── idb.ts                   # IndexedDB CRUD
    ├── anthropic.ts             # 서버 전용 Claude 클라이언트
    └── fetch-json.ts            # 안전한 JSON fetch
```

## 알아두면 좋은 것

- **Web Speech API**는 안드로이드 Chrome, 데스크톱 Chrome/Edge에서 동작합니다. iOS Safari는 부분 지원 — 텍스트 입력으로 우회하세요.
- 메모는 **브라우저별 로컬**입니다. 다른 기기에서 보려면 같은 브라우저에서 접속해야 합니다.
- 사진은 data URL로 IndexedDB에 저장합니다. 매우 큰 사진은 미리 리사이즈하면 좋습니다.

## 라이선스

MIT
