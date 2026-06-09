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
import type { MemoWithUrls } from "@/components/memo-card";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (memo: MemoWithUrls) => void;
}

export function MemoInputSheet({ open, onOpenChange, onCreated }: Props) {
  const [tab, setTab] = useState<"text" | "voice" | "photo">("text");
  const [text, setText] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoMemo, setPhotoMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setText("");
    setAudioBlob(null);
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
      let init: RequestInit;
      if (tab === "text") {
        if (!text.trim()) {
          toast.error("내용을 입력해주세요.", { id: toastId });
          return;
        }
        init = {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ source_type: "text", raw_input: text }),
        };
      } else if (tab === "voice") {
        if (!audioBlob) {
          toast.error("음성 녹음이 필요합니다.", { id: toastId });
          return;
        }
        const fd = new FormData();
        fd.set("source_type", "voice");
        fd.set("file", audioBlob, `voice-${Date.now()}.webm`);
        init = { method: "POST", body: fd };
      } else {
        if (!photo) {
          toast.error("사진을 선택해주세요.", { id: toastId });
          return;
        }
        const fd = new FormData();
        fd.set("source_type", "photo");
        fd.set("file", photo);
        if (photoMemo) fd.set("raw_input", photoMemo);
        init = { method: "POST", body: fd };
      }

      const body = await fetchJson<{ memo: MemoWithUrls }>("/api/memos", init);

      toast.success("정리 완료!", {
        id: toastId,
        description: body.memo.title,
      });
      onCreated(body.memo);
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 중 오류", {
        id: toastId,
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
          onValueChange={(v) => setTab(v as typeof tab)}
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
              <VoiceRecorder onRecorded={setAudioBlob} />
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
