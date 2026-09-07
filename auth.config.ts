import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

const protectedPrefixes = [
  "/dashboard",
  "/onboarding",
  "/meetings",
  "/settings",
  "/search",
]

export const authConfig = {
  trustHost: true,
  providers: [
    Google({
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: "openid email profile",
        },
      },
    }),
  ],
  pages: {
    signIn: "/",
    error: "/",
  },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user)
      const isProtected = protectedPrefixes.some((prefix) =>
        nextUrl.pathname.startsWith(prefix)
      )
      if (isProtected && !isLoggedIn) {
        return false
      }
      return true
    },
    async jwt({ token, account, user }) {
      if (user?.id) {
        token.id = user.id
      }
      if (account?.provider === "google") {
        token.googleSubject = account.providerAccountId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
} satisfies NextAuthConfig
