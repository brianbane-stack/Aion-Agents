import { NextResponse, type NextRequest } from "next/server";
import { openSession } from "@/lib/auth/token";
import { SESSION_COOKIE } from "@/lib/auth/token";

const PUBLIC = new Set(["/login", "/recuperar", "/criar-clinica"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/webhooks/")) return NextResponse.next();
  const session = openSession(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC.has(pathname);
  if (!session && !isPublic && !pathname.startsWith("/api/webhooks")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (session && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/hoje";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.svg$).*)"],
};
