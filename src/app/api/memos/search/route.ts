import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, MEMO_BUCKETS } from "@/lib/supabase/admin";
import { embedText } from "@/lib/ai/embed";
import type { Memo } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    const q = (query ?? "").toString().trim();
    if (!q) {
      return NextResponse.json({ memos: [] });
    }

    const embedding = await embedText(q);

    const { data, error } = await supabaseAdmin.rpc("search_memos", {
      query_text: q,
      query_embedding: embedding,
      match_count: 20,
    });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []) as (Memo & { score: number })[];

    const enriched = await Promise.all(
      rows.map(async (m) => {
        const photo_url = m.photo_path
          ? (
              await supabaseAdmin.storage
                .from(MEMO_BUCKETS.photos)
                .createSignedUrl(m.photo_path, 3600)
            ).data?.signedUrl ?? null
          : null;
        const audio_url = m.audio_path
          ? (
              await supabaseAdmin.storage
                .from(MEMO_BUCKETS.audio)
                .createSignedUrl(m.audio_path, 3600)
            ).data?.signedUrl ?? null
          : null;
        return { ...m, photo_url, audio_url };
      }),
    );

    return NextResponse.json({ memos: enriched });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
