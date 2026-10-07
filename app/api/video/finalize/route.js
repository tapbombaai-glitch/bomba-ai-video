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

const CLOUDINARY_UPLOAD_URL = CLOUDINARY_CLOUD_NAME
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

function cloudinaryAudioUrl(publicId) {
  const cleanId = String(publicId || "")
    .trim()
    .replace(/^\/+/, "");

  if (!cleanId || !CLOUDINARY_CLOUD_NAME) {
    return "";
  }

  return `https://res.cloudinary.com/${encodeURIComponent(
    CLOUDINARY_CLOUD_NAME
  )}/video/upload/${cleanId}.mp3`;
}

async function downloadFile(url, outputPath) {
  if (
    typeof url !== "string" ||
    (!url.startsWith("https://") &&
      !url.startsWith("http://"))
  ) {
    throw new Error(
      "Media URL must be a valid HTTP or HTTPS URL."
    );
  }

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

  if (!buffer.length) {
    throw new Error(
      "Downloaded media file is empty."
    );
  }

  await fs.writeFile(
    outputPath,
    buffer
  );

  return outputPath;
}

function runFfmpeg({
  videoPath,
  audioPaths,
  audioStartTimes,
  soundPath,
  outputPath,
}) {
  return new Promise(
    (resolve, reject) => {
      try {
        if (!videoPath) {
          reject(
            new Error(
              "FFmpeg video input is missing."
            )
          );
          return;
        }

        if (!audioPaths?.length) {
          reject(
            new Error(
              "FFmpeg requires at least one voice track."
            )
          );
          return;
        }

        const command =
          ffmpeg(videoPath);

        /*
          INPUT ORDER

          0 = video
          1 = background sound, if present
          2+ = character voices
        */

        if (soundPath) {
          command.input(soundPath);
        }

        audioPaths.forEach(
          (audioPath) => {
            command.input(audioPath);
          }
        );

        const filterParts = [];

        /*
          Prepare each character voice
          with its individual start time.
        */

        audioPaths.forEach(
          (_, index) => {
            const delaySeconds =
              Number(
                audioStartTimes?.[
                  index
                ] ?? 0
              );

            const safeDelay =
              Number.isFinite(
                delaySeconds
              ) &&
              delaySeconds >= 0
                ? delaySeconds
                : 0;

            const delayMs =
              Math.round(
                safeDelay * 1000
              );

            const inputIndex =
              index +
              (soundPath ? 2 : 1);

            filterParts.push(
              `[${inputIndex}:a]adelay=${delayMs}|${delayMs}[voice${index}]`
            );
          }
        );

        /*
          Mix all character voices.
        */

        const mixInputs =
          audioPaths
            .map(
              (_, index) =>
                `[voice${index}]`
            )
            .join("");

        filterParts.push(
          `${mixInputs}amix=inputs=${audioPaths.length}:duration=longest:dropout_transition=0[mixedVoice]`
        );

        /*
          Add background sound when available.
        */

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

        command
          .complexFilter(
            filterParts
          )
          .outputOptions([
            "-map 0:v:0",
            "-map [mixedAudio]",
            "-c:v copy",
            "-c:a aac",
            "-b:a 192k",
            "-shortest",
            "-movflags +faststart",
          ])
          .on(
            "start",
            (commandLine) => {
              console.log(
                "BOMBA FFMPEG START:",
                commandLine
              );
            }
          )
          .on(
            "progress",
            (progress) => {
              if (
                typeof progress?.percent ===
                "number"
              ) {
                console.log(
                  `BOMBA FFMPEG PROGRESS: ${progress.percent.toFixed(
                    1
                  )}%`
                );
              }
            }
          )
          .on(
            "end",
            () => {
              console.log(
                "BOMBA FFMPEG COMPLETE"
              );

              resolve();
            }
          )
          .on(
            "error",
            (error) => {
              console.error(
                "BOMBA FFMPEG ERROR:",
                error
              );

              reject(error);
            }
          )
          .save(outputPath);
      } catch (error) {
        reject(error);
      }
    }
  );
}

export async function POST(
  request
) {
  let workDir = "";

  try {
    /*
      ============================================
      01 — CONFIGURATION CHECK
      ============================================
    */

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

    console.log(
      "BOMBA FFMPEG STATIC PATH:",
      ffmpegPath
    );

    ffmpeg.setFfmpegPath(
      ffmpegPath
    );

    /*
      ============================================
      02 — READ REQUEST
      ============================================
    */

    const body =
      await request.json();

    const videoUrl =
      typeof body?.videoUrl ===
      "string"
        ? body.videoUrl.trim()
        : "";

    /*
      ============================================
      03 — VOICE TRACKS
      ============================================
    */

    const incomingVoiceTracks =
      Array.isArray(
        body?.voiceTracks
      )
        ? body.voiceTracks
        : [];

    const legacyVoicePublicId =
      typeof body?.voicePublicId ===
      "string"
        ? body.voicePublicId.trim()
        : "";

    const voiceTracks =
      incomingVoiceTracks.length >
      0
        ? incomingVoiceTracks
            .map((track) => ({
              publicId:
                typeof track?.publicId ===
                "string"
                  ? track.publicId.trim()
                  : "",

              startTime:
                Number.isFinite(
                  Number(
                    track?.startTime
                  )
                )
                  ? Math.max(
                      0,
                      Number(
                        track.startTime
                      )
                    )
                  : 0,
            }))
            .filter(
              (track) =>
                track.publicId
            )
        : legacyVoicePublicId
        ? [
            {
              publicId:
                legacyVoicePublicId,
              startTime: 0,
            },
          ]
        : [];

    /*
      ============================================
      04 — VALIDATE REQUEST
      ============================================
    */

    if (!videoUrl) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "videoUrl is required.",
        },
        { status: 400 }
      );
    }

    if (
      !videoUrl.startsWith(
        "https://"
      ) &&
      !videoUrl.startsWith(
        "http://"
      )
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

    /*
      ============================================
      05 — LOG FINALIZATION START
      ============================================
    */

    console.log(
      "======================================"
    );

    console.log(
      "BOMBA MULTI-VOICE FINAL VIDEO STARTING"
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
      ============================================
      06 — CREATE TEMP DIRECTORY
      ============================================
    */

    workDir = path.join(
      os.tmpdir(),
      `bomba-final-${crypto
        .randomBytes(8)
        .toString("hex")}`
    );

    await fs.mkdir(
      workDir,
      {
        recursive: true,
      }
    );

    const videoInputPath =
      path.join(
        workDir,
        "input-video.mp4"
      );

    /*
      ============================================
      07 — DOWNLOAD GENERATED VIDEO
      ============================================
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
      ============================================
      08 — DOWNLOAD CHARACTER VOICES
      ============================================
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

      if (!audioUrl) {
        throw new Error(
          `Unable to create Cloudinary audio URL for voice track ${index + 1}.`
        );
      }

      const audioPath =
        path.join(
          workDir,
          `voice-${index}.mp3`
        );

      console.log(
        `BOMBA DOWNLOADING VOICE ${
          index + 1
        }:`,
        audioUrl
      );

      await downloadFile(
        audioUrl,
        audioPath
      );

      audioPaths.push(
        audioPath
      );

      audioStartTimes.push(
        track.startTime
      );
    }

    /*
      ============================================
      09 — OPTIONAL BACKGROUND SOUND
      ============================================
    */

    let soundPath = "";

    const soundUrl =
      typeof body?.sound
        ?.audioUrl === "string"
        ? body.sound.audioUrl.trim()
        : "";

    if (soundUrl) {
      if (
        !soundUrl.startsWith(
          "https://"
        ) &&
        !soundUrl.startsWith(
          "http://"
        )
      ) {
        throw new Error(
          "The supplied background sound URL must be a valid HTTP or HTTPS URL."
        );
      }

      soundPath = path.join(
        workDir,
        "background-sound.mp3"
      );

      console.log(
        "BOMBA DOWNLOADING BACKGROUND SOUND:",
        soundUrl
      );

      await downloadFile(
        soundUrl,
        soundPath
      );

      console.log(
        "BOMBA BACKGROUND SOUND DOWNLOADED:",
        soundPath
      );
    }

    /*
      ============================================
      10 — MIX VIDEO + VOICES + SOUND
      ============================================
    */

    const mixedVideoPath =
      path.join(
        workDir,
        "mixed-video.mp4"
      );

    await runFfmpeg({
      videoPath:
        videoInputPath,

      audioPaths,

      audioStartTimes,

      soundPath,

      outputPath:
        mixedVideoPath,
    });

    /*
      ============================================
      11 — VERIFY OUTPUT
      ============================================
    */

    const outputStats =
      await fs.stat(
        mixedVideoPath
      );

    if (
      !outputStats.isFile() ||
      outputStats.size === 0
    ) {
      throw new Error(
        "FFmpeg completed but produced an empty final video."
      );
    }

    console.log(
      "BOMBA MIXED VIDEO SIZE:",
      outputStats.size
    );

    /*
      ============================================
      12 — UPLOAD FINAL VIDEO
      ============================================
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
      safeParse(
        uploadText
      );

    console.log(
      "BOMBA FINAL CLOUDINARY UPLOAD STATUS:",
      uploadResponse.status
    );

    if (
      !uploadResponse.ok
    ) {
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
            uploadData?.error
              ?.message ||
            uploadData?.error ||
            `Cloudinary final video upload failed with HTTP ${uploadResponse.status}.`,
        },
        {
          status:
            uploadResponse.status >=
              400 &&
            uploadResponse.status <
              500
              ? uploadResponse.status
              : 502,
        }
      );
    }

    /*
      ============================================
      13 — VERIFY CLOUDINARY RESPONSE
      ============================================
    */

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
      "BOMBA FINAL VIDEO READY"
    );

    /*
      ============================================
      14 — RETURN FINAL VIDEO
      ============================================
    */

    return NextResponse.json(
      {
        status: "completed",

        videoUrl:
          finalVideoUrl,

        finalVideoUrl:
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
      ============================================
      15 — CLEAN TEMP FILES
      ============================================
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

        console.log(
          "BOMBA TEMP DIRECTORY CLEANED"
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