export function getBackendUrl(): string {
  // Enforce relative routing for Vercel Serverless Functions
  return "";
}

export function setBackendUrl(url: string) {
  // No-op under unified Vercel hosting
}

export async function apiFetch(input: string | URL, init?: RequestInit, timeoutMs = 8000): Promise<Response> {
  const backendUrl = getBackendUrl();
  let url = typeof input === "string" ? input : input.toString();

  if (backendUrl && url.startsWith("/api/")) {
    url = `${backendUrl}${url}`;
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === "AbortError") {
      throw new Error(`接続タイムアウト (${timeoutMs}ms) — バックエンドサーバーの応答がありませんにゃ😿`);
    }
    throw error;
  }
}
