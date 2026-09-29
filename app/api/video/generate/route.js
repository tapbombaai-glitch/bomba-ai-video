export const runtime = "nodejs";
export const maxDuration = 300;

const WAN_API_URL =
  "https://alexcheng0072-wan27-free-video-generator.hf.space/gradio_api/call/generate_video";

const WAN_BASE_URL =
  "https://alexcheng0072-wan27-free-video-generator.hf.space";

const POLL_TIMEOUT_MS = 150000;

const DEFAULT_NEGATIVE_PROMPT =
  "nsfw, nudity, explicit content, watermark, text, signature, subtitles, low quality, blurry, deformed, disfigured, static frame";

/**
 * Convert a browser data URL into a Gradio-compatible data URL.
 */
function toGradioImage(imageData) {
  if (!imageData || typeof imageData !== "string") {
    return null;
  }

  if (imageData.startsWith("data:image/")) {
    return imageData;
  }

  return `data:image/jpeg;base64,${imageData}`;
}

/**
 * Safely parse JSON.
 */
async function safeJson(response) {
  const text = await response.text();

  try {
    return {
      text,
      json: JSON.parse(text),
    };
  } catch {
    return {
      text,
      json: null,
    };
  }
}

/**
 * Extract useful error information.
 */
function extractError(json, text, status) {
  if (json?.error) {
    return String(json.error);
  }

  if (json?.message) {
    return String(json.message);
  }

  if (text) {
    const clean = text.replace(/\s+/g, " ").trim();

    if (clean.length <= 500) {
      return clean;
    }

    return clean.slice(0, 500);
  }

  return `HTTP ${status}`;
}

/**
 * Try to find a video URL inside Gradio's result.
 */
function extractVideoUrl(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    if (
      value.includes(".mp4") ||
      value.includes("/file=") ||
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

      if (found) {
        return found;
      }
    }

    return null;
  }

  if (typeof value === "object") {
    const possibleKeys = [
      "url",
      "path",
      "name",
      "video",
      "file",
      "value",
    ];

    for (const key of possibleKeys) {
      if (value[key]) {
        const found = extractVideoUrl(value[key]);

        if (found) {
          return found;
        }
      }
    }

    for (const key of Object.keys(value)) {
      const found = extractVideoUrl(value[key]);

      if (found) {
        return found;
      }
    }
  }

  return null;
}

/**
 * Turn a relative Gradio file path into a usable URL.
 */
function normalizeVideoUrl(videoUrl) {
  if (!videoUrl) {
    return null;
  }

  if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
    return videoUrl;
  }

  if (videoUrl.startsWith("/")) {
    return `${WAN_BASE_URL}${videoUrl}`;
  }

  return `${WAN_BASE_URL}/${videoUrl}`;
}

/**
 * Proxy the generated video through BOMBA.
 *
 * This avoids exposing the temporary Hugging Face file URL directly
 * and allows the browser to receive the video from our own API route.
 */
async function proxyVideo(videoUrl) {
  const normalizedUrl = normalizeVideoUrl(videoUrl);

  if (!normalizedUrl) {
    throw new Error("Generated video URL was empty.");
  }

  console.log("BOMBA FREE WAN PROXY URL:", normalizedUrl);

  const response = await fetch(normalizedUrl, {
    method: "GET",
    redirect: "follow",
  });

  if (!response.ok) {
    const body = await response.text();

    console.error(
      "BOMBA FREE WAN PROXY ERROR:",
      response.status,
      body.slice(0, 500)
    );

    throw new Error(
      `Unable to download generated video. HTTP ${response.status}`
    );
  }

  const contentType =
    response.headers.get("content-type") || "video/mp4";

  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * POST
 *
 * Starts a Wan 2.2 generation job.
 *
 * The current free Space accepts:
 *   1. image
 *   2. prompt
 *   3. aspect ratio
 *   4. duration
 *
 * The Space itself enforces:
 *   - 2–5 seconds
 *   - 832x480
 *   - 480x832
 *   - 640x640
 *   - 4 inference steps
 */
export async function POST(request) {
  try {
    const body = await request.json();

    const imageData =
      body?.imageData ||
      body?.image ||
      body?.characterImage ||
      null;

    const prompt =
      typeof body?.prompt === "string" && body.prompt.trim()
        ? body.prompt.trim()
        : "A realistic cinematic video with natural human movement.";

    const gradioImage = toGradioImage(imageData);

    if (!gradioImage) {
      return Response.json(
        {
          error: "Character image is required.",
        },
        {
          status: 400,
        }
      );
    }

    /**
     * Keep the free test at the minimum 2 seconds.
     *
     * This is deliberate:
     * first we prove that the complete BOMBA → Wan → video
     * pipeline works.
     */
    const data = [
      gradioImage,
      prompt.slice(0, 600),
      "832x480",
      2,
    ];

    console.log("BOMBA FREE WAN DATA:", {
      hasImage: Boolean(gradioImage),
      promptLength: prompt.length,
      aspectRatio: "832x480",
      duration: 2,
    });

    const response = await fetch(WAN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        data,
      }),
    });

    const result = await safeJson(response);

    console.log(
      "BOMBA FREE WAN POST STATUS:",
      response.status
    );

    console.log(
      "BOMBA FREE WAN POST RESPONSE:",
      result.text.slice(0, 2000)
    );

    if (!response.ok) {
      throw new Error(
        `Wan POST failed: ${extractError(
          result.json,
          result.text,
          response.status
        )}`
      );
    }

    const eventId = result.json?.event_id;

    if (!eventId) {
      throw new Error(
        "Wan did not return an event ID."
      );
    }

    console.log(
      "BOMBA FREE WAN EVENT ID:",
      eventId
    );

    return Response.json({
      status: "processing",
      predictionId: eventId,
      eventId,
    });
  } catch (error) {
    console.error(
      "BOMBA FREE WAN POST ERROR:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Video generation request failed.",
      },
      {
        status: 502,
      }
    );
  }
}

/**
 * GET
 *
 * Wait for the existing Wan event.
 *
 * IMPORTANT:
 * The previous version only waited 25 seconds.
 * The current Space can require substantially longer,
 * so this version waits up to 150 seconds.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const eventId =
    searchParams.get("eventId") ||
    searchParams.get("predictionId") ||
    searchParams.get("id");

  if (!eventId) {
    return Response.json(
      {
        error: "Missing eventId.",
      },
      {
        status: 400,
      }
    );
  }

  const pollUrl =
    `${WAN_API_URL}/${encodeURIComponent(eventId)}`;

  console.log(
    "BOMBA FREE WAN CHECK ID:",
    eventId
  );

  console.log(
    "BOMBA FREE WAN POLL URL:",
    pollUrl
  );

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, POLL_TIMEOUT_MS);

  try {
    const response = await fetch(pollUrl, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
      signal: controller.signal,
    });

    console.log(
      "BOMBA FREE WAN GET STATUS:",
      response.status
    );

    if (!response.ok) {
      const text = await response.text();

      console.error(
        "BOMBA FREE WAN GET RESPONSE:",
        text.slice(0, 2000)
      );

      throw new Error(
        `Wan polling failed: ${extractError(
          null,
          text,
          response.status
        )}`
      );
    }

    if (!response.body) {
      throw new Error(
        "Wan polling returned no response body."
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, {
        stream: true,
      });

      /**
       * Gradio sends SSE messages separated by blank lines.
       */
      const messages = buffer.split(/\n\n/);

      buffer = messages.pop() || "";

      for (const message of messages) {
        const lines = message.split(/\r?\n/);

        let eventType = "";
        let dataText = "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line
              .slice(6)
              .trim();
          }

          if (line.startsWith("data:")) {
            dataText += line
              .slice(5)
              .trim();
          }
        }

        if (!eventType && !dataText) {
          continue;
        }

        console.log(
          "BOMBA FREE WAN SSE EVENT:",
          eventType
        );

        if (!dataText) {
          continue;
        }

        let eventData = null;

        try {
          eventData = JSON.parse(dataText);
        } catch {
          eventData = dataText;
        }

        console.log(
          "BOMBA FREE WAN SSE DATA:",
          typeof eventData === "string"
            ? eventData.slice(0, 500)
            : JSON.stringify(eventData).slice(0, 1500)
        );

        /**
         * Generation failed.
         */
        if (
          eventType === "error" ||
          eventType === "failed"
        ) {
          throw new Error(
            extractError(
              typeof eventData === "object"
                ? eventData
                : null,
              typeof eventData === "string"
                ? eventData
                : "",
              500
            )
          );
        }

        /**
         * Generation completed.
         */
        if (
          eventType === "complete" ||
          eventType === "completed"
        ) {
          const videoUrl = extractVideoUrl(
            eventData
          );

          console.log(
            "BOMBA FREE WAN VIDEO:",
            videoUrl
          );

          if (!videoUrl) {
            throw new Error(
              "Wan completed but no video URL was returned."
            );
          }

          clearTimeout(timeout);

          return proxyVideo(videoUrl);
        }
      }
    }

    throw new Error(
      "Wan closed the event stream without returning a completed video."
    );
  } catch (error) {
    if (error?.name === "AbortError") {
      console.error(
        "BOMBA FREE WAN POLL TIMEOUT:",
        eventId
      );

      return Response.json({
        status: "processing",
        predictionId: eventId,
        eventId,
        message:
          "Video is still processing. Please poll again.",
      });
    }

    console.error(
      "BOMBA FREE WAN ERROR:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Video generation failed.",
      },
      {
        status: 502,
      }
    );
  } finally {
    clearTimeout(timeout);
  }
}