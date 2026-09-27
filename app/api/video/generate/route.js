import { NextResponse } from "next/server";

export const runtime = "nodejs";

const WAN_API_BASE =
  "https://observantdistressed-wan2-2-i2v-v3.hf.space";

const WAN_CALL_URL =
  `${WAN_API_BASE}/gradio_api/call/generate_video`;

const WAN_RESULT_URL =
  `${WAN_API_BASE}/gradio_api/call/generate_video`;

const DEFAULT_NEGATIVE_PROMPT = `
blurry, distorted face, deformed body, extra fingers, extra limbs,
bad anatomy, low quality, watermark, text, logo, cartoon, anime,
illustration, unrealistic movement, flickering, duplicate person
`.trim();

/* ---------------------------------------------------------
   IMAGE PREPARATION
--------------------------------------------------------- */

function getImageData(image) {
  if (!image || typeof image !== "string") {
    return null;
  }

  return {
    path: null,
    url: image,
    size: null,
    orig_name: "bomba-input-image",
    mime_type: image.startsWith("data:image/")
      ? image.substring(5, image.indexOf(";"))
      : "image/jpeg",
    is_stream: false,
    meta: {
      _type: "gradio.FileData",
    },
  };
}

/* ---------------------------------------------------------
   URL HELPERS
--------------------------------------------------------- */

function makeWanFileUrl(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/file=")) {
    return `\( {WAN_API_BASE} \){value}`;
  }

  if (value.startsWith("file=")) {
    return `\( {WAN_API_BASE}/ \){value}`;
  }

  return `\( {WAN_API_BASE}/gradio_api/file= \){encodeURIComponent(value)}`;
}

/* ---------------------------------------------------------
   VIDEO EXTRACTION
--------------------------------------------------------- */

function extractVideoUrl(value) {
  if (!value) return null;

  if (typeof value === "string") {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }

    if (value.startsWith("/file=") || value.startsWith("file=")) {
      return makeWanFileUrl(value);
    }

    return null;
  }

  if (typeof value === "object") {
    if (value.url) {
      const url = makeWanFileUrl(value.url);
      if (url) return url;
    }

    if (value.path) {
      const url = makeWanFileUrl(value.path);
      if (url) return url;
    }

    if (value.data) {
      const nested = extractVideoUrl(value.data);
      if (nested) return nested;
    }
  }

  return null;
}

function findVideoInResult(result) {
  if (!result) return null;

  const direct = extractVideoUrl(result);
  if (direct) return direct;

  if (Array.isArray(result)) {
    for (const item of result) {
      const found = findVideoInResult(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof result === "object") {
    const possibleKeys = [
      "output",
      "output_1",
      "output_2",
      "video",
      "video_url",
      "videoUrl",
      "url",
      "path",
      "data",
      "result",
      "results",
    ];

    for (const key of possibleKeys) {
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        const found = findVideoInResult(result[key]);
        if (found) return found;
      }
    }
  }

  return null;
}

/* ---------------------------------------------------------
   JSON + SSE HELPERS
--------------------------------------------------------- */

function parsePossibleJson(value) {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function parseSSE(text) {
  const events = [];

  if (!text || typeof text !== "string") return events;

  const blocks = text.split(/\r?\n\r?\n/);

  for (const block of blocks) {
    if (!block.trim()) continue;

    let eventName = "";
    const dataLines = [];
    const lines = block.split(/\r?\n/);

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventName = line.substring(6).trim();
      }
      if (line.startsWith("data:")) {
        dataLines.push(line.substring(5).trim());
      }
    }

    if (dataLines.length === 0) continue;

    const dataText = dataLines.join("\n");
    let data = parsePossibleJson(dataText);

    if (typeof data === "string") {
      const second = parsePossibleJson(data);
      if (second !== data) data = second;
    }

    events.push({ event: eventName, data });
  }

  return events;
}

function safeLogData(data) {
  try {
    const text = JSON.stringify(data);
    if (text.length > 4000) {
      return text.substring(0, 4000) + "...[truncated]";
    }
    return text;
  } catch {
    return String(data);
  }
}

/* ---------------------------------------------------------
   DOWNLOAD VIDEO AND CONVERT TO DATA URL
   This is the fix for the 404 problem.
--------------------------------------------------------- */

async function downloadVideoAsDataUrl(videoUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(videoUrl, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Could not download video from Hugging Face (HTTP ${response.status}). The temporary file may have expired.`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Safety limit for Vercel response size (\~4MB safe zone)
    if (buffer.length > 3.8 * 1024 * 1024) {
      throw new Error(
        "Generated video is too large to return directly. Please try a shorter duration or lower quality."
      );
    }

    const contentType =
      response.headers.get("content-type") || "video/mp4";

    const base64 = buffer.toString("base64");
    return `data:\( {contentType};base64, \){base64}`;
  } finally {
    clearTimeout(timeout);
  }
}

/* ---------------------------------------------------------
   POST — START GENERATION
--------------------------------------------------------- */

export async function POST(request) {
  try {
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

    if (!characterImage) {
      return NextResponse.json(
        { error: "Please upload a picture first." },
        { status: 400 }
      );
    }

    const imageData = getImageData(characterImage);

    if (!imageData) {
      return NextResponse.json(
        { error: "The uploaded image could not be prepared." },
        { status: 400 }
      );
    }

    const finalPrompt = `
Create a realistic live-action video from the supplied image.

Mode: ${mode}

Scene description:
${prompt}

Animate the person, character, object, and environment naturally
while preserving the identity and appearance of the supplied image.

Use realistic movement.
Use natural facial expressions.
Use realistic body movement.
Use realistic lighting.
Use believable physical motion.
Use cinematic camera movement where appropriate.
Keep the subject visually consistent with the input image.

The result should look like real recorded video.

Do not change the person's identity unnecessarily.
Do not turn the image into a cartoon.
Do not use anime style.
Do not use illustration style.
Do not use 3D cartoon style.
`.trim();

    // Exact order from the Wan Space schema
    const data = [
      imageData,               // 1 input_image
      imageData,               // 2 last_image
      finalPrompt,             // 3 prompt
      6,                       // 4 steps
      DEFAULT_NEGATIVE_PROMPT, // 5 negative_prompt
      4,                       // 6 duration_seconds
      1,                       // 7 guidance_scale
      1,                       // 8 guidance_scale_2
      0,                       // 9 seed
      true,                    // 10 randomize_seed
      6,                       // 11 quality
      "UniPCMultistep",        // 12 scheduler
      3,                       // 13 flow_shift
      16,                      // 14 frame_multiplier
      true,                    // 15 safe_mode
      [],                      // 16 lora_groups
      false,                   // 17 auto_lora_enabled
      true,                    // 18 video_component
    ];

    console.log(
      "BOMBA WAN 2.2 REQUEST:",
      JSON.stringify({
        mode,
        duration: 4,
        steps: 6,
        quality: 6,
        hasImage: true,
      })
    );

    const response = await fetch(WAN_CALL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data }),
      cache: "no-store",
    });

    const responseText = await response.text();

    console.log("WAN 2.2 CREATE STATUS:", response.status);

    if (!response.ok) {
      console.error("WAN 2.2 CREATE ERROR:", responseText);

      let errorMessage = "Wan 2.2 could not start the video.";

      try {
        const errorData = JSON.parse(responseText);
        errorMessage =
          errorData?.error || errorData?.message || errorMessage;
      } catch {
        if (responseText) {
          errorMessage = responseText.substring(0, 1000);
        }
      }

      return NextResponse.json(
        {
          success: false,
          status: "failed",
          error: errorMessage,
        },
        { status: response.status || 500 }
      );
    }

    let result = null;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = null;
    }

    console.log("WAN 2.2 CREATE RESPONSE:", safeLogData(result));

    const eventId = result?.event_id || result?.eventId || null;

    if (!eventId) {
      console.error("WAN 2.2 NO EVENT ID:", responseText);

      return NextResponse.json(
        {
          success: false,
          status: "failed",
          error:
            "Wan 2.2 accepted the request but returned no generation ID.",
        },
        { status: 500 }
      );
    }

    console.log("WAN 2.2 EVENT CREATED:", eventId);

    return NextResponse.json({
      success: true,
      status: "queued",
      jobId: eventId,
      predictionId: eventId,
      message: "Wan 2.2 video generation started.",
    });
  } catch (error) {
    console.error("BOMBA WAN 2.2 POST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        status: "failed",
        error:
          error?.message ||
          "Unexpected error while starting Wan 2.2 video generation.",
      },
      { status: 500 }
    );
  }
}

/* ---------------------------------------------------------
   GET — CHECK STATUS + DOWNLOAD VIDEO WHEN READY
--------------------------------------------------------- */

export async function GET(request) {
  const requestUrl = new URL(request.url);

  const eventId =
    requestUrl.searchParams.get("predictionId") ||
    requestUrl.searchParams.get("jobId");

  if (!eventId) {
    return NextResponse.json(
      {
        success: false,
        status: "failed",
        error: "predictionId or jobId is required.",
      },
      { status: 400 }
    );
  }

  console.log("WAN 2.2 STATUS CHECK:", eventId);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    let response;

    try {
      response = await fetch(
        `\( {WAN_RESULT_URL}/ \){encodeURIComponent(eventId)}`,
        {
          method: "GET",
          headers: {
            Accept: "text/event-stream",
            "Cache-Control": "no-cache",
          },
          signal: controller.signal,
          cache: "no-store",
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    console.log("WAN 2.2 STATUS HTTP:", response.status, eventId);

    // Any non-OK from HF → keep polling (do not fail hard)
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "WAN 2.2 STATUS ERROR:",
        response.status,
        errorText
      );

      return NextResponse.json({
        success: true,
        status: "running",
        videoUrl: null,
        predictionId: eventId,
        message: "Wan 2.2 is still processing the video.",
      });
    }

    const text = await response.text();

    console.log(
      "WAN 2.2 SSE RESPONSE LENGTH:",
      text.length,
      eventId
    );

    const events = parseSSE(text);

    console.log(
      "WAN 2.2 EVENTS FOUND:",
      events.map((e) => e.event),
      eventId
    );

    // Newest events first
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      const eventName = String(event.event || "").toLowerCase();

      /* ---------- COMPLETE ---------- */
      if (eventName === "complete" || eventName === "completed") {
        console.log(
          "WAN 2.2 COMPLETE EVENT:",
          safeLogData(event.data)
        );

        let videoUrl = findVideoInResult(event.data);

        if (!videoUrl) {
          const parsedData = parsePossibleJson(event.data);
          videoUrl = findVideoInResult(parsedData);
        }

        if (!videoUrl) {
          console.error(
            "WAN 2.2 COMPLETE BUT NO VIDEO:",
            safeLogData(event.data)
          );

          return NextResponse.json(
            {
              success: false,
              status: "failed",
              predictionId: eventId,
              error:
                "Wan 2.2 completed, but no video file was returned.",
            },
            { status: 500 }
          );
        }

        console.log("WAN 2.2 VIDEO READY (temporary):", videoUrl);

        // === THE FIX FOR 404 ===
        // Download the video immediately and return a data URL
        try {
          const permanentVideoUrl =
            await downloadVideoAsDataUrl(videoUrl);

          console.log(
            "WAN 2.2 VIDEO DOWNLOADED AS DATA URL, length:",
            permanentVideoUrl.length
          );

          return NextResponse.json({
            success: true,
            status: "succeeded",
            videoUrl: permanentVideoUrl,
            predictionId: eventId,
            message: "Wan 2.2 video is ready.",
          });
        } catch (downloadError) {
          console.error(
            "WAN 2.2 VIDEO DOWNLOAD FAILED:",
            downloadError
          );

          return NextResponse.json(
            {
              success: false,
              status: "failed",
              predictionId: eventId,
              error:
                downloadError?.message ||
                "Video was generated but could not be downloaded before it expired. Please try again.",
            },
            { status: 500 }
          );
        }
      }

      /* ---------- ERROR ---------- */
      if (eventName === "error") {
        console.error(
          "WAN 2.2 GENERATION ERROR EVENT:",
          safeLogData(event.data)
        );

        // Empty / null error → treat as still running
        if (
          event.data === null ||
          event.data === undefined ||
          event.data === "" ||
          (typeof event.data === "object" &&
            Object.keys(event.data).length === 0)
        ) {
          console.log(
            "WAN 2.2 NULL ERROR — TREATING AS STILL RUNNING:",
            eventId
          );

          return NextResponse.json({
            success: true,
            status: "running",
            videoUrl: null,
            predictionId: eventId,
            message: "Wan 2.2 is still generating your video.",
          });
        }

        let errorMessage = "Wan 2.2 video generation failed.";

        if (typeof event.data === "string") {
          errorMessage = event.data;
        } else if (event.data && typeof event.data === "object") {
          errorMessage =
            event.data.error ||
            event.data.message ||
            errorMessage;
        }

        return NextResponse.json(
          {
            success: false,
            status: "failed",
            predictionId: eventId,
            error: errorMessage,
          },
          { status: 500 }
        );
      }
    }

    // No complete/error yet
    return NextResponse.json({
      success: true,
      status: "running",
      videoUrl: null,
      predictionId: eventId,
      message: "Wan 2.2 is still generating your video.",
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      console.log(
        "WAN 2.2 STATUS TIMEOUT — STILL RUNNING:",
        eventId
      );

      return NextResponse.json({
        success: true,
        status: "running",
        videoUrl: null,
        predictionId: eventId,
        message: "Wan 2.2 is still generating your video.",
      });
    }

    console.error("BOMBA WAN 2.2 GET ERROR:", error);

    // Soft-fail most unexpected errors so frontend keeps polling
    return NextResponse.json({
      success: true,
      status: "running",
      videoUrl: null,
      predictionId: eventId,
      message: "Wan 2.2 is still generating your video.",
    });
  }
}