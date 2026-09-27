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

function getImageData(image) {
  if (!image || typeof image !== "string") {
    return null;
  }

  /*
   * The Wan Space accepts a public URL or a base64 encoded image
   * in the FileData "url" field.
   *
   * BOMBA's existing frontend sends the uploaded image as a data URL,
   * so we pass that directly.
   */
  return {
    path: null,
    url: image,
    size: null,
    orig_name: "bomba-input-image",
    mime_type: image.startsWith("data:image/")
      ? image.substring(
          5,
          image.indexOf(";")
        )
      : "image/jpeg",
    is_stream: false,
    meta: {
      _type: "gradio.FileData",
    },
  };
}

function extractVideoUrl(value) {
  if (!value) {
    return null;
  }

  // Direct string URL
  if (typeof value === "string") {
    if (
      value.startsWith("http://") ||
      value.startsWith("https://")
    ) {
      return value;
    }

    return null;
  }

  // Gradio FileData object
  if (typeof value === "object") {
    if (value.url) {
      return value.url;
    }

    if (value.path) {
      if (
        value.path.startsWith("http://") ||
        value.path.startsWith("https://")
      ) {
        return value.path;
      }

      /*
       * Gradio normally exposes generated files through
       * /gradio_api/file=...
       */
      return `${WAN_API_BASE}/gradio_api/file=${encodeURIComponent(
        value.path
      )}`;
    }
  }

  return null;
}

function findVideoInResult(result) {
  if (!result) {
    return null;
  }

  // Direct result
  const direct = extractVideoUrl(result);

  if (direct) {
    return direct;
  }

  // Array result
  if (Array.isArray(result)) {
    for (const item of result) {
      const found = findVideoInResult(item);

      if (found) {
        return found;
      }
    }
  }

  // Object result
  if (typeof result === "object") {
    for (const key of [
      "output",
      "output_1",
      "output_2",
      "video",
      "video_url",
      "url",
      "path",
    ]) {
      if (result[key]) {
        const found = findVideoInResult(
          result[key]
        );

        if (found) {
          return found;
        }
      }
    }
  }

  return null;
}

function parseSSE(text) {
  const events = [];

  const blocks = text.split("\n\n");

  for (const block of blocks) {
    if (!block.trim()) {
      continue;
    }

    let eventName = "";
    let dataText = "";

    const lines = block.split("\n");

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventName = line
          .substring(6)
          .trim();
      }

      if (line.startsWith("data:")) {
        dataText += line
          .substring(5)
          .trim();
      }
    }

    if (!dataText) {
      continue;
    }

    let data = dataText;

    try {
      data = JSON.parse(dataText);
    } catch {
      // Keep as string if it is not JSON.
    }

    events.push({
      event: eventName,
      data,
    });
  }

  return events;
}

export async function POST(request) {
  try {
    const body = await request.json();

    const mode =
      body?.mode || "Movie";

    const prompt =
      body?.prompt?.trim();

    const characterImage =
      body?.characterImage || null;

    if (!prompt) {
      return NextResponse.json(
        {
          error:
            "Please describe your video first.",
        },
        { status: 400 }
      );
    }

    if (!characterImage) {
      return NextResponse.json(
        {
          error:
            "Please upload a picture first.",
        },
        { status: 400 }
      );
    }

    const imageData =
      getImageData(characterImage);

    if (!imageData) {
      return NextResponse.json(
        {
          error:
            "The uploaded image could not be prepared.",
        },
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

    /*
     * IMPORTANT:
     *
     * The order here exactly follows the OpenAPI schema supplied
     * for generate_video.
     */
    const data = [
      imageData,              // input_image
      imageData,              // last_image
      finalPrompt,            // prompt
      8,                      // steps
      DEFAULT_NEGATIVE_PROMPT,// negative_prompt
      5,                      // duration_seconds
      5,                      // guidance_scale
      5,                      // guidance_scale_2
      0,                      // seed
      true,                   // randomize_seed
      8,                      // quality
      "FlowMatchEulerDiscrete",// scheduler
      3,                      // flow_shift
      64,                     // frame_multiplier
      true,                   // safe_mode
      [],                     // lora_groups
      false,                  // auto_lora_enabled
      true,                   // video_component
    ];

    console.log(
      "BOMBA WAN 2.2 REQUEST:",
      JSON.stringify({
        mode,
        duration: 5,
        steps: 8,
        safeMode: true,
        hasImage: true,
      })
    );

    const response = await fetch(
      WAN_CALL_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          data,
        }),
        cache: "no-store",
      }
    );

    const responseText =
      await response.text();

    if (!response.ok) {
      console.error(
        "WAN 2.2 CREATE ERROR:",
        responseText
      );

      let errorMessage =
        "Wan 2.2 could not start the video.";

      try {
        const errorData =
          JSON.parse(responseText);

        errorMessage =
          errorData?.error ||
          errorData?.message ||
          errorMessage;
      } catch {
        if (responseText) {
          errorMessage =
            responseText.slice(0, 500);
        }
      }

      return NextResponse.json(
        {
          error: errorMessage,
        },
        {
          status:
            response.status || 500,
        }
      );
    }

    let result;

    try {
      result =
        JSON.parse(responseText);
    } catch {
      result = null;
    }

    /*
     * Gradio normally returns:
     *
     * {
     *   "event_id": "..."
     * }
     *
     * for a queued call.
     */
    const eventId =
      result?.event_id ||
      result?.eventId ||
      null;

    if (!eventId) {
      console.error(
        "WAN 2.2 NO EVENT ID:",
        responseText
      );

      return NextResponse.json(
        {
          error:
            "Wan 2.2 accepted the request but returned no generation ID.",
        },
        { status: 500 }
      );
    }

    console.log(
      "WAN 2.2 EVENT CREATED:",
      eventId
    );

    return NextResponse.json({
      success: true,
      status: "queued",
      jobId: eventId,
      predictionId: eventId,
      message:
        "Wan 2.2 video generation started.",
    });
  } catch (error) {
    console.error(
      "BOMBA WAN 2.2 POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unexpected error while starting Wan 2.2 video generation.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } =
      new URL(request.url);

    const eventId =
      searchParams.get(
        "predictionId"
      ) ||
      searchParams.get("jobId");

    if (!eventId) {
      return NextResponse.json(
        {
          error:
            "predictionId or jobId is required.",
        },
        { status: 400 }
      );
    }

    /*
     * Gradio uses an SSE result stream for queued
     * API calls.
     *
     * We give each status check a limited amount
     * of time so the Vercel function does not sit
     * forever waiting for the GPU.
     */
    const controller =
      new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 8000);

    let response;

    try {
      response = await fetch(
        `${WAN_RESULT_URL}/${encodeURIComponent(
          eventId
        )}`,
        {
          method: "GET",
          headers: {
            Accept:
              "text/event-stream",
          },
          signal:
            controller.signal,
          cache: "no-store",
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "WAN 2.2 STATUS ERROR:",
        errorText
      );

      return NextResponse.json({
        success: true,
        status: "running",
        videoUrl: null,
        predictionId: eventId,
        message:
          "Wan 2.2 is still processing the video.",
      });
    }

    const text =
      await response.text();

    const events =
      parseSSE(text);

    /*
     * Look from the newest event backwards
     * for a completed video.
     */
    for (
      let i = events.length - 1;
      i >= 0;
      i--
    ) {
      const event =
        events[i];

      if (
        event.event ===
          "complete" ||
        event.event ===
          "completed"
      ) {
        const videoUrl =
          findVideoInResult(
            event.data
          );

        if (videoUrl) {
          console.log(
            "WAN 2.2 VIDEO READY:",
            videoUrl
          );

          return NextResponse.json({
            success: true,
            status: "succeeded",
            videoUrl,
            predictionId:
              eventId,
          });
        }

        console.error(
          "WAN 2.2 COMPLETE BUT NO VIDEO:",
          JSON.stringify(
            event.data
          )
        );

        return NextResponse.json(
          {
            success: false,
            status: "failed",
            predictionId:
              eventId,
            error:
              "Wan 2.2 finished but did not return a video file.",
          },
          { status: 500 }
        );
      }

      if (
        event.event ===
          "error"
      ) {
        return NextResponse.json(
          {
            success: false,
            status: "failed",
            predictionId:
              eventId,
            error:
              typeof event.data ===
              "string"
                ? event.data
                : "Wan 2.2 video generation failed.",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      status: "running",
      videoUrl: null,
      predictionId:
        eventId,
      message:
        "Wan 2.2 is still generating your video.",
    });
  } catch (error) {
    /*
     * An AbortError here simply means the GPU has
     * not finished before our short status window.
     * The frontend can poll again.
     */
    if (
      error?.name ===
      "AbortError"
    ) {
      return NextResponse.json({
        success: true,
        status: "running",
        videoUrl: null,
        predictionId:
          new URL(request.url)
            .searchParams.get(
              "predictionId"
            ),
        message:
          "Wan 2.2 is still generating your video.",
      });
    }

    console.error(
      "BOMBA WAN 2.2 GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unexpected error while checking Wan 2.2 video status.",
      },
      { status: 500 }
    );
  }
}