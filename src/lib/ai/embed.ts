import "server-only";
import { embed } from "ai";

export const EMBEDDING_DIMS = 1536;

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: "openai/text-embedding-3-small",
    value: text.slice(0, 8000),
  });
  return embedding;
}
