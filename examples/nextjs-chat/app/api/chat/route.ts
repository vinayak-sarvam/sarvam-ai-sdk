import { streamText } from "ai";
import { sarvam } from "sarvam-ai-sdk";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    // Validate API key presence before attempting the request
    if (!process.env.SARVAM_API_KEY?.trim()) {
      return new Response(
        JSON.stringify({
          error:
            "SARVAM_API_KEY is not set. Copy .env.example to .env.local and add your key from https://dashboard.sarvam.ai",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages } = await req.json();

    const result = streamText({
      model: sarvam("sarvam-30b"),
      system:
        "You are a helpful AI assistant powered by Sarvam AI. You specialise in Indian languages and culture, but you can help with any topic. Be concise and friendly.",
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
