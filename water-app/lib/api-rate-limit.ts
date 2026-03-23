import { NextRequest, NextResponse } from "next/server";

/** Sliding-window limits per client IP (in-memory; per server instance on serverless). */
const MAX_PER_MINUTE = 30;
const MAX_PER_HOUR = 200;
const MS_MINUTE = 60_000;
const MS_HOUR = 3_600_000;

/** Timestamps of successful checks (request allowed) in the last hour, per IP */
const ipHits = new Map<string, number[]>();

function pruneToHourWindow(ip: string, now: number): number[] {
  const cutoff = now - MS_HOUR;
  const arr = (ipHits.get(ip) ?? []).filter((t) => t > cutoff);
  return arr;
}

/**
 * Resolve client IP from proxy headers (Vercel, nginx, etc.).
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

type RateOutcome =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number; reason: "minute" | "hour" };

function checkRateLimit(ip: string): RateOutcome {
  const now = Date.now();
  let arr = pruneToHourWindow(ip, now);

  const inMinute = arr.filter((t) => t > now - MS_MINUTE);
  if (inMinute.length >= MAX_PER_MINUTE) {
    const oldest = Math.min(...inMinute);
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((oldest + MS_MINUTE - now) / 1000)),
      reason: "minute",
    };
  }

  if (arr.length >= MAX_PER_HOUR) {
    const oldest = Math.min(...arr);
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((oldest + MS_HOUR - now) / 1000)),
      reason: "hour",
    };
  }

  arr.push(now);
  ipHits.set(ip, arr);

  // Best-effort: drop stale empty keys (shouldn't happen often)
  if (ipHits.size > 50_000) {
    for (const [key, times] of ipHits) {
      if (times.every((t) => t <= now - MS_HOUR)) ipHits.delete(key);
    }
  }

  return { allowed: true };
}

const FRIENDLY_MINUTE =
  "You're sending requests a little too quickly. Please wait up to a minute and try again. This helps us keep the directory free for everyone.";

const FRIENDLY_HOUR =
  "This IP has reached the hourly limit for lookups. Please try again later. If you're browsing normally, the limit will reset within an hour.";

/**
 * Returns a 429 response if the client is over the limit; otherwise records this request and returns null.
 */
export function rateLimitOrNull(request: NextRequest): NextResponse | null {
  const ip = getClientIp(request);
  const outcome = checkRateLimit(ip);

  if (outcome.allowed) return null;

  const body = {
    error: outcome.reason === "minute" ? FRIENDLY_MINUTE : FRIENDLY_HOUR,
    code: "RATE_LIMIT" as const,
  };

  return NextResponse.json(body, {
    status: 429,
    headers: {
      "Retry-After": String(outcome.retryAfterSec),
      "Cache-Control": "no-store",
    },
  });
}
