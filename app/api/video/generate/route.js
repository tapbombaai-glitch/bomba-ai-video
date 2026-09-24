import { NextResponse } from "next/server";

export const runtime = "nodejs";

const REPLICATE_API_URL =
  "https://api.replicate.com/v1/models/minimax/video-01/predictions";

export async function POST(request) {
  try {
    const token = process.env.REPLICATE_API_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN is missing." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const mode = body?.mode || "Movie";
    const prompt = body?.prompt?.trim();
    const characterImage = body?.characterImage || null;

    if (!prompt) {
      return NextResponse.json(
        { error: "Please describe your video first." },
        { status: 400 }
      );
    }

    const finalPrompt = `
Create a realistic live-action video.

Mode: ${mode}

Story / scene:
${prompt}

Visual requirements:
Photorealistic human beings.
Natural human skin and facial detail.
Natural body movement and realistic acting.
Realistic environment and believable lighting.
Cinematic composition.
Natural camera movement.
Realistic clothing and physical surroundings.
No cartoon.
No anime.
No illustration.
No 3D cartoon style.
No fantasy-looking characters unless specifically requested.

Make the scene visually match the story exactly.
`.trim();

    const input = {
      prompt: finalPrompt,
      prompt_optimizer: true,
    };

    if (characterImage) {
      input.first_frame_image = characterImage;
    }

    const replicateResponse = await fetch(REPLICATE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({ input }),
    });

    const replicateData = await replicateResponse.json();

    if (!replicateResponse.ok) {
      return NextResponse.json(
        {
          error:
            replicateData?.detail ||
            replicateData?.error ||
            "Replicate could not start the video generation.",
        },
        { status: replicateResponse.status }
      );
    }

    if (
      replicateData?.status === "starting" ||
      replicateData?.status === "processing"
    ) {
      return NextResponse.json({
        success: true,
        jobId: replicateData.id,
        status: replicateData.status,
        message: "Video is still being generated.",
      });
    }

    if (replicateData?.status === "failed") {
      return NextResponse.json(
        {
          error:
            replicateData?.error ||
            "The video generation failed.",
        },
        { status: 500 }
      );
    }

    const videoUrl = getVideoUrl(replicateData);

    if (!videoUrl) {
      return NextResponse.json(
        {
          error: "Video finished but no video URL was returned.",
          predictionId: replicateData?.id || null,
          status: replicateData?.status || null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "succeeded",
      videoUrl,
      predictionId: replicateData.id,
    });
  } catch (error) {
    console.error("BOMBA VIDEO GENERATION ERROR:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unexpected error while generating the video.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const token = process.env.REPLICATE_API_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN is missing." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const predictionId = searchParams.get("predictionId");

    if (!predictionId) {
      return NextResponse.json(
        { error: "predictionId is required." },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.detail ||
            data?.error ||
            "Could not check video status.",
        },
        { status: response.status }
      );
    }

    if (data.status === "failed") {
      return NextResponse.json(
        {
          status: "failed",
          error: data.error || "Video generation failed.",
        },
        { status: 500 }
      );
    }

    if (data.status === "canceled") {
      return NextResponse.json(
        {
          status: "canceled",
          error: "Video generation was canceled.",
        },
        { status: 500 }
      );
    }

    const videoUrl = getVideoUrl(data);

    return NextResponse.json({
      success: true,
      status: data.status,
      videoUrl,
      predictionId: data.id,
    });
  } catch (error) {
    console.error("BOMBA VIDEO STATUS ERROR:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unexpected error while checking video status.",
      },
      { status: 500 }
    );
  }
}

function getVideoUrl(data) {
  if (typeof data?.output === "string") {
    return data.output;
  }

  if (data?.output?.url) {
    return data.output.url;
  }

  if (Array.isArray(data?.output) && data.output.length > 0) {
    const first = data.output[0];

    if (typeof first === "string") {
      return first;
    }

    if (first?.url) {
      return first.url;
    }
  }

  return null;
}
