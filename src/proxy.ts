// Route guard. (On Next.js 16 this file may be named `proxy.ts` and export `proxy` —
// `middleware.ts` still works there with a deprecation warning.)
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { canAccess } from "@/lib/permissions";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const isLogin = pathname === "/login";

  if (!session) {
    if (isLogin) return NextResponse.next();
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (isLogin) return NextResponse.redirect(new URL("/dashboard", req.url));
  if (!canAccess(pathname, session.role)) return NextResponse.redirect(new URL("/dashboard", req.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/health|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};