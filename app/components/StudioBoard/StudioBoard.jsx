"use client";

import { useEffect, useRef, useState } from "react";

/* =========================================================
   PRODUCTION WORKFLOW
========================================================= */

const modules = [
  { number: "01", name: "IDEA", icon: "💡" },
  { number: "02", name: "PLAN", icon: "📋" },
  { number: "03", name: "CHARACTERS", icon: "👤" },
  { number: "04", name: "SCENES", icon: "🎬" },
  { number: "05", name: "DIALOGUE", icon: "💬" },
  { number: "06", name: "VOICE", icon: "🎙️" },
  { number: "07", name: "VIDEO", icon: "🎥" },
  { number: "08", name: "SOUND", icon: "🔊" },
  { number: "09", name: "TIMELINE", icon: "⏱️" },
  { number: "10", name: "PREVIEW", icon: "▶️" },
  { number: "11", name: "EXPORT", icon: "📤" },
];

/* =========================================================
   STUDIO BOARD
========================================================= */

export default function StudioBoard() {
  const [activeModule, setActiveModule] = useState(null);

  /* =======================================================
     AI SOUND STATE
  ======================================================= */

  const [soundPrompt, setSoundPrompt] = useState(
    "cinematic emotional background music for a realistic movie scene"
  );

  const [soundDuration, setSoundDuration] = useState(5);

  const [generatedAudioUrl, setGeneratedAudioUrl] =
    useState("");

  const [isGeneratingSound, setIsGeneratingSound] =
    useState(false);

  const [generatedSoundStatus, setGeneratedSoundStatus] =
    useState("Ready to create AI sound.");

  const [generatedSoundError, setGeneratedSoundError] =
    useState("");

  const generatedAudioRef = useRef(null);

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      stopGeneratedSound();
    };
  }, []);

  /* =======================================================
     STOP GENERATED AUDIO
  ======================================================= */

  function stopGeneratedSound() {
    if (generatedAudioRef.current) {
      try {
        generatedAudioRef.current.pause();
        generatedAudioRef.current.currentTime = 0;
      } catch (error) {
        console.log(
          "Generated audio cleanup skipped."
        );
      }

      generatedAudioRef.current = null;
    }
  }

  /* =======================================================
     GENERATE AI SOUND
  ======================================================= */

  async function generateAISound() {
    const cleanPrompt = soundPrompt.trim();

    if (!cleanPrompt) {
      setGeneratedSoundError(
        "Enter a sound description first."
      );

      setGeneratedSoundStatus(
        "⚠️ Sound description is required."
      );

      return;
    }

    stopGeneratedSound();

    setIsGeneratingSound(true);
    setGeneratedAudioUrl("");
    setGeneratedSoundError("");

    setGeneratedSoundStatus(
      "⏳ BOMBA AI is connecting to the sound engine..."
    );

    try {
      console.log(
        "BOMBA AI SOUND REQUEST STARTED"
      );

      const response = await fetch(
        "/api/sound/generate",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            type: "Background Music",
            prompt: cleanPrompt,
            duration: Number(soundDuration),
          }),
        }
      );

      console.log(
        "BOMBA AI SOUND HTTP STATUS:",
        response.status
      );

      const text = await response.text();

      console.log(
        "BOMBA AI SOUND RAW RESPONSE:",
        text
      );

      let data = {};

      try {
        data = text
          ? JSON.parse(text)
          : {};
      } catch (error) {
        throw new Error(
          "Sound server returned an invalid response."
        );
      }

      console.log(
        "BOMBA AI SOUND RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Sound generation failed with HTTP ${response.status}.`
        );
      }

      if (
        data?.status === "completed" &&
        data?.audioUrl
      ) {
        setGeneratedAudioUrl(
          data.audioUrl
        );

        setGeneratedSoundStatus(
          "✅ AI sound created successfully. Press PLAY AI SOUND."
        );

        return;
      }

      if (
        data?.status === "processing"
      ) {
        setGeneratedSoundStatus(
          "⏳ Sound is still processing. Generate again shortly."
        );

        if (data?.predictionId) {
          console.log(
            "BOMBA SOUND PREDICTION:",
            data.predictionId
          );
        }

        return;
      }

      throw new Error(
        data?.error ||
          "The sound engine did not return an audio file."
      );
    } catch (error) {
      console.error(
        "BOMBA AI SOUND GENERATION ERROR:",
        error
      );

      const message =
        error?.message ||
        "Unable to generate AI sound.";

      setGeneratedSoundError(message);

      setGeneratedSoundStatus(
        `❌ ${message}`
      );
    } finally {
      setIsGeneratingSound(false);
    }
  }

  /* =======================================================
     PLAY GENERATED AI SOUND
  ======================================================= */

  function playGeneratedSound() {
    if (!generatedAudioUrl) {
      setGeneratedSoundStatus(
        "⚠️ Generate a sound first."
      );

      return;
    }

    stopGeneratedSound();

    try {
      setGeneratedSoundStatus(
        "⏳ Loading generated AI sound..."
      );

      const audio =
        new Audio(generatedAudioUrl);

      audio.preload = "auto";

      generatedAudioRef.current =
        audio;

      audio.onloadeddata = () => {
        console.log(
          "BOMBA GENERATED AUDIO LOADED"
        );
      };

      audio.onended = () => {
        setGeneratedSoundStatus(
          "🎵 AI sound finished. Ready again."
        );
      };

      audio.onerror = () => {
        console.error(
          "BOMBA GENERATED AUDIO ERROR:",
          audio.error
        );

        setGeneratedSoundStatus(
          "❌ Generated audio could not be played."
        );
      };

      const promise = audio.play();

      if (promise) {
        promise
          .then(() => {
            setGeneratedSoundStatus(
              "▶️ AI sound is playing."
            );
          })
          .catch((error) => {
            console.error(
              "BOMBA GENERATED AUDIO PLAY ERROR:",
              error
            );

            setGeneratedSoundStatus(
              "❌ Browser blocked the generated audio."
            );
          });
      }
    } catch (error) {
      console.error(
        "BOMBA GENERATED AUDIO ERROR:",
        error
      );

      setGeneratedSoundStatus(
        "❌ Unable to play generated audio."
      );
    }
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <section
      style={{
        marginTop: "24px",
        padding: "14px",
        border:
          "1px solid rgba(255,255,255,0.10)",
        borderRadius: "14px",
        background:
          "rgba(255,255,255,0.025)",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "1.5px",
            opacity: 0.65,
          }}
        >
          BOMBA AI
        </div>

        <h2
          style={{
            margin: "4px 0 3px",
            fontSize: "18px",
            fontWeight: "800",
          }}
        >
          VIDEO PRODUCTION
        </h2>

        <p
          style={{
            margin: 0,
            fontSize: "12px",
            opacity: 0.6,
          }}
        >
          Build your video from idea to export.
        </p>
      </div>

      {/* PRODUCTION MODULES */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: "8px",
        }}
      >
        {modules.map((module) => (
          <button
            key={module.number}
            type="button"
            onClick={() =>
              setActiveModule(module.name)
            }
            style={{
              width: "100%",
              minHeight: "58px",
              padding: "9px",
              borderRadius: "10px",
              border:
                activeModule === module.name
                  ? "1px solid rgba(255,212,59,0.65)"
                  : "1px solid rgba(255,255,255,0.10)",
              background:
                activeModule === module.name
                  ? "rgba(255,212,59,0.08)"
                  : "rgba(255,255,255,0.035)",
              color: "inherit",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "18px",
                  lineHeight: 1,
                }}
              >
                {module.icon}
              </span>

              <span
                style={{
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: "9px",
                    opacity: 0.45,
                    marginBottom: "2px",
                  }}
                >
                  {module.number}
                </span>

                <span
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "800",
                    letterSpacing: "0.5px",
                  }}
                >
                  {module.name}
                </span>
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* =====================================================
          SOUND STUDIO
      ===================================================== */}

      {activeModule === "SOUND" && (
        <div
          style={{
            marginTop: "14px",
            padding: "14px",
            borderRadius: "12px",
            border:
              "1px solid rgba(255,212,59,0.20)",
            background:
              "rgba(255,212,59,0.04)",
          }}
        >
          {/* SOUND HEADER */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "1px",
                  opacity: 0.55,
                }}
              >
                SOUND STUDIO
              </div>

              <h3
                style={{
                  margin: "4px 0 0",
                  fontSize: "16px",
                  fontWeight: "800",
                }}
              >
                🔊 AI Sound
              </h3>
            </div>

            <button
              type="button"
              onClick={() => {
                stopGeneratedSound();

                setActiveModule(null);
              }}
              style={{
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(255,255,255,0.05)",
                color: "inherit",
                borderRadius: "8px",
                padding: "6px 9px",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              CLOSE
            </button>
          </div>

          {/* AI SOUND GENERATOR */}

          <div
            style={{
              padding: "12px",
              borderRadius: "10px",
              border:
                "1px solid rgba(255,212,59,0.30)",
              background:
                "rgba(255,212,59,0.07)",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: "800",
                letterSpacing: "1px",
                marginBottom: "5px",
              }}
            >
              ✨ BOMBA AI SOUND GENERATOR
            </div>

            <div
              style={{
                fontSize: "9px",
                opacity: 0.55,
                lineHeight: 1.5,
                marginBottom: "10px",
              }}
            >
              Create original AI background music
              from your own description.
            </div>

            {/* PROMPT */}

            <textarea
              value={soundPrompt}
              onChange={(event) =>
                setSoundPrompt(
                  event.target.value
                )
              }
              rows={4}
              placeholder="Describe the music you want..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                resize: "vertical",
                padding: "10px",
                borderRadius: "8px",
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(0,0,0,0.25)",
                color: "inherit",
                fontSize: "11px",
                lineHeight: 1.5,
                outline: "none",
              }}
            />

            {/* CONTROLS */}

            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "9px",
              }}
            >
              <select
                value={soundDuration}
                onChange={(event) =>
                  setSoundDuration(
                    Number(
                      event.target.value
                    )
                  )
                }
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "8px",
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                  background:
                    "rgba(0,0,0,0.35)",
                  color: "inherit",
                  fontSize: "10px",
                }}
              >
                <option value={5}>
                  5 seconds
                </option>

                <option value={8}>
                  8 seconds
                </option>

                <option value={10}>
                  10 seconds
                </option>

                <option value={15}>
                  15 seconds
                </option>

                <option value={20}>
                  20 seconds
                </option>

                <option value={30}>
                  30 seconds
                </option>
              </select>

              <button
                type="button"
                onClick={
                  generateAISound
                }
                disabled={
                  isGeneratingSound
                }
                style={{
                  flex: 2,
                  padding: "10px",
                  borderRadius: "8px",
                  border:
                    "1px solid rgba(255,212,59,0.45)",
                  background:
                    "rgba(255,212,59,0.15)",
                  color: "inherit",
                  fontSize: "10px",
                  fontWeight: "800",
                  cursor:
                    isGeneratingSound
                      ? "wait"
                      : "pointer",
                  opacity:
                    isGeneratingSound
                      ? 0.65
                      : 1,
                }}
              >
                {isGeneratingSound
                  ? "⏳ CREATING SOUND..."
                  : "🎵 GENERATE AI SOUND"}
              </button>
            </div>

            {/* STATUS */}

            <div
              style={{
                marginTop: "10px",
                padding: "9px",
                borderRadius: "8px",
                background:
                  "rgba(0,0,0,0.20)",
                fontSize: "9px",
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              {generatedSoundStatus}
            </div>

            {/* ERROR */}

            {generatedSoundError && (
              <div
                style={{
                  marginTop: "7px",
                  padding: "8px",
                  borderRadius: "7px",
                  background:
                    "rgba(255,70,70,0.08)",
                  border:
                    "1px solid rgba(255,70,70,0.20)",
                  fontSize: "8px",
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                }}
              >
                {generatedSoundError}
              </div>
            )}

            {/* GENERATED AUDIO */}

            {generatedAudioUrl && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  borderRadius: "8px",
                  background:
                    "rgba(0,0,0,0.25)",
                  border:
                    "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: "800",
                    marginBottom: "7px",
                  }}
                >
                  ✅ AI SOUND READY
                </div>

                <audio
                  controls
                  preload="metadata"
                  src={generatedAudioUrl}
                  onPlay={() =>
                    setGeneratedSoundStatus(
                      "▶️ AI sound is playing."
                    )
                  }
                  onPause={() =>
                    setGeneratedSoundStatus(
                      "⏸️ AI sound paused."
                    )
                  }
                  onEnded={() =>
                    setGeneratedSoundStatus(
                      "🎵 AI sound finished."
                    )
                  }
                  onError={() =>
                    setGeneratedSoundStatus(
                      "❌ Browser could not load the generated audio."
                    )
                  }
                  style={{
                    width: "100%",
                    height: "40px",
                  }}
                />

                <button
                  type="button"
                  onClick={
                    playGeneratedSound
                  }
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    padding: "10px",
                    borderRadius: "8px",
                    border:
                      "1px solid rgba(255,212,59,0.35)",
                    background:
                      "rgba(255,212,59,0.08)",
                    color: "inherit",
                    fontSize: "10px",
                    fontWeight: "800",
                    cursor: "pointer",
                  }}
                >
                  ▶️ PLAY AI SOUND
                </button>
              </div>
            )}
          </div>

          {/* SIMPLE SOUND INFO */}

          <div
            style={{
              marginTop: "12px",
              padding: "11px",
              borderRadius: "9px",
              background:
                "rgba(255,255,255,0.035)",
              border:
                "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: "800",
                marginBottom: "5px",
              }}
            >
              🎧 SOUND WORKFLOW
            </div>

            <div
              style={{
                fontSize: "9px",
                lineHeight: 1.6,
                opacity: 0.55,
              }}
            >
              Describe the music → choose duration
              → generate → preview → use in your
              video project.
            </div>
          </div>

          {/* FOOTER */}

          <div
            style={{
              marginTop: "9px",
              textAlign: "center",
              fontSize: "8px",
              lineHeight: 1.5,
              opacity: 0.38,
            }}
          >
            BOMBA Sound Studio — AI generated sound.
          </div>
        </div>
      )}
    </section>
  );
}