"use client"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { signInWithGoogle } from "@/app/actions/auth"
import { useFormStatus } from "react-dom"

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={disabled || pending}>
      {pending ? <Spinner data-icon="inline-start" /> : null}
      Continue with Google
    </Button>
  )
}

export function GoogleSignInButton({
  disabled,
  className,
}: {
  disabled?: boolean
  className?: string
}) {
  return (
    <form action={signInWithGoogle} className={className}>
      <SubmitButton disabled={disabled} />
    </form>
  )
}
