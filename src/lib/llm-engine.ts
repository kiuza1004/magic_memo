"use client";

import { CATEGORIES, type StructuredMemo } from "@/lib/types";

const MODEL_DESKTOP_F16 = "Qwen2.5-3B-Instruct-q4f16_1-MLC";
const MODEL_MOBILE_F16 = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
const MODEL_FALLBACK_F32 = "Qwen2.5-1.5B-Instruct-q4f32_1-MLC";

interface WebGPUAdapter {
  features: { has(name: string): boolean };
  limits: { maxStorageBufferBindingSize?: number };
}
interface WebGPU {
  requestAdapter(): Promise<WebGPUAdapter | null>;
}

async function pickModelId(): Promise<string> {
  try {
    const gpu = (navigator as Navigator & { gpu?: WebGPU }).gpu;
    if (!gpu) return MODEL_FALLBACK_F32;
    const adapter = await gpu.requestAdapter();
    if (!adapter) return MODEL_FALLBACK_F32;
    const hasF16 = adapter.features.has("shader-f16");
    const maxBuf = adapter.limits.maxStorageBufferBindingSize ?? 0;
    const isHighEnd = maxBuf >= 1 << 30; // 1 GiB → 데스크탑 GPU 추정
    if (isHighEnd && hasF16) return MODEL_DESKTOP_F16;
    if (hasF16) return MODEL_MOBILE_F16;
    return MODEL_FALLBACK_F32;
  } catch {
    return MODEL_FALLBACK_F32;
  }
}

function isShaderError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /ShaderModule|shader|validating compute|index_kernel/i.test(msg);
}

const SYSTEM_PROMPT = `당신은 비정형 한국어 입력(메모/음성 받아쓰기)을 검색·관리에 최적화된 구조형 데이터로 변환하는 AI입니다.

규칙:
- 모든 출력은 한국어.
- title은 15자 이내, 간결하게.
- tags는 3~5개, 한국어 키워드, # 기호 제외.
- content는 원문 의미를 100% 보존하면서 오타/음성 인식 오류만 교정.
- category는 다음 중 정확히 하나:
  • 업무: 직장·개발·비즈니스·프로젝트
  • 개인: 가족·건강·일기·감정
  • 아이디어: 갑자기 떠오른 생각·기획·창의적 개념
  • 지출: 소비·가격·구매 등 돈 관련
  • 일정: 약속·마감·시간 기반 이벤트
  • 정보: 비밀번호·주소·전화번호·링크 등 기억할 정보
  • 할일: 간단한 체크리스트
  • 일반: 그 외
- importance: 1(낮음)~5(매우 중요).
- action_items: 실행 가능한 할 일. 없으면 빈 배열.

반드시 JSON 객체 하나만 출력하세요. 코드 블록, 설명, 추가 텍스트 금지.`;

const MEMO_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", maxLength: 30 },
    summary: { type: "string" },
    category: { type: "string", enum: [...CATEGORIES] },
    tags: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 5,
    },
    importance: { type: "integer", minimum: 1, maximum: 5 },
    action_items: { type: "array", items: { type: "string" } },
    content: { type: "string" },
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
  additionalProperties: false,
};

export interface ProgressReport {
  progress: number;
  text: string;
}

interface MLCEngineLike {
  chat: {
    completions: {
      create: (opts: {
        messages: Array<{ role: "system" | "user"; content: string }>;
        response_format?: { type: "json_object"; schema?: string };
        max_tokens?: number;
        temperature?: number;
      }) => Promise<{
        choices: Array<{ message: { content: string | null } }>;
      }>;
    };
  };
}

let engine: MLCEngineLike | null = null;
let enginePromise: Promise<MLCEngineLike> | null = null;

export function isWebGPUAvailable(): boolean {
  if (typeof navigator === "undefined") return false;
  return "gpu" in navigator && navigator.gpu != null;
}

export function isEngineReady(): boolean {
  return engine !== null;
}

export async function loadEngine(
  onProgress: (report: ProgressReport) => void,
): Promise<void> {
  if (engine) return;
  if (!isWebGPUAvailable()) {
    throw new Error(
      "이 브라우저는 WebGPU를 지원하지 않아요. Chrome 또는 Edge에서 열어주세요.",
    );
  }
  if (!enginePromise) {
    enginePromise = (async () => {
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
      const primary = await pickModelId();
      const tryLoad = async (id: string) => {
        const e = await CreateMLCEngine(id, {
          initProgressCallback: (report: ProgressReport) => onProgress(report),
        });
        return e as unknown as MLCEngineLike;
      };
      try {
        engine = await tryLoad(primary);
      } catch (err) {
        if (primary !== MODEL_FALLBACK_F32 && isShaderError(err)) {
          // 모바일 GPU에서 f16 셰이더 컴파일 실패 → f32 폴백으로 재시도
          onProgress({ progress: 0, text: "호환 모델로 다시 시도 중…" });
          engine = await tryLoad(MODEL_FALLBACK_F32);
        } else {
          throw err;
        }
      }
      return engine!;
    })();
  }
  try {
    await enginePromise;
  } catch (e) {
    enginePromise = null; // 실패 시 다음 시도를 허용
    throw e;
  }
}

export async function structureMemo(input: {
  text: string;
}): Promise<StructuredMemo> {
  if (!engine) {
    throw new Error("AI가 아직 준비되지 않았어요.");
  }
  const text = input.text.trim();
  if (!text) {
    throw new Error("텍스트가 필요해요.");
  }

  const res = await engine.chat.completions.create({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `다음 입력을 구조화하세요.\n\n${text}` },
    ],
    response_format: {
      type: "json_object",
      schema: JSON.stringify(MEMO_SCHEMA),
    },
    temperature: 0.3,
    max_tokens: 1024,
  });

  const raw = res.choices[0]?.message?.content;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("AI가 응답하지 않았어요. 다시 시도해주세요.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI 응답을 해석할 수 없어요. 다시 시도해주세요.");
  }
  return parsed as StructuredMemo;
}
