"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { TranscriptSegment } from "@prisma/client"
import {
  detectLanguageFromText,
  pickInitialAutoLanguage,
  writeLastSpeechLanguage,
  type LanguagePreference,
  type SpeechLanguage,
} from "@/lib/meetings/languages"

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition

type BrowserSpeechRecognition = EventTarget & {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

type BrowserSpeechRecognitionEvent = {
  resultIndex: number
  results: ArrayLike<{
    isFinal: boolean
    0?: { transcript?: string }
  }>
}

type BrowserSpeechRecognitionErrorEvent = {
  error: string
}

function getSpeechRecognition(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null
  }
  const speechWindow = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor
  }
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null
}

function resolvePreference(preference: LanguagePreference): SpeechLanguage {
  return preference === "auto" ? pickInitialAutoLanguage() : preference
}

export function useBrowserStt({
  meetingId,
  speakerLabel,
  languagePreference,
  active,
  initialSegments,
  onLanguageResolved,
}: {
  meetingId: string
  speakerLabel: string
  languagePreference: LanguagePreference
  active: boolean
  initialSegments: TranscriptSegment[]
  onLanguageResolved?: (language: SpeechLanguage) => void
}) {
  const [interim, setInterim] = useState("")
  const [segments, setSegments] = useState<TranscriptSegment[]>(initialSegments)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unsupported, setUnsupported] = useState(false)
  const [resolvedLanguage, setResolvedLanguage] = useState<SpeechLanguage>(() =>
    resolvePreference(languagePreference)
  )

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const recognitionCtorRef = useRef<BrowserSpeechRecognitionConstructor | null>(
    null
  )
  const shouldRunRef = useRef(false)
  const sessionRef = useRef(0)
  const utteranceStartedAtRef = useRef<Date | null>(null)
  const languageRef = useRef<SpeechLanguage>(resolvedLanguage)
  const preferenceRef = useRef(languagePreference)
  const autoLockedRef = useRef(languagePreference !== "auto")
  const pendingRestartLangRef = useRef<SpeechLanguage | null>(null)
  const persistFinalRef = useRef<(text: string, startAt: Date, endAt: Date) => void>(
    () => undefined
  )
  const onLanguageResolvedRef = useRef(onLanguageResolved)

  onLanguageResolvedRef.current = onLanguageResolved
  preferenceRef.current = languagePreference

  const adoptLanguage = useCallback((next: SpeechLanguage, persist = true) => {
    languageRef.current = next
    setResolvedLanguage(next)
    if (persist) {
      writeLastSpeechLanguage(next)
      onLanguageResolvedRef.current?.(next)
    }
  }, [])

  useEffect(() => {
    if (!getSpeechRecognition()) {
      setUnsupported(true)
      setError("Live transcription needs Chrome or Edge on this device.")
    }
  }, [])

  useEffect(() => {
    setSegments(initialSegments)
    // Snapshot only when switching meetings; live appends stay in local state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId])

  const persistFinal = useCallback(
    async (text: string, startAt: Date, endAt: Date) => {
      const response = await fetch(`/api/meetings/${meetingId}/transcript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          speakerLabel,
          language: languageRef.current,
        }),
      })
      const payload = (await response.json()) as {
        segment?: TranscriptSegment | null
        error?: string
      }
      if (!response.ok) {
        setError(payload.error ?? "Could not save a transcript segment.")
        return
      }
      if (payload.segment) {
        const saved = payload.segment
        setSegments((current) =>
          current.some((item) => item.id === saved.id)
            ? current
            : [...current, saved]
        )
      }
    },
    [meetingId, speakerLabel]
  )

  persistFinalRef.current = persistFinal

  const stop = useCallback(() => {
    sessionRef.current += 1
    shouldRunRef.current = false
    pendingRestartLangRef.current = null
    recognitionRef.current?.abort()
    recognitionRef.current = null
    setListening(false)
    setInterim("")
  }, [])

  const attachRecognition = useCallback(
    (recognition: BrowserSpeechRecognition, session: number) => {
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = languageRef.current

      recognition.onresult = (event) => {
        if (session !== sessionRef.current) {
          return
        }
        let nextInterim = ""
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index]
          if (!result) {
            continue
          }
          const text = result[0]?.transcript?.trim()
          if (!text) {
            continue
          }
          if (result.isFinal) {
            const endAt = new Date()
            const startAt = utteranceStartedAtRef.current ?? endAt
            utteranceStartedAtRef.current = null

            if (preferenceRef.current === "auto") {
              const detected = detectLanguageFromText(text, languageRef.current)
              if (
                detected &&
                detected !== languageRef.current &&
                (!autoLockedRef.current ||
                  (!detected.startsWith("en") &&
                    languageRef.current.startsWith("en")))
              ) {
                adoptLanguage(detected)
                autoLockedRef.current = true
                pendingRestartLangRef.current = detected
                recognition.abort()
              } else if (detected && detected === languageRef.current) {
                autoLockedRef.current = true
                writeLastSpeechLanguage(languageRef.current)
                onLanguageResolvedRef.current?.(languageRef.current)
              }
            }

            void persistFinalRef.current(text, startAt, endAt)
          } else {
            if (!utteranceStartedAtRef.current) {
              utteranceStartedAtRef.current = new Date()
            }
            nextInterim = text
          }
        }
        setInterim(nextInterim)
      }

      recognition.onerror = (event) => {
        if (session !== sessionRef.current) {
          return
        }
        if (event.error === "no-speech" || event.error === "aborted") {
          return
        }
        if (event.error === "not-allowed") {
          setError("Microphone permission was denied. Allow it and start capture again.")
          shouldRunRef.current = false
          setListening(false)
          void fetch(`/api/meetings/${meetingId}/health`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ health: "degraded" }),
          })
          return
        }
        setError("Transcription hit a browser error. Try starting capture again.")
      }

      recognition.onend = () => {
        if (session !== sessionRef.current) {
          return
        }
        const restartLang = pendingRestartLangRef.current
        pendingRestartLangRef.current = null
        if (restartLang && shouldRunRef.current) {
          const Recognition = recognitionCtorRef.current
          if (!Recognition) {
            setListening(false)
            return
          }
          const next = new Recognition()
          languageRef.current = restartLang
          attachRecognition(next, session)
          recognitionRef.current = next
          try {
            next.start()
            setListening(true)
          } catch {
            setError("Transcription stopped. Start capture again.")
            setListening(false)
          }
          return
        }
        setListening(false)
        if (shouldRunRef.current) {
          try {
            recognition.start()
            setListening(true)
          } catch {
            setError("Transcription stopped. Start capture again.")
          }
        }
      }
    },
    [adoptLanguage, meetingId]
  )

  const start = useCallback(() => {
    const Recognition = getSpeechRecognition()
    if (!Recognition) {
      setUnsupported(true)
      setError("Live transcription needs Chrome or Edge on this device.")
      return
    }

    setError(null)
    setUnsupported(false)
    sessionRef.current += 1
    const session = sessionRef.current
    shouldRunRef.current = false
    recognitionRef.current?.abort()
    recognitionRef.current = null
    pendingRestartLangRef.current = null
    autoLockedRef.current = languagePreference !== "auto"
    adoptLanguage(resolvePreference(languagePreference), languagePreference !== "auto")
    shouldRunRef.current = true

    recognitionCtorRef.current = Recognition
    const recognition = new Recognition()
    attachRecognition(recognition, session)
    recognitionRef.current = recognition
    try {
      recognition.start()
      setListening(true)
      void fetch(`/api/meetings/${meetingId}/health`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ health: "connected" }),
      })
    } catch {
      setError("Could not start the browser speech recognizer.")
      shouldRunRef.current = false
    }
  }, [adoptLanguage, attachRecognition, languagePreference, meetingId])

  useEffect(() => {
    const next = resolvePreference(languagePreference)
    autoLockedRef.current = languagePreference !== "auto"
    if (languageRef.current === next) {
      return
    }
    adoptLanguage(next, languagePreference !== "auto")
    if (shouldRunRef.current && recognitionRef.current) {
      pendingRestartLangRef.current = next
      recognitionRef.current.abort()
    }
  }, [adoptLanguage, languagePreference])

  useEffect(() => {
    if (!active) {
      stop()
    }
  }, [active, stop])

  useEffect(() => {
    return () => {
      sessionRef.current += 1
      shouldRunRef.current = false
      recognitionRef.current?.abort()
    }
  }, [])

  return {
    interim,
    segments,
    listening,
    error,
    unsupported,
    resolvedLanguage,
    start,
    stop,
  }
}
