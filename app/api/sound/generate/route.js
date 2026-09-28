import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const REPLICATE_API_URL =
  "https://api.replicate.com/v1/models/meta/musicgen/predictions";

function getSoundPrompt(type, prompt) {
  const basePrompt =
    prompt ||
    "cinematic background music for a realistic video";

  switch (type) {
    case "Sound Effects":
      return `Realistic cinematic sound effects: ${basePrompt}`;

    case "Environment":
      return `Realistic environmental ambience and background sounds: ${basePrompt}`;

    case "Background Music":
    default:
      return `Cinematic background music: ${basePrompt}`;
  }
}

function extractOutputUrl(output) {
  if (!output) return null;

  if (typeof output === "string") {
    return output.startsWith("http")
      ? output
      : null;
  }

  if (Array.isArray(output)) {
    for (const item of output) {
      const found = extractOutputUrl(item);

      if (found) {
        return found;
      }
    }

    return null;
  }

  if (typeof output === "object") {
    const possibleKeys = [
      "url",
      "audio",
      "audio_url",
      "output",
      "path",
    ];

    for (const key of possibleKeys) {
      if (output[key]) {
        const found = extractOutputUrl(output[key]);

        if (found) {
          return found;
        }
      }
    }
  }

  return null;
}

export async function POST(request) {
  try {
    const token =
      process.env.REPLICATE_API_TOKEN;

    if (!token) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "REPLICATE_API_TOKEN is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const body = await request.json();

    const type =
      body.type ||
      "Background Music";

    const prompt =
      body.prompt ||
      "cinematic background music for a realistic video";

    const duration = Math.min(
      Math.max(
        Number(body.duration) || 8,
        1
      ),
      30
    );

    const finalPrompt =
      getSoundPrompt(type, prompt);

    console.log(
      "BOMBA SOUND TYPE:",
      type
    );

    console.log(
      "BOMBA SOUND PROMPT:",
      finalPrompt
    );

    const response = await fetch(
      REPLICATE_API_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "wait=60",
        },
        body: JSON.stringify({
          input: {
            prompt: finalPrompt,
            duration,
            output_format: "mp3",
          },
        }),
      }
    );

    const responseText =
      await response.text();

    console.log(
      "BOMBA SOUND STATUS:",
      response.status
    );

    console.log(
      "BOMBA SOUND RESPONSE:",
      responseText
    );

    let data = null;

    try {
      data = JSON.parse(responseText);
    } catch {
      data = null;
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            data?.detail ||
            data?.error ||
            responseText ||
            `Sound generation failed with status ${response.status}.`,
        },
        {
          status: 502,
        }
      );
    }

    const audioUrl =
      extractOutputUrl(data?.output);

    if (audioUrl) {
      console.log(
        "BOMBA SOUND URL:",
        audioUrl
      );

      return NextResponse.json({
        status: "completed",
        audioUrl,
        type,
        prompt: finalPrompt,
      });
    }

    if (data?.id) {
      console.log(
        "BOMBA SOUND PREDICTION ID:",
        data.id
      );

      return NextResponse.json({
        status: data.status || "processing",
        id: data.id,
        predictionId: data.id,
        type,
      });
    }

    return NextResponse.json(
      {
        status: "failed",
        error:
          "Sound generation completed without an audio URL.",
        rawResponse: data,
      },
      {
        status: 502,
      }
    );
  } catch (error) {
    console.error(
      "BOMBA SOUND ERROR:",
      error
    );

    return NextResponse.json(
      {
        status: "failed",
        error:
          error?.message ||
          "Unable to generate sound.",
      },
      {
        status: 500,
      }
    );
  }
}