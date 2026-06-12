"use client";

import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (text: string) => void;
}

export function TextQuickInput({ open, onOpenChange, onSubmit }: Props) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const t1 = window.setTimeout(() => setText(""), 0);
    const t2 = window.setTimeout(() => ref.current?.focus(), 100);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [open]);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSubmit(t);
    setText("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="h-auto max-h-[60vh] flex flex-col gap-0 p-0 bg-neutral-950 border-neutral-800 text-neutral-100 rounded-t-3xl"
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="size-9 grid place-items-center rounded-full text-neutral-400 hover:text-neutral-100 hover:bg-white/5"
          >
            <X className="size-4" />
          </button>
          <SheetTitle className="text-xs font-normal text-neutral-500">
            텍스트 메모
          </SheetTitle>
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim()}
            className="size-9 grid place-items-center rounded-full bg-fuchsia-500 text-black hover:bg-fuchsia-400 active:scale-95 transition-all disabled:opacity-30 disabled:bg-neutral-800 disabled:text-neutral-600"
          >
            <Send className="size-4" />
          </button>
        </div>

        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="무엇이든 적어보세요…"
          className="flex-1 min-h-40 px-5 py-4 bg-transparent text-base text-neutral-100 placeholder:text-neutral-600 resize-none focus:outline-none"
        />
      </SheetContent>
    </Sheet>
  );
}
