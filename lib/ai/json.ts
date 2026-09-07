export function stripJsonFence(text: string) {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  return fenced?.[1]?.trim() ?? trimmed
}

export function parseJsonFromText(text: string): unknown {
  const stripped = stripJsonFence(text)
  try {
    return JSON.parse(stripped)
  } catch {
    const start = stripped.indexOf("{")
    const end = stripped.lastIndexOf("}")
    if (start >= 0 && end > start) {
      return JSON.parse(stripped.slice(start, end + 1))
    }
    throw new Error("LLM returned non-JSON content.")
  }
}

export function textFromUnknown(value: unknown): string {
  if (typeof value === "string") {
    return value
  }
  if (Array.isArray(value)) {
    return value.map((part) => textFromUnknown(part)).join("")
  }
  if (value && typeof value === "object" && "text" in value) {
    const text = (value as { text?: unknown }).text
    return typeof text === "string" ? text : ""
  }
  return ""
}

export function messageContent(message: {
  content?: unknown
  reasoning_content?: unknown
} | null | undefined) {
  const content = textFromUnknown(message?.content).trim()
  if (content) {
    return content
  }
  return textFromUnknown(message?.reasoning_content).trim()
}
