"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onTranscript: (text: string) => void;
}

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

type Ctor = new () => SpeechRecognitionLike;

// 안드로이드 Chrome의 무음 자동종료에 대비한 자동 재시작 최대 시간 (10분)
const MAX_RECORDING_MS = 10 * 60 * 1000;

function getRecognitionCtor(): Ctor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: Ctor;
    webkitSpeechRecognition?: Ctor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceRecorder({ onTranscript }: Props) {
  const [supported, setSupported] = useState(() => !!getRecognitionCtor());
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldRecordRef = useRef(false);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const launchRef = useRef<() => void>(() => {});

  const teardown = useCallback(() => {
    shouldRecordRef.current = false;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const r = recognitionRef.current;
    if (r) {
      r.onresult = null;
      r.onerror = null;
      r.onend = null;
      try {
        r.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  const launch = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const r = new Ctor();
    r.lang = "ko-KR";
    r.continuous = true;
    r.interimResults = true;

    r.onresult = (e) => {
      let interimChunk = "";
      let finalAdd = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const t = res[0].transcript;
        if (res.isFinal) finalAdd += t;
        else interimChunk += t;
      }
      if (finalAdd) {
        setFinalText((prev) => {
          const next = (prev + " " + finalAdd).trim();
          onTranscript(next);
          return next;
        });
      }
      setInterim(interimChunk);
    };

    r.onerror = (ev) => {
      // no-speech, aborted, audio-capture 는 자동 재시작 처리
      const code = ev.error ?? "unknown";
      if (code === "no-speech" || code === "aborted") return;
      if (code === "not-allowed" || code === "service-not-allowed") {
        shouldRecordRef.current = false;
        setError("마이크 권한이 거부되었습니다.");
        return;
      }
      setError(`음성 인식 오류: ${code}`);
    };

    r.onend = () => {
      setInterim("");
      const elapsedMs = Date.now() - startedAtRef.current;
      // 사용자가 계속 녹음 중이고 최대 시간을 넘지 않았다면 재시작
      if (shouldRecordRef.current && elapsedMs < MAX_RECORDING_MS) {
        try {
          launchRef.current();
        } catch (err) {
          shouldRecordRef.current = false;
          setRecording(false);
          setError(
            err instanceof Error
              ? err.message
              : "재시작 중 오류가 발생했습니다.",
          );
        }
        return;
      }
      shouldRecordRef.current = false;
      setRecording(false);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    try {
      r.start();
      recognitionRef.current = r;
    } catch {
      // 일부 브라우저는 같은 instance를 빠르게 재시작하면 InvalidState 던짐
      // 한 틱 후 재시도
      window.setTimeout(() => {
        if (shouldRecordRef.current) {
          try {
            r.start();
            recognitionRef.current = r;
          } catch (err) {
            shouldRecordRef.current = false;
            setRecording(false);
            setError(
              err instanceof Error ? err.message : "음성 인식 시작 실패",
            );
          }
        }
      }, 200);
    }
  }, [onTranscript]);

  // launch는 자기 자신을 재귀 호출하므로 ref로 보관해 cycle을 끊는다.
  useEffect(() => {
    launchRef.current = launch;
  }, [launch]);

  const start = useCallback(() => {
    setError(null);
    setFinalText("");
    setInterim("");
    shouldRecordRef.current = true;
    startedAtRef.current = Date.now();
    setElapsed(0);
    timerRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 250);
    setRecording(true);
    launchRef.current();
  }, []);

  const stop = useCallback(() => {
    shouldRecordRef.current = false;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setRecording(false);
  }, []);

  const reset = useCallback(() => {
    setFinalText("");
    setInterim("");
    setElapsed(0);
    onTranscript("");
  }, [onTranscript]);

  if (!supported) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        이 브라우저는 음성 인식을 지원하지 않아요. Chrome(안드로이드/데스크톱)에서 시도해보세요.
      </div>
    );
  }

  const mm = Math.floor(elapsed / 60)
    .toString()
    .padStart(2, "0");
  const ss = (elapsed % 60).toString().padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {error && <p className="text-xs text-destructive text-center">{error}</p>}

      <div className="text-3xl font-mono tabular-nums">
        {mm}:{ss}
      </div>

      {!recording ? (
        <Button
          type="button"
          size="lg"
          onClick={start}
          className="size-20 rounded-full bg-red-500 hover:bg-red-600 text-white"
        >
          <Mic className="size-8" />
        </Button>
      ) : (
        <Button
          type="button"
          size="lg"
          onClick={stop}
          className="size-20 rounded-full bg-red-500 hover:bg-red-600 text-white animate-pulse"
        >
          <Square className="size-8 fill-current" />
        </Button>
      )}

      {(finalText || interim) && (
        <div className="w-full max-w-md rounded-md border bg-muted/30 p-3 text-sm leading-relaxed max-h-48 overflow-y-auto">
          <span>{finalText}</span>
          {interim && (
            <span className="text-muted-foreground">
              {finalText ? " " : ""}
              {interim}
            </span>
          )}
        </div>
      )}

      {!recording && finalText && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={reset}
          className="text-muted-foreground"
        >
          <Trash2 className="size-4 mr-1" />
          다시 녹음
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-center max-w-xs">
        {recording
          ? "말씀하세요… 무음이 지속되어도 자동으로 다시 켜집니다 (최대 10분)."
          : finalText
            ? "텍스트가 준비되었습니다. ‘저장’을 눌러주세요."
            : "마이크 버튼을 눌러 한국어로 말하세요."}
      </p>
    </div>
  );
}
