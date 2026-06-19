/**
 * Unit tests for convertToChatMessages. These run without an API key.
 * Run: npx tsx test/convert-to-chat-messages.ts
 */

import assert from "node:assert/strict";
import type { LanguageModelV3Prompt } from "@ai-sdk/provider";
import { convertToChatMessages } from "../src/chat/convert-to-chat-messages";

// A tool result with text output must be sent to the API as the raw string,
// not the { type, value } wrapper object.
const textPrompt: LanguageModelV3Prompt = [
	{
		role: "tool",
		content: [
			{
				type: "tool-result",
				toolCallId: "call_1",
				toolName: "calculator",
				output: { type: "text", value: "42" },
			},
		],
	},
];

const [textMsg] = convertToChatMessages(textPrompt);
assert.equal(textMsg.role, "tool");
assert.equal(textMsg.role === "tool" ? textMsg.content : undefined, "42");

// A tool result with JSON output must be sent as the serialized value.
const jsonPrompt: LanguageModelV3Prompt = [
	{
		role: "tool",
		content: [
			{
				type: "tool-result",
				toolCallId: "call_2",
				toolName: "lookup",
				output: { type: "json", value: { ok: true } },
			},
		],
	},
];

const [jsonMsg] = convertToChatMessages(jsonPrompt);
assert.equal(
	jsonMsg.role === "tool" ? jsonMsg.content : undefined,
	JSON.stringify({ ok: true }),
);

console.log("convert-to-chat-messages tool-result tests passed");
