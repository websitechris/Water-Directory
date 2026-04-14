import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Trailing-slash normalisation. Next.js `skipTrailingSlashRedirect` disables the
 * built-in rule; we reimplement it here.
 *
 * Note: On `next start`, the Node router may still rewrite same-host `Location` to a
 * relative path. On Vercel production, `vercel.json` runs first and emits an absolute
 * `Location` for www / apex (see project `vercel.json`).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    const destPath = pathname.replace(/\/+$/, "") || "/";
    const url = new URL(destPath + search, request.nextUrl.origin);
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
