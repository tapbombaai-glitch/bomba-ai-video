import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const WAN_API_URL =
  "https://observantdistressed-wan2-2-i2v-v3.hf.space/gradio_api/call/generate_video";

const DEFAULT_NEGATIVE_PROMPT =
  "blurry, low quality, distorted face, deformed body, extra fingers, extra limbs, bad anatomy, unrealistic movement, flickering, duplicate person, duplicate body, text, watermark, logo, nudity, sexual content";

function toGradioImage(image) {
  if (!image) return null;

  if (
    typeof image === "object" &&
    (image.url || image.path)
  ) {
    return image;
  }

  const isData =
    typeof image === "string" &&
    image.startsWith("data:");

  return {
    path: null,
    url: image,
    size: null,
    orig_name: "bomba-input.jpg",
    mime_type: isData
      ? image.substring(5, image.indexOf(";")) || "image/jpeg"
      : "image/jpeg",
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
    if (typeof value.error === "string") {
      return value.error;
    }

    try {
      return JSON.stringify(value.error);
    } catch {
      return "Unknown Wan error";
    }
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
      "url",
      "output",
      "path",
      "value",
    ];

    for (const key of directKeys) {
      if (value[key]) {
        const found = extractVideoUrl(value[key]);

        if (found) {
          return found;
        }
      }
    }

    if (Array.isArray(value.data)) {
      const found = extractVideoUrl(value.data);

      if (found) {
        return found;
      }
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

  const contentLength =
    response.headers.get("content-length");

  const buffer = await response.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      ...(contentLength
        ? {
            "Content-Length": contentLength,
          }
        : {}),
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

    const mode =
      body.mode ||
      "Movie";

    if (!imageData) {
      return NextResponse.json(
        {
          error: "Character image is required.",
        },
        {
          status: 400,
        }
      );
    }

    const gradioImage =
      toGradioImage(imageData);

    console.log(
      "BOMBA WAN IMAGE TYPE:",
      typeof imageData
    );

    console.log(
      "BOMBA WAN GRADIO IMAGE:",
      JSON.stringify(gradioImage)
    );

    const finalPrompt = `
${prompt}

Mode: ${mode}.

Create a realistic cinematic live-action video.

Natural human movement.
Realistic facial expressions.
Realistic body proportions.
Realistic lighting.
Gentle cinematic camera movement.
Detailed environment.
Realistic skin texture.
Realistic clothing.
Natural atmosphere.
Photorealistic appearance.
Smooth motion.
Consistent character appearance.
`.trim();

    // Wan generation parameters.
    // Duration remains 5 seconds.
    const data = [
      gradioImage,
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

    console.log(
      "BOMBA WAN DATA:",
      JSON.stringify(data)
    );

    const response = await fetch(WAN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data,
      }),
    });

    const responseText =
      await response.text();

    console.log(
      "BOMBA WAN POST STATUS:",
      response.status
    );

    console.log(
      "BOMBA WAN POST RESPONSE:",
      responseText
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            extractError(
              safeJson(responseText)
            ) ||
            responseText ||
            `Wan request failed with status ${response.status}.`,
        },
        {
          status: 502,
        }
      );
    }

    const parsed =
      safeJson(responseText);

    const predictionId =
      parsed?.event_id ||
      parsed?.id ||
      parsed?.job_id ||
      parsed?.jobId;

    console.log(
      "BOMBA WAN EVENT ID:",
      predictionId
    );

    if (!predictionId) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "Wan did not return an event ID.",
          rawWanResponse:
            responseText,
        },
        {
          status: 502,
        }
      );
    }

    return NextResponse.json({
      status: "queued",
      id: predictionId,
      jobId: predictionId,
      predictionId,
    });
  } catch (error) {
    console.error(
      "BOMBA WAN POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        status: "failed",
        error:
          error?.message ||
          "Unable to start Wan video generation.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET(request) {
  const { searchParams } =
    new URL(request.url);

  const predictionId =
    searchParams.get("id") ||
    searchParams.get("jobId") ||
    searchParams.get("predictionId");

  if (!predictionId) {
    return NextResponse.json(
      {
        status: "failed",
        error:
          "Missing generation ID.",
      },
      {
        status: 400,
      }
    );
  }

  console.log(
    "BOMBA WAN CHECK ID:",
    predictionId
  );

  try {
    const response = await fetch(
      `${WAN_API_URL}/${encodeURIComponent(
        predictionId
      )}`,
      {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
        },
        cache: "no-store",
      }
    );

    const responseText =
      await response.text();

    console.log(
      "BOMBA WAN RESULT RESPONSE:",
      responseText
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            `Wan status request failed with status ${response.status}.`,
          rawWanResponse:
            responseText,
          jobId: predictionId,
        },
        {
          status: 502,
        }
      );
    }

    console.log(
      "BOMBA WAN EVENTS:",
      responseText
    );

    const lines =
      responseText.split("\n");

    for (
      let i = 0;
      i < lines.length;
      i++
    ) {
      const line =
        lines[i].trim();

      if (!line.startsWith("data:")) {
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
        "BOMBA WAN EVENT PARSED:",
        JSON.stringify(parsed)
      );

      const eventError =
        extractError(parsed);

      if (eventError) {
        console.error(
          "BOMBA WAN ERROR EVENT:",
          eventError
        );

        return NextResponse.json(
          {
            status: "failed",
            error: eventError,
            rawWanError: rawData,
            parsedWanError: parsed,
            rawWanResponse:
              responseText,
            jobId: predictionId,
          },
          {
            status: 502,
          }
        );
      }

      const videoUrl =
        extractVideoUrl(parsed);

      if (videoUrl) {
        console.log(
          "BOMBA WAN RESULT URL:",
          videoUrl
        );

        return proxyVideo(videoUrl);
      }
    }

    return NextResponse.json({
      status: "processing",
      id: predictionId,
      jobId: predictionId,
      predictionId,
    });
  } catch (error) {
    console.error(
      "BOMBA WAN GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        status: "failed",
        error:
          error?.message ||
          "Unable to check Wan generation.",
        jobId: predictionId,
      },
      {
        status: 502,
      }
    );
  }
}