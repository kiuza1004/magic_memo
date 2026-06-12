"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Pencil, Settings, List, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { VoiceRecorder, isSpeechSupported } from "@/components/voice-recorder";
import { MemoSheet } from "@/components/memo-sheet";
import { TextQuickInput } from "@/components/text-quick-input";
import {
  isWebGPUAvailable,
  isEngineReady,
  loadEngine,
  structureMemo,
} from "@/lib/llm-engine";
import { addMemo, listMemos, deleteMemo, makeId } from "@/lib/idb";
import type { Memo, SourceType } from "@/lib/types";

type Mode = "idle" | "recording" | "processing";

type EngineUI =
  | { status: "checking" }
  | { status: "unsupported" }
  | { status: "loading"; progress: number; text: string }
  | { status: "ready" }
  | { status: "error"; message: string };

export function HomeScreen() {
  const [mode, setMode] = useState<Mode>("idle");
  const [transcript, setTranscript] = useState("");
  const [memos, setMemos] = useState<Memo[]>([]);
  const [memoSheet, setMemoSheet] = useState(false);
  const [textInput, setTextInput] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [engineUI, setEngineUI] = useState<EngineUI>({ status: "checking" });

  const tickRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);

  // 초기 메모 로드 + 엔진 로딩
  useEffect(() => {
    (async () => {
      try {
        const list = await listMemos();
        setMemos(list);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "메모를 불러올 수 없어요");
      }
    })();

    if (!isWebGPUAvailable()) {
      setEngineUI({ status: "unsupported" });
      return;
    }
    if (isEngineReady()) {
      setEngineUI({ status: "ready" });
      return;
    }
    setEngineUI({ status: "loading", progress: 0, text: "AI 준비 중…" });
    loadEngine((report) => {
      setEngineUI({
        status: "loading",
        progress: Math.max(0, Math.min(1, report.progress)),
        text: report.text || "AI 모델을 받고 있어요…",
      });
    })
      .then(() => setEngineUI({ status: "ready" }))
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : "AI 준비 실패";
        setEngineUI({ status: "error", message });
      });
  }, []);

  // 타이머
  useEffect(() => {
    if (mode !== "recording") {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    startedAtRef.current = Date.now();
    tickRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 250);
    const reset = window.setTimeout(() => setElapsed(0), 0);
    return () => {
      window.clearTimeout(reset);
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [mode]);

  const saveMemo = async (sourceType: SourceType, rawInput: string) => {
    if (engineUI.status !== "ready") {
      toast.error("AI가 아직 준비되지 않았어요.");
      return;
    }
    setMode("processing");
    const toastId = toast.loading("AI가 정리하고 있어요…");
    try {
      const structured = await structureMemo({ text: rawInput });
      const memo: Memo = {
        ...structured,
        id: makeId(),
        created_at: Date.now(),
        source_type: sourceType,
        raw_input: rawInput,
      };
      await addMemo(memo);
      setMemos((prev) => [memo, ...prev]);
      toast.success("정리 완료", {
        id: toastId,
        description: memo.title,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "오류가 발생했어요", {
        id: toastId,
        description: undefined,
      });
    } finally {
      setMode("idle");
      setTranscript("");
    }
  };

  const onMicTap = () => {
    if (engineUI.status !== "ready") {
      toast.error("AI가 아직 준비되지 않았어요.");
      return;
    }
    if (mode === "processing") return;
    if (mode === "recording") {
      setMode("idle");
      const t = transcript.trim();
      if (t) saveMemo("voice", t);
      return;
    }
    if (!isSpeechSupported()) {
      toast.error("이 브라우저는 음성 인식을 지원하지 않아요. 텍스트로 입력해주세요.");
      setTextInput(true);
      return;
    }
    setMode("recording");
  };

  const onTextSubmit = async (text: string) => {
    setTextInput(false);
    const t = text.trim();
    if (!t) return;
    await saveMemo("text", t);
  };

  const onDelete = async (id: string) => {
    const prev = memos;
    setMemos((p) => p.filter((m) => m.id !== id));
    try {
      await deleteMemo(id);
      toast.success("삭제되었어요");
    } catch (e) {
      setMemos(prev);
      toast.error(e instanceof Error ? e.message : "삭제 실패");
    }
  };

  const mm = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const ss = (elapsed % 60).toString().padStart(2, "0");

  const isReady = engineUI.status === "ready";
  const inputsDisabled = !isReady || mode !== "idle";

  return (
    <main className="relative flex flex-col flex-1 overflow-hidden">
      {/* 배경 그라데이션 */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-cyan-500/15 blur-3xl" />
      </div>

      {/* 상단 바 */}
      <header className="flex items-center justify-between px-5 pt-3 pb-2">
        <button
          type="button"
          onClick={() => setMemoSheet(false)}
          className="size-10 grid place-items-center rounded-full text-neutral-400/40"
          aria-label="설정"
          disabled
        >
          <Settings className="size-5" />
        </button>
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-4 text-fuchsia-400" />
          <span className="text-sm font-medium tracking-wide">Magic Memo</span>
        </div>
        <button
          type="button"
          onClick={() => setMemoSheet(true)}
          className="relative size-10 grid place-items-center rounded-full text-neutral-400 hover:text-neutral-100 hover:bg-white/5 active:bg-white/10 transition-colors"
          aria-label="메모 목록"
        >
          <List className="size-5" />
          {memos.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 grid place-items-center rounded-full bg-fuchsia-500 text-black text-[10px] font-bold tabular-nums">
              {memos.length > 99 ? "99+" : memos.length}
            </span>
          )}
        </button>
      </header>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div className="text-4xl font-mono tabular-nums text-neutral-300 mb-6 h-12">
          {mode === "recording" ? `${mm}:${ss}` : ""}
        </div>

        <div className="relative">
          {mode === "recording" && (
            <>
              <span className="absolute inset-0 rounded-full bg-rose-500/60 ring-pulse" />
              <span
                className="absolute inset-0 rounded-full bg-rose-500/40 ring-pulse"
                style={{ animationDelay: "0.4s" }}
              />
            </>
          )}
          <button
            type="button"
            onClick={onMicTap}
            disabled={mode === "processing" || !isReady}
            className={`relative size-56 rounded-full grid place-items-center transition-all active:scale-95 ${
              mode === "recording"
                ? "bg-gradient-to-br from-rose-500 to-rose-700 glow-rose"
                : mode === "processing"
                  ? "bg-neutral-800"
                  : isReady
                    ? "bg-gradient-to-br from-fuchsia-500 to-violet-700 glow-fuchsia"
                    : "bg-neutral-800"
            }`}
            aria-label={mode === "recording" ? "녹음 정지" : "녹음 시작"}
          >
            {mode === "processing" ? (
              <Sparkles className="size-16 text-fuchsia-300 animate-pulse" />
            ) : (
              <Mic className="size-20 text-white" strokeWidth={2.2} />
            )}
          </button>
        </div>

        <p className="mt-6 text-sm text-neutral-400 text-center max-w-xs h-10">
          {mode === "recording"
            ? "말씀하세요. 다시 누르면 저장됩니다."
            : mode === "processing"
              ? "잠시만요…"
              : isReady
                ? "마이크를 눌러 메모하세요."
                : "AI 준비 중…"}
        </p>
      </div>

      {/* 보조 버튼 */}
      <div className="flex items-center justify-center gap-3 pb-10">
        <button
          type="button"
          onClick={() => setTextInput(true)}
          disabled={inputsDisabled}
          className="size-14 rounded-full grid place-items-center bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30"
          aria-label="텍스트 입력"
        >
          <Pencil className="size-5" />
        </button>
      </div>

      {/* 음성 인식 결과 오버레이 */}
      <VoiceRecorder
        recording={mode === "recording"}
        onTranscriptChange={setTranscript}
        onUnsupported={() => {
          setMode("idle");
          toast.error("음성 인식 미지원 브라우저예요.");
        }}
      />

      {/* 텍스트 빠른 입력 */}
      <TextQuickInput
        open={textInput}
        onOpenChange={setTextInput}
        onSubmit={onTextSubmit}
      />

      {/* 메모 목록 시트 */}
      <MemoSheet
        open={memoSheet}
        onOpenChange={setMemoSheet}
        memos={memos}
        onDelete={onDelete}
      />

      {/* 엔진 로딩 오버레이 */}
      {engineUI.status !== "ready" && (
        <EngineOverlay ui={engineUI} />
      )}
    </main>
  );
}

function EngineOverlay({ ui }: { ui: Exclude<EngineUI, { status: "ready" }> }) {
  return (
    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center px-8">
      {ui.status === "checking" && (
        <>
          <Sparkles className="size-12 text-fuchsia-400 animate-pulse mb-4" />
          <p className="text-neutral-300">준비 중…</p>
        </>
      )}

      {ui.status === "unsupported" && (
        <>
          <AlertCircle className="size-12 text-amber-400 mb-4" />
          <h2 className="text-lg font-medium mb-2">WebGPU 미지원 브라우저</h2>
          <p className="text-sm text-neutral-400 text-center max-w-sm leading-relaxed">
            이 앱은 AI 모델을 브라우저에서 직접 실행해 작동합니다.
            <br />
            <strong className="text-neutral-200">Chrome 113+</strong> 또는{" "}
            <strong className="text-neutral-200">Edge 113+</strong>에서 열어주세요.
            <br />
            (iOS Safari·Firefox는 현재 미지원)
          </p>
        </>
      )}

      {ui.status === "loading" && (
        <>
          <div className="relative mb-6">
            <Sparkles className="size-12 text-fuchsia-400 animate-pulse" />
          </div>
          <h2 className="text-lg font-medium mb-2">AI 모델 준비 중</h2>
          <p className="text-xs text-neutral-400 mb-6 text-center max-w-sm leading-relaxed">
            처음 한 번만 받으면 이후엔 즉시 실행됩니다.
            <br />
            완전 오프라인·무료로 동작해요.
          </p>
          <div className="w-full max-w-xs">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-all duration-300"
                style={{ width: `${Math.round(ui.progress * 100)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-neutral-500 tabular-nums">
              <span className="truncate pr-2">{ui.text}</span>
              <span>{Math.round(ui.progress * 100)}%</span>
            </div>
          </div>
        </>
      )}

      {ui.status === "error" && (
        <>
          <AlertCircle className="size-12 text-rose-400 mb-4" />
          <h2 className="text-lg font-medium mb-2">AI 준비 실패</h2>
          <p className="text-sm text-neutral-400 text-center max-w-sm leading-relaxed">
            {ui.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 rounded-full bg-fuchsia-500 text-black text-sm font-medium hover:bg-fuchsia-400 active:scale-95 transition-all"
          >
            다시 시도
          </button>
        </>
      )}
    </div>
  );
}
