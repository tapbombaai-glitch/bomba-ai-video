import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const ELEVENLABS_API_KEY =
  process.env.ELEVENLABS_API_KEY;

const ELEVENLABS_MUSIC_URL =
  "https://api.elevenlabs.io/v1/music";

function getSoundPrompt(type, prompt) {
  const cleanPrompt =
    typeof prompt === "string"
      ? prompt.trim()
      : "";

  const soundType =
    typeof type === "string"
      ? type.trim()
      : "Background Music";

  if (!cleanPrompt) {
    return `${soundType}, cinematic instrumental background music, clean professional production, no vocals`;
  }

  return `${cleanPrompt}

Style: ${soundType}.
Instrumental only.
No vocals.
No speech.
Clean cinematic production.
Suitable for a short AI video.`;
}

export async function POST(request) {
  try {
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "ELEVENLABS_API_KEY is not configured in Vercel.",
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

    let duration =
      Number(body?.duration) || 5;

    duration = Math.max(
      5,
      Math.min(30, Math.round(duration))
    );

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

    const finalPrompt =
      getSoundPrompt(type, prompt);

    console.log(
      "BOMBA ELEVENLABS MUSIC STARTING:",
      {
        duration,
        type,
      }
    );

    const response = await fetch(
      `${ELEVENLABS_MUSIC_URL}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key":
            ELEVENLABS_API_KEY,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          music_length_ms:
            duration * 1000,
          model_id: "music_v2",
          force_instrumental: true,
        }),
        cache: "no-store",
      }
    );

    console.log(
      "BOMBA ELEVENLABS MUSIC STATUS:",
      response.status
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "BOMBA ELEVENLABS MUSIC ERROR:",
        errorText
      );

      return NextResponse.json(
        {
          status: "failed",
          error:
            errorText ||
            `ElevenLabs returned HTTP ${response.status}.`,
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
            "ElevenLabs returned an empty audio file.",
        },
        { status: 502 }
      );
    }

    console.log(
      "BOMBA ELEVENLABS MUSIC COMPLETED:",
      audioBuffer.byteLength,
      "bytes"
    );

    return new Response(
      audioBuffer,
      {
        status: 200,
        headers: {
          "Content-Type":
            "audio/mpeg",
          "Content-Length":
            String(audioBuffer.byteLength),
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "BOMBA ELEVENLABS MUSIC SERVER ERROR:",
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