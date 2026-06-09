import "server-only";
import { generateObject } from "ai";
import { z } from "zod";

const visionSchema = z.object({
  description: z
    .string()
    .describe("이미지의 핵심 내용을 한국어로 자세히 설명한 문장 (1~3문장)"),
  ocr_text: z
    .string()
    .describe("이미지에서 추출한 모든 텍스트(영수증/문서/표지판 등). 없으면 빈 문자열"),
  detected_objects: z
    .array(z.string())
    .describe("이미지에 나타난 주요 사물/장면 키워드. 한국어"),
});

/**
 * Claude Vision으로 이미지를 분석해 설명/OCR/태그를 추출한다.
 * imageInput: data URL, 외부 URL, 또는 Uint8Array.
 */
export async function describeImage(
  imageInput: string | Uint8Array,
): Promise<{
  description: string;
  ocr_text: string;
  detected_objects: string[];
  combined: string;
}> {
  const { object } = await generateObject({
    model: "anthropic/claude-opus-4-7",
    schema: visionSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "이 이미지를 분석해 핵심 설명, OCR 텍스트, 주요 사물 키워드를 추출하세요. 모든 출력은 한국어로.",
          },
          { type: "image", image: imageInput },
        ],
      },
    ],
    temperature: 0.2,
  });

  const combined = [
    `[이미지 설명] ${object.description}`,
    object.ocr_text ? `[OCR 텍스트] ${object.ocr_text}` : "",
    object.detected_objects.length
      ? `[감지된 사물] ${object.detected_objects.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { ...object, combined };
}
