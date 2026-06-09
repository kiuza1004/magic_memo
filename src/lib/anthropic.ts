import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다. Vercel Project Settings → Environment Variables에서 추가하세요.",
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

export const MODEL = "claude-opus-4-7";
