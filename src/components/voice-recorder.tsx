"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  recording: boolean;
  onTranscriptChange: (text: string) => void;
  onUnsupported: () => void;
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

const MAX_RECORDING_MS = 10 * 60 * 1000;

function getRecognitionCtor(): Ctor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: Ctor;
    webkitSpeechRecognition?: Ctor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Headless voice recognizer. Parent owns `recording` state.
 * - 무음 자동종료 시 자동 재시작 (최대 10분)
 * - 결과는 onTranscriptChange로 전달
 */
export function VoiceRecorder({
  recording,
  onTranscriptChange,
  onUnsupported,
}: Props) {
  const [interim, setInterim] = useState("");
  const [finalText, setFinalText] = useState("");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldRecordRef = useRef(false);
  const startedAtRef = useRef<number>(0);
  const launchRef = useRef<() => void>(() => {});

  const launch = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      onUnsupported();
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
          onTranscriptChange(next);
          return next;
        });
      }
      setInterim(interimChunk);
    };

    r.onerror = (ev) => {
      const code = ev.error ?? "unknown";
      if (code === "no-speech" || code === "aborted") return;
    };

    r.onend = () => {
      setInterim("");
      const elapsedMs = Date.now() - startedAtRef.current;
      if (shouldRecordRef.current && elapsedMs < MAX_RECORDING_MS) {
        try {
          launchRef.current();
        } catch {
          shouldRecordRef.current = false;
        }
      }
    };

    try {
      r.start();
      recognitionRef.current = r;
    } catch {
      window.setTimeout(() => {
        if (shouldRecordRef.current) {
          try {
            r.start();
            recognitionRef.current = r;
          } catch {
            shouldRecordRef.current = false;
          }
        }
      }, 200);
    }
  }, [onTranscriptChange, onUnsupported]);

  useEffect(() => {
    launchRef.current = launch;
  }, [launch]);

  useEffect(() => {
    if (recording) {
      shouldRecordRef.current = true;
      startedAtRef.current = Date.now();
      const resetId = window.setTimeout(() => {
        setFinalText("");
        setInterim("");
      }, 0);
      launch();
      return () => {
        window.clearTimeout(resetId);
        shouldRecordRef.current = false;
        try {
          recognitionRef.current?.abort();
        } catch {
          /* ignore */
        }
      };
    }
    shouldRecordRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    // launch는 ref로 보관되므로 deps에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  if (!recording && !finalText && !interim) return null;

  return (
    <div className="absolute inset-x-6 bottom-44 max-h-40 overflow-y-auto rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-4 text-sm leading-relaxed">
      <span className="text-neutral-100">{finalText}</span>
      {interim && (
        <span className="text-neutral-500">
          {finalText ? " " : ""}
          {interim}
        </span>
      )}
      {recording && !finalText && !interim && (
        <span className="text-neutral-500">듣는 중…</span>
      )}
    </div>
  );
}

export function isSpeechSupported(): boolean {
  return !!getRecognitionCtor();
}
