import { NextRequest, NextResponse } from "next/server";
import { getAnthropic, MODEL } from "@/lib/anthropic";
import { CATEGORIES, type StructuredMemo } from "@/lib/types";
import type Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `당신은 비정형 라이프로그 입력(텍스트·이미지)을 검색·관리에 최적화된 구조형 데이터로 변환하는 AI 엔진입니다.

규칙:
- 모든 출력은 한국어로.
- title은 15자 이내로 간결하게.
- tags는 3~5개, 한국어 키워드, # 기호 제외.
- content는 원문 의미를 100% 보존하면서 오타/음성 인식 오류만 교정한 정제 본문.
- category는 다음 중 정확히 하나:
  • 업무: 직장·개발·비즈니스·프로젝트
  • 개인: 가족·건강·일기·감정
  • 아이디어: 갑자기 떠오른 생각·기획·창의적 개념
  • 지출: 소비·가격·구매 등 돈 관련
  • 일정: 약속·마감·시간 기반 이벤트
  • 정보: 비밀번호·주소·전화번호·링크 등 기억할 정보
  • 할일: 간단한 체크리스트
  • 일반: 그 외
- 이미지가 함께 오면 이미지의 시각 정보·OCR 텍스트·사용자의 추가 메모를 통합해 분석하세요.
- 반드시 save_memo 툴을 호출해 결과를 반환하세요.`;

const SAVE_MEMO_TOOL: Anthropic.Messages.Tool = {
  name: "save_memo",
  description: "구조화된 메모를 저장합니다.",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "메모의 명확하고 짧은 제목 (공백 포함 최대 15자)",
      },
      summary: {
        type: "string",
        description: "메모 내용을 요약한 한 줄 문장",
      },
      category: {
        type: "string",
        enum: [...CATEGORIES],
        description: "내용에 가장 알맞은 카테고리",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        maxItems: 5,
        description: "검색용 한국어 키워드 3~5개 (# 기호 제외)",
      },
      importance: {
        type: "integer",
        minimum: 1,
        maximum: 5,
        description: "시급성/중요도 1(낮음)~5(매우 중요)",
      },
      action_items: {
        type: "array",
        items: { type: "string" },
        description: "텍스트에서 유추되는 실행 가능한 할 일. 없으면 빈 배열",
      },
      content: {
        type: "string",
        description: "오타/STT 오류를 교정한 정제된 본문. 의미는 100% 보존",
      },
    },
    required: [
      "title",
      "summary",
      "category",
      "tags",
      "importance",
      "action_items",
      "content",
    ],
  },
};

function parseDataUrl(dataUrl: string): {
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  data: string;
} | null {
  const m = dataUrl.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/);
  if (!m) return null;
  return {
    mediaType: m[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
    data: m[2],
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text: string = (body.text ?? "").toString();
    const imageDataUrl: string | undefined = body.imageDataUrl;

    if (!text.trim() && !imageDataUrl) {
      return NextResponse.json(
        { error: "텍스트 또는 이미지가 필요합니다." },
        { status: 400 },
      );
    }

    const userContent: Anthropic.Messages.ContentBlockParam[] = [];

    if (imageDataUrl) {
      const parsed = parseDataUrl(imageDataUrl);
      if (!parsed) {
        return NextResponse.json(
          { error: "지원하지 않는 이미지 형식입니다. (jpeg/png/gif/webp)" },
          { status: 400 },
        );
      }
      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: parsed.mediaType,
          data: parsed.data,
        },
      });
    }

    userContent.push({
      type: "text",
      text: text.trim()
        ? `다음 입력을 구조화하세요.\n\n${text}`
        : "이 이미지를 분석해 구조화하세요.",
    });

    const client = getAnthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [SAVE_MEMO_TOOL],
      tool_choice: { type: "tool", name: "save_memo" },
      messages: [{ role: "user", content: userContent }],
    });

    const toolUse = response.content.find(
      (c): c is Anthropic.Messages.ToolUseBlock => c.type === "tool_use",
    );
    if (!toolUse) {
      return NextResponse.json(
        { error: "AI가 구조화된 결과를 반환하지 않았어요. 다시 시도해주세요." },
        { status: 500 },
      );
    }

    const memo = toolUse.input as StructuredMemo;
    return NextResponse.json({ memo });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    console.error("[/api/structure] error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
