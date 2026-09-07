import { z } from "zod"

export const SPEECH_LANGUAGES = [
  { code: "en-IN", label: "English (India)", group: "English" },
  { code: "en-US", label: "English (US)", group: "English" },
  { code: "en-GB", label: "English (UK)", group: "English" },
  { code: "hi-IN", label: "Hindi", group: "India" },
  { code: "bn-IN", label: "Bengali", group: "India" },
  { code: "ta-IN", label: "Tamil", group: "India" },
  { code: "te-IN", label: "Telugu", group: "India" },
  { code: "mr-IN", label: "Marathi", group: "India" },
  { code: "gu-IN", label: "Gujarati", group: "India" },
  { code: "kn-IN", label: "Kannada", group: "India" },
  { code: "ml-IN", label: "Malayalam", group: "India" },
  { code: "pa-IN", label: "Punjabi", group: "India" },
  { code: "ur-IN", label: "Urdu", group: "India" },
  { code: "ar-SA", label: "Arabic", group: "Other" },
  { code: "zh-CN", label: "Chinese (Simplified)", group: "Other" },
  { code: "zh-TW", label: "Chinese (Traditional)", group: "Other" },
  { code: "nl-NL", label: "Dutch", group: "Other" },
  { code: "fr-FR", label: "French", group: "Other" },
  { code: "de-DE", label: "German", group: "Other" },
  { code: "id-ID", label: "Indonesian", group: "Other" },
  { code: "it-IT", label: "Italian", group: "Other" },
  { code: "ja-JP", label: "Japanese", group: "Other" },
  { code: "ko-KR", label: "Korean", group: "Other" },
  { code: "pl-PL", label: "Polish", group: "Other" },
  { code: "pt-BR", label: "Portuguese (Brazil)", group: "Other" },
  { code: "pt-PT", label: "Portuguese (Portugal)", group: "Other" },
  { code: "ru-RU", label: "Russian", group: "Other" },
  { code: "es-ES", label: "Spanish (Spain)", group: "Other" },
  { code: "es-MX", label: "Spanish (Mexico)", group: "Other" },
  { code: "th-TH", label: "Thai", group: "Other" },
  { code: "tr-TR", label: "Turkish", group: "Other" },
  { code: "vi-VN", label: "Vietnamese", group: "Other" },
] as const

export const SPEECH_LANGUAGE_CODES = SPEECH_LANGUAGES.map(
  (item) => item.code
) as unknown as [
  (typeof SPEECH_LANGUAGES)[number]["code"],
  ...(typeof SPEECH_LANGUAGES)[number]["code"][],
]

export const speechLanguageSchema = z.enum(SPEECH_LANGUAGE_CODES)
export const languagePreferenceSchema = z.union([
  z.literal("auto"),
  speechLanguageSchema,
])

export type SpeechLanguage = z.infer<typeof speechLanguageSchema>
export type LanguagePreference = z.infer<typeof languagePreferenceSchema>

export const SPEECH_LANGUAGE_GROUPS = [
  "English",
  "India",
  "Other",
] as const

const LAST_LANGUAGE_KEY = "gmeet-ai.speech-language"

const SCRIPT_HINTS: { code: SpeechLanguage; pattern: RegExp }[] = [
  { code: "hi-IN", pattern: /[\u0900-\u097F]/g },
  { code: "bn-IN", pattern: /[\u0980-\u09FF]/g },
  { code: "pa-IN", pattern: /[\u0A00-\u0A7F]/g },
  { code: "gu-IN", pattern: /[\u0A80-\u0AFF]/g },
  { code: "ta-IN", pattern: /[\u0B80-\u0BFF]/g },
  { code: "te-IN", pattern: /[\u0C00-\u0C7F]/g },
  { code: "kn-IN", pattern: /[\u0C80-\u0CFF]/g },
  { code: "ml-IN", pattern: /[\u0D00-\u0D7F]/g },
  { code: "ar-SA", pattern: /[\u0600-\u06FF]/g },
  { code: "th-TH", pattern: /[\u0E00-\u0E7F]/g },
  { code: "ja-JP", pattern: /[\u3040-\u30FF]/g },
  { code: "ko-KR", pattern: /[\uAC00-\uD7AF]/g },
  { code: "zh-CN", pattern: /[\u4E00-\u9FFF]/g },
  { code: "ru-RU", pattern: /[\u0400-\u04FF]/g },
]

const HINGLISH =
  /\b(hai|hain|kya|nahi|nahin|accha|acha|yaar|bhai|ji|theek|thik|namaste|kaise|aap|hum|mera|kahan|kyun|kyon|karo|karna|mat|bilkul)\b/i

const ENGLISHISH =
  /\b(the|and|you|we|our|this|that|meeting|let's|lets|okay|please|because|should|would)\b/i

function countMatches(text: string, pattern: RegExp) {
  return text.match(pattern)?.length ?? 0
}

export function isIndiaTimezone() {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return timeZone === "Asia/Kolkata" || timeZone === "Asia/Calcutta"
  } catch {
    return false
  }
}

export function speechLanguageLabel(code: string) {
  if (code === "auto") {
    return "Auto"
  }
  return SPEECH_LANGUAGES.find((item) => item.code === code)?.label ?? code
}

export function resolveSpeechLanguage(value?: string | null): SpeechLanguage {
  if (value && speechLanguageSchema.safeParse(value).success) {
    return value as SpeechLanguage
  }

  const candidate =
    value ??
    (typeof navigator === "undefined" ? "en-US" : navigator.language)

  const exact = SPEECH_LANGUAGES.find(
    (item) => item.code.toLowerCase() === candidate.toLowerCase()
  )
  if (exact) {
    return exact.code
  }

  const prefix = candidate.split("-")[0]?.toLowerCase()
  const byPrefix = SPEECH_LANGUAGES.find((item) => {
    const [language] = item.code.split("-")
    return language?.toLowerCase() === prefix
  })
  return byPrefix?.code ?? "en-US"
}

export function readLastSpeechLanguage(): SpeechLanguage | null {
  if (typeof window === "undefined") {
    return null
  }
  return speechLanguageSchema.safeParse(window.localStorage.getItem(LAST_LANGUAGE_KEY))
    .data ?? null
}

export function writeLastSpeechLanguage(code: SpeechLanguage) {
  if (typeof window === "undefined") {
    return
  }
  window.localStorage.setItem(LAST_LANGUAGE_KEY, code)
}

export function pickInitialAutoLanguage(): SpeechLanguage {
  const last = readLastSpeechLanguage()
  if (last && !last.startsWith("en")) {
    return last
  }

  if (typeof navigator !== "undefined") {
    for (const locale of navigator.languages) {
      const prefix = locale.split("-")[0]?.toLowerCase()
      if (!prefix || prefix === "en") {
        continue
      }
      const match = SPEECH_LANGUAGES.find((item) => {
        const [language] = item.code.split("-")
        return language?.toLowerCase() === prefix
      })
      if (match) {
        return match.code
      }
    }
  }

  if (isIndiaTimezone()) {
    return "hi-IN"
  }

  if (last) {
    return last
  }

  return resolveSpeechLanguage()
}

export function detectLanguageFromText(
  text: string,
  current: SpeechLanguage
): SpeechLanguage | null {
  const sample = text.trim()
  if (sample.length < 4) {
    return null
  }

  let top: { code: SpeechLanguage; count: number } | null = null
  for (const hint of SCRIPT_HINTS) {
    const count = countMatches(sample, hint.pattern)
    if (count > 0 && (!top || count > top.count)) {
      top = { code: hint.code, count }
    }
  }

  if (top && top.count >= 4) {
    if (top.code === "ar-SA" && isIndiaTimezone()) {
      return "ur-IN"
    }
    if (top.code === "hi-IN" && current === "mr-IN") {
      return "mr-IN"
    }
    return top.code
  }

  const latin = countMatches(sample, /[A-Za-z]/g)
  if (latin >= 8 && latin / Math.max(sample.length, 1) >= 0.5) {
    if (HINGLISH.test(sample) && !current.startsWith("en")) {
      return current
    }
    if (current.startsWith("en")) {
      return null
    }
    if (ENGLISHISH.test(sample) || !HINGLISH.test(sample)) {
      return isIndiaTimezone() || current.endsWith("-IN") ? "en-IN" : "en-US"
    }
  }

  return null
}

export function preferenceFromMeetingLanguage(
  value?: string | null
): LanguagePreference {
  if (!value || value === "auto") {
    return "auto"
  }
  if (speechLanguageSchema.safeParse(value).success) {
    return value as SpeechLanguage
  }
  return "auto"
}
