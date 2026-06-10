"use client";

import { useState } from "react";
import { KeyRound, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setApiKey, getApiKey, clearApiKey } from "@/lib/key-store";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  required?: boolean;
}

export function ApiKeyDialog({ open, onOpenChange, onSaved, required }: Props) {
  const [value, setValue] = useState(getApiKey() ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const v = value.trim();
    if (!v.startsWith("sk-ant-")) {
      setError("Anthropic 키는 'sk-ant-'로 시작해요.");
      return;
    }
    setApiKey(v);
    setError(null);
    onSaved?.();
    onOpenChange(false);
  };

  const remove = () => {
    clearApiKey();
    setValue("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (required && !o) return;
        onOpenChange(o);
      }}
    >
      <DialogContent
        showCloseButton={!required}
        className="max-w-sm bg-neutral-950 border-neutral-800 text-neutral-100"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4 text-fuchsia-400" />
            Anthropic API 키
          </DialogTitle>
          <DialogDescription className="text-neutral-400 text-xs leading-relaxed">
            메모를 AI로 정리하려면 키가 필요해요. 키는 이 브라우저에만 저장되고
            외부 서버로 전송되지 않아요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            placeholder="sk-ant-api03-..."
            type="password"
            autoComplete="off"
            className="bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-600"
          />
          {error && <p className="text-xs text-rose-400">{error}</p>}

          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-fuchsia-400 hover:text-fuchsia-300 inline-flex items-center gap-1"
          >
            <ExternalLink className="size-3" />
            console.anthropic.com 에서 키 발급
          </a>
        </div>

        <div className="flex gap-2 pt-2">
          {!required && getApiKey() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={remove}
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
            >
              삭제
            </Button>
          )}
          <Button
            onClick={save}
            className="ml-auto bg-fuchsia-500 hover:bg-fuchsia-400 text-black font-medium"
          >
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
