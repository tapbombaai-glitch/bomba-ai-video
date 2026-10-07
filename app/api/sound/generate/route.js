// ============================================
// BOMBA AI VIDEO STUDIO
// FILE: app/api/sound/generate/route.js
//
// PURPOSE:
// Generate background sound/music with Cartesia
// Upload generated MP3 to Cloudinary
// Return a public HTTPS audio URL
//
// PIPELINE:
//
// BOMBA
//   ↓
// /api/sound/generate
//   ↓
// Cartesia
//   ↓
// MP3
//   ↓
// Cloudinary
//   ↓
// audioUrl + publicId
//   ↓
// /api/video/finalize
//
// IMPORTANT:
// - No FFmpeg here
// - No video generation here
// - No Eternal AI here
// - API keys remain server-side
// ============================================

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

// ============================================
// ENVIRONMENT
// ============================================

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

// ============================================
// BUILD SOUND TEXT
// ============================================

function buildAudioText(type, prompt) {
  const cleanPrompt =
    typeof prompt === "string"
      ? prompt.trim()
      : "";

  const soundType =
    typeof type === "string" &&
    type.trim()
      ? type.trim()
      : "Background Music";

  if (!cleanPrompt) {
    return `${soundType}.`;
  }

  return `${cleanPrompt}.`;
}

// ============================================
// UPLOAD SOUND TO CLOUDINARY
// ============================================

async function uploadSoundToCloudinary(
  audioBuffer
) {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error(
      "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not configured."
    );
  }

  if (!CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      "NEXT_PUBLIC_CLOUDINARY_VOICE_PRESET is not configured."
    );
  }

  if (!audioBuffer || !audioBuffer.byteLength) {
    throw new Error(
      "Cannot upload an empty sound file."
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
      "BOMBA CLOUDINARY SOUND UPLOAD FAILED:",
      {
        status: uploadResponse.status,
      }
    );

    throw new Error(
      uploadData?.error?.message ||
        `Cloudinary returned HTTP ${uploadResponse.status}.`
    );
  }

  const secureUrl =
    uploadData?.secure_url ||
    uploadData?.url ||
    null;

  const publicId =
    uploadData?.public_id ||
    null;

  const resourceType =
    uploadData?.resource_type ||
    "video";

  if (
    !secureUrl ||
    !/^https?:\/\//i.test(secureUrl)
  ) {
    throw new Error(
      "Cloudinary did not return a valid HTTPS sound URL."
    );
  }

  if (!publicId) {
    throw new Error(
      "Cloudinary did not return a sound public_id."
    );
  }

  console.log(
    "BOMBA CLOUDINARY SOUND UPLOAD COMPLETE:",
    {
      resourceType,
      hasPublicId: true,
    }
  );

  return {
    audioUrl: secureUrl,
    publicId,
    resourceType,
  };
}

// ============================================
// POST
// ============================================

export async function POST(request) {
  try {
    // ========================================
    // CHECK CARTESIA KEY
    // ========================================

    if (!CARTESIA_API_KEY) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "CARTESIA_API_KEY is not configured in Vercel.",
        },
        {
          status: 500,
        }
      );
    }

    // ========================================
    // READ REQUEST
    // ========================================

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          status: "failed",
          error: "Invalid JSON request body.",
        },
        {
          status: 400,
        }
      );
    }

    const type =
      typeof body?.type === "string" &&
      body.type.trim()
        ? body.type.trim()
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
        {
          status: 400,
        }
      );
    }

    // Prevent unnecessarily huge sound prompts.
    if (prompt.length > 2000) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "Sound prompt is too long. Please keep it under 2000 characters.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================
    // VOICE
    // ========================================

    const voiceId =
      typeof body?.voiceId === "string" &&
      body.voiceId.trim()
        ? body.voiceId.trim()
        : DEFAULT_VOICE_ID;

    // ========================================
    // FINAL CARTESIA TEXT
    // ========================================

    const finalText =
      buildAudioText(
        type,
        prompt
      );

    console.log(
      "BOMBA CARTESIA SOUND STARTING:",
      {
        type,
        model: CARTESIA_MODEL,
        textLength: finalText.length,
      }
    );

    // ========================================
    // CARTESIA REQUEST
    // ========================================

    const response =
      await fetch(
        CARTESIA_URL,
        {
          method: "POST",

          headers: {
            "X-API-Key":
              CARTESIA_API_KEY,

            "Cartesia-Version":
              "2025-04-16",

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            model_id:
              CARTESIA_MODEL,

            transcript:
              finalText,

            voice: {
              mode: "id",
              id: voiceId,
            },

            language:
              "en",

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

    // ========================================
    // CARTESIA ERROR
    // ========================================

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "BOMBA CARTESIA SOUND FAILED:",
        {
          status: response.status,
        }
      );

      let readableError =
        `Cartesia returned HTTP ${response.status}.`;

      try {
        const errorData =
          JSON.parse(errorText);

        readableError =
          errorData?.message ||
          errorData?.error ||
          errorData?.detail ||
          readableError;
      } catch {
        // Keep safe generic message.
      }

      return NextResponse.json(
        {
          status: "failed",
          error: readableError,
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

    // ========================================
    // READ AUDIO
    // ========================================

    const audioBuffer =
      await response.arrayBuffer();

    if (
      !audioBuffer ||
      !audioBuffer.byteLength
    ) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "Cartesia returned an empty audio file.",
        },
        {
          status: 502,
        }
      );
    }

    console.log(
      "BOMBA CARTESIA SOUND COMPLETED:",
      {
        bytes:
          audioBuffer.byteLength,
      }
    );

    // ========================================
    // CLOUDINARY
    // ========================================

    const cloudinarySound =
      await uploadSoundToCloudinary(
        audioBuffer
      );

    // ========================================
    // FINAL RESPONSE
    // ========================================

    return NextResponse.json(
      {
        status: "completed",

        audioUrl:
          cloudinarySound.audioUrl,

        publicId:
          cloudinarySound.publicId,

        resourceType:
          cloudinarySound.resourceType,

        type,

        model:
          CARTESIA_MODEL,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    // ========================================
    // SERVER ERROR
    // ========================================

    console.error(
      "BOMBA CARTESIA SOUND SERVER ERROR:",
      error?.message ||
        "Unknown error"
    );

    return NextResponse.json(
      {
        status: "failed",
        error:
          error?.message ||
          "Unexpected error while generating sound.",
      },
      {
        status: 500,
      }
    );
  }
}