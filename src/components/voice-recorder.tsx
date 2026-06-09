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
};

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

type Ctor = new () => SpeechRecognitionLike;

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
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      recognitionRef.current?.stop();
    };
  }, []);

  const start = useCallback(() => {
    setError(null);
    setFinalText("");
    setInterim("");
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    try {
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
        setError(`음성 인식 오류: ${ev.error ?? "unknown"}`);
      };
      r.onend = () => {
        setRecording(false);
        setInterim("");
      };
      r.start();
      recognitionRef.current = r;
      startedAtRef.current = Date.now();
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
      setRecording(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "음성 인식을 시작할 수 없습니다.",
      );
    }
  }, [onTranscript]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
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
        <div className="w-full max-w-md rounded-md border bg-muted/30 p-3 text-sm leading-relaxed">
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
          ? "말씀하세요… 다시 누르면 정지됩니다."
          : finalText
            ? "텍스트가 준비되었습니다. ‘저장’을 눌러주세요."
            : "마이크 버튼을 눌러 한국어로 말하세요."}
      </p>
    </div>
  );
}
