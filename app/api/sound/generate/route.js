import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const CARTESIA_API_KEY =
  process.env.CARTESIA_API_KEY;

const CARTESIA_URL =
  "https://api.cartesia.ai/tts/bytes";

const CARTESIA_MODEL =
  process.env.CARTESIA_MODEL || "sonic-3";

const DEFAULT_VOICE_ID =
  "a0e99841-438c-4a64-b679-ae501e7d6091";

function buildAudioText(type, prompt) {
  const cleanPrompt =
    typeof prompt === "string"
      ? prompt.trim()
      : "";

  const soundType =
    typeof type === "string"
      ? type.trim()
      : "Background Music";

  if (!cleanPrompt) {
    return `${soundType}.`;
  }

  return `${cleanPrompt}.`;
}

export async function POST(request) {
  try {
    if (!CARTESIA_API_KEY) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "CARTESIA_API_KEY is not configured in Vercel.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const type =
      typeof body?.type === "string"
        ? body.type
        : "Background Music";

    const prompt =
      typeof body?.prompt === "string"
        ? body.prompt.trim()
        : "";

    if (!prompt) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "Please describe the sound you want.",
        },
        { status: 400 }
      );
    }

    const voiceId =
      typeof body?.voiceId === "string" &&
      body.voiceId.trim()
        ? body.voiceId.trim()
        : DEFAULT_VOICE_ID;

    const finalText =
      buildAudioText(type, prompt);

    console.log(
      "BOMBA CARTESIA SOUND STARTING:",
      {
        type,
        model: CARTESIA_MODEL,
        voiceId,
        textLength: finalText.length,
      }
    );

    const response = await fetch(
      CARTESIA_URL,
      {
        method: "POST",
        headers: {
          "X-API-Key": CARTESIA_API_KEY,
          "Cartesia-Version": "2025-04-16",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_id: CARTESIA_MODEL,

          transcript: finalText,

          voice: {
            mode: "id",
            id: voiceId,
          },

          language: "en",

          output_format: {
            container: "mp3",
            encoding: "mp3",
            sample_rate: 44100,
          },
        }),

        cache: "no-store",
      }
    );

    console.log(
      "BOMBA CARTESIA SOUND STATUS:",
      response.status
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "BOMBA CARTESIA SOUND ERROR:",
        errorText
      );

      return NextResponse.json(
        {
          status: "failed",
          error:
            errorText ||
            `Cartesia returned HTTP ${response.status}.`,
        },
        {
          status:
            response.status >= 400 &&
            response.status < 500
              ? response.status
              : 502,
        }
      );
    }

    const audioBuffer =
      await response.arrayBuffer();

    if (!audioBuffer.byteLength) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "Cartesia returned an empty audio file.",
        },
        { status: 502 }
      );
    }

    console.log(
      "BOMBA CARTESIA SOUND COMPLETED:",
      audioBuffer.byteLength,
      "bytes"
    );

    // Convert the MP3 into a data URL because
    // the existing Sound Studio expects JSON.
    const base64Audio =
      Buffer.from(audioBuffer).toString("base64");

    const audioUrl =
      `data:audio/mpeg;base64,${base64Audio}`;

    return NextResponse.json(
      {
        status: "completed",
        audioUrl,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "BOMBA CARTESIA SOUND SERVER ERROR:",
      error
    );

    return NextResponse.json(
      {
        status: "failed",
        error:
          error?.message ||
          "Unexpected error while generating sound.",
      },
      { status: 500 }
    );
  }
}