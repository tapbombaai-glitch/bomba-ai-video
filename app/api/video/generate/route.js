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
low quality, blurry, distorted face, deformed body, extra fingers,
extra limbs, duplicate person, bad anatomy, unnatural movement,
cartoon, anime, illustration, CGI, plastic skin,
text, watermark, logo, subtitles,
nudity, naked body, exposed breasts, exposed genitals
`.replace(/\s+/g, " ").trim();

function extractErrorMessage(value) {
  if (value == null) return null;

  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractErrorMessage(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof value === "object") {
    const keys = [
      "error",
      "message",
      "detail",
      "details",
      "status",
      "reason",
    ];

    for (const key of keys) {
      if (value[key] != null) {
        const found = extractErrorMessage(value[key]);
        if (found) return found;
      }
    }

    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }

  return String(value);
}

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

function makeWanFileUrl(fileData) {
  if (!fileData) return null;

  if (typeof fileData === "string") {
    if (
      fileData.startsWith("http://") ||
      fileData.startsWith("https://")
    ) {
      return fileData;
    }

    return `${WAN_API_BASE}/gradio_api/file=${encodeURIComponent(
      fileData
    )}`;
  }

  if (typeof fileData === "object") {
    if (fileData.url) {
      return fileData.url;
    }

    if (fileData.path) {
      return `${WAN_API_BASE}/gradio_api/file=${encodeURIComponent(
        fileData.path
      )}`;
    }

    if (fileData.name) {
      return `${WAN_API_BASE}/gradio_api/file=${encodeURIComponent(
        fileData.name
      )}`;
    }
  }

  return null;
}

function extractVideoUrl(value) {
  if (!value) return null;

  if (typeof value === "string") {
    if (
      value.startsWith("http://") ||
      value.startsWith("https://")
    ) {
      return value;
    }

    if (
      value.includes(".mp4") ||
      value.includes("video") ||
      value.includes("/tmp/")
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
    const directKeys = [
      "video",
      "video_url",
      "videoUrl",
      "url",
      "path",
      "name",
      "file",
      "data",
      "output",
      "outputs",
    ];

    for (const key of directKeys) {
      if (value[key] != null) {
        const found = extractVideoUrl(value[key]);

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

  const normalized = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const blocks = normalized.split(/\n\n+/);

  for (const block of blocks) {
    if (!block.trim()) continue;

    let eventName = null;
    const dataLines = [];

    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) {
        eventName = line.substring(6).trim();
      }

      if (line.startsWith("data:")) {
        dataLines.push(line.substring(5).trim());
      }
    }

    if (dataLines.length > 0) {
      const rawData = dataLines.join("\n");

      events.push({
        event: eventName,
        data: parsePossibleJson(rawData),
      });
    }
  }

  return events;
}

async function getImageData(image) {
  if (!image) return null;

  if (
    image.startsWith("http://") ||
    image.startsWith("https://")
  ) {
    return image;
  }

  return image;
}

async function proxyVideo(videoUrl) {
  try {
    const response = await fetch(videoUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Video download failed with status ${response.status}`,
        },
        { status: 502 }
      );
    }

    const contentType =
      response.headers.get("content-type") ||
      "video/mp4";

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error(
      "BOMBA VIDEO PROXY ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to load generated video.",
      },
      { status: 502 }
    );
  }
}

/* =========================================================
   POST
   Starts a Wan 2.2 generation job.
   ========================================================= */

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      prompt,
      characterImage,
    } = body || {};

    if (!prompt) {
      return NextResponse.json(
        {
          error: "A video prompt is required.",
        },
        { status: 400 }
      );
    }

    if (!characterImage) {
      return NextResponse.json(
        {
          error: "Please upload a character image.",
        },
        { status: 400 }
      );
    }

    const imageData = await getImageData(
      characterImage
    );

    const finalPrompt = `
Photorealistic live-action cinematic video.
Real human appearance.
Natural skin texture.
Natural body movement.
Realistic lighting.
Realistic environment.
Cinematic camera movement.
No cartoon.
No anime.
No illustration.
No CGI appearance.

Do not introduce nudity or exposed body parts.
Keep all characters appropriately clothed.

${prompt}
`.trim();

    const data = [
      imageData,
      imageData,
      finalPrompt,
      6,
      DEFAULT_NEGATIVE_PROMPT,
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
      "BOMBA WAN STARTING GENERATION"
    );

    const response = await fetch(
      WAN_CALL_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data,
        }),
        cache: "no-store",
      }
    );

    const responseText =
      await response.text();

    console.log(
      "BOMBA WAN START STATUS:",
      response.status
    );

    console.log(
      "BOMBA WAN START RESPONSE:",
      responseText.substring(0, 2000)
    );

    if (!response.ok) {
      let parsed;

      try {
        parsed = JSON.parse(responseText);
      } catch {
        parsed = responseText;
      }

      return NextResponse.json(
        {
          error:
            extractErrorMessage(parsed) ||
            `Wan start request failed (${response.status}).`,
        },
        {
          status: 502,
        }
      );
    }

    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      result = null;
    }

    const eventId =
      result?.event_id ||
      result?.eventId ||
      result?.id;

    if (!eventId) {
      console.error(
        "BOMBA WAN DID NOT RETURN EVENT ID:",
        responseText
      );

      return NextResponse.json(
        {
          error:
            "Wan 2.2 did not return a generation event ID.",
        },
        { status: 502 }
      );
    }

    console.log(
      "BOMBA WAN EVENT ID:",
      eventId
    );

    return NextResponse.json(
      {
        jobId: eventId,
        predictionId: eventId,
        eventId,
        status: "queued",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "BOMBA WAN POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          extractErrorMessage(error) ||
          "Unable to start Wan 2.2 generation.",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   GET
   Reads the Gradio SSE result stream.
   ========================================================= */

export async function GET(request) {
  try {
    const { searchParams } =
      new URL(request.url);

    const videoUrl =
      searchParams.get("videoUrl");

    /*
      If the frontend gives us a completed video URL,
      proxy the actual video through BOMBA.
    */
    if (videoUrl) {
      return proxyVideo(videoUrl);
    }

    const eventId =
      searchParams.get("eventId") ||
      searchParams.get("jobId") ||
      searchParams.get("predictionId");

    if (!eventId) {
      return NextResponse.json(
        {
          error:
            "Missing Wan generation event ID.",
        },
        { status: 400 }
      );
    }

    const resultUrl =
      `${WAN_RESULT_BASE}/${encodeURIComponent(
        eventId
      )}`;

    console.log(
      "BOMBA WAN RESULT URL:",
      resultUrl
    );

    /*
      IMPORTANT:
      Gradio returns an SSE stream here.
      We open ONE result stream for this event.
    */

    const controller =
      new AbortController();

    /*
      Leave a little safety margin below Vercel's
      runtime timeout.
    */
    const timeout = setTimeout(() => {
      controller.abort();
    }, 50000);

    let response;

    try {
      response = await fetch(
        resultUrl,
        {
          method: "GET",
          headers: {
            Accept:
              "text/event-stream",
          },
          cache: "no-store",
          signal: controller.signal,
        }
      );
    } catch (error) {
      clearTimeout(timeout);

      console.error(
        "BOMBA WAN RESULT FETCH ERROR:",
        error
      );

      if (
        error?.name === "AbortError"
      ) {
        return NextResponse.json(
          {
            status: "processing",
            message:
              "Wan 2.2 is still generating the video.",
            jobId: eventId,
          },
          { status: 202 }
        );
      }

      return NextResponse.json(
        {
          error:
            extractErrorMessage(error) ||
            "Unable to connect to Wan 2.2 result stream.",
          jobId: eventId,
        },
        { status: 502 }
      );
    }

    const resultText =
      await response.text();

    clearTimeout(timeout);

    console.log(
      "BOMBA WAN RESULT STATUS:",
      response.status
    );

    console.log(
      "BOMBA WAN RESULT RESPONSE:",
      resultText.substring(0, 4000)
    );

    /*
      A 404 can happen when an old/expired event ID
      is requested. Return a readable error instead
      of allowing the frontend to display an object.
    */

    if (!response.ok) {
      let parsedError;

      try {
        parsedError =
          JSON.parse(resultText);
      } catch {
        parsedError = resultText;
      }

      const message =
        extractErrorMessage(
          parsedError
        ) ||
        `Wan result request failed (${response.status}).`;

      console.error(
        "BOMBA WAN RESULT HTTP ERROR:",
        message
      );

      return NextResponse.json(
        {
          error: message,
          jobId: eventId,
        },
        {
          status: response.status === 404
            ? 410
            : 502,
        }
      );
    }

    const events =
      parseSSE(resultText);

    console.log(
      "BOMBA WAN SSE EVENTS:",
      events.map((item) => ({
        event: item.event,
        dataType:
          typeof item.data,
      }))
    );

    /*
      Search from the end because the final
      complete/error event is what we need.
    */

    for (
      let index = events.length - 1;
      index >= 0;
      index--
    ) {
      const item = events[index];

      if (
        item.event === "error"
      ) {
        const message =
          extractErrorMessage(
            item.data
          ) ||
          "Wan 2.2 video generation failed.";

        console.error(
          "BOMBA WAN GENERATION ERROR:",
          message
        );

        return NextResponse.json(
          {
            error: message,
            jobId: eventId,
            status: "failed",
          },
          { status: 502 }
        );
      }
    }

    /*
      Look for the completed output.
    */

    for (
      let index = events.length - 1;
      index >= 0;
      index--
    ) {
      const item = events[index];

      if (
        item.event === "complete"
      ) {
        const foundVideo =
          extractVideoUrl(
            item.data
          );

        if (foundVideo) {
          console.log(
            "BOMBA WAN VIDEO FOUND:",
            foundVideo
          );

          const proxiedUrl =
            `/api/video/generate?videoUrl=${encodeURIComponent(
              foundVideo
            )}`;

          return NextResponse.json(
            {
              status: "completed",
              jobId: eventId,
              videoUrl: proxiedUrl,
            },
            { status: 200 }
          );
        }

        console.error(
          "BOMBA WAN COMPLETE EVENT HAD NO VIDEO:",
          JSON.stringify(
            item.data
          ).substring(0, 4000)
        );

        return NextResponse.json(
          {
            error:
              "Wan 2.2 completed the job but did not return a video file.",
            jobId: eventId,
            status: "failed",
          },
          { status: 502 }
        );
      }
    }

    /*
      If the stream ended without complete/error,
      tell the frontend that generation is still
      processing.
    */

    return NextResponse.json(
      {
        status: "processing",
        message:
          "Wan 2.2 is still generating the video.",
        jobId: eventId,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error(
      "BOMBA WAN GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          extractErrorMessage(error) ||
          "Unable to retrieve Wan 2.2 video.",
      },
      { status: 500 }
    );
  }
}