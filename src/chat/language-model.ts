import {
	InvalidResponseDataError,
	type LanguageModelV4,
	type LanguageModelV4CallOptions,
	type LanguageModelV4Content,
	type LanguageModelV4FinishReason,
	type LanguageModelV4GenerateResult,
	type LanguageModelV4StreamPart,
	type LanguageModelV4StreamResult,
	type SharedV4Warning,
} from "@ai-sdk/provider";
import {
	combineHeaders,
	createEventSourceResponseHandler,
	createJsonResponseHandler,
	generateId,
	isParsableJson,
	type ParseResult,
	parseProviderOptions,
	postJsonToApi,
} from "@ai-sdk/provider-utils";
import type { z } from "zod";
import type { SarvamConfig } from "../config";
import { sarvamFailedResponseHandler } from "../error";
import { convertToChatMessages } from "./convert-to-chat-messages";
import {
	prepareResponseFormat,
	prepareResponseFormatAsTool,
	prepareTools,
} from "./prepare-tools";
import {
	type ChatModelId,
	type ChatSettings,
	chatChunkSchema,
	chatResponseSchema,
	chatSettingsSchema,
	type OpenSourceModelId,
} from "./settings";
import { getResponseMetadata, mapFinishReason } from "./utils";

export class SarvamChatLanguageModel implements LanguageModelV4 {
	readonly specificationVersion = "v4";

	readonly modelId: ChatModelId | OpenSourceModelId;
	readonly settings: ChatSettings;

	private readonly config: SarvamConfig;

	constructor(
		modelId: ChatModelId | OpenSourceModelId,
		settings: ChatSettings,
		config: SarvamConfig,
	) {
		this.modelId = modelId;
		this.settings = settings;
		this.config = config;
	}

	get provider(): string {
		return this.config.provider;
	}

	get supportedUrls(): Record<string, RegExp[]> {
		// Sarvam models don't have native URL support for content
		return {};
	}

	private async getArgs(options: LanguageModelV4CallOptions, stream: boolean) {
		const {
			prompt,
			maxOutputTokens,
			temperature,
			topP,
			topK,
			frequencyPenalty,
			presencePenalty,
			stopSequences,
			responseFormat,
			seed,
			tools,
			toolChoice,
			providerOptions,
			reasoning,
		} = options;

		const warnings: SharedV4Warning[] = [];

		if (topK) {
			warnings.push({
				type: "unsupported",
				feature: "topK",
			});
		}

		const sarvamOptions = await parseProviderOptions({
			provider: "sarvam",
			providerOptions: {
				sarvam: {
					reasoning_effort: reasoning,
					...providerOptions?.sarvam,
					...this.settings,
				},
			},
			schema: chatSettingsSchema,
		});

		const jsonSchemaAsTool =
			responseFormat?.type === "json" &&
			!stream &&
			!this.settings.experimental_json_mode;

		const jsonMode = this.settings.experimental_json_mode && !stream;

		if (jsonMode) {
			warnings.push({
				type: "other",
				message: "Experimental json_mode is enabled",
			});
		}

		const baseArgs = {
			model: this.modelId,
			messages: convertToChatMessages(prompt),
			response_format: jsonMode
				? prepareResponseFormat(responseFormat)
				: undefined,

			max_tokens: maxOutputTokens,
			temperature,
			top_p: topP,
			frequency_penalty: frequencyPenalty,
			presence_penalty: presencePenalty,
			stop: stopSequences,
			seed,

			...sarvamOptions,
		};

		const toolsArg = jsonSchemaAsTool
			? prepareResponseFormatAsTool(responseFormat)
			: prepareTools(
					{
						tools,
						toolChoice,
					},
					(w) => warnings.push(w),
				);

		return {
			args: {
				...baseArgs,
				...toolsArg,
			},
			warnings,
			jsonSchemaAsTool,
		};
	}

	async doGenerate(
		options: LanguageModelV4CallOptions,
	): Promise<LanguageModelV4GenerateResult> {
		const { args, warnings, jsonSchemaAsTool } = await this.getArgs(
			options,
			false,
		);

		const {
			responseHeaders,
			value: response,
			rawValue: rawResponse,
		} = await postJsonToApi({
			url: this.config.url({
				path: "/chat/completions",
				modelId: this.modelId,
			}),
			headers: combineHeaders(this.config.headers?.(), options.headers),
			body: args,
			failedResponseHandler: sarvamFailedResponseHandler,
			successfulResponseHandler: createJsonResponseHandler(chatResponseSchema),
			abortSignal: options.abortSignal,
			fetch: this.config.fetch,
		});

		const choice = response.choices[0];

		if (!choice) {
			throw new InvalidResponseDataError({
				data: response,
				message: "No choices returned in response",
			});
		}

		const content: LanguageModelV4Content[] = [];

		if (choice.message.content) {
			content.push({
				type: "text",
				text: choice.message.content,
			});
		}

		if (choice.message.reasoning_content) {
			content.push({
				type: "reasoning",
				text: choice.message.reasoning_content,
			});
		}

		if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
			for (const toolCall of choice.message.tool_calls) {
				if (jsonSchemaAsTool)
					content.push({
						type: "text",
						text: toolCall.function.arguments,
					});
				else
					content.push({
						type: "tool-call",
						toolCallId: toolCall.id ?? (this.config.generateId ?? generateId)(),
						toolName: toolCall.function.name,
						input: toolCall.function.arguments,
					});
			}
		}

		const finishReason = mapFinishReason(choice.finish_reason);
		const unified =
			jsonSchemaAsTool && finishReason === "tool-calls" ? "stop" : finishReason;

		return {
			content,
			finishReason: {
				unified,
				raw: choice.finish_reason ?? undefined,
			},
			usage: {
				inputTokens: {
					total: response.usage?.prompt_tokens ?? undefined,
					noCache: undefined,
					cacheRead: undefined,
					cacheWrite: undefined,
				},
				outputTokens: {
					total: response.usage?.completion_tokens ?? undefined,
					text: undefined,
					reasoning: undefined,
				},
			},
			providerMetadata: {
				sarvam: {
					system_fingerprint: response.system_fingerprint,
					service_tier: response.service_tier,
				},
			},
			warnings,
			request: {
				body: args,
			},
			response: {
				headers: responseHeaders,
				body: rawResponse,
				id: response.id ?? undefined,
				modelId: response.model ?? undefined,
				timestamp: response.created
					? new Date(response.created * 1000)
					: undefined,
			},
		};
	}

	async doStream(
		options: LanguageModelV4CallOptions,
	): Promise<LanguageModelV4StreamResult> {
		const { args } = await this.getArgs(options, true);

		const { responseHeaders, value: response } = await postJsonToApi({
			url: this.config.url({
				path: "/chat/completions",
				modelId: this.modelId,
			}),
			headers: combineHeaders(this.config.headers?.(), options.headers),
			body: {
				...args,
				stream: true,
			},
			failedResponseHandler: sarvamFailedResponseHandler,
			successfulResponseHandler:
				createEventSourceResponseHandler(chatChunkSchema),
			abortSignal: options.abortSignal,
			fetch: this.config.fetch,
		});

		const toolCalls: Array<{
			id: string;
			name: string;
			arguments: string;
			hasFinished: boolean;
		}> = [];

		let finishReason: LanguageModelV4FinishReason = {
			unified: "other",
			raw: undefined,
		};
		let usage: {
			inputTokens: {
				total: number | undefined;
				noCache: number | undefined;
				cacheRead: number | undefined;
				cacheWrite: number | undefined;
			};
			outputTokens: {
				total: number | undefined;
				text: number | undefined;
				reasoning: number | undefined;
			};
		} = {
			inputTokens: {
				total: undefined,
				noCache: undefined,
				cacheRead: undefined,
				cacheWrite: undefined,
			},
			outputTokens: {
				total: undefined,
				text: undefined,
				reasoning: undefined,
			},
		};
		let isFirstChunk = true;

		return {
			stream: response.pipeThrough(
				new TransformStream<
					ParseResult<z.infer<typeof chatChunkSchema>>,
					LanguageModelV4StreamPart
				>({
					transform(chunk, controller) {
						// handle failed chunk parsing / validation:
						if (!chunk.success) {
							finishReason = { unified: "error", raw: undefined };
							controller.enqueue({
								type: "error",
								error: chunk.error,
							});
							return;
						}

						const value = chunk.value;

						// handle error chunks:
						if ("error" in value) {
							finishReason = { unified: "error", raw: undefined };
							controller.enqueue({
								type: "error",
								error: value.error,
							});
							return;
						}

						if (isFirstChunk) {
							isFirstChunk = false;

							const metadata = getResponseMetadata(value);
							if (metadata.id || metadata.timestamp || metadata.modelId) {
								controller.enqueue({
									type: "response-metadata",
									...metadata,
								});
							}
						}

						if (value.x_sarvam?.usage != null) {
							usage = {
								inputTokens: {
									total: value.x_sarvam.usage.prompt_tokens ?? undefined,
									noCache: undefined,
									cacheRead: undefined,
									cacheWrite: undefined,
								},
								outputTokens: {
									total: value.x_sarvam.usage.completion_tokens ?? undefined,
									text: undefined,
									reasoning: undefined,
								},
							};
						}

						const choice = value.choices[0];

						if (choice?.finish_reason != null) {
							finishReason = {
								unified: mapFinishReason(choice.finish_reason),
								raw: choice.finish_reason,
							};
						}

						if (choice?.delta == null) {
							return;
						}

						const delta = choice.delta;

						// Handle reasoning
						if (delta.reasoning != null && delta.reasoning.length > 0) {
							controller.enqueue({
								type: "reasoning-start",
								id: "reasoning-0",
							});

							controller.enqueue({
								type: "reasoning-delta",
								id: "reasoning-0",
								delta: delta.reasoning,
							});

							controller.enqueue({
								type: "reasoning-end",
								id: "reasoning-0",
							});
						}

						// Handle text content
						if (delta.content != null && delta.content.length > 0) {
							controller.enqueue({
								type: "text-start",
								id: "text-0",
							});

							controller.enqueue({
								type: "text-delta",
								id: "text-0",
								delta: delta.content,
							});

							controller.enqueue({
								type: "text-end",
								id: "text-0",
							});
						}

						// Handle tool calls
						if (delta.tool_calls != null) {
							for (const toolCallDelta of delta.tool_calls) {
								const index = toolCallDelta.index;

								if (toolCalls[index] == null) {
									if (toolCallDelta.type !== "function") {
										throw new InvalidResponseDataError({
											data: toolCallDelta,
											message: `Expected 'function' type.`,
										});
									}

									if (toolCallDelta.id == null) {
										throw new InvalidResponseDataError({
											data: toolCallDelta,
											message: `Expected 'id' to be a string.`,
										});
									}

									if (toolCallDelta.function?.name == null) {
										throw new InvalidResponseDataError({
											data: toolCallDelta,
											message: `Expected 'function.name' to be a string.`,
										});
									}

									toolCalls[index] = {
										id: toolCallDelta.id,
										name: toolCallDelta.function.name,
										arguments: toolCallDelta.function.arguments ?? "",
										hasFinished: false,
									};

									const toolCall = toolCalls[index];

									if (toolCall.name != null && toolCall.arguments != null) {
										controller.enqueue({
											type: "tool-input-start",
											id: toolCall.id,
											toolName: toolCall.name,
										});

										// send delta if the argument text has already started:
										if (toolCall.arguments.length > 0) {
											controller.enqueue({
												type: "tool-input-delta",
												id: toolCall.id,
												delta: toolCall.arguments,
											});
										}

										// check if tool call is complete
										// (some providers send the full tool call in one chunk):
										if (isParsableJson(toolCall.arguments)) {
											controller.enqueue({
												type: "tool-input-end",
												id: toolCall.id,
											});
											controller.enqueue({
												type: "tool-call",
												toolCallId: toolCall.id,
												toolName: toolCall.name,
												input: toolCall.arguments,
											});
											toolCall.hasFinished = true;
										}
									}

									continue;
								}

								// existing tool call, merge if not finished
								const toolCall = toolCalls[index];

								if (toolCall.hasFinished) {
									continue;
								}

								if (toolCallDelta.function?.arguments != null) {
									toolCall.arguments += toolCallDelta.function?.arguments ?? "";
								}

								// send delta
								controller.enqueue({
									type: "tool-input-delta",
									id: toolCall.id,
									delta: toolCallDelta.function.arguments ?? "",
								});

								// check if tool call is complete
								if (
									toolCall.name != null &&
									toolCall.arguments != null &&
									isParsableJson(toolCall.arguments)
								) {
									controller.enqueue({
										type: "tool-input-end",
										id: toolCall.id,
									});
									controller.enqueue({
										type: "tool-call",
										toolCallId: toolCall.id,
										toolName: toolCall.name,
										input: toolCall.arguments,
									});
									toolCall.hasFinished = true;
								}
							}
						}
					},

					flush(controller) {
						controller.enqueue({
							type: "finish",
							finishReason,
							usage,
						});
					},
				}),
			),
			request: { body: args },
			response: { headers: responseHeaders },
		};
	}
}
