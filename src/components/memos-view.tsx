"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Sparkles, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchBar } from "@/components/search-bar";
import { CategoryFilter } from "@/components/category-filter";
import { MemoCard } from "@/components/memo-card";
import { MemoDetailDialog } from "@/components/memo-detail-dialog";
import { MemoInputSheet } from "@/components/memo-input-sheet";
import { deleteMemo, listMemos } from "@/lib/idb";
import type { Category, Memo } from "@/lib/types";

function matches(memo: Memo, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  if (memo.title.toLowerCase().includes(needle)) return true;
  if (memo.summary.toLowerCase().includes(needle)) return true;
  if (memo.content.toLowerCase().includes(needle)) return true;
  if (memo.raw_input.toLowerCase().includes(needle)) return true;
  if (memo.category.toLowerCase().includes(needle)) return true;
  if (memo.tags.some((t) => t.toLowerCase().includes(needle))) return true;
  if (memo.action_items.some((a) => a.toLowerCase().includes(needle)))
    return true;
  return false;
}

export function MemosView() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [selected, setSelected] = useState<Memo | null>(null);
  const [inputOpen, setInputOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listMemos();
        if (!cancelled) setMemos(list);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "메모를 불러올 수 없어요");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim();
    return memos.filter((m) => {
      if (category && m.category !== category) return false;
      if (q && !matches(m, q)) return false;
      return true;
    });
  }, [memos, category, query]);

  const onCreated = (m: Memo) => {
    setMemos((prev) => [m, ...prev]);
  };

  const onDelete = async (id: string) => {
    const prev = memos;
    setMemos((p) => p.filter((m) => m.id !== id));
    try {
      await deleteMemo(id);
      toast.success("삭제되었습니다");
    } catch (e) {
      setMemos(prev);
      toast.error(e instanceof Error ? e.message : "삭제 중 오류");
    }
  };

  return (
    <div className="flex flex-col flex-1 max-w-2xl w-full mx-auto px-4 pt-4 pb-28">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold flex items-center gap-1.5">
          <Sparkles className="size-5 text-amber-500" />
          Magic Memo
        </h1>
        <span className="text-xs text-muted-foreground">
          {filtered.length}개
        </span>
      </header>

      <div className="space-y-3 mb-4">
        <SearchBar value={query} onChange={setQuery} />
        <CategoryFilter value={category} onChange={setCategory} />
      </div>

      <div className="flex-1 space-y-2">
        {loading && memos.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 text-muted-foreground">
            <Inbox className="size-10 mb-3 opacity-40" />
            <p className="text-sm">
              {query
                ? "검색 결과가 없어요."
                : "아직 메모가 없어요. 아래 + 버튼으로 시작하세요."}
            </p>
          </div>
        ) : (
          filtered.map((m) => (
            <MemoCard key={m.id} memo={m} onClick={() => setSelected(m)} />
          ))
        )}
      </div>

      <Button
        type="button"
        onClick={() => setInputOpen(true)}
        className="fixed bottom-6 right-6 size-14 rounded-full shadow-lg z-30"
        size="icon"
        aria-label="새 메모"
      >
        <Plus className="size-6" />
      </Button>

      <MemoInputSheet
        open={inputOpen}
        onOpenChange={setInputOpen}
        onCreated={onCreated}
      />

      <MemoDetailDialog
        memo={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onDelete={onDelete}
      />
    </div>
  );
}
