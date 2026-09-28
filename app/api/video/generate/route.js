import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const WAN_API_URL =
  "https://observantdistressed-wan2-2-i2v-v3.hf.space/gradio_api/call/generate_video";

const DEFAULT_NEGATIVE_PROMPT =
  "blurry, low quality, distorted face, deformed body, extra fingers, extra limbs, bad anatomy, unrealistic movement, flickering, duplicate person, duplicate body, text, watermark, logo, nudity, sexual content";

function parseJsonSafely(value) {
  if (value === null || value === undefined) return null;

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseSSE(text) {
  const events = [];
  let currentEvent = null;
  let currentData = [];

  const lines = text.split(/\r?\n/);

  function pushEvent() {
    if (!currentEvent && currentData.length === 0) return;

    const rawData = currentData.join("\n");

    events.push({
      event: currentEvent || "message",
      rawData,
      parsedData: parseJsonSafely(rawData),
    });

    currentEvent = null;
    currentData = [];
  }

  for (const line of lines) {
    if (line.startsWith("event:")) {
      if (currentEvent || currentData.length > 0) {
        pushEvent();
      }

      currentEvent = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      currentData.push(line.slice(5).trimStart());
    } else if (line.trim() === "") {
      pushEvent();
    }
  }

  pushEvent();

  return events;
}

function extractErrorMessage(value) {
  if (value === null || value === undefined) {
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

  if (typeof value === "object") {
    return (
      value.error ||
      value.message ||
      value.detail ||
      value.msg ||
      value.reason ||
      null
    );
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
    const possibleKeys = [
      "video",
      "video_url",
      "videoUrl",
      "url",
      "path",
      "file",
      "name",
    ];

    for (const key of possibleKeys) {
      const found = extractVideoUrl(value[key]);
      if (found) return found;
    }
  }

  return null;
}

function findVideoInEvents(events) {
  for (const event of events) {
    const found = extractVideoUrl(event.parsedData);

    if (found) {
      return found;
    }
  }

  return null;
}

async function getImageData(request) {
  const body = await request.json();

  return {
    imageData: body?.imageData || body?.image || body?.characterImage || null,
    prompt: body?.prompt || "",
    mode: body?.mode || "Story",
  };
}

async function proxyVideo(videoUrl) {
  try {
    const response = await fetch(videoUrl);

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "failed",
          error: `Video file could not be downloaded. HTTP ${response.status}`,
        },
        { status: 502 }
      );
    }

    const contentType =
      response.headers.get("content-type") || "video/mp4";

    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(arrayBuffer.byteLength),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "failed",
        error:
          error?.message ||
          "Unable to proxy the generated video.",
      },
      { status: 502 }
    );
  }
}

export async function POST(request) {
  try {
    const { imageData, prompt, mode } = await getImageData(request);

    if (!imageData) {
      return NextResponse.json(
        {
          status: "failed",
          error: "Please upload a character photo first.",
        },
        { status: 400 }
      );
    }

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        {
          status: "failed",
          error: "Please describe the video you want to create.",
        },
        { status: 400 }
      );
    }

    const finalPrompt = `${prompt.trim()}

Cinematic realistic live-action style, natural human movement, realistic facial expressions, realistic body proportions, realistic lighting, gentle cinematic camera movement, detailed environment, realistic skin texture, realistic clothing, natural atmosphere.`;

    /*
      Wan 2.2 generate_video input order:

      1  input_image
      2  last_image
      3  prompt
      4  steps
      5  negative_prompt
      6  duration_seconds
      7  guidance_scale
      8  guidance_scale_2
      9  seed
      10 randomize_seed
      11 quality
      12 scheduler
      13 flow_shift
      14 frame_multiplier
      15 safe_mode
      16 lora_groups
      17 auto_lora_enabled
      18 video_component
    */

    const data = [
      imageData,
      null,
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
      6.0,
      16,
      true,
      [],
      false,
      true,
    ];

    console.log("BOMBA WAN REQUEST MODE:", mode);
    console.log("BOMBA WAN DATA:", JSON.stringify(data));
    console.log("BOMBA WAN FLOW SHIFT:", 6.0);
    console.log("BOMBA WAN LAST IMAGE:", null);

    const response = await fetch(WAN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data,
      }),
    });

    const responseText = await response.text();

    console.log(
      "BOMBA WAN START RESPONSE:",
      responseText.slice(0, 12000)
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "failed",
          error: "Wan 2.2 could not start the video generation.",
          rawWanResponse: responseText,
        },
        { status: 502 }
      );
    }

    const startData = parseJsonSafely(responseText);

    const predictionId =
      startData?.event_id ||
      startData?.id ||
      startData?.prediction_id;

    if (!predictionId) {
      return NextResponse.json(
        {
          status: "failed",
          error: "Wan 2.2 did not return a generation ID.",
          rawWanResponse: responseText,
        },
        { status: 502 }
      );
    }

    console.log("BOMBA WAN EVENT ID:", predictionId);

    return NextResponse.json({
      status: "queued",
      id: predictionId,
      jobId: predictionId,
    });
  } catch (error) {
    console.error("BOMBA WAN POST ERROR:", error);

    return NextResponse.json(
      {
        status: "failed",
        error:
          error?.message ||
          "Unable to start Wan 2.2 video generation.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const predictionId =
      searchParams.get("id") ||
      searchParams.get("jobId");

    if (!predictionId) {
      return NextResponse.json(
        {
          status: "failed",
          error: "Missing Wan generation ID.",
        },
        { status: 400 }
      );
    }

    const resultUrl = `${WAN_API_URL}/${predictionId}`;

    const response = await fetch(resultUrl, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
      },
      cache: "no-store",
    });

    const responseText = await response.text();

    console.log(
      "BOMBA WAN RESULT RESPONSE:",
      responseText.slice(0, 12000)
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "failed",
          error: `Wan 2.2 result request failed with HTTP ${response.status}.`,
          rawWanResponse: responseText,
          jobId: predictionId,
        },
        { status: 502 }
      );
    }

    const events = parseSSE(responseText);

    console.log(
      "BOMBA WAN EVENTS:",
      JSON.stringify(events).slice(0, 12000)
    );

    for (const event of events) {
      console.log(
        "BOMBA WAN EVENT:",
        event.event,
        "RAW:",
        event.rawData,
        "PARSED:",
        JSON.stringify(event.parsedData)
      );
    }

    const errorEvent = events.find(
      (event) =>
        event.event === "error" ||
        event.event === "failed" ||
        event.event === "failure"
    );

    if (errorEvent) {
      const errorMessage =
        extractErrorMessage(errorEvent.parsedData) ||
        extractErrorMessage(errorEvent.rawData);

      console.error(
        "BOMBA WAN ERROR EVENT RAW:",
        errorEvent.rawData
      );

      console.error(
        "BOMBA WAN ERROR EVENT PARSED:",
        JSON.stringify(errorEvent.parsedData)
      );

      return NextResponse.json(
        {
          status: "failed",
          error:
            errorMessage ||
            "Wan 2.2 returned an error event without an error message.",
          rawWanError: errorEvent.rawData,
          parsedWanError: errorEvent.parsedData,
          rawWanResponse: responseText,
          jobId: predictionId,
        },
        { status: 502 }
      );
    }

    const videoUrl = findVideoInEvents(events);

    if (videoUrl) {
      console.log("BOMBA WAN VIDEO URL:", videoUrl);

      return proxyVideo(videoUrl);
    }

    const hasProcessingEvent = events.some(
      (event) =>
        event.event === "generating" ||
        event.event === "process_generating" ||
        event.event === "process_starts" ||
        event.event === "process_completed" ||
        event.event === "queue_full"
    );

    if (hasProcessingEvent) {
      return NextResponse.json({
        status: "processing",
        jobId: predictionId,
      });
    }

    return NextResponse.json({
      status: "processing",
      jobId: predictionId,
    });
  } catch (error) {
    console.error("BOMBA WAN GET ERROR:", error);

    return NextResponse.json(
      {
        status: "failed",
        error:
          error?.message ||
          "Unable to check Wan 2.2 video generation.",
      },
      { status: 500 }
    );
  }
}