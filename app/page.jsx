"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

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

    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
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
     CHECK VIDEO
     
     IMPORTANT:
     This is now SEQUENTIAL.
     
     We wait for one request to finish before starting
     another request. This prevents multiple GET requests
     from hitting the same Wan SSE event at the same time.
  ===================================================== */

  const pollVideo = async (predictionId) => {
    const controller = {
      cancelled: false,
    };

    stopPolling();

    pollingRef.current = controller;

    const maxAttempts = 12;

    for (let attempts = 1; attempts <= maxAttempts; attempts++) {
      if (controller.cancelled) {
        return;
      }

      try {
        const elapsedMinutes = Math.round(
          ((attempts - 1) * 55) / 60
        );

        if (attempts === 1) {
          setStatus(
            "Connecting to Wan 2.2... 🎬"
          );
        } else {
          setStatus(
            `Wan 2.2 is still generating your video... ${elapsedMinutes} min`
          );
        }

        console.log(
          "BOMBA WAN STATUS CHECK:",
          attempts,
          predictionId
        );

        const res = await fetch(
          `/api/video/generate?predictionId=${encodeURIComponent(
            predictionId
          )}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (controller.cancelled) {
          return;
        }

        let data;

        try {
          data = await readJsonResponse(res);
        } catch (parseError) {
          console.error(
            "BOMBA STATUS RESPONSE ERROR:",
            parseError
          );

          /*
            If the server returned something unexpected,
            wait and make another sequential attempt.
          */

          if (attempts < maxAttempts) {
            setStatus(
              "Wan 2.2 is processing the video... reconnecting..."
            );

            await wait(3000);
            continue;
          }

          throw parseError;
        }

        console.log(
          "BOMBA VIDEO STATUS:",
          data
        );

        /* ===============================================
           VIDEO READY
           
           IMPORTANT:
           route.js returns "completed", not "succeeded".
        =============================================== */

        if (
          res.ok &&
          data?.status === "completed" &&
          data?.videoUrl
        ) {
          console.log(
            "BOMBA VIDEO READY:",
            data.videoUrl
          );

          if (pollingRef.current === controller) {
            pollingRef.current = null;
          }

          setVideoUrl(data.videoUrl);
          setStatus("Video ready! 🎬");
          setError("");
          setLoading(false);

          return;
        }

        /* ===============================================
           STILL PROCESSING
           
           route.js normally returns HTTP 202 here.
        =============================================== */

        if (
          data?.status === "processing" ||
          res.status === 202
        ) {
          if (attempts < maxAttempts) {
            setStatus(
              "Wan 2.2 is still generating your video... please wait 🎬"
            );

            /*
              IMPORTANT:
              Wait only AFTER the previous request has
              completely finished.
            */

            await wait(3000);
            continue;
          }

          throw new Error(
            "The video is taking longer than expected. Wan 2.2 may still be generating it."
          );
        }

        /* ===============================================
           GENERATION FAILED
        =============================================== */

        if (
          data?.status === "failed" ||
          data?.status === "canceled"
        ) {
          throw new Error(
            data?.error ||
              "Wan 2.2 video generation failed."
          );
        }

        /* ===============================================
           HTTP ERROR
        =============================================== */

        if (!res.ok) {
          /*
            A 410 means the Wan event is no longer available.
            Do not keep hammering the same expired event.
          */

          if (res.status === 410) {
            throw new Error(
              data?.error ||
                "The Wan 2.2 generation event expired or is no longer available."
            );
          }

          throw new Error(
            data?.error ||
              data?.message ||
              `Unable to check video status (${res.status}).`
          );
        }

        /* ===============================================
           UNKNOWN RESPONSE
        =============================================== */

        if (attempts < maxAttempts) {
          setStatus(
            "Wan 2.2 is processing your video... please wait."
          );

          await wait(3000);
          continue;
        }

        throw new Error(
          "Wan 2.2 did not return a final video result."
        );
      } catch (err) {
        console.error(
          "BOMBA VIDEO STATUS ERROR:",
          err
        );

        if (controller.cancelled) {
          return;
        }

        /*
          Give temporary connection problems another
          sequential attempt.
        */

        if (attempts < maxAttempts) {
          setStatus(
            "Wan 2.2 is still working... reconnecting safely..."
          );

          await wait(3000);
          continue;
        }

        if (pollingRef.current === controller) {
          pollingRef.current = null;
        }

        setError(
          err?.message ||
            "Unable to retrieve the generated video."
        );

        setStatus("");
        setLoading(false);

        return;
      }
    }

    if (pollingRef.current === controller) {
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

  const handleGenerateVideo = async () => {
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
            prompt: realisticPrompt,
            characterImage,
          }),
        }
      );

      let data;

      try {
        data = await readJsonResponse(res);
      } catch (parseError) {
        console.error(
          "BOMBA GENERATE RESPONSE ERROR:",
          parseError
        );

        throw new Error(
          parseError?.message ||
            "The video server returned an invalid response."
        );
      }

      console.log(
        "BOMBA GENERATE RESPONSE:",
        data
      );

      if (!res.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Failed to generate video."
        );
      }

      /* ===============================================
         VIDEO ALREADY AVAILABLE
      =============================================== */

      if (data?.videoUrl) {
        console.log(
          "BOMBA DIRECT VIDEO URL:",
          data.videoUrl
        );

        setVideoUrl(data.videoUrl);
        setStatus("Video ready! 🎬");
        setError("");
        setLoading(false);

        return;
      }

      /* ===============================================
         JOB CREATED
      =============================================== */

      if (
        data?.jobId ||
        data?.predictionId ||
        data?.eventId
      ) {
        const jobId =
          data.jobId ||
          data.predictionId ||
          data.eventId;

        console.log(
          "BOMBA WAN JOB:",
          jobId
        );

        setStatus(
          "Wan 2.2 has started generating your video... 🎬"
        );

        /*
          IMPORTANT:
          pollVideo is now sequential.
          It does NOT use setInterval.
        */

        await pollVideo(jobId);

        return;
      }

      throw new Error(
        "No video job or video URL returned."
      );
    } catch (err) {
      console.error(
        "BOMBA GENERATE ERROR:",
        err
      );

      setError(
        err?.message ||
          "Something went wrong while generating the video."
      );

      setStatus("");
      setLoading(false);
    }
  };

  /* =====================================================
     API KEY
  ===================================================== */

  const generateApiKey = async () => {
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

      const { data, error } =
        await supabase
          .from("bomba_keys")
          .insert([
            {
              key_code: keyCode,
              email: apiEmail.trim(),
              videos_allowed: 20,
              videos_used: 0,
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

      setApiKey(
        data.key_code
      );

      setApiMessage(
        "Your BOMBA API Key has been created successfully."
      );
    } catch (err) {
      console.error(err);

      setApiMessage(
        err?.message ||
          "Unable to create API Key. Please try again."
      );
    } finally {
      setApiLoading(false);
    }
  };

  const copyApiKey = async () => {
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

  const handleVideoError = () => {
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
    <main className="studio">

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
              background:
                "#FFD43B",
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
            background:
              "#111111",
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
              alignItems:
                "center",
              gap: "12px",
              marginBottom:
                "12px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  color:
                    "#ffffff",
                }}
              >
                🔑 Get Your BOMBA API Key
              </h2>

              <p
                style={{
                  color:
                    "#aaaaaa",
                  lineHeight:
                    "1.5",
                  marginBottom:
                    0,
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
                background:
                  "#080808",
                color:
                  "#ffffff",
                borderRadius:
                  "9px",
                padding:
                  "8px 12px",
                cursor:
                  "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <label
            style={{
              display:
                "block",
              color:
                "#dddddd",
              fontSize:
                "14px",
              marginBottom:
                "8px",
              marginTop:
                "20px",
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
            disabled={
              apiLoading
            }
            style={{
              width: "100%",
              boxSizing:
                "border-box",
              padding: "14px",
              borderRadius:
                "10px",
              border:
                "1px solid #333333",
              background:
                "#080808",
              color:
                "#ffffff",
              fontSize:
                "16px",
              outline:
                "none",
              marginBottom:
                "14px",
            }}
          />

          <button
            type="button"
            onClick={
              generateApiKey
            }
            disabled={
              apiLoading
            }
            style={{
              width: "100%",
              padding: "14px",
              border:
                "none",
              borderRadius:
                "10px",
              background:
                apiLoading
                  ? "#8d7920"
                  : "#FFD43B",
              color:
                "#000000",
              fontWeight:
                "800",
              fontSize:
                "15px",
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
                marginTop:
                  "18px",
                padding:
                  "16px",
                borderRadius:
                  "12px",
                background:
                  "#080808",
                border:
                  "1px solid #FFD43B",
              }}
            >
              <div
                style={{
                  color:
                    "#aaaaaa",
                  fontSize:
                    "12px",
                  marginBottom:
                    "8px",
                }}
              >
                YOUR BOMBA API KEY
              </div>

              <div
                style={{
                  color:
                    "#FFD43B",
                  fontWeight:
                    "700",
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
                  padding:
                    "12px",
                  borderRadius:
                    "9px",
                  border:
                    "1px solid #FFD43B",
                  background:
                    "transparent",
                  color:
                    "#FFD43B",
                  fontWeight:
                    "800",
                  cursor:
                    "pointer",
                }}
              >
                📋 COPY API KEY
              </button>
            </div>
          )}

          {apiMessage && (
            <div
              style={{
                marginTop:
                  "14px",
                padding:
                  "11px",
                borderRadius:
                  "9px",
                background:
                  "#181818",
                color:
                  "#dddddd",
                fontSize:
                  "14px",
                lineHeight:
                  "1.5",
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
          {modes.map((item) => (
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
          ))}
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
              disabled={
                loading
              }
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
              marginTop:
                "16px",
              color:
                "#facc15",
              fontSize:
                "14px",
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
              marginTop:
                "12px",
              padding:
                "12px",
              background:
                "#3f1111",
              border:
                "1px solid #ef4444",
              borderRadius:
                "8px",
              color:
                "#fca5a5",
              fontSize:
                "14px",
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
              marginTop:
                "24px",
            }}
          >
            <h3
              style={{
                marginBottom:
                  "12px",
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
                width:
                  "100%",
                borderRadius:
                  "12px",
                background:
                  "#000",
              }}
            />

            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display:
                  "inline-block",
                marginTop:
                  "12px",
                color:
                  "#facc15",
                textDecoration:
                  "underline",
              }}
            >
              Open Video
            </a>

            <div
              style={{
                marginTop:
                  "8px",
                color:
                  "#888",
                fontSize:
                  "12px",
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
          WORKFLOW
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