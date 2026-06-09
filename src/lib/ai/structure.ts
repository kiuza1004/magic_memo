import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { CATEGORIES, type StructuredMemo } from "@/lib/types";

export const memoSchema = z.object({
  title: z.string().max(20).describe("메모의 명확하고 짧은 제목 (공백 포함 최대 15자)"),
  summary: z.string().describe("메모 내용을 요약한 한 줄 문장"),
  category: z.enum(CATEGORIES).describe("내용에 가장 알맞은 카테고리"),
  tags: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe("검색용 한국어 키워드 3~5개 (# 기호 제외)"),
  importance: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe("시급성/중요도 1(낮음)~5(매우 중요)"),
  action_items: z
    .array(z.string())
    .describe("텍스트에서 유추되는 실행 가능한 할 일. 없으면 빈 배열"),
  standardized_content: z
    .string()
    .describe("오타/STT 오류를 교정한 정제된 본문. 의미는 100% 보존"),
});

const SYSTEM_PROMPT = `당신은 비정형 라이프로그 입력(음성 STT, 이미지 설명/OCR, 일반 텍스트)을 검색·관리에 최적화된 구조형 데이터로 변환하는 AI 엔진입니다.

규칙:
- 카테고리는 [업무, 개인, 아이디어, 지출, 일정, 정보, 할일, 일반] 중 하나만 선택.
- 업무: 직장/개발/비즈니스/프로젝트.
- 개인: 가족/건강/일기/감정.
- 아이디어: 갑자기 떠오른 생각/기획/창의적 개념.
- 지출: 소비/가격/구매 등 돈 관련.
- 일정: 약속/마감/시간 기반 이벤트.
- 정보: 비밀번호/주소/전화번호/링크 등 기억할 정보.
- 할일: 간단한 체크리스트.
- 일반: 그 외.
- title은 15자 이내로 간결하게.
- tags는 3~5개, 한국어 키워드, # 기호 제외.
- standardized_content는 원문 의미를 100% 보존하면서 오타/STT 오류만 교정.
- 모든 출력은 한국어로.`;

export async function structureMemo(rawInput: string): Promise<StructuredMemo> {
  const { object } = await generateObject({
    model: "anthropic/claude-opus-4-7",
    schema: memoSchema,
    system: SYSTEM_PROMPT,
    prompt: `다음 입력을 구조화하세요.\n\nInput: ${rawInput}`,
    temperature: 0.2,
  });
  return object;
}
