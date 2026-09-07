import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"

import { authConfig } from "@/auth.config"
import { prisma } from "@/lib/db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  events: {
    async linkAccount({ user, account }) {
      if (account.provider === "google" && user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { googleSubject: account.providerAccountId },
        })
      }
    },
  },
})
