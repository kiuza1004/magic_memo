"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Trash2, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Memo } from "@/lib/types";

interface Props {
  memo: Memo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
}

export function MemoDetailDialog({ memo, open, onOpenChange, onDelete }: Props) {
  if (!memo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {memo.title}
            {Array.from({ length: memo.importance }).map((_, i) => (
              <Star
                key={i}
                className="size-3.5 fill-amber-400 stroke-amber-400"
              />
            ))}
          </DialogTitle>
          <DialogDescription>
            {format(new Date(memo.created_at), "yyyy년 M월 d일 HH:mm", {
              locale: ko,
            })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge>{memo.category}</Badge>
              {memo.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  #{t}
                </Badge>
              ))}
            </div>

            {memo.photo_data_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={memo.photo_data_url}
                alt=""
                className="w-full rounded-md object-cover max-h-72"
              />
            )}

            <section>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">
                요약
              </h4>
              <p className="leading-relaxed">{memo.summary}</p>
            </section>

            <section>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">
                정리된 내용
              </h4>
              <p className="leading-relaxed whitespace-pre-wrap">
                {memo.content}
              </p>
            </section>

            {memo.action_items.length > 0 && (
              <section>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">
                  할 일
                </h4>
                <ul className="list-disc list-inside space-y-0.5">
                  {memo.action_items.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </section>
            )}

            {memo.raw_input && (
              <section>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">
                  원본 입력
                </h4>
                <p className="leading-relaxed whitespace-pre-wrap text-muted-foreground text-xs">
                  {memo.raw_input}
                </p>
              </section>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => {
              onDelete(memo.id);
              onOpenChange(false);
            }}
          >
            <Trash2 className="size-4 mr-1" />
            삭제
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
