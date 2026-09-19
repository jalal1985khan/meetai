"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { TranscriptSegment } from "@prisma/client"

export function useElevenLabsAudio({
  meetingId,
  speakerLabel,
  active,
  onSegmentEnhanced,
}: {
  meetingId: string
  speakerLabel: string
  active: boolean
  onSegmentEnhanced?: (segment: TranscriptSegment) => void
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const chunkStartRef = useRef<Date>(new Date())
  const intervalTimerRef = useRef<number | null>(null)
  const activeRef = useRef(active)
  const onSegmentEnhancedRef = useRef(onSegmentEnhanced)
  const startNextSliceRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    activeRef.current = active
    onSegmentEnhancedRef.current = onSegmentEnhanced
  }, [active, onSegmentEnhanced])

  const uploadAudioChunk = useCallback(
    async (blob: Blob, startAt: Date, endAt: Date) => {
      // Ignore tiny silent audio buffers
      if (blob.size < 4000) {
        return
      }

      try {
        setIsEnhancing(true)
        const formData = new FormData()
        formData.append("file", blob, "chunk.webm")
        formData.append("startAt", startAt.toISOString())
        formData.append("endAt", endAt.toISOString())
        formData.append("speakerLabel", speakerLabel || "You")

        const response = await fetch(
          `/api/meetings/${meetingId}/transcribe-audio`,
          {
            method: "POST",
            body: formData,
          }
        )

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as {
          enhanced?: boolean
          segment?: TranscriptSegment
        }

        if (data.enhanced && data.segment) {
          onSegmentEnhancedRef.current?.(data.segment)
        }
      } catch {
        // Silently fall back to browser STT if network or upload fails
      } finally {
        setIsEnhancing(false)
      }
    },
    [meetingId, speakerLabel]
  )

  const startNextSlice = useCallback(() => {
    if (!mediaStreamRef.current || !activeRef.current) {
      return
    }

    chunksRef.current = []
    chunkStartRef.current = new Date()

    let mimeType = "audio/webm;codecs=opus"
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm"
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4"
      } else {
        mimeType = ""
      }
    }

    try {
      const recorder = mimeType
        ? new MediaRecorder(mediaStreamRef.current, { mimeType })
        : new MediaRecorder(mediaStreamRef.current)

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        const endAt = new Date()
        const fullBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        })
        chunksRef.current = []
        void uploadAudioChunk(fullBlob, chunkStartRef.current, endAt)

        // Automatically cycle into next chunk if still active
        if (activeRef.current) {
          startNextSliceRef.current()
        }
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)

      // Cut audio slices every 16 seconds
      if (intervalTimerRef.current) {
        window.clearTimeout(intervalTimerRef.current)
      }
      intervalTimerRef.current = window.setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
        ) {
          mediaRecorderRef.current.stop()
        }
      }, 16000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to slice audio.")
    }
  }, [uploadAudioChunk])

  useEffect(() => {
    startNextSliceRef.current = startNextSlice
  }, [startNextSlice])

  const start = useCallback(async () => {
    try {
      setError(null)
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Microphone audio recording is not supported in this browser.")
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      mediaStreamRef.current = stream
      startNextSlice()
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Microphone permission denied for audio enhancement."
      )
    }
  }, [startNextSlice])

  const stop = useCallback(() => {
    if (intervalTimerRef.current) {
      window.clearTimeout(intervalTimerRef.current)
      intervalTimerRef.current = null
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
    }

    setIsRecording(false)
    setIsEnhancing(false)
  }, [])

  useEffect(() => {
    return () => {
      if (intervalTimerRef.current) {
        window.clearTimeout(intervalTimerRef.current)
        intervalTimerRef.current = null
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        try {
          mediaRecorderRef.current.stop()
        } catch {
          // ignore
        }
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop())
        mediaStreamRef.current = null
      }
    }
  }, [])

  return {
    isRecording,
    isEnhancing,
    error,
    start,
    stop,
  }
}
