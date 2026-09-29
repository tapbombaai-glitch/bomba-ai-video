import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const WAN_API_URL =
  "https://alexcheng0072-wan27-free-video-generator.hf.space/gradio_api/call/generate_video";

const POLL_TIMEOUT_MS = 25000;

function toGradioImage(image) {
  if (!image) return null;

  if (
    typeof image === "object" &&
    (image.url || image.path)
  ) {
    return image;
  }

  if (
    typeof image === "string" &&
    image.startsWith("data:")
  ) {
    return {
      path: null,
      url: image,
      size: null,
      orig_name: "bomba-input.jpg",
      mime_type:
        image.substring(
          5,
          image.indexOf(";")
        ) || "image/jpeg",
      is_stream: false,
      meta: {
        _type: "gradio.FileData",
      },
    };
  }

  return {
    path: null,
    url: image,
    size: null,
    orig_name: "bomba-input.jpg",
    mime_type: "image/jpeg",
    is_stream: false,
    meta: {
      _type: "gradio.FileData",
    },
  };
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractError(value) {
  if (!value) return null;

  if (typeof value === "string") {
    return value;
  }

  if (value.error) {
    return typeof value.error === "string"
      ? value.error
      : JSON.stringify(value.error);
  }

  if (value.message) {
    return value.message;
  }

  if (value.detail) {
    return typeof value.detail === "string"
      ? value.detail
      : JSON.stringify(value.detail);
  }

  return null;
}

function extractVideoUrl(value) {
  if (!value) return null;

  if (typeof value === "string") {
    return value.startsWith("http")
      ? value
      : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractVideoUrl(item);

      if (found) return found;
    }

    return null;
  }

  if (typeof value === "object") {
    const keys = [
      "url",
      "video",
      "video_url",
      "path",
      "output",
      "value",
    ];

    for (const key of keys) {
      if (value[key]) {
        const found =
          extractVideoUrl(value[key]);

        if (found) return found;
      }
    }

    if (Array.isArray(value.data)) {
      return extractVideoUrl(value.data);
    }
  }

  return null;
}

async function proxyVideo(videoUrl) {
  const response = await fetch(videoUrl);

  if (!response.ok) {
    throw new Error(
      `Unable to download generated video (${response.status}).`
    );
  }

  const contentType =
    response.headers.get("content-type") ||
    "video/mp4";

  const buffer =
    await response.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control":
        "public, max-age=31536000, immutable",
    },
  });
}

export async function POST(request) {
  try {
    const body = await request.json();

    const imageData =
      body.imageData ||
      body.image ||
      body.characterImage;

    const prompt =
      body.prompt ||
      "A realistic cinematic scene with natural human movement.";

    if (!imageData) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "Character image is required.",
        },
        { status: 400 }
      );
    }

    const gradioImage =
      toGradioImage(imageData);

    /*
      FREE TEST BACKEND

      The public Space accepts:

      1. input image
      2. prompt
      3. aspect ratio
      4. duration

      We deliberately use 5 seconds because
      the free endpoint only allows 2–5 seconds.
    */

    const data = [
      gradioImage,
      prompt,
      "832x480",
      5,
    ];

    console.log(
      "BOMBA FREE WAN DATA:",
      JSON.stringify(data)
    );

    const response = await fetch(
      WAN_API_URL,
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

    console.log(
      "BOMBA FREE WAN POST STATUS:",
      response.status
    );

    console.log(
      "BOMBA FREE WAN POST RESPONSE:",
      responseText
    );

    if (!response.ok) {
      const parsed =
        safeJson(responseText);

      return NextResponse.json(
        {
          status: "failed",
          error:
            extractError(parsed) ||
            responseText ||
            `Wan request failed with status ${response.status}.`,
        },
        { status: 502 }
      );
    }

    const parsed =
      safeJson(responseText);

    const eventId =
      parsed?.event_id;

    if (!eventId) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "Free Wan backend did not return an event ID.",
          rawResponse:
            responseText,
        },
        { status: 502 }
      );
    }

    console.log(
      "BOMBA FREE WAN EVENT ID:",
      eventId
    );

    return NextResponse.json({
      status: "queued",
      id: eventId,
      jobId: eventId,
      predictionId: eventId,
    });
  } catch (error) {
    console.error(
      "BOMBA FREE WAN POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        status: "failed",
        error:
          error?.message ||
          "Unable to start free video generation.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const { searchParams } =
    new URL(request.url);

  const eventId =
    searchParams.get("id") ||
    searchParams.get("jobId") ||
    searchParams.get("predictionId");

  if (!eventId) {
    return NextResponse.json(
      {
        status: "failed",
        error:
          "Missing generation ID.",
      },
      { status: 400 }
    );
  }

  console.log(
    "BOMBA FREE WAN CHECK ID:",
    eventId
  );

  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, POLL_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${WAN_API_URL}/${encodeURIComponent(
        eventId
      )}`,
      {
        method: "GET",
        headers: {
          Accept:
            "text/event-stream",
          "Cache-Control":
            "no-cache",
        },
        cache: "no-store",
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const responseText =
        await response.text();

      console.error(
        "BOMBA FREE WAN GET STATUS:",
        response.status
      );

      console.error(
        "BOMBA FREE WAN GET RESPONSE:",
        responseText
      );

      return NextResponse.json(
        {
          status: "failed",
          error:
            `Free Wan status request failed with status ${response.status}.`,
          rawWanResponse:
            responseText,
          jobId: eventId,
        },
        { status: 502 }
      );
    }

    if (!response.body) {
      return NextResponse.json({
        status: "processing",
        id: eventId,
        jobId: eventId,
        predictionId: eventId,
      });
    }

    const reader =
      response.body.getReader();

    const decoder =
      new TextDecoder();

    let buffer = "";

    while (true) {
      const {
        value,
        done,
      } = await reader.read();

      if (done) break;

      buffer += decoder.decode(
        value,
        { stream: true }
      );

      const events =
        buffer.split("\n\n");

      buffer =
        events.pop() || "";

      for (const event of events) {
        const lines =
          event.split("\n");

        for (const rawLine of lines) {
          const line =
            rawLine.trim();

          if (
            !line.startsWith("data:")
          ) {
            continue;
          }

          const rawData =
            line.slice(5).trim();

          if (!rawData) {
            continue;
          }

          const parsed =
            safeJson(rawData);

          console.log(
            "BOMBA FREE WAN EVENT:",
            JSON.stringify(parsed)
          );

          const error =
            extractError(parsed);

          if (error) {
            console.error(
              "BOMBA FREE WAN ERROR:",
              error
            );

            return NextResponse.json(
              {
                status: "failed",
                error,
                rawWanError:
                  rawData,
                jobId: eventId,
              },
              { status: 502 }
            );
          }

          const videoUrl =
            extractVideoUrl(parsed);

          if (videoUrl) {
            console.log(
              "BOMBA FREE WAN VIDEO:",
              videoUrl
            );

            return proxyVideo(
              videoUrl
            );
          }
        }
      }
    }

    return NextResponse.json({
      status: "processing",
      id: eventId,
      jobId: eventId,
      predictionId: eventId,
    });
  } catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      console.log(
        "BOMBA FREE WAN POLL WINDOW ENDED:",
        eventId
      );

      return NextResponse.json({
        status: "processing",
        id: eventId,
        jobId: eventId,
        predictionId: eventId,
      });
    }

    console.error(
      "BOMBA FREE WAN GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        status: "failed",
        error:
          error?.message ||
          "Unable to check free Wan generation.",
        jobId: eventId,
      },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}