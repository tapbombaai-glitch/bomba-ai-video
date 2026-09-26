import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BYTEPLUS_API_URL =
  "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks";

const BYTEPLUS_MODEL = "dreamina-seedance-2-5-260628";

export async function POST(request) {
  try {
    const apiKey = process.env.ARK_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "ARK_API_KEY is missing. Add your BytePlus ModelArk API key in Vercel.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const mode = body?.mode || "Movie";
    const prompt = body?.prompt?.trim();
    const characterImage = body?.characterImage || null;

    let duration = Number(body?.duration ?? 4);

    if (!prompt) {
      return NextResponse.json(
        {
          error: "Please describe your video first.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(duration)) {
      duration = 4;
    }

    // Seedance 2.5 supports 4–30 seconds.
    duration = Math.max(
      4,
      Math.min(30, Math.round(duration))
    );

    const finalPrompt = `
Create a realistic live-action cinematic video.

Mode: ${mode}

Story / scene:
${prompt}

Visual requirements:
Photorealistic live-action style.
Realistic human beings.
Natural human skin and facial detail.
Natural facial expressions.
Natural body movement.
Realistic acting.
Realistic environment.
Believable lighting.
Cinematic composition.
Natural camera movement.
Realistic clothing.
Realistic physical surroundings.
Realistic proportions and physics.

Make the scene visually match the story exactly.

Do not use cartoon style.
Do not use anime style.
Do not use illustration style.
Do not use 3D cartoon characters.
Do not use fantasy-looking characters unless specifically requested.
`.trim();

    const content = [
      {
        type: "text",
        text: finalPrompt,
      },
    ];

    /*
     * Character image support.
     *
     * BytePlus accepts image_url content.
     * We only add it when the frontend actually sends an image.
     */
    if (characterImage) {
      content.push({
        type: "image_url",
        image_url: {
          url: characterImage,
        },
        role: "first_frame",
      });
    }

    const requestBody = {
      model: BYTEPLUS_MODEL,
      content,
      generate_audio: true,
      ratio: "adaptive",
      duration,
      watermark: false,
    };

    console.log(
      "BYTEPLUS CREATE REQUEST:",
      JSON.stringify({
        model: BYTEPLUS_MODEL,
        mode,
        duration,
        hasCharacterImage: Boolean(characterImage),
      })
    );

    const response = await fetch(BYTEPLUS_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "BYTEPLUS CREATE ERROR:",
        JSON.stringify(data)
      );

      const bytePlusError =
        data?.error?.message ||
        data?.message ||
        data?.error ||
        "BytePlus could not start the video generation.";

      return NextResponse.json(
        {
          error: bytePlusError,
          code: data?.error?.code || null,
        },
        {
          status: response.status,
        }
      );
    }

    const taskId = data?.id;

    if (!taskId) {
      console.error(
        "BYTEPLUS NO TASK ID:",
        JSON.stringify(data)
      );

      return NextResponse.json(
        {
          error:
            "BytePlus accepted the request but returned no task ID.",
        },
        { status: 500 }
      );
    }

    console.log(
      "BYTEPLUS TASK CREATED:",
      taskId
    );

    return NextResponse.json({
      success: true,
      status: "queued",
      jobId: taskId,
      predictionId: taskId,
      message:
        "Video generation started with BytePlus Seedance 2.5.",
    });
  } catch (error) {
    console.error(
      "BOMBA BYTEPLUS VIDEO ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unexpected error while starting BytePlus video generation.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const apiKey = process.env.ARK_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "ARK_API_KEY is missing. Add your BytePlus ModelArk API key in Vercel.",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(
      request.url
    );

    const taskId =
      searchParams.get("predictionId") ||
      searchParams.get("jobId");

    if (!taskId) {
      return NextResponse.json(
        {
          error:
            "predictionId or jobId is required.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${BYTEPLUS_API_URL}/${encodeURIComponent(
        taskId
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "BYTEPLUS STATUS ERROR:",
        JSON.stringify(data)
      );

      return NextResponse.json(
        {
          error:
            data?.error?.message ||
            data?.message ||
            data?.error ||
            "Could not check BytePlus video status.",
        },
        {
          status: response.status,
        }
      );
    }

    const status = data?.status;

    console.log(
      "BYTEPLUS TASK STATUS:",
      taskId,
      status
    );

    if (status === "failed") {
      return NextResponse.json(
        {
          success: false,
          status: "failed",
          predictionId:
            data?.id || taskId,
          error:
            data?.error?.message ||
            data?.error ||
            "BytePlus video generation failed.",
        },
        { status: 500 }
      );
    }

    if (status === "cancelled") {
      return NextResponse.json(
        {
          success: false,
          status: "cancelled",
          predictionId:
            data?.id || taskId,
          error:
            "BytePlus video generation was cancelled.",
        },
        { status: 500 }
      );
    }

    const videoUrl =
      data?.content?.video_url || null;

    if (
      status === "succeeded" &&
      videoUrl
    ) {
      return NextResponse.json({
        success: true,
        status: "succeeded",
        videoUrl,
        predictionId:
          data?.id || taskId,
      });
    }

    return NextResponse.json({
      success: true,
      status:
        status || "running",
      videoUrl: null,
      predictionId:
        data?.id || taskId,
      message:
        "Video is still being generated.",
    });
  } catch (error) {
    console.error(
      "BOMBA BYTEPLUS STATUS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unexpected error while checking BytePlus video status.",
      },
      { status: 500 }
    );
  }
}