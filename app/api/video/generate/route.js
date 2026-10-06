import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const ETERNALAI_API_KEY = process.env.ETERNALAI_API_KEY;

const ETERNALAI_BASE_URL = "https://open.eternalai.org";

const ETERNALAI_SUBMIT_URL =
  `${ETERNALAI_BASE_URL}/api/image-to-video`;

const ETERNALAI_MODEL =
  "wan-ai/wan2.2-i2v-a14b-lightning";

const DEFAULT_NEGATIVE_PROMPT =
  "blurry, low quality, distorted face, deformed body, extra fingers, extra limbs, bad anatomy, unrealistic movement, flickering, duplicate person, text, watermark, logo, nsfw, nudity";

/* =========================================================
   HELPERS
========================================================= */

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function cleanString(value, fallback = "") {
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

function buildPrompt(body) {
  const prompt = cleanString(body?.prompt);

  const sceneDescription = cleanString(
    body?.sceneDescription
  );

  const shotDescription = cleanString(
    body?.shotDescription
  );

  const camera = cleanString(body?.camera);

  const shotType = cleanString(body?.shotType);

  const action = cleanString(body?.action);

  const mode = cleanString(
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

  parts.push(`Mode: ${mode}`);

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

/* =========================================================
   POST
   START ETERNAL AI VIDEO GENERATION
========================================================= */

export async function POST(request) {
  try {
    if (!ETERNALAI_API_KEY) {
      return NextResponse.json(
        {
          status: "failed",
          code: "ETERNALAI_API_KEY_MISSING",
          error:
            "ETERNALAI_API_KEY is not configured in Vercel.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const imageData = getImageData(body);

    const prompt = buildPrompt(body);

    if (!imageData) {
      return NextResponse.json(
        {
          status: "failed",
          code: "CHARACTER_IMAGE_MISSING",
          error:
            "Please upload a character image first.",
        },
        { status: 400 }
      );
    }

    if (!prompt.trim()) {
      return NextResponse.json(
        {
          status: "failed",
          code: "PROMPT_MISSING",
          error:
            "Please describe the video you want.",
        },
        { status: 400 }
      );
    }

    /*
     * EternalAI currently receives the character image
     * as image_url. The image can be a normal URL or
     * a data URL supplied by the frontend.
     */

    const payload = {
      prompt,

      image_url: imageData,

      model_id: ETERNALAI_MODEL,

      duration: "5",

      aspect_ratio: "16:9",

      resolution: "480p",

      negative_prompt:
        DEFAULT_NEGATIVE_PROMPT,

      cfg_scale: 0.5,
    };

    console.log(
      "================================================="
    );

    console.log(
      "BOMBA VIDEO ENGINE → ETERNAL AI"
    );

    console.log({
      model: ETERNALAI_MODEL,
      mode: cleanString(
        body?.mode,
        "Story"
      ),
      hasImage: Boolean(imageData),
      promptLength: prompt.length,
      duration: "5 seconds",
      resolution: "480p",
      aspectRatio: "16:9",
    });

    console.log(
      "================================================="
    );

    const response = await fetch(
      ETERNALAI_SUBMIT_URL,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${ETERNALAI_API_KEY}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(payload),

        cache: "no-store",
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

    console.log(
      "BOMBA ETERNAL AI RESPONSE:",
      responseText.slice(0, 1500)
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "failed",

          code:
            response.status === 401
              ? "ETERNALAI_AUTH_FAILED"
              : response.status === 429
              ? "ETERNALAI_RATE_LIMIT"
              : "ETERNALAI_REQUEST_FAILED",

          error:
            data?.error ||
            data?.detail ||
            data?.message ||
            `Eternal AI returned HTTP ${response.status}`,

          raw:
            responseText.slice(0, 1000),
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

    /*
     * EternalAI may return the request ID
     * in slightly different locations.
     */

    const requestId =
      data?.result?.request_id ||
      data?.result?.id ||
      data?.request_id ||
      data?.job_id ||
      data?.prediction_id ||
      data?.id;

    if (!requestId) {
      return NextResponse.json(
        {
          status: "failed",

          code:
            "ETERNALAI_REQUEST_ID_MISSING",

          error:
            "Eternal AI accepted the request but did not return a generation ID.",

          raw:
            responseText.slice(0, 1000),
        },

        { status: 502 }
      );
    }

    console.log(
      "BOMBA ETERNAL AI REQUEST ID:",
      requestId
    );

    return NextResponse.json(
      {
        status: "queued",

        provider: "eternalai",

        model: ETERNALAI_MODEL,

        id: requestId,

        jobId: requestId,

        predictionId: requestId,
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
      error
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

      { status: 500 }
    );
  }
}

/* =========================================================
   GET
   CHECK ETERNAL AI VIDEO STATUS
========================================================= */

export async function GET(request) {
  try {
    if (!ETERNALAI_API_KEY) {
      return NextResponse.json(
        {
          status: "failed",

          code:
            "ETERNALAI_API_KEY_MISSING",

          error:
            "ETERNALAI_API_KEY is missing.",
        },

        { status: 500 }
      );
    }

    const { searchParams } =
      new URL(request.url);

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

        { status: 400 }
      );
    }

    const statusUrl =
      `${ETERNALAI_BASE_URL}/api/image-to-video/${encodeURIComponent(
        requestId
      )}/status`;

    console.log(
      "BOMBA ETERNAL AI STATUS CHECK:",
      requestId
    );

    const statusRes =
      await fetch(statusUrl, {
        method: "GET",

        headers: {
          Authorization:
            `Bearer ${ETERNALAI_API_KEY}`,
        },

        cache: "no-store",
      });

    const statusText =
      await statusRes.text();

    const statusData =
      safeParse(statusText);

    console.log(
      "BOMBA ETERNAL AI STATUS HTTP:",
      statusRes.status
    );

    console.log(
      "BOMBA ETERNAL AI STATUS RESPONSE:",
      statusText.slice(0, 1200)
    );

    if (!statusRes.ok) {
      return NextResponse.json(
        {
          status: "failed",

          code:
            "ETERNALAI_STATUS_FAILED",

          error:
            statusData?.error ||
            statusData?.detail ||
            statusData?.message ||
            `Eternal AI status check failed (HTTP ${statusRes.status})`,

          raw:
            statusText.slice(0, 800),

          jobId: requestId,

          id: requestId,
        },

        { status: 502 }
      );
    }

    /*
     * EternalAI may put the actual
     * generation object under result.
     */

    const result =
      statusData?.result ||
      {};

    const generationStatus =
      String(
        result?.status ||
          statusData?.status ||
          result?.state ||
          statusData?.state ||
          ""
      ).toLowerCase();

    const progress =
      result?.progress ??
      statusData?.progress ??
      null;

    /*
     * Search multiple possible locations
     * for the generated video URL.
     */

    const videoUrl =
      result?.video_url ||
      result?.video?.url ||
      result?.output?.video_url ||
      result?.output?.video?.url ||
      result?.output?.url ||
      statusData?.video_url ||
      statusData?.video?.url ||
      statusData?.output?.video_url ||
      statusData?.output?.video?.url ||
      statusData?.output?.url ||
      null;

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

    /* =====================================================
       PROCESSING
    ===================================================== */

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
          status: "processing",

          provider: "eternalai",

          jobId: requestId,

          id: requestId,

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

    /* =====================================================
       FAILED
    ===================================================== */

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
          status: "failed",

          provider: "eternalai",

          jobId: requestId,

          id: requestId,

          error:
            result?.error ||
            result?.message ||
            statusData?.error ||
            statusData?.message ||
            "Eternal AI video generation failed.",
        },

        { status: 502 }
      );
    }

    /* =====================================================
       COMPLETED
    ===================================================== */

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
            status: "failed",

            code:
              "VIDEO_URL_MISSING",

            error:
              "Eternal AI completed the generation but returned no video URL.",

            jobId: requestId,

            id: requestId,

            raw:
              statusText.slice(
                0,
                1000
              ),
          },

          { status: 502 }
        );
      }

      console.log(
        "BOMBA ETERNAL AI VIDEO READY"
      );

      return NextResponse.json(
        {
          status: "completed",

          provider: "eternalai",

          jobId: requestId,

          id: requestId,

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

    /* =====================================================
       FALLBACK:
       VIDEO URL EXISTS
    ===================================================== */

    if (videoUrl) {
      console.log(
        "BOMBA ETERNAL AI VIDEO URL FOUND"
      );

      return NextResponse.json(
        {
          status: "completed",

          provider: "eternalai",

          jobId: requestId,

          id: requestId,

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

    /* =====================================================
       UNKNOWN STATUS
    ===================================================== */

    return NextResponse.json(
      {
        status: "processing",

        provider: "eternalai",

        jobId: requestId,

        id: requestId,

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
      error
    );

    return NextResponse.json(
      {
        status: "failed",

        code:
          "ETERNALAI_STATUS_ERROR",

        error:
          error?.message ||
          "Error while checking Eternal AI video generation.",
      },

      { status: 500 }
    );
  }
}