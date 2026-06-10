"use client";

import { useMemo, useState } from "react";
import { format, formatDistanceToNow, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";
import { Trash2, Search, X, Star, Mic, Camera, Pencil } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import type { Category, Memo, SourceType } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

const CATEGORY_COLOR: Record<Category, string> = {
  업무: "bg-cyan-400",
  개인: "bg-emerald-400",
  아이디어: "bg-fuchsia-400",
  지출: "bg-amber-400",
  일정: "bg-violet-400",
  정보: "bg-sky-400",
  할일: "bg-rose-400",
  일반: "bg-neutral-400",
};

const SOURCE_ICON: Record<SourceType, typeof Mic> = {
  voice: Mic,
  photo: Camera,
  text: Pencil,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memos: Memo[];
  onDelete: (id: string) => void;
}

function matches(memo: Memo, q: string): boolean {
  if (!q) return true;
  const n = q.toLowerCase();
  return (
    memo.title.toLowerCase().includes(n) ||
    memo.summary.toLowerCase().includes(n) ||
    memo.content.toLowerCase().includes(n) ||
    memo.raw_input.toLowerCase().includes(n) ||
    memo.category.toLowerCase().includes(n) ||
    memo.tags.some((t) => t.toLowerCase().includes(n))
  );
}

export function MemoSheet({ open, onOpenChange, memos, onDelete }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim();
    return memos.filter((m) => {
      if (category && m.category !== category) return false;
      if (q && !matches(m, q)) return false;
      return true;
    });
  }, [memos, query, category]);

  // 날짜별 그룹
  const grouped = useMemo(() => {
    const out: { date: number; items: Memo[] }[] = [];
    for (const m of filtered) {
      const last = out[out.length - 1];
      if (last && isSameDay(new Date(last.date), new Date(m.created_at))) {
        last.items.push(m);
      } else {
        out.push({ date: m.created_at, items: [m] });
      }
    }
    return out;
  }, [filtered]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] flex flex-col gap-0 p-0 bg-neutral-950 border-neutral-800 text-neutral-100"
      >
        <SheetHeader className="px-5 pt-4 pb-3 gap-3">
          <SheetTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
            메모 {memos.length}개
          </SheetTitle>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="제목·태그·내용 검색"
              className="pl-9 pr-9 h-11 bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-600"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-200"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="-mx-5 px-5 overflow-x-auto">
            <div className="flex gap-1.5 w-max">
              <button
                type="button"
                onClick={() => setCategory(null)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                  category === null
                    ? "bg-white text-black"
                    : "bg-white/5 text-neutral-400 hover:text-neutral-100"
                }`}
              >
                전체
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(category === c ? null : c)}
                  className={`px-3 py-1 rounded-full text-xs whitespace-nowrap inline-flex items-center gap-1.5 transition-colors ${
                    category === c
                      ? "bg-white text-black"
                      : "bg-white/5 text-neutral-400 hover:text-neutral-100"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${CATEGORY_COLOR[c]}`}
                  />
                  {c}
                </button>
              ))}
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {filtered.length === 0 ? (
            <div className="py-24 text-center text-sm text-neutral-500">
              {query || category
                ? "결과 없음"
                : "아직 메모가 없어요"}
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map((g) => (
                <section key={g.date}>
                  <h3 className="sticky top-0 py-2 -mx-5 px-5 bg-neutral-950/95 backdrop-blur text-[11px] uppercase tracking-wider text-neutral-500 font-medium z-10">
                    {format(new Date(g.date), "M월 d일 EEEE", { locale: ko })}
                  </h3>
                  <ul className="space-y-1.5">
                    {g.items.map((m) => {
                      const Icon = SOURCE_ICON[m.source_type];
                      const isOpen = expanded === m.id;
                      return (
                        <li
                          key={m.id}
                          className="rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => setExpanded(isOpen ? null : m.id)}
                            className="w-full text-left p-3.5 flex gap-3"
                          >
                            <span
                              className={`size-2 rounded-full mt-2 flex-shrink-0 ${CATEGORY_COLOR[m.category]}`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Icon className="size-3.5 text-neutral-500 flex-shrink-0" />
                                <span className="text-[15px] font-medium truncate">
                                  {m.title}
                                </span>
                                {m.importance >= 4 && (
                                  <Star className="size-3 fill-amber-400 stroke-amber-400 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-neutral-400 line-clamp-1">
                                {m.summary}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] text-neutral-500 tabular-nums">
                                  {formatDistanceToNow(new Date(m.created_at), {
                                    addSuffix: true,
                                    locale: ko,
                                  })}
                                </span>
                                {m.tags.slice(0, 2).map((t) => (
                                  <span
                                    key={t}
                                    className="text-[10px] text-neutral-500"
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </button>

                          {isOpen && (
                            <div className="px-3.5 pb-3.5 border-t border-white/5 pt-3 space-y-3">
                              {m.photo_data_url && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={m.photo_data_url}
                                  alt=""
                                  className="w-full rounded-lg object-cover max-h-64"
                                />
                              )}
                              <p className="text-sm leading-relaxed whitespace-pre-wrap text-neutral-200">
                                {m.content}
                              </p>
                              {m.action_items.length > 0 && (
                                <div>
                                  <p className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1">
                                    할 일
                                  </p>
                                  <ul className="space-y-0.5">
                                    {m.action_items.map((a, i) => (
                                      <li
                                        key={i}
                                        className="text-sm text-neutral-200 flex gap-2"
                                      >
                                        <span className="text-neutral-600">
                                          •
                                        </span>
                                        {a}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <div className="flex flex-wrap gap-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium text-black ${CATEGORY_COLOR[m.category]}`}
                                >
                                  {m.category}
                                </span>
                                {m.tags.map((t) => (
                                  <span
                                    key={t}
                                    className="px-2 py-0.5 rounded-md text-[10px] bg-white/5 text-neutral-400"
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(m.id);
                                }}
                                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300"
                              >
                                <Trash2 className="size-3.5" />
                                삭제
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
