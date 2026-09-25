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
        clearInterval(pollingRef.current);
      }
    };
  }, []);

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
      }
    };

    reader.onerror = () => {
      alert("Failed to read the image. Please try another file.");
    };

    reader.readAsDataURL(file);
  };

  const removeCharacterImage = () => {
    setCharacterImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const pollVideo = (predictionId) => {
    let attempts = 0;
    const maxAttempts = 90;

    stopPolling();

    pollingRef.current = setInterval(async () => {
      attempts++;

      try {
        const res = await fetch(
          `/api/video/generate?predictionId=${encodeURIComponent(
            predictionId
          )}`,
          {
            cache: "no-store",
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.error || "Unable to check video status."
          );
        }

        if (
          data.status === "succeeded" &&
          data.videoUrl
        ) {
          stopPolling();

          setVideoUrl(data.videoUrl);
          setStatus("Video ready! 🎬");
          setLoading(false);

          return;
        }

        if (
          data.status === "failed" ||
          data.status === "canceled"
        ) {
          stopPolling();

          setError(
            data.error || "Video generation failed."
          );

          setStatus("");
          setLoading(false);

          return;
        }

        const seconds = attempts * 5;

        setStatus(
          `Video is still being generated... ${seconds}s`
        );

        if (attempts >= maxAttempts) {
          stopPolling();

          setError(
            "Video is taking longer than expected. Please try again later."
          );

          setStatus("");
          setLoading(false);
        }
      } catch (err) {
        stopPolling();

        console.error(err);

        setError(
          err.message ||
            "Unable to check video generation status."
        );

        setStatus("");
        setLoading(false);
      }
    }, 5000);
  };

  const handleGenerateVideo = async () => {
    if (!prompt.trim()) {
      setError("Please describe your video first.");
      return;
    }

    stopPolling();

    setLoading(true);
    setError("");
    setVideoUrl(null);
    setStatus("Preparing your realistic video...");

    try {
      const realisticPrompt = `
Photorealistic live-action video, cinematic quality, natural lighting, real human skin texture, realistic body movement, natural environment, no cartoon, no anime, no illustration style.

Mode: ${mode}

User idea:
${prompt}
`.trim();

      const headers = {
        "Content-Type": "application/json",
      };

      const res = await fetch("/api/video/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          mode,
          prompt: realisticPrompt,
          characterImage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Failed to generate video."
        );
      }

      if (data.videoUrl) {
        setVideoUrl(data.videoUrl);
        setStatus("Video ready! 🎬");
        setLoading(false);
      } else if (data.jobId) {
        setStatus(
          "Video is being generated... please wait 🎬"
        );

        pollVideo(data.jobId);
      } else {
        throw new Error(
          "No video job or video URL returned."
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Something went wrong while generating the video."
      );

      setStatus("");
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    setApiMessage("");
    setApiKey("");

    if (!apiEmail.trim()) {
      setApiMessage("Please enter your email address.");
      return;
    }

    setApiLoading(true);

    try {
      const keyCode =
        "bomba_" +
        Math.random().toString(36).substring(2, 15);

      const { data, error } = await supabase
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
        console.error("BOMBA API KEY ERROR:", error);

        throw new Error(
          error.message || "Unable to create API Key."
        );
      }

      setApiKey(data.key_code);

      setApiMessage(
        "Your BOMBA API Key has been created successfully."
      );
    } catch (err) {
      console.error(err);

      setApiMessage(
        err.message ||
          "Unable to create API Key. Please try again."
      );
    } finally {
      setApiLoading(false);
    }
  };

  const copyApiKey = async () => {
    if (!apiKey) return;

    try {
      await navigator.clipboard.writeText(apiKey);

      setApiMessage("API Key copied successfully! 📋");
    } catch {
      setApiMessage(
        "Unable to copy automatically. Please copy the key manually."
      );
    }
  };

  return (
    <main className="studio">
      <header className="topbar">
        <div>
          <div className="brand">BOMBA AI</div>
          <div className="subtitle">VIDEO STUDIO</div>
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
              border: "1px solid #FFD43B",
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

      {showApiKey && (
        <section
          style={{
            margin: "20px auto",
            width: "calc(100% - 32px)",
            maxWidth: "720px",
            background: "#111111",
            border: "1px solid #292929",
            borderRadius: "18px",
            padding: "24px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
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
              onClick={() => setShowApiKey(false)}
              style={{
                border: "1px solid #444",
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
              setApiEmail(event.target.value)
            }
            placeholder="you@example.com"
            disabled={apiLoading}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #333333",
              background: "#080808",
              color: "#ffffff",
              fontSize: "16px",
              outline: "none",
              marginBottom: "14px",
            }}
          />

          <button
            type="button"
            onClick={generateApiKey}
            disabled={apiLoading}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "10px",
              background: apiLoading
                ? "#8d7920"
                : "#FFD43B",
              color: "#000000",
              fontWeight: "800",
              fontSize: "15px",
              cursor: apiLoading
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
                border: "1px solid #FFD43B",
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
                  wordBreak: "break-all",
                  marginBottom: "12px",
                }}
              >
                {apiKey}
              </div>

              <button
                type="button"
                onClick={copyApiKey}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "9px",
                  border: "1px solid #FFD43B",
                  background: "transparent",
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

      <section className="hero">
        <div className="badge">
          AI VIDEO PRODUCTION STUDIO
        </div>

        <h1>
          Turn your idea into a
          <span> realistic AI video.</span>
        </h1>

        <p>
          Create characters, scenes, dialogue, voices, sound
          and cinematic videos from one simple idea.
        </p>
      </section>

      <section className="studioCard">
        <h2>What do you want to create?</h2>

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
              onClick={() => setMode(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="characterUpload">
          <div className="characterHeader">
            <div>
              <h3>👤 Your Character</h3>

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
                onChange={handleImageUpload}
                hidden
              />

              <div className="uploadIcon">📸</div>

              <strong>+ Add Your Photo</strong>

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
                      onChange={handleImageUpload}
                      hidden
                    />

                    Change Photo
                  </label>

                  <button
                    type="button"
                    className="removePhoto"
                    onClick={removeCharacterImage}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="promptBox">
          <label>Describe your video</label>

          <textarea
            value={prompt}
            onChange={(e) =>
              setPrompt(e.target.value)
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
              onClick={handleGenerateVideo}
              disabled={loading}
            >
              {loading
                ? "Generating..."
                : "🎬 Generate Video"}
            </button>
          </div>
        </div>

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

        {error && (
          <div
            style={{
              marginTop: "12px",
              padding: "12px",
              background: "#3f1111",
              border: "1px solid #ef4444",
              borderRadius: "8px",
              color: "#fca5a5",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        {videoUrl && (
          <div style={{ marginTop: "24px" }}>
            <h3 style={{ marginBottom: "12px" }}>
              Your Realistic Video
            </h3>

            <video
              src={videoUrl}
              controls
              playsInline
              style={{
                width: "100%",
                borderRadius: "12px",
                background: "#000",
              }}
            />

            <a
              href={videoUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                marginTop: "12px",
                color: "#facc15",
                textDecoration: "underline",
              }}
            >
              Download Video
            </a>
          </div>
        )}
      </section>

      <section className="workflow">
        <h2>Production Workflow</h2>

        <div className="workflowGrid">
          <div>
            <strong>01</strong>
            <h3>Plan</h3>
            <p>
              Turn your idea into scenes and shots.
            </p>
          </div>

          <div>
            <strong>02</strong>
            <h3>Characters</h3>
            <p>
              Create consistent realistic characters.
            </p>
          </div>

          <div>
            <strong>03</strong>
            <h3>Scenes</h3>
            <p>
              Build realistic locations and actions.
            </p>
          </div>

          <div>
            <strong>04</strong>
            <h3>Generate</h3>
            <p>
              Generate cinematic video clips.
            </p>
          </div>
        </div>
      </section>

      <section className="future">
        <h2>Coming into the Studio</h2>

        <div className="featureList">
          <span>🎭 Consistent Characters</span>
          <span>🗣️ Natural Voices</span>
          <span>👄 Lip Sync</span>
          <span>🎬 Cinematic Camera</span>
          <span>🔊 Sound Effects</span>
          <span>🎵 Background Music</span>
          <span>🏠 Realistic Environments</span>
          <span>📺 Full Episodes</span>
        </div>
      </section>
    </main>
  );
}