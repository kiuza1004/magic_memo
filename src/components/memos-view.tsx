"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Sparkles, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchBar } from "@/components/search-bar";
import { CategoryFilter } from "@/components/category-filter";
import { MemoCard, type MemoWithUrls } from "@/components/memo-card";
import { MemoDetailDialog } from "@/components/memo-detail-dialog";
import { MemoInputSheet } from "@/components/memo-input-sheet";
import type { Category } from "@/lib/types";

export function MemosView() {
  const [memos, setMemos] = useState<MemoWithUrls[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [selected, setSelected] = useState<MemoWithUrls | null>(null);
  const [inputOpen, setInputOpen] = useState(false);

  const fetchList = async (cat: Category | null) => {
    setLoading(true);
    try {
      const url = cat
        ? `/api/memos?category=${encodeURIComponent(cat)}`
        : `/api/memos`;
      const res = await fetch(url);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "불러오기 실패");
      setMemos(body.memos ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "메모를 불러올 수 없어요");
    } finally {
      setLoading(false);
    }
  };

  const runSearch = async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/memos/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "검색 실패");
      setMemos(body.memos ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "검색 중 오류");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = query.trim();
    const delay = q ? 400 : 0;
    const id = window.setTimeout(() => {
      if (q) runSearch(q);
      else fetchList(category);
    }, delay);
    return () => window.clearTimeout(id);
  }, [query, category]);

  const filtered = useMemo(() => {
    if (query.trim()) return memos;
    if (!category) return memos;
    return memos.filter((m) => m.category === category);
  }, [memos, category, query]);

  const onCreated = (m: MemoWithUrls) => {
    setMemos((prev) => [m, ...prev]);
  };

  const onDelete = async (id: string) => {
    const prev = memos;
    setMemos((p) => p.filter((m) => m.id !== id));
    try {
      const res = await fetch(`/api/memos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
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
        <CategoryFilter
          value={category}
          onChange={(c) => {
            setCategory(c);
          }}
        />
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
