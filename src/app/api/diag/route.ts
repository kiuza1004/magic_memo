import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;
  const allKeys = Object.keys(process.env)
    .filter((k) => k.toUpperCase().includes("ANTHROPIC"))
    .sort();

  return NextResponse.json({
    has_ANTHROPIC_API_KEY: !!key,
    key_length: key ? key.length : 0,
    key_prefix: key ? key.slice(0, 10) : null,
    key_has_leading_space: key ? key !== key.trimStart() : false,
    key_has_trailing_space: key ? key !== key.trimEnd() : false,
    anthropic_related_env_keys: allKeys,
    vercel_env: process.env.VERCEL_ENV ?? null,
    node_env: process.env.NODE_ENV ?? null,
    region: process.env.VERCEL_REGION ?? null,
    deployment_url: process.env.VERCEL_URL ?? null,
  });
}
