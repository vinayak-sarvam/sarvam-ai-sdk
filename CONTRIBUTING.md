# Contributing to sarvam-ai-sdk

Thanks for helping improve the Sarvam provider for Vercel's AI SDK.

## Setup

```bash
git clone https://github.com/rajatsandeepsen/sarvam-ai-sdk.git
cd sarvam-ai-sdk
npm install
```

## Build

```bash
npm run build        # compile TypeScript → dist/
npm run build:watch  # recompile on file change
npm run type-check   # type check without emitting
npm run check        # biome linter
```

## Tests

### Unit tests (no API key required)

Mock-based tests covering all models — run these locally and in CI:

```bash
npm run test:unit
```

### Integration tests (API key required)

Hits the real Sarvam API. Copy `.env.example` to `.env` and add your key from [dashboard.sarvam.ai](https://dashboard.sarvam.ai):

```bash
cp .env.example .env
# fill in SARVAM_API_KEY=...
npm test
```

Individual test files can be run directly:

```bash
npx tsx --env-file=.env test/chat.ts
npx tsx --env-file=.env test/speech.ts
npx tsx --env-file=.env test/transcription.ts
```

## Repo structure

```
src/
  chat/           # Text generation + streaming + tool calling
  tts/            # Text-to-Speech (bulbul:v3)
  stt/            # Speech-to-Text (saaras:v3)
  ttt/            # Translation, Transliteration, Language ID
  provider.ts     # createSarvam() factory
  index.ts        # Public exports
test/
  unit/           # Mock-based unit tests (no API key needed)
  *.ts            # Integration tests (API key required)
```

## Making a change

1. **Pick something to work on** — check open issues or the list below.
2. **Fork and branch** — `git checkout -b feat/your-change`.
3. **Write or update tests** — add a unit test in `test/unit/` for your change.
4. **Build and test** — `npm run build && npm run test:unit`.
5. **Open a PR** against `master` with a clear description.

## Good first contributions

- Add missing Sarvam API fields to existing settings schemas
- Improve JSDoc on settings types
- Add more unit test coverage for edge cases
- Fix TypeScript strictness issues caught by `npm run type-check`
- Update README examples for new features

## Code style

- Biome is the formatter and linter — run `npm run check` before submitting.
- All new public API surface must have JSDoc comments (see existing settings files for examples).
- New settings fields should have `@default`, `@example`, and value range documented where applicable.
