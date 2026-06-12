import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Magic Memo",
    short_name: "Magic Memo",
    description: "브라우저에서 동작하는 로컬 AI 라이프로그 (Qwen2.5-3B)",
    start_url: ".",
    scope: ".",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "ko",
    orientation: "portrait",
    icons: [
      { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
