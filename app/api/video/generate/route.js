import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const WAN_API_BASE =
  "https://observantdistressed-wan2-2-i2v-v3.hf.space";

const WAN_CALL_URL =
  `${WAN_API_BASE}/gradio_api/call/generate_video`;

const WAN_RESULT_BASE =
  `${WAN_API_BASE}/gradio_api/call/generate_video`;

const DEFAULT_NEGATIVE_PROMPT = `
blurry, distorted face, deformed body, extra fingers, extra limbs,
bad anatomy, low quality, watermark, text, logo, cartoon, anime,
illustration, unrealistic movement, flickering, duplicate person,
nudity, naked body, exposed breasts, exposed genitals
`.trim();

/* =====================================================
   GRADIO IMAGE DATA
===================================================== */

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

/* =====================================================
   WAN FILE URL
===================================================== */

function makeWanFileUrl(value) {
  if (!value) return null;

  if (typeof value !== "string") {
    return null;
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  if (value.startsWith("/file=")) {
    return `${WAN_API_BASE}${value}`;
  }

  if (value.startsWith("file=")) {
    return `${WAN_API_BASE}/${value}`;
  }

  return `${WAN_API_BASE}/gradio_api/file=${encodeURIComponent(
    value
  )}`;
}

/* =====================================================
   EXTRACT VIDEO URL
===================================================== */

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

      if (found) {
        return found;
      }
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
        const found =
          extractVideoUrl(value[key]);

        if (found) {
          return found;
        }
      }
    }

    for (const key of Object.keys(value)) {
      const found =
        extractVideoUrl(value[key]);

      if (found) {
        return found;
      }
    }
  }

  return null;
}

/* =====================================================
   PARSE POSSIBLE JSON
===================================================== */

function parsePossibleJson(value) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

/* =====================================================
   PARSE SSE
===================================================== */

function parseSSE(text) {
  const events = [];

  const blocks =
    text.split(/\r?\n\r?\n+/);

  for (const block of blocks) {
    const lines =
      block.split(/\r?\n/);

    let event = null;
    let data = "";

    for (const line of lines) {
      if (line.startsWith("event:")) {
        event =
          line.substring(6).trim();
      }

      if (line.startsWith("data:")) {
        data +=
          line.substring(5).trim();
      }
    }

    if (event || data) {
      events.push({
        event,
        data:
          parsePossibleJson(data),
      });
    }
  }

  return events;
}

/* =====================================================
   SAFE LOG
===================================================== */

function safeLogData(value) {
  try {
    const text =
      JSON.stringify(value);

    if (text.length > 5000) {
      return (
        text.substring(0, 5000) +
        "..."
      );
    }

    return text;
  } catch {
    return String(value);
  }
}

/* =====================================================
   EXTRACT ERROR MESSAGE
===================================================== */

function extractErrorMessage(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const text = value.trim();

    if (!text) {
      return null;
    }

    return text;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found =
        extractErrorMessage(item);

      if (found) {
        return found;
      }
    }

    return null;
  }

  if (typeof value === "object") {
    const keys = [
      "error",
      "message",
      "detail",
      "details",
      "exception",
      "reason",
      "description",
    ];

    for (const key of keys) {
      if (value[key]) {
        const found =
          extractErrorMessage(
            value[key]
          );

        if (found) {
          return found;
        }
      }
    }

    for (const key of Object.keys(value)) {
      const found =
        extractErrorMessage(
          value[key]
        );

      if (found) {
        return found;
      }
    }
  }

  return null;
}

/* =====================================================
   VIDEO PROXY
===================================================== */

async function proxyVideo(requestUrl) {
  const encodedVideoUrl =
    requestUrl.searchParams.get(
      "videoUrl"
    );

  if (!encodedVideoUrl) {
    return null;
  }

  let videoUrl;

  try {
    videoUrl =
      decodeURIComponent(
        encodedVideoUrl
      );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error:
          "Invalid video URL.",
      },
      { status: 400 }
    );
  }

  let remoteUrl;

  try {
    remoteUrl =
      new URL(videoUrl);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error:
          "Invalid video URL.",
      },
      { status: 400 }
    );
  }

  const allowedHost =
    "observantdistressed-wan2-2-i2v-v3.hf.space";

  if (
    remoteUrl.hostname !==
    allowedHost
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Video source is not allowed.",
      },
      { status: 403 }
    );
  }

  console.log(
    "BOMBA VIDEO PROXY:",
    remoteUrl.toString()
  );

  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, 50000);

  try {
    const response =
      await fetch(
        remoteUrl.toString(),
        {
          method: "GET",
          headers: {
            Accept:
              "video/mp4,video/*,*/*",
          },
          signal:
            controller.signal,
        }
      );

    console.log(
      "BOMBA VIDEO PROXY STATUS:",
      response.status,
      response.headers.get(
        "content-type"
      ),
      response.headers.get(
        "content-length"
      )
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "BOMBA VIDEO PROXY ERROR:",
        errorText.substring(
          0,
          2000
        )
      );

      return NextResponse.json(
        {
          success: false,
          error:
            `Unable to retrieve generated video. Status ${response.status}.`,
        },
        { status: 502 }
      );
    }

    const headers =
      new Headers();

    headers.set(
      "Content-Type",
      response.headers.get(
        "content-type"
      ) || "video/mp4"
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
      response.headers.get(
        "content-length"
      );

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

/* =====================================================
   POST — START WAN GENERATION
===================================================== */

export async function POST(request) {
  try {
    const body =
      await request.json();

    const {
      mode,
      prompt,
      characterImage,
    } = body || {};

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please enter a video prompt.",
        },
        { status: 400 }
      );
    }

    if (!characterImage) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please upload a character image.",
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
Do not introduce nudity or exposed body parts.
Keep all characters appropriately clothed.
`.trim();

    const imageData =
      getImageData(
        characterImage
      );

    /*
      IMPORTANT:
      Keep the Wan 2.2 input order unchanged.
    */

    const data = [
      imageData,
      imageData,
      finalPrompt,
      6,
      DEFAULT_NEGATIVE_PROMPT,

      // 10 SECOND VIDEO
      10,

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
      "===================================="
    );

    console.log(
      "BOMBA WAN 2.2 STARTING"
    );

    console.log(
      "Duration: 10 seconds"
    );

    console.log(
      "Steps: 6"
    );

    console.log(
      "Scheduler: UniPCMultistep"
    );

    console.log(
      "===================================="
    );

    const response =
      await fetch(
        WAN_CALL_URL,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
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
        responseText.substring(
          0,
          5000
        )
      );

      return NextResponse.json(
        {
          success: false,
          status: "failed",
          error:
            `Wan 2.2 could not start generation. HTTP ${response.status}. ${responseText.substring(
              0,
              1000
            )}`,
        },
        { status: 502 }
      );
    }

    let result;

    try {
      result =
        JSON.parse(
          responseText
        );
    } catch {
      console.error(
        "BOMBA WAN INVALID START RESPONSE:",
        responseText.substring(
          0,
          5000
        )
      );

      return NextResponse.json(
        {
          success: false,
          status: "failed",
          error:
            `Wan 2.2 returned an unexpected response: ${responseText.substring(
              0,
              1000
            )}`,
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
          status: "failed",
          error:
            `Wan 2.2 did not return a generation ID. Response: ${safeLogData(
              result
            )}`,
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
        status: "failed",
        error:
          error?.message ||
          "Unable to start video generation.",
      },
      { status: 500 }
    );
  }
}

/* =====================================================
   GET — CHECK WAN GENERATION
===================================================== */

export async function GET(request) {
  const requestUrl =
    new URL(request.url);

  /* ===================================================
     VIDEO PROXY REQUEST
  =================================================== */

  if (
    requestUrl.searchParams.has(
      "videoUrl"
    )
  ) {
    return proxyVideo(
      requestUrl
    );
  }

  /* ===================================================
     GENERATION ID
  =================================================== */

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
        status: "failed",
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
    "===================================="
  );

  console.log(
    "BOMBA WAN 2.2 STATUS CHECK:",
    eventId
  );

  console.log(
    "===================================="
  );

  try {
    const response =
      await fetch(
        resultUrl,
        {
          method: "GET",
          headers: {
            Accept:
              "text/event-stream",
          },
          cache:
            "no-store",
        }
      );

    const text =
      await response.text();

    console.log(
      "BOMBA WAN STATUS HTTP:",
      response.status
    );

    if (!response.ok) {
      console.error(
        "BOMBA WAN STATUS ERROR:",
        response.status,
        text.substring(
          0,
          5000
        )
      );

      return NextResponse.json(
        {
          success: false,
          status: "failed",
          predictionId:
            eventId,
          error:
            `Unable to check Wan 2.2 status. HTTP ${response.status}. ${text.substring(
              0,
              1000
            )}`,
        },
        { status: 502 }
      );
    }

    const events =
      parseSSE(text);

    console.log(
      "BOMBA WAN EVENTS:",
      safeLogData(events)
    );

    let latestStatus =
      "processing";

    let videoUrl =
      null;

    let rawCompleteData =
      null;

    let wanError =
      null;

    for (const item of events) {
      const eventName =
        item.event || "";

      const data =
        item.data;

      /* =============================================
         GENERATING
      ============================================= */

      if (
        eventName ===
          "generating" ||
        eventName ===
          "pending" ||
        eventName ===
          "queued"
      ) {
        latestStatus =
          "processing";
      }

      /* =============================================
         COMPLETE
      ============================================= */

      if (
        eventName ===
        "complete"
      ) {
        latestStatus =
          "succeeded";

        rawCompleteData =
          data;

        videoUrl =
          extractVideoUrl(
            data
          );
      }

      /* =============================================
         ERROR
      ============================================= */

      if (
        eventName ===
        "error"
      ) {
        latestStatus =
          "failed";

        wanError =
          extractErrorMessage(
            data
          ) ||
          "Wan 2.2 returned an error.";

        console.error(
          "===================================="
        );

        console.error(
          "BOMBA WAN GENERATION ERROR:"
        );

        console.error(
          wanError
        );

        console.error(
          "RAW WAN ERROR DATA:",
          safeLogData(data)
        );

        console.error(
          "===================================="
        );
      }
    }

    /* =================================================
       TRY COMPLETE DATA AGAIN
    ================================================= */

    if (
      !videoUrl &&
      rawCompleteData
    ) {
      videoUrl =
        extractVideoUrl(
          rawCompleteData
        );
    }

    /* =================================================
       VIDEO READY
    ================================================= */

    if (
      latestStatus ===
        "succeeded" &&
      videoUrl
    ) {
      console.log(
        "WAN 2.2 ORIGINAL VIDEO:",
        videoUrl
      );

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
        status:
          "succeeded",
        videoUrl:
          proxyUrl,
        predictionId:
          eventId,
        message:
          "Video is ready.",
      });
    }

    /* =================================================
       WAN FAILED
    ================================================= */

    if (
      latestStatus ===
      "failed"
    ) {
      return NextResponse.json({
        success: false,
        status:
          "failed",
        predictionId:
          eventId,
        error:
          wanError ||
          "Wan 2.2 video generation failed.",
      });
    }

    /* =================================================
       STILL PROCESSING
    ================================================= */

    return NextResponse.json({
      success: true,
      status:
        "processing",
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
        status:
          "failed",
        predictionId:
          eventId,
        error:
          error?.message ||
          "Unable to check video generation status.",
      },
      { status: 500 }
    );
  }
}