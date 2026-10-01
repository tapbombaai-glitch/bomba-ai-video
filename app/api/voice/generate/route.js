import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const NAIJALINGO_API_KEY = process.env.NAIJALINGO_API_KEY;
const NAIJALINGO_URL = "https://api.9jalingo.org/v1/audio/speech";

export async function POST(request) {
  try {
    if (!NAIJALINGO_API_KEY) {
      return NextResponse.json(
        {
          status: "failed",
          error: "Missing NAIJALINGO_API_KEY environment variable.",
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

    const language =
      typeof body?.language === "string"
        ? body.language.trim()
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

    if (!language) {
      return NextResponse.json(
        {
          status: "failed",
          error: "language is required.",
        },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        {
          status: "failed",
          error: "Voice text is too long. Maximum is 5000 characters.",
        },
        { status: 400 }
      );
    }

    console.log("BOMBA 9JALINGO VOICE STARTING");
    console.log("BOMBA 9JALINGO VOICE:", voiceId);
    console.log("BOMBA 9JALINGO LANGUAGE:", language);
    console.log("BOMBA 9JALINGO TEXT LENGTH:", text.length);

    const response = await fetch(NAIJALINGO_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NAIJALINGO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "9jalingo-tts-1",
        voice: voiceId,
        input: text,
        lang: language,
        response_format: "mp3",
      }),
    });

    console.log(
      "BOMBA 9JALINGO VOICE STATUS:",
      response.status
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "BOMBA 9JALINGO VOICE ERROR:",
        errorText
      );

      return NextResponse.json(
        {
          status: "failed",
          error:
            errorText ||
            `9jaLingo request failed with status ${response.status}.`,
        },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    console.log(
      "BOMBA 9JALINGO VOICE COMPLETED:",
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
      "BOMBA 9JALINGO VOICE SERVER ERROR:",
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