"use client";

const KEY = "magic-memo.anthropic_api_key";

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setApiKey(value: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, value.trim());
}

export function clearApiKey(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}
