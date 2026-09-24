import { NextResponse } from "next/server";

export const runtime = "nodejs";

const REPLICATE_API_URL =
  "https://api.replicate.com/v1/models/minimax/video-01/predictions";

export async function POST(request) {
  try {
    const token = process.env.REPLICATE_API_TOKEN;

    if (!token) {
      return NextResponse.json(
        {
          error:
            "REPLICATE_API_TOKEN is missing. Add it to the Vercel environment variables.",
        },
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

    /*
      BOMBA keeps the video engine universal.

      The user can describe:
      - a movie
      - a relationship story
      - an advert
      - a market scene
      - a school drama
      - an action scene
      - a presenter
      - etc.

      We don't hard-code one particular story.
    */
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
No fantasy-looking characters unless the user's story specifically requests them.

Make the scene visually match the story exactly.
`.trim();

    const input = {
      prompt: finalPrompt,
      prompt_optimizer: true,
    };

    /*
      If the user uploaded a character photo, use it
      as the first frame/reference for the video.
    */
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
      body: JSON.stringify({
        input,
      }),
    });

    const replicateData = await replicateResponse.json();

    if (!replicateResponse.ok) {
      return NextResponse.json(
        {
          error:
            replicateData?.detail ||
            replicateData?.error ||
            "Replicate could not start the video generation.",
          details: replicateData,
        },
        { status: replicateResponse.status }
      );
    }

    /*
      With Prefer: wait, Replicate may return the completed
      prediction. If generation takes longer, it can instead
      return a prediction that is still processing.
    */

    if (
      replicateData?.status === "starting" ||
      replicateData?.status === "processing"
    ) {
      return NextResponse.json({
        success: true,
        jobId: replicateData.id,
        status: replicateData.status,
        message:
          "Your video is still being generated. The next step is to poll this job until it is ready.",
      });
    }

    if (replicateData?.status === "failed") {
      return NextResponse.json(
        {
          error:
            replicateData?.error ||
            "The video generation failed on the AI engine.",
        },
        { status: 500 }
      );
    }

    /*
      Video-01 normally returns a video URI.
    */
    let videoUrl = null;

    if (typeof replicateData?.output === "string") {
      videoUrl = replicateData.output;
    } else if (replicateData?.output?.url) {
      videoUrl = replicateData.output.url;
    }

    if (!videoUrl) {
      return NextResponse.json(
        {
          error: "The AI engine finished, but no video URL was returned.",
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
