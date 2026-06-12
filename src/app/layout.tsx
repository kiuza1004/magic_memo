import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SWRegister } from "@/components/sw-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Magic Memo — AI 라이프로그",
  description:
    "음성·텍스트·사진으로 기록하면 AI가 자동 분류·요약하고 자연어로 바로 찾아주는 개인 메모 앱.",
  manifest: "manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Magic Memo",
  },
  icons: {
    icon: [
      { url: "icon.svg", type: "image/svg+xml" },
      { url: "icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-svh flex flex-col bg-black text-neutral-100 overflow-hidden">
        <SWRegister />
        {children}
        <Toaster
          position="top-center"
          theme="dark"
          toastOptions={{
            className: "!bg-neutral-900 !border-neutral-800 !text-neutral-100",
          }}
        />
      </body>
    </html>
  );
}
