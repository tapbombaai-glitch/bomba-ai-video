import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

// ────────────────────────────────────────────────
// fal.ai Configuration
// ────────────────────────────────────────────────
const FAL_KEY = process.env.FAL_KEY;

if (!FAL_KEY) {
  console.warn("⚠️ FAL_KEY is missing. Add it in Vercel Environment Variables.");
}

// Recommended model: Wan 2.2 Image-to-Video (reliable + good quality)
const FAL_MODEL = "fal-ai/wan/v2.2/image-to-video";
const FAL_SUBMIT_URL = `https://queue.fal.run/${FAL_MODEL}`;
const FAL_STATUS_BASE = `https://queue.fal.run/${FAL_MODEL}/requests`;

const DEFAULT_NEGATIVE_PROMPT =
  "blurry, low quality, distorted face, deformed body, extra fingers, extra limbs, bad anatomy, unrealistic movement, flickering, duplicate person, text, watermark, logo, nsfw, nudity";

/**
 * Safely parse JSON
 */
function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Proxy the final video so the browser downloads it from your domain
 */
async function proxyVideo(videoUrl) {
  try {
    const response = await fetch(videoUrl, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "failed",
          error: `Failed to download video (HTTP ${response.status})`,
        },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") || "video/mp4";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("BOMBA PROXY ERROR:", err);
    return NextResponse.json(
      { status: "failed", error: "Could not proxy the generated video." },
      { status: 502 }
    );
  }
}

/* =========================================================
   POST → Start generation
   ========================================================= */
export async function POST(request) {
  try {
    if (!FAL_KEY) {
      return NextResponse.json(
        {
          status: "failed",
          error: "FAL_KEY is not configured. Please add it in Vercel.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const imageData =
      body?.imageData || body?.image || body?.characterImage || null;
    const prompt = (body?.prompt || "").trim();
    const mode = body?.mode || "Story";

    if (!imageData) {
      return NextResponse.json(
        { status: "failed", error: "Please upload a character photo first." },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { status: "failed", error: "Please describe the video you want." },
        { status: 400 }
      );
    }

    // Make the prompt stronger for realistic results
    const finalPrompt = `${prompt}

Photorealistic live-action video, cinematic lighting, natural human movement, realistic skin texture, realistic facial expressions, natural body proportions, detailed environment, high quality, 24fps.`;

    // Payload for fal.ai Wan 2.2 I2V
    const payload = {
      image_url: imageData, // can be base64 data URL or public URL
      prompt: finalPrompt,
      negative_prompt: DEFAULT_NEGATIVE_PROMPT,
      num_frames: 81, // ≈ 5 seconds at 16 fps
      frames_per_second: 16,
      resolution: "720p",
      aspect_ratio: "16:9",
      guidance_scale: 5.0,
      num_inference_steps: 30,
      enable_safety_checker: true,
    };

    console.log("BOMBA FAL → Starting generation | Mode:", mode);

    const response = await fetch(FAL_SUBMIT_URL, {
      method: "POST",
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    const data = safeParse(text);

    console.log("BOMBA FAL START STATUS:", response.status);
    console.log("BOMBA FAL START BODY:", text.slice(0, 800));

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "failed",
          error: data?.detail || data?.error || "Failed to start generation on fal.ai",
          raw: text.slice(0, 1000),
        },
        { status: 502 }
      );
    }

    const requestId = data?.request_id || data?.id;

    if (!requestId) {
      return NextResponse.json(
        {
          status: "failed",
          error: "fal.ai did not return a request_id",
          raw: text.slice(0, 1000),
        },
        { status: 502 }
      );
    }

    console.log("BOMBA FAL REQUEST ID:", requestId);

    // Keep the same response shape your frontend expects
    return NextResponse.json({
      status: "queued",
      id: requestId,
      jobId: requestId,
      predictionId: requestId,
    });
  } catch (error) {
    console.error("BOMBA FAL POST ERROR:", error);
    return NextResponse.json(
      {
        status: "failed",
        error: error?.message || "Unexpected error while starting generation",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   GET → Poll status / return video
   ========================================================= */
export async function GET(request) {
  try {
    if (!FAL_KEY) {
      return NextResponse.json(
        { status: "failed", error: "FAL_KEY is missing" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestId =
      searchParams.get("id") ||
      searchParams.get("jobId") ||
      searchParams.get("predictionId") ||
      searchParams.get("eventId");

    if (!requestId) {
      return NextResponse.json(
        { status: "failed", error: "Missing generation ID" },
        { status: 400 }
      );
    }

    // 1. Check status
    const statusRes = await fetch(`\( {FAL_STATUS_BASE}/ \){requestId}/status`, {
      headers: {
        Authorization: `Key ${FAL_KEY}`,
      },
      cache: "no-store",
    });

    const statusText = await statusRes.text();
    const statusData = safeParse(statusText);

    console.log("BOMBA FAL STATUS:", statusText.slice(0, 600));

    if (!statusRes.ok) {
      return NextResponse.json(
        {
          status: "failed",
          error: `Status check failed (HTTP ${statusRes.status})`,
          raw: statusText.slice(0, 800),
          jobId: requestId,
        },
        { status: 502 }
      );
    }

    const status = (statusData?.status || "").toUpperCase();

    // Still processing
    if (status === "IN_QUEUE" || status === "IN_PROGRESS") {
      return NextResponse.json({
        status: "processing",
        jobId: requestId,
        id: requestId,
      });
    }

    // Failed
    if (status === "FAILED" || status === "ERROR") {
      return NextResponse.json(
        {
          status: "failed",
          error:
            statusData?.error ||
            statusData?.detail ||
            "Generation failed on fal.ai",
          jobId: requestId,
        },
        { status: 502 }
      );
    }

    // Completed → get the result
    if (status === "COMPLETED" || status === "OK") {
      const resultRes = await fetch(`\( {FAL_STATUS_BASE}/ \){requestId}`, {
        headers: {
          Authorization: `Key ${FAL_KEY}`,
        },
        cache: "no-store",
      });

      const resultText = await resultRes.text();
      const resultData = safeParse(resultText);

      console.log("BOMBA FAL RESULT:", resultText.slice(0, 800));

      const videoUrl =
        resultData?.video?.url ||
        resultData?.data?.video?.url ||
        resultData?.output?.video?.url ||
        resultData?.video_url ||
        null;

      if (videoUrl) {
        console.log("BOMBA FAL VIDEO URL:", videoUrl);
        return proxyVideo(videoUrl);
      }

      return NextResponse.json(
        {
          status: "failed",
          error: "Generation completed but no video URL was found",
          raw: resultText.slice(0, 1000),
          jobId: requestId,
        },
        { status: 502 }
      );
    }

    // Unknown status → treat as still processing
    return NextResponse.json({
      status: "processing",
      jobId: requestId,
      id: requestId,
    });
  } catch (error) {
    console.error("BOMBA FAL GET ERROR:", error);
    return NextResponse.json(
      {
        status: "failed",
        error: error?.message || "Error while checking generation status",
      },
      { status: 500 }
    );
  }
}