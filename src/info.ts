import type { ChatModelId } from "./chat/settings";
import type { TranscriptionModelId } from "./stt/transcription-settings";
import type { SpeechModelId } from "./tts/speech-settings";
import type { TranslationModelId } from "./ttt/translation-settings";

/**
 * Limits of Sarvam chat models.
 *
 * - context_window: maximum number of tokens the model can handle read
 * - max_completions: maximum number of completions (n) per request
 * - max_tokens: maximum number of tokens, by plan
 */
export const SarvamChatModelInfo: Record<
	ChatModelId,
	{
		context_window: number;
		max_completions: number;
		max_tokens: {
			starter: number;
			pro: number;
			business: number;
		};
	}
> = {
	"sarvam-105b": {
		context_window: 128_000,
		max_completions: 128,
		max_tokens: {
			starter: 4096,
			pro: 16384,
			business: 128000,
		},
	},
	"sarvam-105b-conversations": {
		context_window: 32_000,
		max_completions: 128,
		max_tokens: {
			starter: 4096,
			pro: 16384,
			business: 128000,
		},
	},
};

/**
 * Limits of Sarvam transcription models (speech-to-text).
 *
 * - max_audio_duration: maximum audio length per real-time request (seconds)
 * - max_file_duration: maximum audio length per file in batch jobs (hours)
 * - max_files_per_job: maximum number of files in one batch job
 * - max_speakers: maximum number of speakers for diarization in a batch job
 */
export const SarvamTranscriptionModelInfo: Record<
	TranscriptionModelId,
	{
		max_audio_duration: number;
		max_file_duration: number;
		max_files_per_job: number;
		max_speakers: number;
	}
> = {
	"saaras:v3": {
		max_audio_duration: 30,
		max_file_duration: 2,
		max_files_per_job: 20,
		max_speakers: 20,
	},
	"saaras:v4": {
		max_audio_duration: 30,
		max_file_duration: 2,
		max_files_per_job: 20,
		max_speakers: 20,
	},
};

/**
 * Limits of Sarvam speech synthesis (text-to-speech).
 *
 * - max_characters: maximum number of input characters for REST API request
 * - max_characters_streaming: maximum number of input characters for HTTP streaming request
 * - max_characters_websocket: maximum number of input characters for WebSocket request
 */
export const SarvamSpeechModelInfo: Record<
	SpeechModelId,
	{
		max_characters: number;
		max_characters_streaming: number;
		max_characters_websocket: number;
	}
> = {
	"bulbul:v3": {
		max_characters: 2500,
		max_characters_streaming: 3500,
		max_characters_websocket: 2500,
	},
};

/**
 * Limits of Sarvam translation.
 *
 * - max_input_length: maximum number of characters allowed in a request
 */
export const SarvamTranslationModelInfo: Record<
	TranslationModelId,
	{
		max_input_length: number;
	}
> = {
	"mayura:v1": {
		max_input_length: 1000,
	},
	"sarvam-translate:v1": {
		max_input_length: 2000,
	},
};

/**
 * Limits of Sarvam transliteration.
 *
 * - max_input_length: max characters allowed in a single request
 */
export const SarvamTransliterateInfo: Record<
	"default",
	{
		max_input_length: number;
	}
> = {
	default: {
		max_input_length: 1000,
	},
};
