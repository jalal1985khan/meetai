"use client"

import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select"
import {
  SPEECH_LANGUAGE_GROUPS,
  SPEECH_LANGUAGES,
  type LanguagePreference,
} from "@/lib/meetings/languages"

export function SpeechLanguageSelect({
  id = "speech-language",
  value,
  onChange,
  disabled,
}: {
  id?: string
  value: LanguagePreference
  onChange: (value: LanguagePreference) => void
  disabled?: boolean
}) {
  return (
    <NativeSelect
      id={id}
      size="sm"
      aria-label="Speech language"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as LanguagePreference)}
    >
      <NativeSelectOption value="auto">Auto-detect</NativeSelectOption>
      {SPEECH_LANGUAGE_GROUPS.map((group) => (
        <NativeSelectOptGroup key={group} label={group}>
          {SPEECH_LANGUAGES.filter((item) => item.group === group).map((item) => (
            <NativeSelectOption key={item.code} value={item.code}>
              {item.label}
            </NativeSelectOption>
          ))}
        </NativeSelectOptGroup>
      ))}
    </NativeSelect>
  )
}
