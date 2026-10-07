// ============================================
// BOMBA AI VIDEO STUDIO
// FILE:
// app/api/video/generate/route.js
//
// PURPOSE:
// Start and monitor BOMBA AI video generation
// through Eternal AI.
//
// FLOW:
//
// POST
// BOMBA → Eternal AI
//        ↓
//     request_id
//
// GET
// BOMBA → Eternal AI status
//        ↓
//     video_url
//
// IMPORTANT:
// - Server-side only
// - Eternal AI API key never exposed
// - No Cloudinary upload here
// - No FFmpeg here
// - No voice generation here
// - No sound generation here
// ============================================

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

// ============================================
// ETERNAL AI CONFIGURATION
// ============================================

const ETERNALAI_API_KEY =
  process.env.ETERNALAI_API_KEY;

const ETERNALAI_BASE_URL =
  "https://open.eternalai.org";

const ETERNALAI_SUBMIT_URL =
  `${ETERNALAI_BASE_URL}/api/image-to-video`;

const ETERNALAI_MODEL =
  "wan-ai/wan2.2-i2v-a14b-lightning";

// ============================================
// DEFAULT NEGATIVE PROMPT
// ============================================

const DEFAULT_NEGATIVE_PROMPT =
  [
    "blurry",
    "low quality",
    "distorted face",
    "deformed body",
    "extra fingers",
    "extra limbs",
    "bad anatomy",
    "unrealistic movement",
    "flickering",
    "duplicate person",
    "text",
    "watermark",
    "logo",
    "nsfw",
    "nudity",
  ].join(", ");

// ============================================
// HELPERS
// ============================================

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function cleanString(
  value,
  fallback = ""
) {
  return typeof value === "string"
    ? value.trim()
    : fallback;
}

function getImageData(body) {
  return (
    body?.imageData ||
    body?.image ||
    body?.characterImage ||
    body?.character?.image ||
    null
  );
}

// ============================================
// BUILD VIDEO PROMPT
// ============================================

function buildPrompt(body) {
  const prompt =
    cleanString(body?.prompt);

  const sceneDescription =
    cleanString(
      body?.sceneDescription
    );

  const shotDescription =
    cleanString(
      body?.shotDescription
    );

  const camera =
    cleanString(body?.camera);

  const shotType =
    cleanString(body?.shotType);

  const action =
    cleanString(body?.action);

  const mode =
    cleanString(
      body?.mode,
      "Story"
    );

  const parts = [];

  if (prompt) {
    parts.push(prompt);
  }

  if (sceneDescription) {
    parts.push(
      `Scene description: ${sceneDescription}`
    );
  }

  if (shotDescription) {
    parts.push(
      `Shot description: ${shotDescription}`
    );
  }

  if (action) {
    parts.push(
      `Character action: ${action}`
    );
  }

  if (shotType) {
    parts.push(
      `Shot type: ${shotType}`
    );
  }

  if (camera) {
    parts.push(
      `Camera movement: ${camera}`
    );
  }

  parts.push(
    `Mode: ${mode}`
  );

  parts.push(
    "Photorealistic live-action video."
  );

  parts.push(
    "Cinematic lighting."
  );

  parts.push(
    "Natural human movement."
  );

  parts.push(
    "Realistic facial expressions."
  );

  parts.push(
    "Realistic skin texture."
  );

  parts.push(
    "Natural body proportions."
  );

  parts.push(
    "Detailed realistic environment."
  );

  parts.push(
    "The uploaded reference image is the main character and must remain the primary character throughout the entire shot."
  );

  parts.push(
    "Preserve the main character's identity, face, facial structure, skin tone, hairstyle, body proportions, clothing, and overall appearance from the uploaded reference image."
  );

  parts.push(
    "Do not replace, redesign, transform, or introduce a different main character."
  );

  parts.push(
    "Keep the main character visually consistent from the first frame to the last frame."
  );

  parts.push(
    "Smooth cinematic camera movement."
  );

  parts.push(
    "No cartoon, no anime, no illustration style."
  );

  return parts.join("\n\n");
}

// ============================================
// EXTRACT REQUEST ID
// ============================================

function extractRequestId(data) {
  return (
    data?.result?.request_id ||
    data?.request_id ||
    data?.job_id ||
    data?.prediction_id ||
    data?.id ||
    null
  );
}

// ============================================
// EXTRACT VIDEO URL
// ============================================

function extractVideoUrl(data) {
  return (
    data?.result?.video_url ||
    data?.video_url ||
    data?.result?.video?.url ||
    data?.video?.url ||
    data?.result?.output?.video_url ||
    data?.output?.video_url ||
    data?.result?.output?.url ||
    data?.output?.url ||
    null
  );
}

// ============================================
// EXTRACT STATUS
// ============================================

function extractGenerationStatus(data) {
  return String(
    data?.result?.status ||
      data?.status ||
      data?.result?.state ||
      data?.state ||
      ""
  ).toLowerCase();
}

// ============================================
// EXTRACT PROGRESS
// ============================================

function extractProgress(data) {
  return (
    data?.result?.progress ??
    data?.progress ??
    null
  );
}

// ============================================
// POST
// START VIDEO GENERATION
// ============================================

export async function POST(request) {
  try {
    // ========================================
    // API KEY CHECK
    // ========================================

    if (!ETERNALAI_API_KEY) {
      return NextResponse.json(
        {
          status: "failed",
          code:
            "ETERNALAI_API_KEY_MISSING",
          error:
            "ETERNALAI_API_KEY is not configured in Vercel.",
        },
        {
          status: 500,
        }
      );
    }

    // ========================================
    // READ BODY
    // ========================================

    let body;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          status: "failed",
          code:
            "INVALID_JSON",
          error:
            "Invalid JSON request body.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================
    // IMAGE
    // ========================================

    const imageData =
      getImageData(body);

    if (!imageData) {
      return NextResponse.json(
        {
          status: "failed",
          code:
            "CHARACTER_IMAGE_MISSING",
          error:
            "Please upload a character image first.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================
    // PROMPT
    // ========================================

    const prompt =
      buildPrompt(body);

    if (!prompt.trim()) {
      return NextResponse.json(
        {
          status: "failed",
          code:
            "PROMPT_MISSING",
          error:
            "Please describe the video you want.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================
    // IMAGE SIZE SAFETY
    // ========================================

    if (
      typeof imageData === "string" &&
      imageData.startsWith("data:")
    ) {
      const approximateBytes =
        Math.ceil(
          imageData.length * 0.75
        );

      const maxImageBytes =
        15 * 1024 * 1024;

      if (
        approximateBytes >
        maxImageBytes
      ) {
        return NextResponse.json(
          {
            status: "failed",
            code:
              "CHARACTER_IMAGE_TOO_LARGE",
            error:
              "The character image is too large. Please use an image under 15 MB.",
          },
          {
            status: 400,
          }
        );
      }
    }

    // ========================================
    // GENERATION SETTINGS
    //
    // KEEPING THESE LOW/COST-SAFE FOR NOW:
    // 5 seconds
    // 480p
    // 16:9
    // ========================================

    const payload = {
      prompt,

      image_url:
        imageData,

      model_id:
        ETERNALAI_MODEL,

      duration:
        "5",

      aspect_ratio:
        "16:9",

      resolution:
        "480p",

      negative_prompt:
        DEFAULT_NEGATIVE_PROMPT,

      cfg_scale:
        0.5,
    };

    // ========================================
    // SAFE LOGGING
    // NEVER LOG API KEY
    // ========================================

    console.log(
      "BOMBA VIDEO ENGINE → ETERNAL AI"
    );

    console.log({
      model:
        ETERNALAI_MODEL,

      mode:
        cleanString(
          body?.mode,
          "Story"
        ),

      hasImage:
        Boolean(imageData),

      imageType:
        typeof imageData,

      promptLength:
        prompt.length,

      duration:
        "5 seconds",

      resolution:
        "480p",

      aspectRatio:
        "16:9",
    });

    // ========================================
    // SUBMIT TO ETERNAL AI
    // ========================================

    const response =
      await fetch(
        ETERNALAI_SUBMIT_URL,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${ETERNALAI_API_KEY}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(payload),

          cache:
            "no-store",
        }
      );

    const responseText =
      await response.text();

    const data =
      safeParse(responseText);

    console.log(
      "BOMBA ETERNAL AI HTTP:",
      response.status
    );

    // ========================================
    // ETERNAL AI ERROR
    // ========================================

    if (!response.ok) {
      const errorMessage =
        data?.error ||
        data?.detail ||
        data?.message ||
        data?.result?.error ||
        `Eternal AI returned HTTP ${response.status}.`;

      let code =
        "ETERNALAI_REQUEST_FAILED";

      if (
        response.status === 401
      ) {
        code =
          "ETERNALAI_AUTH_FAILED";
      }

      if (
        response.status === 402
      ) {
        code =
          "ETERNALAI_INSUFFICIENT_CREDITS";
      }

      if (
        response.status === 429
      ) {
        code =
          "ETERNALAI_RATE_LIMIT";
      }

      console.error(
        "BOMBA ETERNAL AI REQUEST FAILED:",
        {
          status:
            response.status,
          code,
          error:
            errorMessage,
        }
      );

      return NextResponse.json(
        {
          status: "failed",

          code,

          error:
            errorMessage,
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

    // ========================================
    // REQUEST ID
    // ========================================

    const requestId =
      extractRequestId(data);

    if (!requestId) {
      console.error(
        "BOMBA ETERNAL AI REQUEST ID MISSING"
      );

      return NextResponse.json(
        {
          status: "failed",

          code:
            "ETERNALAI_REQUEST_ID_MISSING",

          error:
            "Eternal AI accepted the request but did not return a generation ID.",
        },
        {
          status: 502,
        }
      );
    }

    console.log(
      "BOMBA ETERNAL AI REQUEST ID:",
      requestId
    );

    // ========================================
    // SUCCESS
    // ========================================

    return NextResponse.json(
      {
        status:
          "queued",

        provider:
          "eternalai",

        model:
          ETERNALAI_MODEL,

        id:
          requestId,

        jobId:
          requestId,

        predictionId:
          requestId,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "BOMBA ETERNAL AI POST ERROR:",
      error?.message ||
        "Unknown error"
    );

    return NextResponse.json(
      {
        status: "failed",

        code:
          "ETERNALAI_UNEXPECTED_ERROR",

        error:
          error?.message ||
          "Unexpected error while starting video generation.",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================
// GET
// CHECK VIDEO GENERATION STATUS
// ============================================

export async function GET(request) {
  try {
    // ========================================
    // API KEY CHECK
    // ========================================

    if (!ETERNALAI_API_KEY) {
      return NextResponse.json(
        {
          status: "failed",

          code:
            "ETERNALAI_API_KEY_MISSING",

          error:
            "ETERNALAI_API_KEY is missing.",
        },
        {
          status: 500,
        }
      );
    }

    // ========================================
    // READ REQUEST ID
    // ========================================

    const { searchParams } =
      new URL(
        request.url
      );

    const requestId =
      searchParams.get("id") ||
      searchParams.get("jobId") ||
      searchParams.get(
        "predictionId"
      ) ||
      searchParams.get(
        "eventId"
      );

    if (!requestId) {
      return NextResponse.json(
        {
          status: "failed",

          code:
            "GENERATION_ID_MISSING",

          error:
            "Missing generation ID.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================
    // ETERNAL AI STATUS URL
    // ========================================

    const statusUrl =
      `${ETERNALAI_BASE_URL}` +
      `/api/image-to-video/` +
      `${encodeURIComponent(
        requestId
      )}` +
      `/status`;

    console.log(
      "BOMBA ETERNAL AI STATUS CHECK:",
      requestId
    );

    // ========================================
    // STATUS REQUEST
    // ========================================

    const statusResponse =
      await fetch(
        statusUrl,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${ETERNALAI_API_KEY}`,
          },

          cache:
            "no-store",
        }
      );

    const statusText =
      await statusResponse.text();

    const statusData =
      safeParse(statusText);

    console.log(
      "BOMBA ETERNAL AI STATUS HTTP:",
      statusResponse.status
    );

    // ========================================
    // STATUS ERROR
    // ========================================

    if (
      !statusResponse.ok
    ) {
      const errorMessage =
        statusData?.error ||
        statusData?.detail ||
        statusData?.message ||
        statusData?.result?.error ||
        `Eternal AI status check failed (HTTP ${statusResponse.status}).`;

      console.error(
        "BOMBA ETERNAL AI STATUS FAILED:",
        {
          requestId,
          status:
            statusResponse.status,
        }
      );

      return NextResponse.json(
        {
          status: "failed",

          code:
            "ETERNALAI_STATUS_FAILED",

          error:
            errorMessage,

          jobId:
            requestId,

          id:
            requestId,
        },
        {
          status: 502,
        }
      );
    }

    // ========================================
    // EXTRACT DATA
    // ========================================

    const generationStatus =
      extractGenerationStatus(
        statusData
      );

    const progress =
      extractProgress(
        statusData
      );

    const videoUrl =
      extractVideoUrl(
        statusData
      );

    const result =
      statusData?.result ||
      {};

    console.log(
      "BOMBA ETERNAL AI JOB:",
      {
        requestId,

        status:
          generationStatus,

        progress,

        hasVideo:
          Boolean(videoUrl),
      }
    );

    // ========================================
    // PROCESSING STATUSES
    // ========================================

    const processingStatuses = [
      "pending",
      "processing",
      "queued",
      "queue",
      "in_queue",
      "in_progress",
      "starting",
      "started",
      "running",
      "generating",
    ];

    if (
      processingStatuses.includes(
        generationStatus
      )
    ) {
      return NextResponse.json(
        {
          status:
            "processing",

          provider:
            "eternalai",

          jobId:
            requestId,

          id:
            requestId,

          progress,
        },
        {
          status: 200,

          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    // ========================================
    // FAILED STATUSES
    // ========================================

    const failedStatuses = [
      "failed",
      "error",
      "cancelled",
      "canceled",
    ];

    if (
      failedStatuses.includes(
        generationStatus
      )
    ) {
      return NextResponse.json(
        {
          status:
            "failed",

          provider:
            "eternalai",

          jobId:
            requestId,

          id:
            requestId,

          error:
            result?.error ||
            result?.message ||
            statusData?.error ||
            statusData?.message ||
            "Eternal AI video generation failed.",
        },
        {
          status: 502,
        }
      );
    }

    // ========================================
    // COMPLETED
    // ========================================

    const completedStatuses = [
      "completed",
      "complete",
      "success",
      "succeeded",
      "done",
      "finished",
    ];

    if (
      completedStatuses.includes(
        generationStatus
      )
    ) {
      if (!videoUrl) {
        return NextResponse.json(
          {
            status:
              "failed",

            code:
              "VIDEO_URL_MISSING",

            error:
              "Eternal AI completed the generation but returned no video URL.",

            jobId:
              requestId,

            id:
              requestId,
          },
          {
            status: 502,
          }
        );
      }

      console.log(
        "BOMBA ETERNAL AI VIDEO READY"
      );

      return NextResponse.json(
        {
          status:
            "completed",

          provider:
            "eternalai",

          jobId:
            requestId,

          id:
            requestId,

          videoUrl,
        },
        {
          status: 200,

          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    // ========================================
    // SAFETY FALLBACK
    //
    // If Eternal AI gives us a video URL
    // but an unexpected status string,
    // the URL is enough to finish the job.
    // ========================================

    if (videoUrl) {
      console.log(
        "BOMBA ETERNAL AI VIDEO URL FOUND"
      );

      return NextResponse.json(
        {
          status:
            "completed",

          provider:
            "eternalai",

          jobId:
            requestId,

          id:
            requestId,

          videoUrl,
        },
        {
          status: 200,

          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    // ========================================
    // UNKNOWN STATUS
    //
    // Keep polling instead of incorrectly
    // declaring failure.
    // ========================================

    return NextResponse.json(
      {
        status:
          "processing",

        provider:
          "eternalai",

        jobId:
          requestId,

        id:
          requestId,

        progress,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "BOMBA ETERNAL AI GET ERROR:",
      error?.message ||
        "Unknown error"
    );

    return NextResponse.json(
      {
        status:
          "failed",

        code:
          "ETERNALAI_STATUS_ERROR",

        error:
          error?.message ||
          "Error while checking Eternal AI video generation.",
      },
      {
        status: 500,
      }
    );
  }
}