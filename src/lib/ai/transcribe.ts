import "server-only";
import { experimental_transcribe as transcribe } from "ai";

export async function transcribeAudio(audio: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = audio instanceof ArrayBuffer ? new Uint8Array(audio) : audio;
  const result = await transcribe({
    model: "openai/whisper-1",
    audio: bytes,
  });
  return result.text;
}
