# Magic Memo

음성·텍스트·사진 무엇이든 던지면 AI(Claude)가 자동 분류·요약·태깅하는 개인 라이프로그 PWA.
**서버 없음. DB 없음. 환경변수 없음.** 모든 데이터는 사용자 브라우저에 보관됩니다.

## 핵심 컨셉

- 정적 HTML로 배포 (Next.js `output: "export"`)
- 사용자가 자기 Anthropic API 키를 첫 실행 시 직접 붙여넣음 → `localStorage`
- 브라우저가 Anthropic Messages API를 **직접 호출** (`anthropic-dangerous-direct-browser-access` 헤더)
- 메모는 IndexedDB에 저장

→ Vercel, Netlify, GitHub Pages, Cloudflare Pages, S3 등 어디든 정적 호스팅으로 배포 가능.

## 기능

- **3가지 입력 방식**
  - 마이크 (메인): Web Speech API 한국어 실시간 STT, 무음 자동 재시작 (최대 10분)
  - 텍스트: 빠른 입력 시트
  - 카메라: 사진 즉시 캡처 → Claude Vision으로 분석
- **AI 자동 정리** — Claude Opus 4.7이 `save_memo` tool로 보장된 구조화 JSON 반환
  - 제목 / 요약 / 카테고리(8종) / 태그(3~5개) / 중요도(1~5) / 할 일 / 정제 본문
- **로컬 저장** — IndexedDB
- **즉시 검색·필터** — 카테고리 색상 칩, 일자별 타임라인
- **PWA** — `manifest.webmanifest`, 다크 테마, 모바일 우선 UI

## 스택

| 영역 | 도구 |
|---|---|
| 프레임워크 | Next.js 16 (App Router, Turbopack, static export) |
| UI | Tailwind v4, shadcn/ui, lucide-react, sonner |
| AI | 직접 `fetch` → Anthropic Messages API + tool use |
| 음성 인식 | Web Speech API (`ko-KR`) |
| 저장 | IndexedDB (`idb`), API 키는 `localStorage` |

## 빠른 시작

```bash
npm i
npm run dev
# → http://localhost:3000
```

첫 화면에 API 키 입력 다이얼로그가 뜹니다. https://console.anthropic.com/settings/keys 에서 발급한 `sk-ant-...` 키를 붙여넣으면 끝.

## 빌드 & 정적 export

```bash
npm run build       # out/ 디렉터리에 정적 파일 생성
```

`out/`을 그대로 정적 호스팅에 올리면 됩니다.

## 아키텍처

```
┌─────────────────────────┐
│        브라우저          │
│                         │
│  • 마이크/카메라/텍스트  │
│  • localStorage (key)   │
│  • IndexedDB (memos)    │
│           │             │
│           │ direct fetch + tool_choice: save_memo
│           ▼             │
└───────┬─────────────────┘
        │  HTTPS
        ▼
   Anthropic API
   (Claude Opus 4.7)
```

서버 함수도, 환경변수도, 백엔드 DB도 없습니다. 클라이언트만 존재합니다.

## 보안 메모

- API 키는 사용자 브라우저의 `localStorage`에만 존재합니다. 서버로 전송되지 않습니다.
- 단, **브라우저에서 직접 Anthropic을 호출**하므로 동일 브라우저의 다른 스크립트(확장 프로그램 등)가 키를 볼 수 있습니다. 공용/신뢰할 수 없는 브라우저에서는 사용하지 마세요.
- 다중 사용자 SaaS가 필요하면 이 구조 대신 서버 프록시로 전환해야 합니다.

## 폴더 구조

```
src/
├── app/
│   ├── layout.tsx, page.tsx, manifest.ts, globals.css
│   └── (서버 라우트 없음)
├── components/
│   ├── home-screen.tsx        # 메인 화면 (거대 마이크 버튼)
│   ├── voice-recorder.tsx     # Web Speech API + 자동 재시작
│   ├── text-quick-input.tsx   # 텍스트 빠른 입력 시트
│   ├── memo-sheet.tsx         # 메모 리스트 풀업 시트
│   ├── api-key-dialog.tsx     # 최초 실행 키 입력
│   └── ui/                    # shadcn 컴포넌트
└── lib/
    ├── types.ts               # Memo, Category, StructuredMemo
    ├── structure.ts           # 직접 fetch → Anthropic
    ├── key-store.ts           # localStorage 키 관리
    └── idb.ts                 # IndexedDB CRUD
```

## 알아두면 좋은 것

- **Web Speech API**는 안드로이드 Chrome, 데스크톱 Chrome/Edge에서 동작합니다. iOS Safari는 부분 지원 — 텍스트로 우회하세요.
- 메모는 **브라우저별 로컬**입니다. 다른 기기에서 보려면 같은 브라우저에서 접속해야 합니다.
- 사진은 longest-side 1280px JPEG q=0.85로 자동 압축 후 data URL로 저장됩니다.

## 라이선스

MIT
