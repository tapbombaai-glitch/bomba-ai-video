import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MINIMAX_API_URL =
  "https://api.minimax.io/v2/video_generation";

const MINIMAX_QUERY_URL =
  "https://api.minimax.io/v2/query/video_generation";

const MINIMAX_MODEL = "MiniMax-H3";

export async function POST(request) {
  try {
    const apiKey = process.env.MINIMAX_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "MINIMAX_API_KEY is missing. Add your MiniMax API key in Vercel.",
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
        {
          error: "Please describe your video first.",
        },
        { status: 400 }
      );
    }

    /*
     * First BOMBA H3 test:
     * 10 seconds at 768P.
     *
     * MiniMax H3 supports 4–15 seconds.
     */
    const duration = 10;

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
     * If the frontend sends a character image,
     * use it as the first frame.
     *
     * MiniMax requires a public image URL for reliable
     * image-to-video requests.
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
      model: MINIMAX_MODEL,
      content,
      resolution: "768P",
      duration,
      ratio: characterImage ? "adaptive" : "16:9",
    };

    console.log(
      "MINIMAX H3 CREATE REQUEST:",
      JSON.stringify({
        model: MINIMAX_MODEL,
        mode,
        duration,
        resolution: "768P",
        hasCharacterImage: Boolean(characterImage),
      })
    );

    const response = await fetch(MINIMAX_API_URL, {
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
        "MINIMAX H3 CREATE ERROR:",
        JSON.stringify(data)
      );

      const minimaxError =
        data?.error?.message ||
        data?.message ||
        "MiniMax could not start the video generation.";

      return NextResponse.json(
        {
          error: minimaxError,
          code:
            data?.error?.http_code ||
            data?.error?.code ||
            null,
          requestId:
            data?.request_id ||
            null,
        },
        {
          status: response.status,
        }
      );
    }

    const taskId = data?.task_id;

    if (!taskId) {
      console.error(
        "MINIMAX H3 NO TASK ID:",
        JSON.stringify(data)
      );

      return NextResponse.json(
        {
          error:
            "MiniMax accepted the request but returned no task ID.",
        },
        { status: 500 }
      );
    }

    console.log(
      "MINIMAX H3 TASK CREATED:",
      taskId
    );

    return NextResponse.json({
      success: true,
      status: "queued",
      jobId: taskId,
      predictionId: taskId,
      message:
        "Video generation started with MiniMax H3.",
    });
  } catch (error) {
    console.error(
      "BOMBA MINIMAX H3 VIDEO ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unexpected error while starting MiniMax H3 video generation.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const apiKey = process.env.MINIMAX_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "MINIMAX_API_KEY is missing. Add your MiniMax API key in Vercel.",
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
      `${MINIMAX_QUERY_URL}/${encodeURIComponent(
        taskId
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "MINIMAX H3 STATUS ERROR:",
        JSON.stringify(data)
      );

      return NextResponse.json(
        {
          error:
            data?.error?.message ||
            data?.message ||
            "Could not check MiniMax video status.",
        },
        {
          status: response.status,
        }
      );
    }

    const task = data?.task;
    const status = task?.status;

    console.log(
      "MINIMAX H3 TASK STATUS:",
      taskId,
      status
    );

    if (status === "failed") {
      return NextResponse.json(
        {
          success: false,
          status: "failed",
          predictionId:
            task?.id || taskId,
          error:
            task?.error?.message ||
            task?.error ||
            "MiniMax H3 video generation failed.",
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
            task?.id || taskId,
          error:
            "MiniMax H3 video generation was cancelled.",
        },
        { status: 500 }
      );
    }

    const videoUrl =
      task?.content?.url || null;

    if (
      status === "succeeded" &&
      videoUrl
    ) {
      return NextResponse.json({
        success: true,
        status: "succeeded",
        videoUrl,
        predictionId:
          task?.id || taskId,
      });
    }

    return NextResponse.json({
      success: true,
      status: status || "running",
      videoUrl: null,
      predictionId:
        task?.id || taskId,
      message:
        "Video is still being generated.",
    });
  } catch (error) {
    console.error(
      "BOMBA MINIMAX H3 STATUS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unexpected error while checking MiniMax H3 video status.",
      },
      { status: 500 }
    );
  }
}