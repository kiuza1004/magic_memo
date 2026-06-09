"use client";

import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Mic, Image as ImageIcon, FileText, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Memo } from "@/lib/types";

const sourceIcon = {
  text: FileText,
  voice: Mic,
  photo: ImageIcon,
} as const;

interface Props {
  memo: Memo;
  onClick: () => void;
}

export function MemoCard({ memo, onClick }: Props) {
  const Icon = sourceIcon[memo.source_type];
  const when = formatDistanceToNow(new Date(memo.created_at), {
    addSuffix: true,
    locale: ko,
  });

  return (
    <Card
      onClick={onClick}
      className="p-4 cursor-pointer hover:bg-muted/40 transition-colors gap-2"
    >
      <div className="flex items-start gap-3">
        {memo.photo_data_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={memo.photo_data_url}
            alt=""
            className="size-14 rounded-md object-cover flex-shrink-0"
          />
        ) : (
          <div className="size-14 rounded-md bg-muted flex-shrink-0 grid place-items-center">
            <Icon className="size-5 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-medium text-sm truncate">{memo.title}</h3>
            {memo.importance >= 4 && (
              <Star className="size-3.5 fill-amber-400 stroke-amber-400 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {memo.summary}
          </p>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-5">
              {memo.category}
            </Badge>
            {memo.tags.slice(0, 2).map((t) => (
              <span key={t} className="text-[11px] text-muted-foreground">
                #{t}
              </span>
            ))}
            <span className="text-[11px] text-muted-foreground ml-auto">
              {when}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
