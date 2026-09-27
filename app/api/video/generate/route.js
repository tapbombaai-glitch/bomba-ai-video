import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel / serverless friendly

const WAN_API_BASE = "https://observantdistressed-wan2-2-i2v-v3.hf.space";
const WAN_CALL_URL = `${WAN_API_BASE}/gradio_api/call/generate_video`;
const WAN_RESULT_BASE = `${WAN_API_BASE}/gradio_api/call/generate_video`;

const DEFAULT_NEGATIVE_PROMPT = `
blurry, distorted face, deformed body, extra fingers, extra limbs,
bad anatomy, low quality, watermark, text, logo, cartoon, anime,
illustration, unrealistic movement, flickering, duplicate person
`.trim();

/* ---------------------------------------------------------
   IMAGE PREPARATION
--------------------------------------------------------- */
function getImageData(image) {
  if (!image || typeof image !== "string") return null;

  return {
    path: null,
    url: image,
    size: null,
    orig_name: "bomba-input-image",
    mime_type: image.startsWith("data:image/")
      ? image.substring(5, image.indexOf(";"))
      : "image/jpeg",
    is_stream: false,
    meta: { _type: "gradio.FileData" },
  };
}

/* ---------------------------------------------------------
   URL HELPERS (FIXED)
--------------------------------------------------------- */
function makeWanFileUrl(value) {
  if (!value || typeof value !== "string") return null;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/file=")) {
    return `\( {WAN_API_BASE} \){value}`;
  }

  if (value.startsWith("file=")) {
    return `\( {WAN_API_BASE}/ \){value}`;
  }

  // Most common Gradio path format
  return `\( {WAN_API_BASE}/gradio_api/file= \){encodeURIComponent(value)}`;
}

/* ---------------------------------------------------------
   VIDEO EXTRACTION
--------------------------------------------------------- */
function extractVideoUrl(value) {
  if (!value) return null;

  if (typeof value === "string") {
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
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
    const keys = [
      "output", "output_1", "output_2", "video", "video_url",
      "videoUrl", "url", "path", "data", "result", "results",
    ];
    for (const key of keys) {
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

    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }

    if (dataLines.length === 0) continue;

    let data = parsePossibleJson(dataLines.join("\n"));
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
    return text.length > 3500 ? text.slice(0, 3500) + "...[truncated]" : text;
  } catch {
    return String(data);
  }
}

/* ---------------------------------------------------------
   OPTIONAL: Download video as data URL
   (Only use if you really need a permanent URL right now)
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
        `Could not download video (HTTP ${response.status}). Temporary file may have expired.`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Stay under typical serverless response limits
    if (buffer.length > 3.5 * 1024 * 1024) {
      throw new Error(
        "Generated video is too large to return as data URL. Use a shorter duration."
      );
    }

    const contentType = response.headers.get("content-type") || "video/mp4";
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

Use realistic movement, natural facial expressions, realistic body movement,
realistic lighting, and believable physical motion.
Use cinematic camera movement where appropriate.
Keep the subject visually consistent with the input image.

The result should look like real recorded video.
Do not change the person's identity.
Do not turn the image into cartoon, anime, illustration, or 3D cartoon style.
`.trim();

    // Order must match the Space's generate_video schema
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

    console.log("BOMBA WAN 2.2 REQUEST:", {
      mode,
      duration: 4,
      steps: 6,
      hasImage: true,
    });

    const response = await fetch(WAN_CALL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
        errorMessage = errorData?.error || errorData?.message || errorMessage;
      } catch {
        if (responseText) errorMessage = responseText.substring(0, 800);
      }

      return NextResponse.json(
        { success: false, status: "failed", error: errorMessage },
        { status: response.status || 500 }
      );
    }

    let result = null;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = null;
    }

    const eventId = result?.event_id || result?.eventId || null;

    if (!eventId) {
      console.error("WAN 2.2 NO EVENT ID:", responseText);
      return NextResponse.json(
        {
          success: false,
          status: "failed",
          error: "Wan 2.2 accepted the request but returned no generation ID.",
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
      message: "Wan 2.2 video generation started. This can take 3–8 minutes on the public Space.",
    });
  } catch (error) {
    console.error("BOMBA WAN 2.2 POST ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        status: "failed",
        error: error?.message || "Unexpected error while starting video generation.",
      },
      { status: 500 }
    );
  }
}

/* ---------------------------------------------------------
   GET — CHECK STATUS
--------------------------------------------------------- */
export async function GET(request) {
  const requestUrl = new URL(request.url);
  const eventId =
    requestUrl.searchParams.get("predictionId") ||
    requestUrl.searchParams.get("jobId");

  if (!eventId) {
    return NextResponse.json(
      { success: false, status: "failed", error: "predictionId or jobId is required." },
      { status: 400 }
    );
  }

  console.log("WAN 2.2 STATUS CHECK:", eventId);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 28000);

    let response;
    try {
      response = await fetch(
        `\( {WAN_RESULT_BASE}/ \){encodeURIComponent(eventId)}`,
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

    // Non-OK → keep polling (Space may still be waking / queued)
    if (!response.ok) {
      const errorText = await response.text();
      console.error("WAN 2.2 STATUS ERROR:", response.status, errorText);

      return NextResponse.json({
        success: true,
        status: "running",
        videoUrl: null,
        predictionId: eventId,
        message: "Wan 2.2 is still processing (or waking up). Please keep waiting.",
      });
    }

    const text = await response.text();
    const events = parseSSE(text);

    console.log(
      "WAN 2.2 EVENTS:",
      events.map((e) => e.event),
      eventId
    );

    // Newest events first
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      const eventName = String(event.event || "").toLowerCase();

      // ---------- COMPLETE ----------
      if (eventName === "complete" || eventName === "completed") {
        console.log("WAN 2.2 COMPLETE:", safeLogData(event.data));

        let videoUrl = findVideoInResult(event.data);
        if (!videoUrl) {
          const parsed = parsePossibleJson(event.data);
          videoUrl = findVideoInResult(parsed);
        }

        if (!videoUrl) {
          console.error("WAN 2.2 COMPLETE BUT NO VIDEO:", safeLogData(event.data));
          return NextResponse.json(
            {
              success: false,
              status: "failed",
              predictionId: eventId,
              error: "Wan 2.2 finished but returned no video file.",
            },
            { status: 500 }
          );
        }

        console.log("WAN 2.2 VIDEO READY (temp URL):", videoUrl);

        // Option A (recommended for now): return the temporary HF URL
        // The frontend can play it directly. It may expire after some time.
        return NextResponse.json({
          success: true,
          status: "succeeded",
          videoUrl,                       // temporary HF URL
          predictionId: eventId,
          message: "Video is ready.",
        });

        // Option B (if you really need a permanent data URL):
        // try {
        //   const permanent = await downloadVideoAsDataUrl(videoUrl);
        //   return NextResponse.json({
        //     success: true,
        //     status: "succeeded",
        //     videoUrl: permanent,
        //     predictionId: eventId,
        //     message: "Video is ready.",
        //   });
        // } catch (dlError) {
        //   console.error("Download failed:", dlError);
        //   return NextResponse.json(
        //     {
        //       success: false,
        //       status: "failed",
        //       predictionId: eventId,
        //       error: dlError?.message || "Video generated but could not be downloaded.",
        //     },
        //     { status: 500 }
        //   );
        // }
      }

      // ---------- ERROR ----------
      if (eventName === "error") {
        console.error("WAN 2.2 ERROR EVENT:", safeLogData(event.data));

        // Empty error → treat as still running
        if (
          event.data === null ||
          event.data === undefined ||
          event.data === "" ||
          (typeof event.data === "object" && Object.keys(event.data).length === 0)
        ) {
          return NextResponse.json({
            success: true,
            status: "running",
            videoUrl: null,
            predictionId: eventId,
            message: "Wan 2.2 is still generating your video.",
          });
        }

        let errorMessage = "Wan 2.2 video generation failed.";
        if (typeof event.data === "string") errorMessage = event.data;
        else if (event.data && typeof event.data === "object") {
          errorMessage = event.data.error || event.data.message || errorMessage;
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

    // Still running / generating / heartbeat
    return NextResponse.json({
      success: true,
      status: "running",
      videoUrl: null,
      predictionId: eventId,
      message: "Wan 2.2 is still generating your video. This can take several minutes.",
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      console.log("WAN 2.2 STATUS TIMEOUT — still running:", eventId);
      return NextResponse.json({
        success: true,
        status: "running",
        videoUrl: null,
        predictionId: eventId,
        message: "Wan 2.2 is still generating your video.",
      });
    }

    console.error("BOMBA WAN 2.2 GET ERROR:", error);

    // Soft-fail so the frontend keeps polling
    return NextResponse.json({
      success: true,
      status: "running",
      videoUrl: null,
      predictionId: eventId,
      message: "Wan 2.2 is still generating your video.",
    });
  }
}