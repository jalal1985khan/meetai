import { messageContent, parseJsonFromText } from "@/lib/ai/json"
import { logEvent } from "@/lib/logger"
import type { LlmProvider } from "@/lib/providers/types"

class UnconfiguredLlmProvider implements LlmProvider {
  readonly configured = false
  readonly model = "unconfigured"

  completeJson(): Promise<unknown> {
    return Promise.reject(new Error("LLM provider is not configured."))
  }
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError"
}

async function readJsonResponse(response: Response) {
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    logEvent("ai", "llm_http_error", { status: response.status })
    throw new Error("LLM request failed.")
  }
  return payload
}

class GeminiProvider implements LlmProvider {
  readonly configured = true
  readonly model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash"

  constructor(private readonly apiKey: string) {}

  async completeJson(system: string, user: string, timeoutMs: number) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }),
        }
      )
      const payload = (await readJsonResponse(response)) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
      const text = payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
      if (!text) {
        throw new Error("LLM returned an empty response.")
      }
      return parseJsonFromText(text)
    } finally {
      clearTimeout(timer)
    }
  }
}

class OpenAiCompatibleProvider implements LlmProvider {
  readonly configured = true
  readonly model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini"

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string
  ) {}

  async completeJson(system: string, user: string, timeoutMs: number) {
    const extras = this.vendorExtras()
    try {
      return await this.requestJson(system, user, timeoutMs, true, extras)
    } catch (error) {
      if (isAbortError(error)) {
        logEvent("ai", "llm_timeout", { model: this.model })
        throw error
      }
      return await this.requestJson(system, user, timeoutMs, false, {})
    }
  }

  private vendorExtras() {
    const model = this.model.toLowerCase()
    const nvidia = this.baseUrl.includes("nvidia.com")
    const kimi = model.includes("kimi")
    const extras: Record<string, unknown> = { max_tokens: 3072 }
    if (kimi || nvidia) {
      extras.reasoning_effort = "low"
    }
    return extras
  }

  private async requestJson(
    system: string,
    user: string,
    timeoutMs: number,
    jsonMode: boolean,
    extras: Record<string, unknown>
  ) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const body: Record<string, unknown> = {
      model: this.model,
      stream: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      ...extras,
    }
    const omitTemperature =
      this.model.toLowerCase().includes("kimi") ||
      this.baseUrl.includes("nvidia.com")
    if (!omitTemperature) {
      body.temperature = 0.2
    }
    if (jsonMode) {
      body.response_format = { type: "json_object" }
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify(body),
      })
      const payload = (await readJsonResponse(response)) as {
        choices?: {
          message?: { content?: unknown; reasoning_content?: unknown }
        }[]
      }
      const text = messageContent(payload.choices?.[0]?.message)
      if (!text) {
        throw new Error("LLM returned an empty response.")
      }
      return parseJsonFromText(text)
    } finally {
      clearTimeout(timer)
    }
  }
}

export function createLlmProvider(): LlmProvider {
  const geminiKey = process.env.GEMINI_API_KEY?.trim()
  if (geminiKey) {
    return new GeminiProvider(geminiKey)
  }
  const openAiKey = process.env.OPENAI_API_KEY?.trim()
  if (openAiKey) {
    const baseUrl = (
      process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1"
    ).replace(/\/$/, "")
    return new OpenAiCompatibleProvider(openAiKey, baseUrl)
  }
  return new UnconfiguredLlmProvider()
}

export function getLlmProvider(): LlmProvider {
  return createLlmProvider()
}

export function isLlmConfigured() {
  return createLlmProvider().configured
}
