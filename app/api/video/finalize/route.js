import { NextResponse } from "next/server";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs/promises";
import os from "os";
import path from "path";
import crypto from "crypto";

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

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function cloudinaryAudioUrl(publicId) {
  const cleanId = String(publicId || "")
    .trim()
    .replace(/^\/+/, "");

  return `https://res.cloudinary.com/${encodeURIComponent(
    CLOUDINARY_CLOUD_NAME
  )}/video/upload/${cleanId}.mp3`;
}

async function downloadFile(url, outputPath) {
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Unable to download media. HTTP ${response.status}`
    );
  }

  const buffer = Buffer.from(
    await response.arrayBuffer()
  );

  await fs.writeFile(outputPath, buffer);

  return outputPath;
}

function runFfmpeg({
  videoPath,
  audioPaths,
  audioStartTimes,
  soundPath,
  outputPath,
}) {
  return new Promise((resolve, reject) => {
    const command = ffmpeg(videoPath);
    if (soundPath) {
  command.input(soundPath);
}
    audioPaths.forEach((audioPath) => {
      command.input(audioPath);
    });

    const inputCount = audioPaths.length;

    const filterParts = [];

    /*
      Prepare each character voice.

      Example:

      Voice A starts at 0 sec
      Voice B starts at 4.5 sec
      Voice C starts at 8 sec
    */

    audioPaths.forEach((_, index) => {
      const delayMs = Math.max(
        0,
        Math.round(
          Number(audioStartTimes[index] || 0) * 1000
        )
      );

      filterParts.push(
    `[${index + 2}:a]adelay=${delayMs}|${delayMs}[voice${index}]`
      );
    });

    const mixInputs = audioPaths
      .map((_, index) => `[voice${index}]`)
      .join("");

    filterParts.push(
  `${mixInputs}amix=inputs=${inputCount}:duration=longest:dropout_transition=0[mixedVoice]`
);

if (soundPath) {
  filterParts.push(
    `[1:a]volume=0.22[backgroundSound]`
  );

  filterParts.push(
    `[mixedVoice][backgroundSound]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0[mixedAudio]`
  );
} else {
  filterParts.push(
    `[mixedVoice]anull[mixedAudio]`
  );
}

filterParts.push(`[0:v]copy[vout]`);

command
  .complexFilter(filterParts)
  .outputOptions([
    "-map [vout]",
    "-map [mixedAudio]",
    "-c:v copy",
    "-c:a aac",
    "-b:a 192k",
    "-shortest",
    "-movflags +faststart",
  ])
      .on("start", (commandLine) => {
        console.log(
          "BOMBA FFMPEG START:",
          commandLine
        );
      })
      .on("progress", (progress) => {
        if (progress?.percent) {
          console.log(
            `BOMBA FFMPEG PROGRESS: ${progress.percent.toFixed(
              1
            )}%`
          );
        }
      })
      .on("end", () => {
        console.log(
          "BOMBA FFMPEG COMPLETE"
        );

        resolve();
      })
      .on("error", (error) => {
        console.error(
          "BOMBA FFMPEG ERROR:",
          error
        );

        reject(error);
      })
      .save(outputPath);
  });
}

export async function POST(request) {
  let workDir = "";

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

    if (!ffmpegPath) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "FFmpeg binary is not available.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const videoUrl =
      typeof body?.videoUrl === "string"
        ? body.videoUrl.trim()
        : "";

    /*
      NEW MULTI-VOICE FORMAT

      voiceTracks: [
        {
          publicId: "voice/daniel",
          startTime: 0
        },
        {
          publicId: "voice/sarah",
          startTime: 4.5
        }
      ]
    */

    const incomingVoiceTracks = Array.isArray(
      body?.voiceTracks
    )
      ? body.voiceTracks
      : [];

    /*
      BACKWARD COMPATIBILITY

      The old frontend can still send:

      voicePublicId: "voice/daniel"
    */

    const legacyVoicePublicId =
      typeof body?.voicePublicId === "string"
        ? body.voicePublicId.trim()
        : "";

    const voiceTracks =
      incomingVoiceTracks.length > 0
        ? incomingVoiceTracks
            .map((track) => ({
              publicId:
                typeof track?.publicId === "string"
                  ? track.publicId.trim()
                  : "",
              startTime:
                Number.isFinite(
                  Number(track?.startTime)
                )
                  ? Number(track.startTime)
                  : 0,
            }))
            .filter(
              (track) => track.publicId
            )
        : legacyVoicePublicId
        ? [
            {
              publicId: legacyVoicePublicId,
              startTime: 0,
            },
          ]
        : [];

    if (!videoUrl) {
      return NextResponse.json(
        {
          status: "failed",
          error: "videoUrl is required.",
        },
        { status: 400 }
      );
    }

    if (!voiceTracks.length) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "At least one voice track is required.",
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
      "BOMBA MULTI-VOICE FINAL VIDEO STARTING"
    );

    console.log(
      "ETERNAL VIDEO:",
      videoUrl
    );

    console.log(
      "VOICE TRACK COUNT:",
      voiceTracks.length
    );

    console.log(
      "VOICE TRACKS:",
      voiceTracks
    );

    console.log(
      "======================================"
    );

    /*
      STEP 1
      Create temporary working directory.
    */

    workDir = path.join(
      os.tmpdir(),
      `bomba-final-${crypto
        .randomBytes(8)
        .toString("hex")}`
    );

    await fs.mkdir(workDir, {
      recursive: true,
    });

    const videoInputPath = path.join(
      workDir,
      "input-video.mp4"
    );

    /*
      STEP 2
      Download Eternal AI video.
    */

    await downloadFile(
      videoUrl,
      videoInputPath
    );

    console.log(
      "BOMBA VIDEO DOWNLOADED:",
      videoInputPath
    );

    /*
      STEP 3
      Download every character voice.
    */

    const audioPaths = [];
    const audioStartTimes = [];

    for (
      let index = 0;
      index < voiceTracks.length;
      index++
    ) {
      const track =
        voiceTracks[index];

      const audioUrl =
        cloudinaryAudioUrl(
          track.publicId
        );

      const audioPath = path.join(
        workDir,
        `voice-${index}.mp3`
      );

      console.log(
        `BOMBA DOWNLOADING VOICE ${index + 1}:`,
        audioUrl
      );

      await downloadFile(
        audioUrl,
        audioPath
      );

      audioPaths.push(audioPath);

      audioStartTimes.push(
        track.startTime
      );
    }

    /*
      STEP 4
      Mix all character voices with
      their individual start times.
    */

    const mixedVideoPath =
      path.join(
        workDir,
        "mixed-video.mp4"
      );

    await runFfmpeg({
      videoPath: videoInputPath,
      audioPaths,
      audioStartTimes,
      outputPath: mixedVideoPath,
    });

    /*
      STEP 5
      Upload finished video to Cloudinary.
    */

    const uploadFormData =
      new FormData();

    const finishedVideoBuffer =
      await fs.readFile(
        mixedVideoPath
      );

    uploadFormData.append(
      "file",
      new Blob([
        finishedVideoBuffer,
      ]),
      "bomba-final-video.mp4"
    );

    uploadFormData.append(
      "upload_preset",
      CLOUDINARY_VIDEO_PRESET
    );

    const uploadResponse =
      await fetch(
        CLOUDINARY_UPLOAD_URL,
        {
          method: "POST",
          body: uploadFormData,
          cache: "no-store",
        }
      );

    const uploadText =
      await uploadResponse.text();

    const uploadData =
      safeParse(uploadText);

    console.log(
      "BOMBA FINAL CLOUDINARY UPLOAD STATUS:",
      uploadResponse.status
    );

    if (!uploadResponse.ok) {
      console.error(
        "BOMBA FINAL CLOUDINARY UPLOAD ERROR:",
        uploadText.slice(
          0,
          1500
        )
      );

      return NextResponse.json(
        {
          status: "failed",
          error:
            uploadData?.error?.message ||
            uploadData?.error ||
            `Cloudinary final video upload failed with HTTP ${uploadResponse.status}.`,
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

    const finalVideoPublicId =
      uploadData?.public_id;

    const finalVideoUrl =
      uploadData?.secure_url ||
      uploadData?.url;

    if (
      !finalVideoPublicId ||
      !finalVideoUrl
    ) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "Cloudinary uploaded the final video but did not return a usable video URL.",
        },
        { status: 502 }
      );
    }

    console.log(
      "BOMBA FINAL VIDEO PUBLIC ID:",
      finalVideoPublicId
    );

    console.log(
      "BOMBA FINAL VIDEO URL:",
      finalVideoUrl
    );

    return NextResponse.json(
      {
        status: "completed",
        videoUrl: finalVideoUrl,
        finalVideoUrl,
        cloudinaryVideoPublicId:
          finalVideoPublicId,
        voiceTracks,
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
    console.error(
      "BOMBA FINAL VIDEO ERROR:",
      error
    );

    return NextResponse.json(
      {
        status: "failed",
        error:
          error?.message ||
          "Unable to combine the video and character voices.",
      },
      { status: 500 }
    );
  } finally {
    /*
      Always clean temporary files.
    */

    if (workDir) {
      try {
        await fs.rm(
          workDir,
          {
            recursive: true,
            force: true,
          }
        );
      } catch (cleanupError) {
        console.error(
          "BOMBA TEMP CLEANUP ERROR:",
          cleanupError
        );
      }
    }
  }
}