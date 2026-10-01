"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import PlanPanel from "./components/Plan/PlanPanel";
import StudioBoard from "./components/StudioBoard/StudioBoard";

export default function Home() {
  const [mode, setMode] = useState("Movie");
  const [prompt, setPrompt] = useState("");
  const [characterImage, setCharacterImage] = useState(null);

  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const [showApiKey, setShowApiKey] = useState(false);
  const [apiEmail, setApiEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiLoading, setApiLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState("");

  const pollingRef = useRef(null);
  const fileInputRef = useRef(null);

  const modes = [
    "Movie",
    "Program",
    "Acting",
    "Ad",
    "Social Media",
    "Presenter",
    "Story",
  ];

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        pollingRef.current.cancelled = true;
        pollingRef.current = null;
      }
    };
  }, []);

  /* =====================================================
     SAFE JSON RESPONSE READER
  ===================================================== */

  const readJsonResponse = async (res) => {
    const text = await res.text();

    console.log("BOMBA RAW RESPONSE:", text);

    if (!text || !text.trim()) {
      return {};
    }

    try {
      const parsed = JSON.parse(text);

      if (
        parsed === null ||
        typeof parsed !== "object"
      ) {
        console.error(
          "BOMBA INVALID JSON OBJECT:",
          parsed
        );

        return {};
      }

      return parsed;
    } catch (parseError) {
      console.error(
        "BOMBA NON-JSON RESPONSE:",
        text
      );

      throw new Error(
        text.length > 500
          ? text.substring(0, 500)
          : text
      );
    }
  };

  /* =====================================================
     SAFE ERROR MESSAGE
  ===================================================== */

  const getSafeErrorMessage = (
    data,
    fallback
  ) => {
    const possibleMessages = [
      data?.error,
      data?.message,
      data?.detail,
      data?.details,
      data?.rawEternalError,
      data?.rawWanError,
      fallback,
    ];

    for (const message of possibleMessages) {
      if (
        typeof message === "string" &&
        message.trim() &&
        message.trim().toLowerCase() !== "null" &&
        message.trim().toLowerCase() !== "undefined"
      ) {
        return message.trim();
      }
    }

    return fallback;
  };

  /* =====================================================
     IMAGE UPLOAD
  ===================================================== */

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCharacterImage(reader.result);
        setError("");
      }
    };

    reader.onerror = () => {
      alert(
        "Failed to read the image. Please try another file."
      );
    };

    reader.readAsDataURL(file);
  };

  const removeCharacterImage = () => {
    setCharacterImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* =====================================================
     STOP VIDEO CHECKING
  ===================================================== */

  const stopPolling = () => {
    if (pollingRef.current) {
      pollingRef.current.cancelled = true;
      pollingRef.current = null;
    }
  };

  /* =====================================================
     WAIT
  ===================================================== */

  const wait = (milliseconds) => {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  };

  /* =====================================================
     EXTRACT VIDEO URL
  ===================================================== */

  const extractVideoUrl = (data) => {
    const possibleUrls = [
      data?.videoUrl,
      data?.video_url,
      data?.video?.url,
      data?.output,
      Array.isArray(data?.output)
        ? data.output[0]
        : null,
    ];

    for (const value of possibleUrls) {
      if (
        typeof value === "string" &&
        value.trim()
      ) {
        return value.trim();
      }
    }

    return null;
  };

  /* =====================================================
     EXTRACT JOB ID
  ===================================================== */

  const extractJobId = (data) => {
    const possibleIds = [
      data?.id,
      data?.jobId,
      data?.request_id,
      data?.predictionId,
      data?.eventId,
    ];

    for (const value of possibleIds) {
      if (
        typeof value === "string" &&
        value.trim()
      ) {
        return value.trim();
      }
    }

    return null;
    };

  /* =====================================================
     FINALIZE VIDEO WITH BOMBA AI VOICE
  ===================================================== */

  const finalizeVideoWithVoice = async (generatedVideoUrl) => {
    if (!generatedVideoUrl) {
      return generatedVideoUrl;
    }

    let voicePublicId = "";

    try {
      voicePublicId =
        localStorage.getItem(
          "bomba_voice_public_id"
        ) || "";
    } catch (storageError) {
      console.error(
        "BOMBA VOICE STORAGE ERROR:",
        storageError
      );
    }

    if (!voicePublicId) {
      console.log(
        "BOMBA: No saved Cloudinary voice found. Keeping original video."
      );

      return generatedVideoUrl;
    }

    setStatus(
      "Video ready. Adding your BOMBA AI voice... 🎙️"
    );

    console.log(
      "BOMBA FINALIZE START:",
      {
        generatedVideoUrl,
        voicePublicId,
      }
    );

    const finalizeResponse = await fetch(
      "/api/video/finalize",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          videoUrl: generatedVideoUrl,
          voicePublicId: voicePublicId,
        }),
      }
    );

    const finalizeData =
      await readJsonResponse(
        finalizeResponse
      );

    console.log(
      "BOMBA FINALIZE RESPONSE:",
      finalizeData
    );

    if (
      !finalizeResponse.ok ||
      finalizeData?.status !== "completed" ||
      !finalizeData?.videoUrl
    ) {
      throw new Error(
        getSafeErrorMessage(
          finalizeData,
          "Unable to attach the BOMBA AI voice to the video."
        )
      );
    }

    console.log(
      "BOMBA FINAL VIDEO READY:",
      finalizeData.videoUrl
    );

    return finalizeData.videoUrl;
  };

  /* =====================================================
     CHECK VIDEO
  ===================================================== */

  const pollVideo = async (predictionId) => {
    const controller = {
      cancelled: false,
    };

    stopPolling();

    pollingRef.current = controller;

    const maxAttempts = 20;
    const startedAt = Date.now();

    for (
      let attempts = 1;
      attempts <= maxAttempts;
      attempts++
    ) {
      if (controller.cancelled) {
        return;
      }

      try {
        const elapsedSeconds = Math.floor(
          (Date.now() - startedAt) / 1000
        );

        if (attempts === 1) {
          setStatus(
            "Connecting to Eternal AI... 🎬 0 sec"
          );
        } else {
          setStatus(
            `Eternal AI is still generating your video... ${elapsedSeconds} sec`
          );
        }

        console.log(
          "BOMBA ETERNAL AI STATUS CHECK:",
          attempts,
          predictionId
        );

        const pollUrl =
          `/api/video/generate?id=${encodeURIComponent(
            predictionId
          )}`;

        console.log(
          "BOMBA ETERNAL AI POLL URL:",
          pollUrl
        );

        const res = await fetch(
          pollUrl,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept:
                "application/json, video/*",
            },
          }
        );

        if (controller.cancelled) {
          return;
        }

        const contentType =
          res.headers.get("content-type") || "";

        console.log(
          "BOMBA ETERNAL AI POLL CONTENT TYPE:",
          contentType
        );

        /* ===============================================
           VIDEO DIRECTLY RETURNED
        =============================================== */

        if (
          res.ok &&
          contentType
            .toLowerCase()
            .startsWith("video/")
        ) {
          const videoBlob =
            await res.blob();

          if (!videoBlob.size) {
            throw new Error(
              "Eternal AI returned an empty video file."
            );
          }

          const generatedVideoUrl =
            URL.createObjectURL(
              videoBlob
            );

          console.log(
            "BOMBA VIDEO BLOB READY:",
            generatedVideoUrl,
            videoBlob.size
          );

          if (
            pollingRef.current === controller
          ) {
            pollingRef.current = null;
          }

          setVideoUrl(
            generatedVideoUrl
          );

          setStatus(
            "Video ready! 🎬"
          );

          setError("");
          setLoading(false);

          return;
        }

        let data;

        try {
          data =
            await readJsonResponse(res);
        } catch (parseError) {
          console.error(
            "BOMBA STATUS RESPONSE ERROR:",
            parseError
          );

          if (
            attempts <
            maxAttempts
          ) {
            setStatus(
              "Eternal AI is processing the video... reconnecting..."
            );

            await wait(3000);
            continue;
          }

          throw parseError;
        }

        if (
          !data ||
          typeof data !== "object"
        ) {
          console.error(
            "BOMBA EMPTY STATUS DATA:",
            data
          );

          if (
            attempts <
            maxAttempts
          ) {
            setStatus(
              "Eternal AI is processing the video... reconnecting..."
            );

            await wait(3000);
            continue;
          }

          throw new Error(
            "Eternal AI returned an empty status response."
          );
        }

        console.log(
          "BOMBA ETERNAL AI VIDEO STATUS:",
          data
        );

        /* ===============================================
           VIDEO READY AS JSON
        =============================================== */

        const returnedVideoUrl =
          extractVideoUrl(data);

        if (
          res.ok &&
          returnedVideoUrl
        ) {
          console.log(
            "BOMBA VIDEO READY:",
            returnedVideoUrl
          );

          if (
            pollingRef.current === controller
          ) {
            pollingRef.current = null;
          }

          const finalVideoUrl =
  await finalizeVideoWithVoice(
    returnedVideoUrl
  );

setVideoUrl(
  finalVideoUrl
);

setStatus(
  "Video ready with BOMBA AI voice! 🎬🎙️"
);
            "Video ready! 🎬"
          );

          setError("");
          setLoading(false);

          return;
        }

        /* ===============================================
           NORMALIZE STATUS
        =============================================== */

        const currentStatus =
          typeof data.status === "string"
            ? data.status.toLowerCase()
            : "";

        /* ===============================================
           GENERATION FAILED
        =============================================== */

        if (
          currentStatus === "failed" ||
          currentStatus === "error" ||
          currentStatus === "canceled" ||
          currentStatus === "cancelled"
        ) {
          const failedMessage =
            getSafeErrorMessage(
              data,
              "Eternal AI video generation failed."
            );

          const failedError =
            new Error(
              failedMessage
            );

          failedError.retryable = false;

          throw failedError;
        }

        /* ===============================================
           EXPIRED
        =============================================== */

        if (
          res.status === 410 ||
          currentStatus === "expired"
        ) {
          const expiredMessage =
            getSafeErrorMessage(
              data,
              "The Eternal AI generation request expired or is no longer available."
            );

          const expiredError =
            new Error(
              expiredMessage
            );

          expiredError.retryable = false;

          throw expiredError;
        }

        /* ===============================================
           STILL PROCESSING
        =============================================== */

        if (
          currentStatus === "processing" ||
          currentStatus === "queued" ||
          currentStatus === "in_queue" ||
          currentStatus === "in_progress" ||
          currentStatus === "pending" ||
          currentStatus === "started" ||
          res.status === 202
        ) {
          if (
            attempts <
            maxAttempts
          ) {
            const currentSeconds =
              Math.floor(
                (Date.now() -
                  startedAt) /
                  1000
              );

            setStatus(
              `Eternal AI is still generating your video... ${currentSeconds} sec`
            );

            await wait(3000);
            continue;
          }

          throw new Error(
            "The video is taking longer than expected. Eternal AI may still be generating it."
          );
        }

        /* ===============================================
           HTTP ERROR
        =============================================== */

        if (!res.ok) {
          const httpMessage =
            getSafeErrorMessage(
              data,
              `Unable to check video status (${res.status}).`
            );

          throw new Error(
            httpMessage
          );
        }

        /* ===============================================
           UNKNOWN RESPONSE
        =============================================== */

        console.warn(
          "BOMBA UNKNOWN ETERNAL AI RESPONSE:",
          data
        );

        if (
          attempts <
          maxAttempts
        ) {
          const currentSeconds =
            Math.floor(
              (Date.now() -
                startedAt) /
                1000
            );

          setStatus(
            `Eternal AI is processing your video... ${currentSeconds} sec`
          );

          await wait(3000);
          continue;
        }

        throw new Error(
          "Eternal AI did not return a final video result."
        );
      } catch (err) {
        console.error(
          "BOMBA VIDEO STATUS ERROR:",
          err
        );

        if (controller.cancelled) {
          return;
        }

        /* ===============================================
           FINAL ERRORS
        =============================================== */

        if (
          err?.retryable === false
        ) {
          if (
            pollingRef.current ===
            controller
          ) {
            pollingRef.current = null;
          }

          setError(
            getSafeErrorMessage(
              {
                error:
                  err?.message,
              },
              "Eternal AI video generation failed."
            )
          );

          setStatus("");
          setLoading(false);

          return;
        }

        /* ===============================================
           TEMPORARY CONNECTION PROBLEMS
        =============================================== */

        if (
          attempts <
          maxAttempts
        ) {
          const currentSeconds =
            Math.floor(
              (Date.now() -
                startedAt) /
                1000
            );

          setStatus(
            `Eternal AI is still working... reconnecting... ${currentSeconds} sec`
          );

          await wait(3000);
          continue;
        }

        if (
          pollingRef.current ===
          controller
        ) {
          pollingRef.current = null;
        }

        setError(
          getSafeErrorMessage(
            {
              error:
                err?.message,
            },
            "Unable to retrieve the generated video."
          )
        );

        setStatus("");
        setLoading(false);

        return;
      }
    }

    if (
      pollingRef.current ===
      controller
    ) {
      pollingRef.current = null;
    }

    setError(
      "The video is taking longer than expected. Please try again shortly."
    );

    setStatus("");
    setLoading(false);
  };

  /* =====================================================
     GENERATE VIDEO
  ===================================================== */

  const handleGenerateVideo =
    async () => {
      if (!prompt.trim()) {
        setError(
          "Please describe your video first."
        );
        return;
      }

      if (!characterImage) {
        setError(
          "Please upload a picture first."
        );
        return;
      }

      stopPolling();

      setLoading(true);
      setError("");
      setVideoUrl(null);
      setStatus(
        "Preparing your realistic video..."
      );

      try {
        const realisticPrompt = `
Photorealistic live-action video, cinematic quality, natural lighting, real human skin texture, realistic body movement, natural environment, no cartoon, no anime, no illustration style.

Mode: ${mode}

User idea:
${prompt}
`.trim();

        console.log(
          "BOMBA GENERATING MODE:",
          mode
        );

        const res = await fetch(
          "/api/video/generate",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body: JSON.stringify({
              mode,
              prompt:
                realisticPrompt,

              /*
                Keep both fields so the backend can
                use the imageData field explicitly.
              */
              imageData:
                characterImage,

              characterImage:
                characterImage,
            }),
          }
        );

        let data;

        try {
          data =
            await readJsonResponse(
              res
            );
        } catch (
          parseError
        ) {
          console.error(
            "BOMBA GENERATE RESPONSE ERROR:",
            parseError
          );

          throw new Error(
            parseError?.message ||
              "The video server returned an invalid response."
          );
        }

        if (
          !data ||
          typeof data !==
            "object"
        ) {
          console.error(
            "BOMBA GENERATE EMPTY DATA:",
            data
          );

          throw new Error(
            "The video server returned an empty response."
          );
        }

        console.log(
          "BOMBA GENERATE RESPONSE:",
          data
        );

        if (!res.ok) {
          throw new Error(
            getSafeErrorMessage(
              data,
              "Failed to generate video."
            )
          );
        }

        /* ===============================================
           VIDEO ALREADY AVAILABLE
        =============================================== */

        const directVideoUrl =
          extractVideoUrl(data);

        if (
          directVideoUrl
        ) {
          console.log(
            "BOMBA DIRECT VIDEO URL:",
            directVideoUrl
          );

          const finalVideoUrl =
  await finalizeVideoWithVoice(
    directVideoUrl
  );

setVideoUrl(
  finalVideoUrl
);

setStatus(
  "Video ready with BOMBA AI voice! 🎬🎙️"
);

          setError("");
          setLoading(false);

          return;
        }

        /* ===============================================
           JOB CREATED
        =============================================== */

        const jobId =
          extractJobId(data);

        if (jobId) {
          console.log(
            "BOMBA ETERNAL AI JOB:",
            jobId
          );

          setStatus(
            "Eternal AI has started generating your video... 🎬"
          );

          await pollVideo(
            jobId
          );

          return;
        }

        /* ===============================================
           NO JOB / NO VIDEO
        =============================================== */

        console.error(
          "BOMBA NO JOB RESPONSE:",
          data
        );

        throw new Error(
          getSafeErrorMessage(
            data,
            "No video job or video URL was returned by the video server."
          )
        );
      } catch (err) {
        console.error(
          "BOMBA GENERATE ERROR:",
          err
        );

        setError(
          getSafeErrorMessage(
            {
              error:
                err?.message,
            },
            "Something went wrong while generating the video."
          )
        );

        setStatus("");
        setLoading(false);
      }
    };

  /* =====================================================
     API KEY
  ===================================================== */

  const generateApiKey =
    async () => {
      setApiMessage("");
      setApiKey("");

      if (!apiEmail.trim()) {
        setApiMessage(
          "Please enter your email address."
        );

        return;
      }

      setApiLoading(true);

      try {
        const keyCode =
          "bomba_" +
          Math.random()
            .toString(36)
            .substring(2, 15);

        const {
          data,
          error,
        } = await supabase
          .from("bomba_keys")
          .insert([
            {
              key_code:
                keyCode,

              email:
                apiEmail.trim(),

              videos_allowed:
                20,

              videos_used:
                0,
            },
          ])
          .select()
          .single();

        if (error) {
          console.error(
            "BOMBA API KEY ERROR:",
            error
          );

          throw new Error(
            error.message ||
              "Unable to create API Key."
          );
        }

        if (
          !data ||
          !data.key_code
        ) {
          throw new Error(
            "The API Key was not returned by the database."
          );
        }

        setApiKey(
          data.key_code
        );

        setApiMessage(
          "Your BOMBA API Key has been created successfully."
        );
      } catch (err) {
        console.error(
          err
        );

        setApiMessage(
          err?.message ||
            "Unable to create API Key. Please try again."
        );
      } finally {
        setApiLoading(
          false
        );
      }
    };

  const copyApiKey =
    async () => {
      if (!apiKey) return;

      try {
        await navigator.clipboard.writeText(
          apiKey
        );

        setApiMessage(
          "API Key copied successfully! 📋"
        );
      } catch {
        setApiMessage(
          "Unable to copy automatically. Please copy the key manually."
        );
      }
    };

  /* =====================================================
     VIDEO PLAYER ERROR
  ===================================================== */

  const handleVideoError =
    () => {
      console.error(
        "BOMBA VIDEO PLAYER ERROR:",
        videoUrl
      );

      setError(
        "The video was generated, but the browser could not play the returned video file."
      );
    };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <main>

      {/* =================================================
          TOP BAR
      ================================================= */}

      <header className="topbar">
        <div>
          <div className="brand">
            BOMBA AI
          </div>

          <div className="subtitle">
            VIDEO STUDIO
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setShowApiKey(true);
              setApiMessage("");
            }}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border:
                "1px solid #FFD43B",
              background: "#FFD43B",
              color: "#000",
              fontWeight: "800",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            🔑 API KEY
          </button>

          <button
            type="button"
            className="profileButton"
          >
            TB
          </button>
        </div>
      </header>

      {/* =================================================
          API KEY PANEL
      ================================================= */}

      {showApiKey && (
        <section
          style={{
            margin: "20px auto",
            width:
              "calc(100% - 32px)",
            maxWidth: "720px",
            background: "#111111",
            border:
              "1px solid #292929",
            borderRadius: "18px",
            padding: "24px",
            boxSizing:
              "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#ffffff",
                }}
              >
                🔑 Get Your BOMBA API Key
              </h2>

              <p
                style={{
                  color: "#aaaaaa",
                  lineHeight: "1.5",
                  marginBottom: 0,
                }}
              >
                Enter your email address to generate
                your BOMBA API Key.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowApiKey(false)
              }
              style={{
                border:
                  "1px solid #444",
                background: "#080808",
                color: "#ffffff",
                borderRadius: "9px",
                padding: "8px 12px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <label
            style={{
              display: "block",
              color: "#dddddd",
              fontSize: "14px",
              marginBottom: "8px",
              marginTop: "20px",
            }}
          >
            Email Address
          </label>

          <input
            type="email"
            value={apiEmail}
            onChange={(event) =>
              setApiEmail(
                event.target.value
              )
            }
            placeholder="you@example.com"
            disabled={apiLoading}
            style={{
              width: "100%",
              boxSizing:
                "border-box",
              padding: "14px",
              borderRadius: "10px",
              border:
                "1px solid #333333",
              background: "#080808",
              color: "#ffffff",
              fontSize: "16px",
              outline: "none",
              marginBottom: "14px",
            }}
          />

          <button
            type="button"
            onClick={
              generateApiKey
            }
            disabled={apiLoading}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "10px",
              background:
                apiLoading
                  ? "#8d7920"
                  : "#FFD43B",
              color: "#000000",
              fontWeight: "800",
              fontSize: "15px",
              cursor:
                apiLoading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {apiLoading
              ? "GENERATING..."
              : "GENERATE API KEY"}
          </button>

          {apiKey && (
            <div
              style={{
                marginTop: "18px",
                padding: "16px",
                borderRadius: "12px",
                background: "#080808",
                border:
                  "1px solid #FFD43B",
              }}
            >
              <div
                style={{
                  color: "#aaaaaa",
                  fontSize: "12px",
                  marginBottom: "8px",
                }}
              >
                YOUR BOMBA API KEY
              </div>

              <div
                style={{
                  color: "#FFD43B",
                  fontWeight: "700",
                  wordBreak:
                    "break-all",
                  marginBottom:
                    "12px",
                }}
              >
                {apiKey}
              </div>

              <button
                type="button"
                onClick={
                  copyApiKey
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "9px",
                  border:
                    "1px solid #FFD43B",
                  background:
                    "transparent",
                  color: "#FFD43B",
                  fontWeight: "800",
                  cursor: "pointer",
                }}
              >
                📋 COPY API KEY
              </button>
            </div>
          )}

          {apiMessage && (
            <div
              style={{
                marginTop: "14px",
                padding: "11px",
                borderRadius: "9px",
                background: "#181818",
                color: "#dddddd",
                fontSize: "14px",
                lineHeight: "1.5",
              }}
            >
              {apiMessage}
            </div>
          )}
        </section>
      )}

      {/* =================================================
          HERO
      ================================================= */}

      <section className="hero">
        <div className="badge">
          AI VIDEO PRODUCTION STUDIO
        </div>

        <h1>
          Turn your idea into a
          <span>
            {" "}
            realistic AI video.
          </span>
        </h1>

        <p>
          Create characters, scenes, dialogue, voices,
          sound and cinematic videos from one simple idea.
        </p>
      </section>

      {/* =================================================
          STUDIO CARD
      ================================================= */}

      <section className="studioCard">

        <h2>
          What do you want to create?
        </h2>

        <div className="modeGrid">
          {modes.map(
            (item) => (
              <button
                key={item}
                type="button"
                className={
                  mode === item
                    ? "mode active"
                    : "mode"
                }
                onClick={() =>
                  setMode(item)
                }
              >
                {item}
              </button>
            )
          )}
        </div>

        {/* ===============================================
            CHARACTER
        =============================================== */}

        <div className="characterUpload">

          <div className="characterHeader">
            <div>
              <h3>
                👤 Your Character
              </h3>

              <p>
                Upload your photo to use yourself as the
                main character.
              </p>
            </div>
          </div>

          {!characterImage ? (
            <label className="uploadBox">

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={
                  handleImageUpload
                }
                hidden
              />

              <div className="uploadIcon">
                📸
              </div>

              <strong>
                + Add Your Photo
              </strong>

              <span>
                PNG, JPG or WEBP · Maximum 10MB
              </span>

            </label>
          ) : (
            <div className="characterPreview">

              <img
                src={characterImage}
                alt="Your BOMBA character"
              />

              <div className="characterPreviewInfo">

                <strong>
                  ✅ Character Photo Added
                </strong>

                <span>
                  This photo will be used as your
                  character reference.
                </span>

                <div className="characterActions">

                  <label className="changePhoto">

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={
                        handleImageUpload
                      }
                      hidden
                    />

                    Change Photo
                  </label>

                  <button
                    type="button"
                    className="removePhoto"
                    onClick={
                      removeCharacterImage
                    }
                  >
                    Remove
                  </button>

                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===============================================
            PROMPT
        =============================================== */}

        <div className="promptBox">

          <label>
            Describe your video
          </label>

          <textarea
            value={prompt}
            onChange={(e) =>
              setPrompt(
                e.target.value
              )
            }
            placeholder="Example: I walk into a busy Nigerian market, meet my friend, shake hands with him and we laugh while people move naturally around us..."
          />

          <div className="promptFooter">

            <span>
              {prompt.length} characters
            </span>

            <button
              type="button"
              className="generateButton"
              onClick={
                handleGenerateVideo
              }
              disabled={loading}
            >
              {loading
                ? "Generating..."
                : "🎬 Generate Video"}
            </button>

          </div>
        </div>

        {/* ===============================================
            STATUS
        =============================================== */}

        {status && (
          <div
            style={{
              marginTop: "16px",
              color: "#facc15",
              fontSize: "14px",
            }}
          >
            {status}
          </div>
        )}

        {/* ===============================================
            ERROR
        =============================================== */}

        {error && (
          <div
            style={{
              marginTop: "12px",
              padding: "12px",
              background: "#3f1111",
              border:
                "1px solid #ef4444",
              borderRadius: "8px",
              color: "#fca5a5",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        {/* ===============================================
            VIDEO RESULT
        =============================================== */}

        {videoUrl && (
          <div
            style={{
              marginTop: "24px",
            }}
          >
            <h3
              style={{
                marginBottom: "12px",
              }}
            >
              Your Realistic Video
            </h3>

            <video
              key={videoUrl}
              src={videoUrl}
              controls
              playsInline
              preload="metadata"
              onError={
                handleVideoError
              }
              style={{
                width: "100%",
                borderRadius: "12px",
                background: "#000",
              }}
            />

            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display:
                  "inline-block",
                marginTop: "12px",
                color: "#facc15",
                textDecoration:
                  "underline",
              }}
            >
              Open Video
            </a>

            <div
              style={{
                marginTop: "8px",
                color: "#888",
                fontSize: "12px",
              }}
            >
              If the video player does not start,
              tap "Open Video" to test the returned file
              directly.
            </div>
          </div>
        )}

      </section>

      {/* =================================================
          PLAN
      ================================================= */}

      <PlanPanel idea={prompt} />

      {/* =================================================
          BOMBA AI STUDIO BOARD
      ================================================= */}

      <StudioBoard />

      {/* =================================================
          OLD WORKFLOW
      ================================================= */}

      <section className="workflow">

        <h2>
          Production Workflow
        </h2>

        <div className="workflowGrid">

          <div>
            <strong>
              01
            </strong>

            <h3>
              Plan
            </h3>

            <p>
              Turn your idea into scenes and shots.
            </p>
          </div>

          <div>
            <strong>
              02
            </strong>

            <h3>
              Characters
            </h3>

            <p>
              Create consistent realistic characters.
            </p>
          </div>

          <div>
            <strong>
              03
            </strong>

            <h3>
              Scenes
            </h3>

            <p>
              Build realistic locations and actions.
            </p>
          </div>

          <div>
            <strong>
              04
            </strong>

            <h3>
              Generate
            </h3>

            <p>
              Generate cinematic video clips.
            </p>
          </div>

        </div>
      </section>

      {/* =================================================
          FUTURE FEATURES
      ================================================= */}

      <section className="future">

        <h2>
          Coming into the Studio
        </h2>

        <div className="featureList">

          <span>
            🎭 Consistent Characters
          </span>

          <span>
            🗣️ Natural Voices
          </span>

          <span>
            👄 Lip Sync
          </span>

          <span>
            🎬 Cinematic Camera
          </span>

          <span>
            🔊 Sound Effects
          </span>

          <span>
            🎵 Background Music
          </span>

          <span>
            🏠 Realistic Environments
          </span>

          <span>
            📺 Full Episodes
          </span>

        </div>

      </section>

    </main>
  );
}