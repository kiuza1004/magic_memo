import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, MEMO_BUCKETS } from "@/lib/supabase/admin";
import { structureMemo } from "@/lib/ai/structure";
import { embedText } from "@/lib/ai/embed";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { describeImage } from "@/lib/ai/vision";
import type { Memo, SourceType } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const SIGN_TTL = 60 * 60; // 1 hour

async function signedAssetUrl(
  bucket: string,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, SIGN_TTL);
  return data?.signedUrl ?? null;
}

type MemoWithUrls = Memo & {
  photo_url: string | null;
  audio_url: string | null;
};

async function attachUrls(rows: Memo[]): Promise<MemoWithUrls[]> {
  return Promise.all(
    rows.map(async (m) => ({
      ...m,
      photo_url: await signedAssetUrl(MEMO_BUCKETS.photos, m.photo_path),
      audio_url: await signedAssetUrl(MEMO_BUCKETS.audio, m.audio_path),
    })),
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

  let q = supabaseAdmin
    .from("memos")
    .select(
      "id,created_at,updated_at,source_type,raw_input,title,summary,category,tags,importance,action_items,standardized_content,photo_path,audio_path",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category) q = q.eq("category", category);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = await attachUrls((data ?? []) as Memo[]);
  return NextResponse.json({ memos: enriched });
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let sourceType: SourceType = "text";
    let rawInput = "";
    let photoPath: string | null = null;
    let audioPath: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const fd = await req.formData();
      sourceType = (fd.get("source_type") as SourceType) ?? "text";
      const userText = (fd.get("raw_input") as string | null) ?? "";
      const file = fd.get("file") as File | null;

      if (sourceType === "voice") {
        if (!file) {
          return NextResponse.json(
            { error: "음성 파일이 필요합니다." },
            { status: 400 },
          );
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        rawInput = await transcribeAudio(bytes);
        const ext = (file.name.split(".").pop() || "webm").toLowerCase();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabaseAdmin.storage
          .from(MEMO_BUCKETS.audio)
          .upload(path, bytes, {
            contentType: file.type || "audio/webm",
            upsert: false,
          });
        if (!upErr) audioPath = path;
      } else if (sourceType === "photo") {
        if (!file) {
          return NextResponse.json(
            { error: "사진 파일이 필요합니다." },
            { status: 400 },
          );
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        const vision = await describeImage(bytes);
        rawInput = userText
          ? `${vision.combined}\n\n[사용자 메모] ${userText}`
          : vision.combined;
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabaseAdmin.storage
          .from(MEMO_BUCKETS.photos)
          .upload(path, bytes, {
            contentType: file.type || "image/jpeg",
            upsert: false,
          });
        if (!upErr) photoPath = path;
      } else {
        rawInput = userText;
      }
    } else {
      const body = await req.json();
      sourceType = body.source_type ?? "text";
      rawInput = body.raw_input ?? "";
    }

    rawInput = rawInput.trim();
    if (!rawInput) {
      return NextResponse.json(
        { error: "내용이 비어 있습니다." },
        { status: 400 },
      );
    }

    const structured = await structureMemo(rawInput);
    const embedding = await embedText(
      `${structured.title}\n${structured.summary}\n${structured.standardized_content}\n${structured.tags.join(" ")}`,
    );

    const { data, error } = await supabaseAdmin
      .from("memos")
      .insert({
        source_type: sourceType,
        raw_input: rawInput,
        title: structured.title,
        summary: structured.summary,
        category: structured.category,
        tags: structured.tags,
        importance: structured.importance,
        action_items: structured.action_items,
        standardized_content: structured.standardized_content,
        photo_path: photoPath,
        audio_path: audioPath,
        embedding,
      })
      .select(
        "id,created_at,updated_at,source_type,raw_input,title,summary,category,tags,importance,action_items,standardized_content,photo_path,audio_path",
      )
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const [memo] = await attachUrls([data as Memo]);
    return NextResponse.json({ memo });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
