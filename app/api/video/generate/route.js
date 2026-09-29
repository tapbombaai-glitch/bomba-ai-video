import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const FAL_KEY = process.env.FAL_KEY;

const FAL_MODEL = "fal-ai/wan/v2.2-a14b/image-to-video";

const FAL_SUBMIT_URL =
  `https://queue.fal.run/${FAL_MODEL}`;

const FAL_STATUS_BASE =
  `https://queue.fal.run/${FAL_MODEL}/requests`;

const DEFAULT_NEGATIVE_PROMPT =
  "blurry, low quality, distorted face, deformed body, extra fingers, extra limbs, bad anatomy, unrealistic movement, flickering, duplicate person, text, watermark, logo, nsfw, nudity";

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function proxyVideo(videoUrl) {
  try {
    const response = await fetch(videoUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "failed",
          error: `Failed to download video (HTTP ${response.status})`,
        },
        { status: 502 }
      );
    }

    const contentType =
      response.headers.get("content-type") ||
      "video/mp4";

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("BOMBA FAL PROXY ERROR:", error);

    return NextResponse.json(
      {
        status: "failed",
        error: "Could not proxy the generated video.",
      },
      { status: 502 }
    );
  }
}

/* =========================================================
   POST → START GENERATION
   ========================================================= */

export async function POST(request) {
  try {
    if (!FAL_KEY) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "FAL_KEY is not configured in Vercel.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const imageData =
      body?.imageData ||
      body?.image ||
      body?.characterImage ||
      null;

    const prompt =
      typeof body?.prompt === "string"
        ? body.prompt.trim()
        : "";

    const mode =
      body?.mode || "Story";

    if (!imageData) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "Please upload a character photo first.",
        },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "Please describe the video you want.",
        },
        { status: 400 }
      );
    }

    const finalPrompt = `${prompt}

Photorealistic live-action video, cinematic lighting, natural human movement, realistic skin texture, realistic facial expressions, natural body proportions, detailed environment, high quality.`;

    /*
     * 81 frames / 16 FPS ≈ 5 seconds
     *
     * These values are supported by the current
     * fal.ai Wan 2.2 A14B image-to-video schema.
     */

    const payload = {
      image_url: imageData,
      prompt: finalPrompt,
      negative_prompt: DEFAULT_NEGATIVE_PROMPT,

      num_frames: 81,
      frames_per_second: 16,

      resolution: "720p",
      aspect_ratio: "16:9",

      num_inference_steps: 27,

      enable_safety_checker: true,

      enable_output_safety_checker: false,

      num_interpolated_frames: 0,
      adjust_fps_for_interpolation: false,

      video_quality: "balanced",
      video_write_mode: "fast",
    };

    console.log(
      "BOMBA FAL STARTING:",
      {
        model: FAL_MODEL,
        mode,
        frames: 81,
        fps: 16,
        duration: "approximately 5 seconds",
        resolution: "720p",
      }
    );

    const response = await fetch(
      FAL_SUBMIT_URL,
      {
        method: "POST",

        headers: {
          Authorization: `Key ${FAL_KEY}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      }
    );

    const text = await response.text();

    const data = safeParse(text);

    console.log(
      "BOMBA FAL START STATUS:",
      response.status
    );

    console.log(
      "BOMBA FAL START RESPONSE:",
      text.slice(0, 1500)
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            data?.detail ||
            data?.error ||
            `fal.ai returned HTTP ${response.status}`,
          raw: text.slice(0, 1000),
        },
        { status: 502 }
      );
    }

    const requestId =
      data?.request_id ||
      data?.id;

    if (!requestId) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "fal.ai did not return a request ID.",
          raw: text.slice(0, 1000),
        },
        { status: 502 }
      );
    }

    console.log(
      "BOMBA FAL REQUEST ID:",
      requestId
    );

    return NextResponse.json({
      status: "queued",
      id: requestId,
      jobId: requestId,
      predictionId: requestId,
    });
  } catch (error) {
    console.error(
      "BOMBA FAL POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        status: "failed",
        error:
          error?.message ||
          "Unexpected error while starting video generation.",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   GET → CHECK STATUS / RETURN VIDEO
   ========================================================= */

export async function GET(request) {
  try {
    if (!FAL_KEY) {
      return NextResponse.json(
        {
          status: "failed",
          error: "FAL_KEY is missing.",
        },
        { status: 500 }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const requestId =
      searchParams.get("id") ||
      searchParams.get("jobId") ||
      searchParams.get("predictionId") ||
      searchParams.get("eventId");

    if (!requestId) {
      return NextResponse.json(
        {
          status: "failed",
          error: "Missing generation ID.",
        },
        { status: 400 }
      );
    }

    /* -----------------------------------------
       CHECK STATUS
    ----------------------------------------- */

    const statusUrl =
      `${FAL_STATUS_BASE}/${encodeURIComponent(
        requestId
      )}/status`;

    console.log(
      "BOMBA FAL STATUS URL:",
      statusUrl
    );

    const statusRes = await fetch(
      statusUrl,
      {
        method: "GET",

        headers: {
          Authorization: `Key ${FAL_KEY}`,
        },

        cache: "no-store",
      }
    );

    const statusText =
      await statusRes.text();

    const statusData =
      safeParse(statusText);

    console.log(
      "BOMBA FAL STATUS RESPONSE:",
      statusText.slice(0, 1000)
    );

    if (!statusRes.ok) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            `fal.ai status check failed (HTTP ${statusRes.status})`,
          raw: statusText.slice(0, 800),
          jobId: requestId,
        },
        { status: 502 }
      );
    }

    const status =
      String(
        statusData?.status || ""
      ).toUpperCase();

    console.log(
      "BOMBA FAL JOB STATUS:",
      status
    );

    /* -----------------------------------------
       STILL WORKING
    ----------------------------------------- */

    if (
      status === "IN_QUEUE" ||
      status === "IN_PROGRESS"
    ) {
      return NextResponse.json({
        status: "processing",
        jobId: requestId,
        id: requestId,
      });
    }

    /* -----------------------------------------
       FAILED
    ----------------------------------------- */

    if (
      status === "FAILED" ||
      status === "ERROR"
    ) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            statusData?.error ||
            statusData?.detail ||
            "fal.ai video generation failed.",
          jobId: requestId,
        },
        { status: 502 }
      );
    }

    /* -----------------------------------------
       COMPLETED
    ----------------------------------------- */

    if (
      status === "COMPLETED" ||
      status === "OK"
    ) {
      const resultUrl =
        `${FAL_STATUS_BASE}/${encodeURIComponent(
          requestId
        )}`;

      console.log(
        "BOMBA FAL RESULT URL:",
        resultUrl
      );

      const resultRes =
        await fetch(
          resultUrl,
          {
            method: "GET",

            headers: {
              Authorization: `Key ${FAL_KEY}`,
            },

            cache: "no-store",
          }
        );

      const resultText =
        await resultRes.text();

      const resultData =
        safeParse(resultText);

      console.log(
        "BOMBA FAL RESULT:",
        resultText.slice(0, 1500)
      );

      if (!resultRes.ok) {
        return NextResponse.json(
          {
            status: "failed",
            error:
              `fal.ai result request failed (HTTP ${resultRes.status})`,
            raw: resultText.slice(
              0,
              1000
            ),
            jobId: requestId,
          },
          { status: 502 }
        );
      }

      const videoUrl =
        resultData?.video?.url ||
        resultData?.data?.video?.url ||
        resultData?.output?.video?.url ||
        resultData?.video_url ||
        null;

      if (!videoUrl) {
        return NextResponse.json(
          {
            status: "failed",
            error:
              "Generation completed but fal.ai returned no video URL.",
            raw: resultText.slice(
              0,
              1000
            ),
            jobId: requestId,
          },
          { status: 502 }
        );
      }

      console.log(
        "BOMBA FAL VIDEO URL:",
        videoUrl
      );

      return proxyVideo(videoUrl);
    }

    /* -----------------------------------------
       UNKNOWN STATUS
    ----------------------------------------- */

    return NextResponse.json({
      status: "processing",
      jobId: requestId,
      id: requestId,
    });
  } catch (error) {
    console.error(
      "BOMBA FAL GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        status: "failed",
        error:
          error?.message ||
          "Error while checking video generation.",
      },
      { status: 500 }
    );
  }
}