import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, MEMO_BUCKETS } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data: existing } = await supabaseAdmin
    .from("memos")
    .select("photo_path,audio_path")
    .eq("id", id)
    .single();

  if (existing?.photo_path) {
    await supabaseAdmin.storage
      .from(MEMO_BUCKETS.photos)
      .remove([existing.photo_path]);
  }
  if (existing?.audio_path) {
    await supabaseAdmin.storage
      .from(MEMO_BUCKETS.audio)
      .remove([existing.audio_path]);
  }

  const { error } = await supabaseAdmin.from("memos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
