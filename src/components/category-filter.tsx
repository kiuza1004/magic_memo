"use client";

import { CATEGORIES, type Category } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  value: Category | null;
  onChange: (cat: Category | null) => void;
}

export function CategoryFilter({ value, onChange }: Props) {
  return (
    <div className="-mx-4 px-4 overflow-x-auto">
      <div className="flex gap-2 pb-1 w-max">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors",
            value === null
              ? "bg-foreground text-background border-foreground"
              : "bg-background text-muted-foreground border-border hover:bg-muted",
          )}
        >
          전체
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors",
              value === c
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover:bg-muted",
            )}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
