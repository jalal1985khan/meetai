import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  const authSecretSet = Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET)
  const googleId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || ""
  const googleSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || ""
  const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "(not set)"
  const trustHost = process.env.AUTH_TRUST_HOST || "(not set)"
  const databaseUrl = process.env.DATABASE_URL || ""

  let dbHost = "NOT_SET"
  if (databaseUrl) {
    try {
      const parsed = new URL(databaseUrl.replace(/^postgresql:\/\//, "http://"))
      dbHost = `${parsed.hostname}:${parsed.port || "5432"}`
    } catch {
      dbHost = "INVALID_URL_FORMAT"
    }
  }

  let dbStatus = "unknown"
  let dbError: string | null = null
  let userTableStatus = "unknown"

  if (databaseUrl) {
    try {
      await prisma.$queryRaw`SELECT 1`
      dbStatus = "connected"
      try {
        await prisma.user.findFirst()
        userTableStatus = "exists"
      } catch (err: unknown) {
        userTableStatus = "error"
        dbError = err instanceof Error ? err.message : String(err)
      }
    } catch (err: unknown) {
      dbStatus = "connection_failed"
      dbError = err instanceof Error ? err.message : String(err)
    }
  } else {
    dbStatus = "missing_DATABASE_URL"
  }

  return NextResponse.json({
    env: {
      AUTH_SECRET_configured: authSecretSet,
      AUTH_GOOGLE_ID_configured: Boolean(googleId),
      AUTH_GOOGLE_ID_preview: googleId ? `${googleId.slice(0, 8)}...${googleId.slice(-12)}` : null,
      AUTH_GOOGLE_SECRET_configured: Boolean(googleSecret),
      AUTH_URL: authUrl,
      AUTH_TRUST_HOST: trustHost,
      DATABASE_URL_host: dbHost,
    },
    database: {
      status: dbStatus,
      user_table: userTableStatus,
      error: dbError,
    },
    timestamp: new Date().toISOString(),
  })
}
