import { NextResponse } from "next/server"

import { auth } from "@/auth"

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

export async function requireUser() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new HttpError(401, "Sign in with Google to continue.")
  }
  return { userId, session }
}

export function jsonError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 })
}
