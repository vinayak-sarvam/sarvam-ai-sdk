/**
 * Unit tests for the translate/transliterate request bodies. These run without
 * an API key via an injected fetch that captures the outgoing request.
 * Run: npx tsx test/ttt-request-body.ts
 */

import assert from "node:assert/strict";
import type {
	LanguageModelV3CallOptions,
	LanguageModelV3Prompt,
} from "@ai-sdk/provider";
import { createSarvam } from "../src/index";

const prompt: LanguageModelV3Prompt = [
	{ role: "user", content: [{ type: "text", text: "Hello" }] },
];
const options = { prompt } as LanguageModelV3CallOptions;

function providerWithCapture(response: object): {
	sarvam: ReturnType<typeof createSarvam>;
	getBody: () => Record<string, unknown>;
} {
	let body: Record<string, unknown> = {};
	const sarvam = createSarvam({
		apiKey: "sk_test",
		fetch: (async (_url: RequestInfo | URL, init?: RequestInit) => {
			body = JSON.parse(init?.body as string);
			return new Response(JSON.stringify(response), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		}) as typeof fetch,
	});
	return { sarvam, getBody: () => body };
}

// translate: the wire body uses source/target_language_code only. The
// SDK-internal `from`/`to` setting names are not Sarvam API fields.
{
	const { sarvam, getBody } = providerWithCapture({
		translated_text: "x",
		request_id: "r",
	});
	await sarvam
		.translation("mayura:v1", { from: "en-IN", to: "hi-IN" })
		.doGenerate(options);
	const body = getBody();
	assert.ok(!("from" in body), "translate body must not contain `from`");
	assert.ok(!("to" in body), "translate body must not contain `to`");
	assert.equal(body.source_language_code, "en-IN");
	assert.equal(body.target_language_code, "hi-IN");
}

// transliterate: same contract.
{
	const { sarvam, getBody } = providerWithCapture({
		transliterated_text: "x",
		request_id: "r",
	});
	await sarvam
		.transliterate({ from: "hi-IN", to: "en-IN" })
		.doGenerate(options);
	const body = getBody();
	assert.ok(!("from" in body), "transliterate body must not contain `from`");
	assert.ok(!("to" in body), "transliterate body must not contain `to`");
	assert.equal(body.source_language_code, "hi-IN");
	assert.equal(body.target_language_code, "en-IN");
}

console.log("ttt request-body tests passed");
