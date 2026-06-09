"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Memo } from "@/lib/types";

interface MagicMemoDB extends DBSchema {
  memos: {
    key: string;
    value: Memo;
    indexes: { "by-created": number; "by-category": string };
  };
}

const DB_NAME = "magic-memo";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MagicMemoDB>> | null = null;

function getDb() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is browser-only");
  }
  if (!dbPromise) {
    dbPromise = openDB<MagicMemoDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("memos", { keyPath: "id" });
        store.createIndex("by-created", "created_at");
        store.createIndex("by-category", "category");
      },
    });
  }
  return dbPromise;
}

export async function listMemos(): Promise<Memo[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("memos", "by-created");
  return all.reverse(); // newest first
}

export async function addMemo(memo: Memo): Promise<void> {
  const db = await getDb();
  await db.put("memos", memo);
}

export async function deleteMemo(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("memos", id);
}

export async function clearAll(): Promise<void> {
  const db = await getDb();
  await db.clear("memos");
}

export function makeId(): string {
  // 브라우저 + 모바일 모두 crypto.randomUUID 지원 (안드로이드 크롬 60+).
  return crypto.randomUUID();
}
