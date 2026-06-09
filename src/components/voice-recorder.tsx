"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onRecorded: (blob: Blob) => void;
}

export function VoiceRecorder({ onRecorded }: Props) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const start = async () => {
    setError(null);
    setBlob(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mime });
        setBlob(b);
        onRecorded(b);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      recorderRef.current = mr;
      startedAtRef.current = Date.now();
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
      setRecording(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? `마이크 사용이 거부되었습니다: ${e.message}`
          : "마이크에 접근할 수 없습니다.",
      );
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
  };

  const reset = () => {
    setBlob(null);
    setElapsed(0);
  };

  const mm = Math.floor(elapsed / 60)
    .toString()
    .padStart(2, "0");
  const ss = (elapsed % 60).toString().padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}

      <div className="text-3xl font-mono tabular-nums">
        {mm}:{ss}
      </div>

      {!recording && !blob && (
        <Button
          type="button"
          size="lg"
          onClick={start}
          className="size-20 rounded-full bg-red-500 hover:bg-red-600 text-white"
        >
          <Mic className="size-8" />
        </Button>
      )}

      {recording && (
        <Button
          type="button"
          size="lg"
          onClick={stop}
          className="size-20 rounded-full bg-red-500 hover:bg-red-600 text-white animate-pulse"
        >
          <Square className="size-8 fill-current" />
        </Button>
      )}

      {!recording && blob && (
        <>
          <audio
            controls
            src={URL.createObjectURL(blob)}
            className="w-full max-w-xs"
          />
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
        </>
      )}

      <p className="text-xs text-muted-foreground text-center max-w-xs">
        {recording
          ? "녹음 중… 다시 누르면 정지됩니다."
          : blob
            ? "음성이 준비되었습니다. ‘저장’을 눌러주세요."
            : "마이크 버튼을 눌러 녹음을 시작하세요."}
      </p>
    </div>
  );
}
