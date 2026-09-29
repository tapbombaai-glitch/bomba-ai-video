import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY;
const CARTESIA_URL = "https://api.cartesia.ai/tts/bytes";

const CARTESIA_MODEL =
  process.env.CARTESIA_MODEL || "sonic-3";

export async function POST(request) {
  try {
    if (!CARTESIA_API_KEY) {
      return NextResponse.json(
        {
          status: "failed",
          error: "Missing CARTESIA_API_KEY environment variable.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const text =
      typeof body?.text === "string"
        ? body.text.trim()
        : "";

    const voiceId =
      typeof body?.voiceId === "string"
        ? body.voiceId.trim()
        : "";

    if (!text) {
      return NextResponse.json(
        {
          status: "failed",
          error: "Voice text is required.",
        },
        { status: 400 }
      );
    }

    if (!voiceId) {
      return NextResponse.json(
        {
          status: "failed",
          error: "voiceId is required.",
        },
        { status: 400 }
      );
    }

    // Keep the first test reasonably small.
    if (text.length > 5000) {
      return NextResponse.json(
        {
          status: "failed",
          error: "Voice text is too long. Maximum is 5000 characters.",
        },
        { status: 400 }
      );
    }

    console.log("BOMBA CARTESIA VOICE STARTING");
    console.log("BOMBA CARTESIA VOICE MODEL:", CARTESIA_MODEL);
    console.log("BOMBA CARTESIA VOICE TEXT LENGTH:", text.length);

    const response = await fetch(CARTESIA_URL, {
      method: "POST",
      headers: {
        "X-API-Key": CARTESIA_API_KEY,
        "Cartesia-Version": "2025-04-16",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: CARTESIA_MODEL,
        transcript: text,
        voice: {
          mode: "id",
          id: voiceId,
        },
        output_format: {
          container: "mp3",
          encoding: "mp3",
          sample_rate: 44100,
        },
      }),
    });

    console.log(
      "BOMBA CARTESIA VOICE STATUS:",
      response.status
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "BOMBA CARTESIA VOICE ERROR:",
        errorText
      );

      return NextResponse.json(
        {
          status: "failed",
          error:
            errorText ||
            `Cartesia request failed with status ${response.status}.`,
        },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    console.log(
      "BOMBA CARTESIA VOICE COMPLETED:",
      audioBuffer.byteLength,
      "bytes"
    );

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(
      "BOMBA CARTESIA VOICE SERVER ERROR:",
      error
    );

    return NextResponse.json(
      {
        status: "failed",
        error:
          error?.message ||
          "Unable to generate voice audio.",
      },
      { status: 500 }
    );
  }
}