/**
 * Canonical site origin. Vercel serves the app on www; the apex host redirects there.
 * Override with NEXT_PUBLIC_SITE_URL when needed (must match the primary live host).
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return "https://www.waterdirectory.co.uk";
}
