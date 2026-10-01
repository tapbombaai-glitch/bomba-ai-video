import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";

const CLOUDINARY_VIDEO_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_VIDEO_PRESET || "";

const CLOUDINARY_UPLOAD_URL =
  CLOUDINARY_CLOUD_NAME
    ? `https://api.cloudinary.com/v1_1/${encodeURIComponent(
        CLOUDINARY_CLOUD_NAME
      )}/video/upload`
    : "";

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function cloudinaryLayerId(publicId) {
  return String(publicId || "")
    .replace(/\//g, ":")
    .trim();
}

/* =========================================================
   POST
   Eternal AI VIDEO URL
        +
   Cloudinary VOICE PUBLIC ID
        ↓
   FINAL VIDEO URL
========================================================= */

export async function POST(request) {
  try {
    if (!CLOUDINARY_CLOUD_NAME) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not configured.",
        },
        { status: 500 }
      );
    }

    if (!CLOUDINARY_VIDEO_PRESET) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "NEXT_PUBLIC_CLOUDINARY_VIDEO_PRESET is not configured.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const videoUrl =
      typeof body?.videoUrl === "string"
        ? body.videoUrl.trim()
        : "";

    const voicePublicId =
      typeof body?.voicePublicId === "string"
        ? body.voicePublicId.trim()
        : "";

    if (!videoUrl) {
      return NextResponse.json(
        {
          status: "failed",
          error: "videoUrl is required.",
        },
        { status: 400 }
      );
    }

    if (!voicePublicId) {
      return NextResponse.json(
        {
          status: "failed",
          error: "voicePublicId is required.",
        },
        { status: 400 }
      );
    }

    if (
      !videoUrl.startsWith("https://") &&
      !videoUrl.startsWith("http://")
    ) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "The supplied video URL must be a valid HTTP or HTTPS URL.",
        },
        { status: 400 }
      );
    }

    console.log(
      "======================================"
    );

    console.log(
      "BOMBA FINAL VIDEO STARTING"
    );

    console.log(
      "ETERNAL VIDEO:",
      videoUrl
    );

    console.log(
      "VOICE PUBLIC ID:",
      voicePublicId
    );

    console.log(
      "======================================"
    );

    /* =====================================================
       STEP 1
       Upload Eternal AI video into Cloudinary.
    ===================================================== */

    const formData = new FormData();

    formData.append("file", videoUrl);

    formData.append(
      "upload_preset",
      CLOUDINARY_VIDEO_PRESET
    );

    const uploadResponse = await fetch(
      CLOUDINARY_UPLOAD_URL,
      {
        method: "POST",
        body: formData,
        cache: "no-store",
      }
    );

    const uploadText =
      await uploadResponse.text();

    const uploadData =
      safeParse(uploadText);

    console.log(
      "BOMBA CLOUDINARY VIDEO UPLOAD STATUS:",
      uploadResponse.status
    );

    if (!uploadResponse.ok) {
      console.error(
        "BOMBA CLOUDINARY VIDEO UPLOAD ERROR:",
        uploadText.slice(0, 1500)
      );

      return NextResponse.json(
        {
          status: "failed",
          error:
            uploadData?.error?.message ||
            uploadData?.error ||
            `Cloudinary video upload failed with HTTP ${uploadResponse.status}.`,
        },
        {
          status:
            uploadResponse.status >= 400 &&
            uploadResponse.status < 500
              ? uploadResponse.status
              : 502,
        }
      );
    }

    const videoPublicId =
      uploadData?.public_id;

    if (!videoPublicId) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "Cloudinary uploaded the video but did not return a public ID.",
        },
        { status: 502 }
      );
    }

    console.log(
      "BOMBA CLOUDINARY VIDEO PUBLIC ID:",
      videoPublicId
    );

    /* =====================================================
       STEP 2
       Build automatic audio overlay transformation.
       
       ac_none
       ↓
       remove existing video audio

       l_audio:VOICE
       ↓
       add 9jaLingo voice
    ===================================================== */

    const safeVideoPublicId =
      videoPublicId;

    const safeVoicePublicId =
      cloudinaryLayerId(
        voicePublicId
      );

    const finalVideoUrl =
      `https://res.cloudinary.com/${encodeURIComponent(
        CLOUDINARY_CLOUD_NAME
      )}/video/upload/ac_none/l_audio:${safeVoicePublicId}/fl_layer_apply/${safeVideoPublicId}.mp4`;

    console.log(
      "BOMBA FINAL VIDEO URL:",
      finalVideoUrl
    );

    /* =====================================================
       RETURN FINAL VIDEO
    ===================================================== */

    return NextResponse.json(
      {
        status: "completed",
        videoUrl: finalVideoUrl,
        finalVideoUrl,
        cloudinaryVideoPublicId:
          videoPublicId,
        cloudinaryVoicePublicId:
          voicePublicId,
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
      "BOMBA FINAL VIDEO ERROR:",
      error
    );

    return NextResponse.json(
      {
        status: "failed",
        error:
          error?.message ||
          "Unable to automatically combine the video and voice.",
      },
      { status: 500 }
    );
  }
}