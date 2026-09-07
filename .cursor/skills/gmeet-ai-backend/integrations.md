# Integrations

## Google OAuth

- Identity + least-privilege Workspace scopes. Confirm production scopes against current Meet REST docs before shipping.
- Store tokens as encrypted refs (`IntegrationAccount.accessTokenRef`). Refresh in the backend. Surface re-auth when refresh fails.
- Revoke on account deletion.

## Mode A — Meet REST artifacts (preferred when available)

Use current Meet REST v2: conference records, participants, transcripts, transcript entries (participant, text, language, timestamps).

Workspace Events for Meet lifecycle where supported. **Do not assume every participant receives every event type.**

Reconciliation:

- Copy entries into `TranscriptSegment` with `source: meet_api`.
- Track source version; API entries may differ from Google Docs transcript files.
- Conference records expire (~30 days). Persist our copy immediately.
- If artifact mode cannot run, fail explicit and offer extension or import (MEET-05).

Docs: https://developers.google.com/workspace/meet/api/

## Mode B — Meet Media API (not MVP)

Developer Preview: Cloud project, OAuth principal, **and** conference participants must be enrolled. Unsuitable as the only launch path. Keep a `MeetMediaAdapter` interface empty or feature-flagged; do not block MVP on it.

Docs: https://developers.google.com/workspace/meet/media-api/guides/overview

## Mode C — Chrome extension (primary live MVP)

Manifest V3. Narrow permissions. Request tab media only when the user starts the assistant.

Responsibilities:

- Identify supported Meet tabs (`meet.google.com` meeting pages)
- Request tab-media via documented extension APIs (`tabCapture` or current MV3 equivalent — verify against current Chrome docs)
- Downsample/encode to STT requirements
- Authenticated streaming channel to the web app
- Compact capture indicator; pause/stop
- Reconnect + bounded buffer
- Lifecycle state to dashboard

Never capture unrelated tabs. Never keep audio running after Stop.

Docs: https://developer.chrome.com/docs/extensions/reference/api

## Mode D — Manual import

Audio and/or transcript file. Same pipeline from normalization onward. `sourceMode: manual_import`.

## Speech-to-text

Provider behind `SttProvider`. Google Cloud STT is the default candidate (streaming, interim/final, diarization) but swappable.

- Enforce frame size / encoding in the capture adapter
- Map diarization speaker tags to `Participant.speakerLabel`
- On provider error: `degraded`, bounded retry, then explicit failure

Docs:

- https://docs.cloud.google.com/speech-to-text/docs/streaming-recognize
- https://docs.cloud.google.com/speech-to-text/docs/v1/multiple-voices
- https://docs.cloud.google.com/speech-to-text/docs/best-practices

## LLM

Provider behind `LlmProvider` with structured-output support. See [ai-pipeline.md](ai-pipeline.md). Route cheaper/faster models for live extract and a stronger model for final synthesis if needed. Enforce token/cost caps per meeting.

## P2 only

Google Docs export, task systems, webhooks — queue-backed `ExportJob`. Do not design MVP schema around them beyond the `ExportJob` table.

## Provider abstraction sketch

```ts
interface MeetingSourceAdapter {
  readonly mode: "meet_api" | "browser_capture" | "manual_import" | "meet_media";
  connect(session: MeetingSession): Promise<void>;
  stop(session: MeetingSession): Promise<void>;
}

interface SttProvider {
  stream(audio: AsyncIterable<AudioFrame>, opts: SttOptions): AsyncIterable<SttEvent>;
}

interface LlmProvider {
  extract(input: ExtractPacket, schema: JsonSchema): Promise<unknown>;
  synthesize(input: FinalPacket, schema: JsonSchema): Promise<unknown>;
}
```

Route handlers depend on these interfaces, not on GCP/OpenAI client types.
