import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const CARTESIA_API_KEY =
  process.env.CARTESIA_API_KEY;

const CARTESIA_URL =
  "https://api.cartesia.ai/tts/bytes";

const CARTESIA_MODEL =
  process.env.CARTESIA_MODEL || "sonic-3";

const DEFAULT_VOICE_ID =
  "a0e99841-438c-4a64-b679-ae501e7d6091";

const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_VOICE_PRESET ||
  "bomba_voice";

function buildAudioText(type, prompt) {
  const cleanPrompt =
    typeof prompt === "string"
      ? prompt.trim()
      : "";

  const soundType =
    typeof type === "string"
      ? type.trim()
      : "Background Music";

  if (!cleanPrompt) {
    return `${soundType}.`;
  }

  return `${cleanPrompt}.`;
}

async function uploadSoundToCloudinary(
  audioBuffer
) {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error(
      "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not configured."
    );
  }

  const formData = new FormData();

  const audioBlob = new Blob(
    [audioBuffer],
    {
      type: "audio/mpeg",
    }
  );

  formData.append(
    "file",
    audioBlob,
    `bomba-sound-${Date.now()}.mp3`
  );

  formData.append(
    "upload_preset",
    CLOUDINARY_UPLOAD_PRESET
  );

  formData.append(
    "folder",
    "bomba/sounds"
  );

  const uploadUrl =
    `https://api.cloudinary.com/v1_1/` +
    `${CLOUDINARY_CLOUD_NAME}/video/upload`;

  const uploadResponse =
    await fetch(uploadUrl, {
      method: "POST",
      body: formData,
      cache: "no-store",
    });

  const uploadText =
    await uploadResponse.text();

  let uploadData = {};

  try {
    uploadData =
      JSON.parse(uploadText);
  } catch {
    uploadData = {};
  }

  if (!uploadResponse.ok) {
    console.error(
      "BOMBA CLOUDINARY SOUND UPLOAD ERROR:",
      uploadText
    );

    throw new Error(
      uploadData?.error?.message ||
        uploadText ||
        `Cloudinary returned HTTP ${uploadResponse.status}.`
    );
  }

  const secureUrl =
    uploadData?.secure_url ||
    uploadData?.url ||
    null;

  if (
    !secureUrl ||
    !/^https?:\/\//i.test(secureUrl)
  ) {
    console.error(
      "BOMBA CLOUDINARY SOUND INVALID URL:",
      uploadData
    );

    throw new Error(
      "Cloudinary did not return a valid HTTP or HTTPS sound URL."
    );
  }

  console.log(
    "BOMBA CLOUDINARY SOUND UPLOADED:",
    secureUrl
  );

  return {
    audioUrl: secureUrl,
    publicId:
      uploadData?.public_id || null,
    resourceType:
      uploadData?.resource_type || "video",
  };
}

export async function POST(request) {
  try {
    if (!CARTESIA_API_KEY) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "CARTESIA_API_KEY is not configured in Vercel.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const type =
      typeof body?.type === "string"
        ? body.type
        : "Background Music";

    const prompt =
      typeof body?.prompt === "string"
        ? body.prompt.trim()
        : "";

    if (!prompt) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "Please describe the sound you want.",
        },
        { status: 400 }
      );
    }

    const voiceId =
      typeof body?.voiceId === "string" &&
      body.voiceId.trim()
        ? body.voiceId.trim()
        : DEFAULT_VOICE_ID;

    const finalText =
      buildAudioText(type, prompt);

    console.log(
      "BOMBA CARTESIA SOUND STARTING:",
      {
        type,
        model: CARTESIA_MODEL,
        voiceId,
        textLength: finalText.length,
      }
    );

    const response = await fetch(
      CARTESIA_URL,
      {
        method: "POST",
        headers: {
          "X-API-Key": CARTESIA_API_KEY,
          "Cartesia-Version": "2025-04-16",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_id: CARTESIA_MODEL,

          transcript: finalText,

          voice: {
            mode: "id",
            id: voiceId,
          },

          language: "en",

          output_format: {
            container: "mp3",
            encoding: "mp3",
            sample_rate: 44100,
          },
        }),

        cache: "no-store",
      }
    );

    console.log(
      "BOMBA CARTESIA SOUND STATUS:",
      response.status
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "BOMBA CARTESIA SOUND ERROR:",
        errorText
      );

      return NextResponse.json(
        {
          status: "failed",
          error:
            errorText ||
            `Cartesia returned HTTP ${response.status}.`,
        },
        {
          status:
            response.status >= 400 &&
            response.status < 500
              ? response.status
              : 502,
        }
      );
    }

    const audioBuffer =
      await response.arrayBuffer();

    if (!audioBuffer.byteLength) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "Cartesia returned an empty audio file.",
        },
        { status: 502 }
      );
    }

    console.log(
      "BOMBA CARTESIA SOUND COMPLETED:",
      audioBuffer.byteLength,
      "bytes"
    );

    // Upload the generated MP3 to Cloudinary.
    // This converts the Cartesia audio into a real
    // HTTPS URL that the final video mixer can access.
    const cloudinarySound =
      await uploadSoundToCloudinary(
        audioBuffer
      );

    return NextResponse.json(
      {
        status: "completed",

        audioUrl:
          cloudinarySound.audioUrl,

        publicId:
          cloudinarySound.publicId,

        resourceType:
          cloudinarySound.resourceType,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "BOMBA CARTESIA SOUND SERVER ERROR:",
      error
    );

    return NextResponse.json(
      {
        status: "failed",
        error:
          error?.message ||
          "Unexpected error while generating sound.",
      },
      { status: 500 }
    );
  }
}