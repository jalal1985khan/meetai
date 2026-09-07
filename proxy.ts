import { NextResponse } from "next/server"
import NextAuth from "next-auth"

import { authConfig } from "@/auth.config"

const { auth } = NextAuth(authConfig)

export default auth((request) => {
  const isLoggedIn = Boolean(request.auth?.user)
  const { pathname } = request.nextUrl
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/meetings") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/search")

  if (isProtected && !isLoggedIn) {
    const url = new URL("/", request.url)
    url.searchParams.set("auth", "required")
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/meetings/:path*",
    "/settings/:path*",
    "/search/:path*",
  ],
}
