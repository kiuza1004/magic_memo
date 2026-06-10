"use client";

import { useState } from "react";
import { Sparkles, Mic, Image as ImageIcon, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { VoiceRecorder } from "@/components/voice-recorder";
import { PhotoInput } from "@/components/photo-input";
import { fetchJson } from "@/lib/fetch-json";
import { addMemo, makeId } from "@/lib/idb";
import type { Memo, SourceType, StructuredMemo } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (memo: Memo) => void;
}

// Vercel 함수 body limit(4.5MB) + Anthropic 이미지 권장 크기를 동시에 만족시키기 위해
// 긴 변 1280px로 다운스케일하고 JPEG 0.85로 인코딩한다.
async function compressImage(file: File): Promise<string> {
  const MAX_DIM = 1280;
  const QUALITY = 0.85;
  const originalUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("이미지를 읽을 수 없습니다."));
      el.src = originalUrl;
    });
    const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 컨텍스트를 만들 수 없습니다.");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", QUALITY);
  } finally {
    URL.revokeObjectURL(originalUrl);
  }
}

export function MemoInputSheet({ open, onOpenChange, onCreated }: Props) {
  const [tab, setTab] = useState<SourceType>("text");
  const [text, setText] = useState("");
  const [voiceText, setVoiceText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoMemo, setPhotoMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setText("");
    setVoiceText("");
    setPhoto(null);
    setPhotoMemo("");
    setTab("text");
  };

  const submit = async () => {
    setSubmitting(true);
    const toastId = toast.loading("AI가 정리하고 있어요…", {
      description: "잠시만 기다려주세요.",
    });
    try {
      let rawInput = "";
      let imageDataUrl: string | undefined;

      if (tab === "text") {
        if (!text.trim()) {
          toast.error("내용을 입력해주세요.", { id: toastId, description: undefined });
          return;
        }
        rawInput = text.trim();
      } else if (tab === "voice") {
        if (!voiceText.trim()) {
          toast.error("음성 인식 결과가 없어요.", { id: toastId, description: undefined });
          return;
        }
        rawInput = voiceText.trim();
      } else {
        if (!photo) {
          toast.error("사진을 선택해주세요.", { id: toastId, description: undefined });
          return;
        }
        imageDataUrl = await compressImage(photo);
        rawInput = photoMemo.trim();
      }

      const body = await fetchJson<{ memo: StructuredMemo }>("/api/structure", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: rawInput, imageDataUrl }),
      });

      const memo: Memo = {
        ...body.memo,
        id: makeId(),
        created_at: Date.now(),
        source_type: tab,
        raw_input: rawInput,
        photo_data_url: imageDataUrl,
      };

      await addMemo(memo);

      toast.success("정리 완료!", { id: toastId, description: memo.title });
      onCreated(memo);
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 중 오류", {
        id: toastId,
        description: undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[88vh] flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-5 pb-2">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            새 메모
          </SheetTitle>
          <SheetDescription className="text-xs">
            텍스트·음성·사진 중 편한 방식으로 기록하세요. AI가 자동으로 정리해드려요.
          </SheetDescription>
        </SheetHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as SourceType)}
          className="flex-1 flex flex-col px-6 pb-6"
        >
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="text">
              <FileText className="size-4 mr-1.5" />
              텍스트
            </TabsTrigger>
            <TabsTrigger value="voice">
              <Mic className="size-4 mr-1.5" />
              음성
            </TabsTrigger>
            <TabsTrigger value="photo">
              <ImageIcon className="size-4 mr-1.5" />
              사진
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            <TabsContent value="text" className="mt-0">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="떠오른 생각, 할 일, 정보 무엇이든 자유롭게…"
                className="min-h-48 resize-none"
                autoFocus
              />
            </TabsContent>

            <TabsContent value="voice" className="mt-0">
              <VoiceRecorder onTranscript={setVoiceText} />
            </TabsContent>

            <TabsContent value="photo" className="mt-0 space-y-3">
              <PhotoInput onSelected={setPhoto} />
              <Textarea
                value={photoMemo}
                onChange={(e) => setPhotoMemo(e.target.value)}
                placeholder="추가 메모 (선택)"
                className="min-h-20 resize-none text-sm"
              />
            </TabsContent>
          </div>

          <Button
            type="button"
            size="lg"
            disabled={submitting}
            onClick={submit}
            className="w-full"
          >
            <Sparkles className="size-4 mr-1.5" />
            {submitting ? "정리 중…" : "AI로 정리해서 저장"}
          </Button>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
