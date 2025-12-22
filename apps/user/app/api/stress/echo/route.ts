import { NextResponse } from "next/server";

function parsePositiveInt(
  value: string | null,
  { min = 0, max = 256 * 1024, fallback = min } = {},
): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.floor(parsed);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

function sleepMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bytes = parsePositiveInt(searchParams.get("bytes"), {
    min: 0,
    max: 256 * 1024,
    fallback: 256,
  });
  const delayMs = parsePositiveInt(searchParams.get("ms"), {
    min: 0,
    max: 10_000,
    fallback: 0,
  });

  if (delayMs > 0) {
    await sleepMs(delayMs);
  }

  const payload = Buffer.alloc(bytes, 97);
  return new NextResponse(payload, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "no-store",
    },
  });
}
