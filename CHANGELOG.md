# Changelog

All notable changes to `sarvam-ai-sdk` are documented here.

---

## [0.3.1] — Current

- Add `provider_metadata` to chat responses (`system_fingerprint`, `service_tier`)
- Add `Output` support with `generateText` for structured JSON output
- Add smoke test and integration test suite
- Set `User-Agent: sarvam-vercel-sdk` on all requests
- Align public exports

## [0.3.0]

- **Full AI SDK v6 support** — upgraded from v5 to v6 API (`LanguageModelV3`, `SpeechModelV3`, `TranscriptionModelV3`)
- Chat: streaming, tool calling, reasoning content support
- TTS: `bulbul:v3` with 30+ voices, pace, temperature, codec options
- STT: `saaras:v3` with diarization, timestamps, multi-language support
- Translation: `mayura:v1` and `sarvam-translate:v1` with formal/colloquial/code-mixed modes
- Transliteration: spoken form, numeral formats
- Language Identification: `text-lid` API

## [0.2.x]

- AI SDK v5 support
- Removed Document Intelligence API
- Correctness fixes across all models

## [0.1.x]

- Initial release targeting AI SDK v4
- Basic chat completion, TTS, STT, translation, transliteration, language identification

---

## Version Compatibility

| sarvam-ai-sdk | Vercel AI SDK |
|---|---|
| 0.4.x (beta) | 7.x.x (beta) |
| 0.3.x | 6.x.x |
| 0.2.x | 5.x.x |
| 0.1.x | 4.x.x |
