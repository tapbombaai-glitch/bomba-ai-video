import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const WAN_API_BASE =
  "https://observantdistressed-wan2-2-i2v-v3.hf.space";

const WAN_CALL_URL =
  `${WAN_API_BASE}/gradio_api/call/generate_video`;

const WAN_RESULT_BASE =
  `${WAN_API_BASE}/gradio_api/call/generate_video`;

const DEFAULT_NEGATIVE_PROMPT = `
blurry, distorted face, deformed body, extra fingers, extra limbs,
bad anatomy, low quality, watermark, text, logo, cartoon, anime,
illustration, unrealistic movement, flickering, duplicate person
`.trim();

function getImageData(image) {
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

function makeWanFileUrl(value) {
  if (!value) return null;

  if (typeof value !== "string") return null;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/file=")) {
    return `${WAN_API_BASE}${value}`;
  }

  if (value.startsWith("file=")) {
    return `${WAN_API_BASE}/${value}`;
  }

  return `${WAN_API_BASE}/gradio_api/file=${encodeURIComponent(value)}`;
}

function extractVideoUrl(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const lower = value.toLowerCase();

    if (
      lower.includes(".mp4") ||
      lower.includes("video") ||
      lower.includes("/file=") ||
      lower.includes("gradio_api/file")
    ) {
      return makeWanFileUrl(value);
    }

    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractVideoUrl(item);
      if (found) return found;
    }

    return null;
  }

  if (typeof value === "object") {
    const priorityKeys = [
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

    for (const key of priorityKeys) {
      if (value[key]) {
        const found = extractVideoUrl(value[key]);
        if (found) return found;
      }
    }

    for (const key of Object.keys(value)) {
      const found = extractVideoUrl(value[key]);
      if (found) return found;
    }
  }

  return null;
}

function parsePossibleJson(value) {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();

  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function parseSSE(text) {
  const events = [];

  const blocks = text.split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split("\n");

    let event = null;
    let data = "";

    for (const line of lines) {
      if (line.startsWith("event:")) {
        event = line.substring(6).trim();
      }

      if (line.startsWith("data:")) {
        data += line.substring(5).trim();
      }
    }

    if (event || data) {
      events.push({
        event,
        data: parsePossibleJson(data),
      });
    }
  }

  return events;
}

function safeLogData(value) {
  try {
    const text = JSON.stringify(value);

    if (text.length > 3000) {
      return text.substring(0, 3000) + "...";
    }

    return text;
  } catch {
    return String(value);
  }
}

async function proxyVideo(requestUrl) {
  const encodedVideoUrl =
    requestUrl.searchParams.get("videoUrl");

  if (!encodedVideoUrl) {
    return null;
  }

  let videoUrl;

  try {
    videoUrl = decodeURIComponent(encodedVideoUrl);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid video URL.",
      },
      { status: 400 }
    );
  }

  let remoteUrl;

  try {
    remoteUrl = new URL(videoUrl);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid video URL.",
      },
      { status: 400 }
    );
  }

  const allowedHost =
    "observantdistressed-wan2-2-i2v-v3.hf.space";

  if (remoteUrl.hostname !== allowedHost) {
    return NextResponse.json(
      {
        success: false,
        error: "Video source is not allowed.",
      },
      { status: 403 }
    );
  }

  console.log(
    "BOMBA VIDEO PROXY:",
    remoteUrl.toString()
  );

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 50000);

  try {
    const response = await fetch(
      remoteUrl.toString(),
      {
        method: "GET",
        headers: {
          Accept: "video/mp4,video/*,*/*",
        },
        signal: controller.signal,
      }
    );

    console.log(
      "BOMBA VIDEO PROXY STATUS:",
      response.status,
      response.headers.get("content-type"),
      response.headers.get("content-length")
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "BOMBA VIDEO PROXY ERROR:",
        errorText.substring(0, 1000)
      );

      return NextResponse.json(
        {
          success: false,
          error: `Unable to retrieve generated video. Status ${response.status}.`,
        },
        { status: 502 }
      );
    }

    const headers = new Headers();

    headers.set(
      "Content-Type",
      response.headers.get("content-type") ||
        "video/mp4"
    );

    headers.set(
      "Cache-Control",
      "public, max-age=3600"
    );

    headers.set(
      "Accept-Ranges",
      "bytes"
    );

    const contentLength =
      response.headers.get("content-length");

    if (contentLength) {
      headers.set(
        "Content-Length",
        contentLength
      );
    }

    return new Response(
      response.body,
      {
        status: 200,
        headers,
      }
    );
  } catch (error) {
    console.error(
      "BOMBA VIDEO PROXY FETCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "BOMBA could not retrieve the generated video.",
      },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      mode,
      prompt,
      characterImage,
    } = body || {};

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a video prompt.",
        },
        { status: 400 }
      );
    }

    if (!characterImage) {
      return NextResponse.json(
        {
          success: false,
          error: "Please upload a character image.",
        },
        { status: 400 }
      );
    }

    const finalPrompt = `
Create a realistic live-action video from the supplied image.

Mode: ${mode || "Movie"}

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
Do not use cartoon style.
Do not use anime style.
Do not use illustration style.
Do not use 3D cartoon style.
`.trim();

    const imageData =
      getImageData(characterImage);

    const data = [
      imageData,
      imageData,
      finalPrompt,
      6,
      DEFAULT_NEGATIVE_PROMPT,
      4,
      1,
      1,
      0,
      true,
      6,
      "UniPCMultistep",
      3,
      16,
      true,
      [],
      false,
      true,
    ];

    console.log(
      "BOMBA WAN 2.2 STARTING"
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
      }
    );

    const responseText =
      await response.text();

    if (!response.ok) {
      console.error(
        "BOMBA WAN START ERROR:",
        response.status,
        responseText.substring(0, 3000)
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Wan 2.2 could not start the video generation.",
        },
        { status: 502 }
      );
    }

    let result;

    try {
      result =
        JSON.parse(responseText);
    } catch {
      console.error(
        "BOMBA WAN INVALID START RESPONSE:",
        responseText.substring(0, 3000)
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Wan 2.2 returned an unexpected response.",
        },
        { status: 502 }
      );
    }

    console.log(
      "BOMBA WAN START RESPONSE:",
      safeLogData(result)
    );

    const eventId =
      result?.event_id ||
      result?.eventId ||
      result?.id;

    if (!eventId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Wan 2.2 did not return a generation ID.",
        },
        { status: 502 }
      );
    }

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
      "BOMBA WAN POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to start video generation.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const requestUrl =
    new URL(request.url);

  /*
   * VIDEO PROXY
   *
   * Browser requests:
   *
   * /api/video/generate?videoUrl=...
   *
   * BOMBA downloads the temporary Hugging Face
   * video and streams it back to the browser.
   */
  if (
    requestUrl.searchParams.has(
      "videoUrl"
    )
  ) {
    return proxyVideo(requestUrl);
  }

  const eventId =
    requestUrl.searchParams.get(
      "predictionId"
    ) ||
    requestUrl.searchParams.get(
      "jobId"
    );

  if (!eventId) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Missing predictionId or jobId.",
      },
      { status: 400 }
    );
  }

  const resultUrl =
    `${WAN_RESULT_BASE}/${encodeURIComponent(
      eventId
    )}`;

  console.log(
    "BOMBA WAN 2.2 STATUS CHECK:",
    eventId
  );

  try {
    const response = await fetch(
      resultUrl,
      {
        method: "GET",
        headers: {
          Accept:
            "text/event-stream",
        },
        cache: "no-store",
      }
    );

    const text =
      await response.text();

    if (!response.ok) {
      console.error(
        "BOMBA WAN STATUS ERROR:",
        response.status,
        text.substring(0, 3000)
      );

      return NextResponse.json(
        {
          success: false,
          status: "error",
          error:
            "Unable to check Wan 2.2 generation status.",
        },
        { status: 502 }
      );
    }

    const events =
      parseSSE(text);

    let latestStatus =
      "processing";

    let videoUrl = null;

    let rawCompleteData =
      null;

    for (const item of events) {
      const eventName =
        item.event || "";

      const data =
        item.data;

      if (
        eventName === "generating" ||
        eventName === "pending"
      ) {
        latestStatus =
          "processing";
      }

      if (
        eventName === "complete"
      ) {
        latestStatus =
          "succeeded";

        rawCompleteData =
          data;

        videoUrl =
          extractVideoUrl(data);
      }

      if (
        eventName === "error"
      ) {
        latestStatus =
          "failed";

        console.error(
          "BOMBA WAN GENERATION ERROR:",
          safeLogData(data)
        );
      }
    }

    /*
     * Some Gradio responses may contain the
     * result without using exactly the expected
     * event name, so search the complete payload
     * as a fallback.
     */
    if (
      !videoUrl &&
      rawCompleteData
    ) {
      videoUrl =
        extractVideoUrl(
          rawCompleteData
        );
    }

    if (
      latestStatus ===
        "succeeded" &&
      videoUrl
    ) {
      console.log(
        "WAN 2.2 ORIGINAL VIDEO:",
        videoUrl
      );

      /*
       * IMPORTANT:
       *
       * Do NOT send the temporary Hugging Face
       * URL directly to the browser.
       *
       * Send the browser through BOMBA's proxy.
       */
      const proxyUrl =
        `${requestUrl.origin}/api/video/generate?videoUrl=${encodeURIComponent(
          videoUrl
        )}`;

      console.log(
        "BOMBA PROXY VIDEO URL:",
        proxyUrl
      );

      return NextResponse.json({
        success: true,
        status: "succeeded",
        videoUrl: proxyUrl,
        predictionId:
          eventId,
        message:
          "Video is ready.",
      });
    }

    if (
      latestStatus ===
      "failed"
    ) {
      return NextResponse.json({
        success: false,
        status: "failed",
        predictionId:
          eventId,
        error:
          "Wan 2.2 video generation failed.",
      });
    }

    return NextResponse.json({
      success: true,
      status: "processing",
      predictionId:
        eventId,
      message:
        "Video is still being generated.",
    });
  } catch (error) {
    console.error(
      "BOMBA WAN STATUS FETCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        status: "error",
        predictionId:
          eventId,
        error:
          error?.message ||
          "Unable to check video status.",
      },
      { status: 500 }
    );
  }
}