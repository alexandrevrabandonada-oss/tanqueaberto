import { NextResponse, type NextRequest } from "next/server";

import { BETA_ACCESS_COOKIE_NAME, isBetaClosed, isBetaProtectedPath } from "./lib/beta/gate";

export function middleware(request: NextRequest) {
  if (!isBetaClosed()) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  if (!isBetaProtectedPath(pathname) || request.cookies.has(BETA_ACCESS_COOKIE_NAME)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/beta";
  url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"]
};
