/**
 * fetch 응답을 안전하게 JSON으로 파싱한다.
 * 빈 본문/비JSON/타임아웃 504 등 어떤 경우에도 의미 있는 에러를 던진다.
 */
export async function fetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, init);
  const text = await res.text();

  if (!text) {
    throw new Error(
      `서버가 빈 응답을 보냈어요 (HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}). ` +
        `함수 타임아웃이거나 환경변수가 누락됐을 수 있어요. Vercel 로그를 확인하세요.`,
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(
      `JSON이 아닌 응답: ${text.slice(0, 200)}${text.length > 200 ? "…" : ""}`,
    );
  }

  if (!res.ok) {
    const err =
      (body as { error?: string })?.error ??
      `HTTP ${res.status} ${res.statusText}`;
    throw new Error(err);
  }

  return body as T;
}
