import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const WAN_API_BASE =
  "https://observantdistressed-wan2-2-i2v-v3.hf.space";

const WAN_API_URL =
  `${WAN_API_BASE}/gradio_api/call/generate_video`;

const DEFAULT_NEGATIVE_PROMPT = `
cartoon, anime, illustration, CGI, 3D render, plastic skin,
deformed face, distorted body, extra fingers, extra limbs,
bad hands, duplicate person, blurry face, low quality,
unnatural movement, text, watermark, logo,
nudity, naked body, exposed breasts, exposed genitals,
sexual content, explicit content
`.trim();

/* =========================================================
   JSON HELPERS
========================================================= */

function parseJsonSafely(text) {
  if (!text || typeof text !== "string") {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/* =========================================================
   SSE PARSER
========================================================= */

function parseSSE(text) {
  const events = [];

  if (!text || typeof text !== "string") {
    return events;
  }

  const blocks = text.split(/\n\n+/);

  for (const block of blocks) {
    if (!block.trim()) {
      continue;
    }

    let eventName = "message";
    const dataLines = [];

    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) {
        eventName = line.substring(6).trim();
      }

      if (line.startsWith("data:")) {
        dataLines.push(line.substring(5).trim());
      }
    }

    if (!dataLines.length) {
      continue;
    }

    const rawData = dataLines.join("\n");

    const parsedData =
      parseJsonSafely(rawData);

    /*
      IMPORTANT:
      Do NOT use:
        parsedData ?? rawData

      because JSON "null" would become the string "null"
      and hide the fact that Wan actually returned null.

      We keep both values separately.
    */

    events.push({
      event: eventName,
      rawData,
      parsedData,
    });
  }

  return events;
}

/* =========================================================
   ERROR EXTRACTION
========================================================= */

function extractErrorMessage(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (
      !trimmed ||
      trimmed.toLowerCase() === "null" ||
      trimmed.toLowerCase() === "undefined"
    ) {
      return null;
    }

    return trimmed;
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
      "reason",
      "status",
      "exception",
      "description",
    ];

    for (const key of keys) {
      if (
        value[key] !== null &&
        value[key] !== undefined
      ) {
        const found =
          extractErrorMessage(value[key]);

        if (found) {
          return found;
        }
      }
    }

    try {
      const json = JSON.stringify(value);

      if (
        json &&
        json !== "{}" &&
        json !== "null"
      ) {
        return json;
      }
    } catch {
      return null;
    }
  }

  return null;
}

/* =========================================================
   VIDEO URL EXTRACTION
========================================================= */

function extractVideoUrl(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    if (
      value.startsWith("http://") ||
      value.startsWith("https://")
    ) {
      return value;
    }

    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found =
        extractVideoUrl(item);

      if (found) {
        return found;
      }
    }

    return null;
  }

  if (typeof value === "object") {
    const possibleKeys = [
      "video",
      "video_url",
      "videoUrl",
      "url",
      "path",
      "file",
      "value",
      "data",
      "output",
      "result",
    ];

    for (const key of possibleKeys) {
      if (value[key]) {
        const found =
          extractVideoUrl(value[key]);

        if (found) {
          return found;
        }
      }
    }
  }

  return null;
}

/* =========================================================
   FIND VIDEO IN SSE EVENTS
========================================================= */

function findVideoInEvents(events) {
  for (const item of events) {
    /*
      First inspect parsed JSON.
    */
    const parsedVideo =
      extractVideoUrl(item.parsedData);

    if (parsedVideo) {
      return parsedVideo;
    }

    /*
      Then inspect raw event data.
    */
    const rawVideo =
      extractVideoUrl(item.rawData);

    if (rawVideo) {
      return rawVideo;
    }
  }

  return null;
}

/* =========================================================
   IMAGE
========================================================= */

function getImageData(characterImage) {
  if (!characterImage) {
    return null;
  }

  if (typeof characterImage !== "string") {
    return null;
  }

  return characterImage;
}

/* =========================================================
   VIDEO PROXY
========================================================= */

async function proxyVideo(videoUrl) {
  console.log(
    "BOMBA WAN PROXY VIDEO:",
    videoUrl
  );

  const response = await fetch(videoUrl, {
    method: "GET",
    cache: "no-store",
  });

  if (
    !response.ok ||
    !response.body
  ) {
    console.error(
      "BOMBA WAN VIDEO PROXY FAILED:",
      response.status,
      response.statusText
    );

    return NextResponse.json(
      {
        error:
          `Unable to retrieve generated video (${response.status}).`,
      },
      { status: 502 }
    );
  }

  const contentType =
    response.headers.get("content-type") ||
    "video/mp4";

  return new Response(
    response.body,
    {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control":
          "no-store, no-cache, must-revalidate",
        "Accept-Ranges": "bytes",
      },
    }
  );
}

/* =========================================================
   POST
   START WAN GENERATION
========================================================= */

export async function POST(request) {
  try {
    const body =
      await request.json();

    const {
      prompt,
      characterImage,
    } = body || {};

    /* -----------------------------------------------------
       VALIDATE PROMPT
    ----------------------------------------------------- */

    if (
      !prompt ||
      typeof prompt !== "string" ||
      !prompt.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Please describe your video first.",
        },
        { status: 400 }
      );
    }

    /* -----------------------------------------------------
       VALIDATE IMAGE
    ----------------------------------------------------- */

    if (!characterImage) {
      return NextResponse.json(
        {
          error:
            "Please upload a character photo first.",
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
            "Invalid character image.",
        },
        { status: 400 }
      );
    }

    /* -----------------------------------------------------
       FINAL PROMPT
    ----------------------------------------------------- */

    const finalPrompt = `
${prompt.trim()}

Create a photorealistic live-action video using the supplied
character image as the main visual identity.

Keep the person's face, identity, skin tone, hairstyle and
overall appearance consistent with the reference image.

Natural human movement.
Natural facial expressions.
Realistic body proportions.
Realistic environment.
Cinematic camera movement.
Realistic lighting.
Photorealistic live-action appearance.

No cartoon.
No anime.
No illustration.
No CGI appearance.
No nudity.
No sexual content.
`.trim();

    /* -----------------------------------------------------
       WAN INPUT

       IMPORTANT:
       Keep this exact input order.
    ----------------------------------------------------- */

    const data = [
      imageData,
      imageData,
      finalPrompt,
      6,
      DEFAULT_NEGATIVE_PROMPT,
      5,
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
      "================================================="
    );

    console.log(
      "BOMBA WAN STARTING GENERATION"
    );

    console.log(
      "Image type:",
      typeof imageData
    );

    console.log(
      "Prompt length:",
      finalPrompt.length
    );

    console.log(
      "Duration:",
      5
    );

    console.log(
      "WAN URL:",
      WAN_API_URL
    );

    /* -----------------------------------------------------
       START WAN JOB
    ----------------------------------------------------- */

    const response =
      await fetch(WAN_API_URL, {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Accept:
            "application/json",
        },
        body: JSON.stringify({
          data,
        }),
        cache: "no-store",
      });

    const responseText =
      await response.text();

    console.log(
      "BOMBA WAN START STATUS:",
      response.status
    );

    console.log(
      "BOMBA WAN START RESPONSE:",
      responseText.substring(
        0,
        6000
      )
    );

    /* -----------------------------------------------------
       WAN START ERROR
    ----------------------------------------------------- */

    if (!response.ok) {
      const parsedStartError =
        parseJsonSafely(
          responseText
        );

      const extractedError =
        extractErrorMessage(
          parsedStartError
        );

      return NextResponse.json(
        {
          error:
            extractedError ||
            `Wan 2.2 returned HTTP ${response.status}.`,
          rawWanResponse:
            responseText.substring(
              0,
              6000
            ),
        },
        { status: 502 }
      );
    }

    /* -----------------------------------------------------
       READ EVENT ID
    ----------------------------------------------------- */

    const startData =
      parseJsonSafely(
        responseText
      );

    const eventId =
      startData?.event_id ||
      startData?.eventId ||
      startData?.id;

    if (!eventId) {
      console.error(
        "BOMBA WAN NO EVENT ID:",
        responseText
      );

      return NextResponse.json(
        {
          error:
            "Wan 2.2 accepted the request but did not return a job ID.",
          rawWanResponse:
            responseText.substring(
              0,
              6000
            ),
        },
        { status: 502 }
      );
    }

    console.log(
      "BOMBA WAN EVENT ID:",
      eventId
    );

    return NextResponse.json({
      jobId: eventId,
      predictionId: eventId,
      eventId,
      status: "queued",
    });
  } catch (error) {
    console.error(
      "BOMBA WAN POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to start Wan 2.2 video generation.",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   GET
   CHECK WAN RESULT
========================================================= */

export async function GET(request) {
  const {
    searchParams,
  } = new URL(request.url);

  const videoUrl =
    searchParams.get(
      "videoUrl"
    );

  const predictionId =
    searchParams.get(
      "predictionId"
    ) ||
    searchParams.get(
      "jobId"
    ) ||
    searchParams.get(
      "eventId"
    );

  /* -------------------------------------------------------
     DIRECT VIDEO PROXY
  ------------------------------------------------------- */

  if (videoUrl) {
    try {
      return await proxyVideo(
        videoUrl
      );
    } catch (error) {
      console.error(
        "BOMBA WAN VIDEO PROXY ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            error?.message ||
            "Unable to retrieve generated video.",
        },
        { status: 502 }
      );
    }
  }

  /* -------------------------------------------------------
     NO JOB ID
  ------------------------------------------------------- */

  if (!predictionId) {
    return NextResponse.json(
      {
        error:
          "Missing video job ID.",
      },
      { status: 400 }
    );
  }

  const resultUrl =
    `${WAN_API_URL}/${encodeURIComponent(
      predictionId
    )}`;

  console.log(
    "================================================="
  );

  console.log(
    "BOMBA WAN CHECKING RESULT"
  );

  console.log(
    "Event ID:",
    predictionId
  );

  console.log(
    "Result URL:",
    resultUrl
  );

  const controller =
    new AbortController();

  /*
    Keep this below the Vercel function limit.
    The frontend polls again if still processing.
  */

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, 45000);

  try {
    const response =
      await fetch(
        resultUrl,
        {
          method: "GET",
          headers: {
            Accept:
              "text/event-stream",
            "Cache-Control":
              "no-cache",
          },
          cache: "no-store",
          signal:
            controller.signal,
        }
      );

    clearTimeout(timeout);

    const responseText =
      await response.text();

    console.log(
      "BOMBA WAN RESULT HTTP STATUS:",
      response.status
    );

    /*
      IMPORTANT:
      Print the complete response so we can see
      exactly what the Wan Space sends back.
    */

    console.log(
      "BOMBA WAN FULL RESULT RESPONSE:",
      responseText.substring(
        0,
        12000
      )
    );

    /* -----------------------------------------------------
       EXPIRED / UNKNOWN EVENT
    ----------------------------------------------------- */

    if (response.status === 404) {
      console.error(
        "BOMBA WAN RESULT 404:",
        predictionId
      );

      return NextResponse.json(
        {
          status: "expired",
          error:
            "Wan 2.2 could not find this generation job. The job may have expired.",
          jobId:
            predictionId,
        },
        { status: 410 }
      );
    }

    /* -----------------------------------------------------
       HTTP ERROR
    ----------------------------------------------------- */

    if (!response.ok) {
      console.error(
        "BOMBA WAN RESULT HTTP ERROR:",
        response.status,
        responseText
      );

      const parsedHttpError =
        parseJsonSafely(
          responseText
        );

      const extractedHttpError =
        extractErrorMessage(
          parsedHttpError
        );

      return NextResponse.json(
        {
          status: "failed",
          error:
            extractedHttpError ||
            `Wan 2.2 returned HTTP ${response.status}.`,
          rawWanResponse:
            responseText.substring(
              0,
              12000
            ),
          jobId:
            predictionId,
        },
        { status: 502 }
      );
    }

    /* -----------------------------------------------------
       PARSE SSE
    ----------------------------------------------------- */

    const events =
      parseSSE(
        responseText
      );

    console.log(
      "BOMBA WAN SSE EVENT COUNT:",
      events.length
    );

    for (
      const event of events
    ) {
      console.log(
        "BOMBA WAN SSE EVENT:",
        event.event
      );

      console.log(
        "BOMBA WAN SSE RAW DATA:",
        String(
          event.rawData
        ).substring(
          0,
          6000
        )
      );

      console.log(
        "BOMBA WAN SSE PARSED DATA:",
        event.parsedData
      );
    }

    /* -----------------------------------------------------
       CHECK ERROR EVENTS
    ----------------------------------------------------- */

    for (
      const item of events
    ) {
      if (
        item.event === "error" ||
        item.event === "failed"
      ) {
        console.error(
          "================================================="
        );

        console.error(
          "BOMBA WAN ERROR EVENT DETECTED"
        );

        console.error(
          "Event:",
          item.event
        );

        console.error(
          "Raw data:",
          item.rawData
        );

        console.error(
          "Parsed data:",
          item.parsedData
        );

        console.error(
          "Full response:",
          responseText.substring(
            0,
            12000
          )
        );

        /*
          Try to find a real error message.
        */

        const message =
          extractErrorMessage(
            item.parsedData
          ) ||
          extractErrorMessage(
            item.rawData
          );

        /*
          If Wan literally sends null,
          DO NOT return "null".

          Instead return a useful diagnostic
          that tells us the event contains no
          actual error message.
        */

        const finalError =
          message ||
          `Wan 2.2 returned an ${item.event} event without an error message.`;

        return NextResponse.json(
          {
            status: "failed",
            error:
              finalError,
            rawWanError:
              item.rawData ||
              null,
            parsedWanError:
              item.parsedData ??
              null,
            rawWanResponse:
              responseText.substring(
                0,
                12000
              ),
            jobId:
              predictionId,
          },
          { status: 502 }
        );
      }
    }

    /* -----------------------------------------------------
       LOOK FOR VIDEO
    ----------------------------------------------------- */

    const foundVideo =
      findVideoInEvents(
        events
      );

    if (foundVideo) {
      console.log(
        "================================================="
      );

      console.log(
        "BOMBA WAN VIDEO FOUND:",
        foundVideo
      );

      console.log(
        "BOMBA WAN JOB COMPLETE:",
        predictionId
      );

      /*
        Return a BOMBA proxy URL instead of exposing
        the temporary Hugging Face file directly.
      */

      const baseUrl =
        new URL(
          request.url
        ).origin;

      const proxyUrl =
        `${baseUrl}/api/video/generate?videoUrl=${encodeURIComponent(
          foundVideo
        )}`;

      return NextResponse.json({
        status:
          "completed",
        videoUrl:
          proxyUrl,
        jobId:
          predictionId,
      });
    }

    /* -----------------------------------------------------
       CHECK PROCESSING EVENTS
    ----------------------------------------------------- */

    let hasGeneratingEvent =
      false;

    for (
      const item of events
    ) {
      if (
        item.event ===
          "generating" ||
        item.event ===
          "process_starts" ||
        item.event ===
          "heartbeat" ||
        item.event ===
          "process_generating"
      ) {
        hasGeneratingEvent =
          true;
      }
    }

    console.log(
      "BOMBA WAN STILL PROCESSING:",
      predictionId
    );

    return NextResponse.json(
      {
        status:
          "processing",
        message:
          "Wan 2.2 is still generating the video.",
        jobId:
          predictionId,
        events:
          events.map(
            (item) =>
              item.event
          ),
        generating:
          hasGeneratingEvent,
      },
      { status: 202 }
    );
  } catch (error) {
    clearTimeout(timeout);

    /* -----------------------------------------------------
       TIMEOUT
    ----------------------------------------------------- */

    if (
      error?.name ===
      "AbortError"
    ) {
      console.log(
        "BOMBA WAN RESULT CHECK TIMED OUT:",
        predictionId
      );

      /*
        Timeout does NOT mean the generation failed.
        The frontend will poll again.
      */

      return NextResponse.json(
        {
          status:
            "processing",
          message:
            "Wan 2.2 is still generating the video.",
          jobId:
            predictionId,
        },
        { status: 202 }
      );
    }

    /* -----------------------------------------------------
       OTHER GET ERROR
    ----------------------------------------------------- */

    console.error(
      "BOMBA WAN GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        status:
          "failed",
        error:
          error?.message ||
          "Unable to check Wan 2.2 video status.",
        jobId:
          predictionId,
      },
      { status: 502 }
    );
  }
}