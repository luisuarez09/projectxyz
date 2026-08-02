import { type NextRequest, NextResponse } from "next/server";

import { getAuth } from "@/modules/identity/infrastructure/auth";

const publicPages = [
  "/login",
  "/recuperar-acceso",
  "/restablecer-contrasena",
  "/invitacion",
  "/verificar-segundo-factor",
];

function isPublicPage(pathname: string) {
  return publicPages.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function proxy(request: NextRequest) {
  if (isPublicPage(request.nextUrl.pathname)) return NextResponse.next();

  const session = await getAuth().api.getSession({ headers: request.headers });
  if (session) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "continuar",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
