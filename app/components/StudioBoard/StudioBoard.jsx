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
     9JALINGO VOICE STATE
  ======================================================= */

  const [voiceText, setVoiceText] = useState(
    "Welcome to BOMBA AI. No stress, we go help you create your video. Just describe wetin you want, and BOMBA AI go build am."
  );

  const [voiceLanguage, setVoiceLanguage] =
    useState("pcm");

  const [voiceId, setVoiceId] =
    useState("ada_pcm");

  const [generatedVoiceUrl, setGeneratedVoiceUrl] =
    useState("");

  const [isGeneratingVoice, setIsGeneratingVoice] =
    useState(false);

  const [generatedVoiceStatus, setGeneratedVoiceStatus] =
    useState("Ready to create AI voice.");

  const [generatedVoiceError, setGeneratedVoiceError] =
    useState("");

  const generatedVoiceRef = useRef(null);

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      stopGeneratedSound();
      stopGeneratedVoice();

      if (generatedVoiceUrl) {
        URL.revokeObjectURL(generatedVoiceUrl);
      }
    };
  }, [generatedVoiceUrl]);

  /* =======================================================
     STOP GENERATED SOUND
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
     STOP GENERATED VOICE
  ======================================================= */

  function stopGeneratedVoice() {
    if (generatedVoiceRef.current) {
      try {
        generatedVoiceRef.current.pause();
        generatedVoiceRef.current.currentTime = 0;
      } catch (error) {
        console.log(
          "Generated voice cleanup skipped."
        );
      }

      generatedVoiceRef.current = null;
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

  /* =======================================================
     GENERATE 9JALINGO AI VOICE
  ======================================================= */

  async function generateAIVoice() {
    const cleanText = voiceText.trim();
    const cleanVoiceId = voiceId.trim();

    if (!cleanText) {
      setGeneratedVoiceError(
        "Enter the dialogue you want the AI voice to speak."
      );

      setGeneratedVoiceStatus(
        "⚠️ Voice text is required."
      );

      return;
    }

    if (!cleanVoiceId) {
      setGeneratedVoiceError(
        "Enter a 9jaLingo Voice ID first."
      );

      setGeneratedVoiceStatus(
        "⚠️ 9jaLingo Voice ID is required."
      );

      return;
    }

    stopGeneratedVoice();

    if (generatedVoiceUrl) {
      URL.revokeObjectURL(
        generatedVoiceUrl
      );
    }

    setGeneratedVoiceUrl("");
    setGeneratedVoiceError("");
    setIsGeneratingVoice(true);

    setGeneratedVoiceStatus(
      "⏳ BOMBA AI is sending your dialogue to 9jaLingo..."
    );

    try {
      console.log(
        "BOMBA 9JALINGO FRONTEND VOICE REQUEST STARTED"
      );

      const response = await fetch(
        "/api/voice/generate",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            text: cleanText,
            voiceId: cleanVoiceId,
            language: voiceLanguage,
          }),
        }
      );

      console.log(
        "BOMBA 9JALINGO FRONTEND VOICE STATUS:",
        response.status
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        let errorData = {};

        try {
          errorData = errorText
            ? JSON.parse(errorText)
            : {};
        } catch (error) {
          errorData = {};
        }

        throw new Error(
          errorData?.error ||
            errorText ||
            `Voice generation failed with HTTP ${response.status}.`
        );
      }

      /*
       * IMPORTANT:
       * /api/voice/generate returns RAW MP3 BYTES.
       * It does NOT return JSON.
       */

      const audioBuffer =
        await response.arrayBuffer();

      if (!audioBuffer.byteLength) {
        throw new Error(
          "9jaLingo returned an empty audio file."
        );
      }

      const audioBlob =
        new Blob(
          [audioBuffer],
          {
            type: "audio/mpeg",
          }
        );

      const audioUrl =
        URL.createObjectURL(
          audioBlob
        );

      setGeneratedVoiceUrl(
        audioUrl
      );

      setGeneratedVoiceStatus(
        "✅ AI voice created successfully. Press PLAY AI VOICE."
      );

      console.log(
        "BOMBA 9JALINGO VOICE AUDIO READY:",
        audioBuffer.byteLength,
        "bytes"
      );
    } catch (error) {
      console.error(
        "BOMBA 9JALINGO VOICE GENERATION ERROR:",
        error
      );

      const message =
        error?.message ||
        "Unable to generate AI voice.";

      setGeneratedVoiceError(
        message
      );

      setGeneratedVoiceStatus(
        `❌ ${message}`
      );
    } finally {
      setIsGeneratingVoice(false);
    }
  }

  /* =======================================================
     PLAY GENERATED AI VOICE
  ======================================================= */

  function playGeneratedVoice() {
    if (!generatedVoiceUrl) {
      setGeneratedVoiceStatus(
        "⚠️ Generate a voice first."
      );

      return;
    }

    stopGeneratedVoice();

    try {
      setGeneratedVoiceStatus(
        "⏳ Loading generated AI voice..."
      );

      const audio =
        new Audio(
          generatedVoiceUrl
        );

      audio.preload = "auto";

      generatedVoiceRef.current =
        audio;

      audio.onloadeddata = () => {
        console.log(
          "BOMBA GENERATED VOICE LOADED"
        );
      };

      audio.onended = () => {
        setGeneratedVoiceStatus(
          "🎙️ AI voice finished. Ready again."
        );
      };

      audio.onerror = () => {
        console.error(
          "BOMBA GENERATED VOICE ERROR:",
          audio.error
        );

        setGeneratedVoiceStatus(
          "❌ Generated voice could not be played."
        );
      };

      const promise =
        audio.play();

      if (promise) {
        promise
          .then(() => {
            setGeneratedVoiceStatus(
              "▶️ AI voice is playing."
            );
          })
          .catch((error) => {
            console.error(
              "BOMBA GENERATED VOICE PLAY ERROR:",
              error
            );

            setGeneratedVoiceStatus(
              "❌ Browser blocked the generated voice."
            );
          });
      }
    } catch (error) {
      console.error(
        "BOMBA GENERATED VOICE ERROR:",
        error
      );

      setGeneratedVoiceStatus(
        "❌ Unable to play generated voice."
      );
    }
  }

  /* =======================================================
     UI
  ======================================================= */

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
          VOICE STUDIO
      ===================================================== */}

      {activeModule === "VOICE" && (
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
          {/* VOICE HEADER */}

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
                VOICE STUDIO
              </div>

              <h3
                style={{
                  margin: "4px 0 0",
                  fontSize: "16px",
                  fontWeight: "800",
                }}
              >
                🎙️ AI Voice
              </h3>
            </div>

            <button
              type="button"
              onClick={() => {
                stopGeneratedVoice();
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

          {/* VOICE GENERATOR */}

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
              ✨ BOMBA AI VOICE GENERATOR
            </div>

            <div
              style={{
                fontSize: "9px",
                opacity: 0.55,
                lineHeight: 1.5,
                marginBottom: "10px",
              }}
            >
              Turn your dialogue into realistic
              AI speech using 9jaLingo.
            </div>

            {/* LANGUAGE */}

            <label
              style={{
                display: "block",
                fontSize: "9px",
                fontWeight: "800",
                marginBottom: "5px",
              }}
            >
              LANGUAGE
            </label>

            <select
              value={voiceLanguage}
              onChange={(event) =>
                setVoiceLanguage(
                  event.target.value
                )
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px",
                marginBottom: "9px",
                borderRadius: "8px",
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(0,0,0,0.35)",
                color: "inherit",
                fontSize: "10px",
              }}
            >
              <option value="pcm">
                Nigerian Pidgin
              </option>

              <option value="yo">
                Yoruba
              </option>

              <option value="ig">
                Igbo
              </option>

              <option value="ha">
                Hausa
              </option>
            </select>

            {/* VOICE ID */}

            <label
              style={{
                display: "block",
                fontSize: "9px",
                fontWeight: "800",
                marginBottom: "5px",
              }}
            >
              9JALINGO VOICE ID
            </label>

            <input
              type="text"
              value={voiceId}
              onChange={(event) =>
                setVoiceId(
                  event.target.value
                )
              }
              placeholder="e.g. ada_pcm"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px",
                marginBottom: "9px",
                borderRadius: "8px",
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(0,0,0,0.25)",
                color: "inherit",
                fontSize: "10px",
                outline: "none",
              }}
            />

            {/* DIALOGUE */}

            <label
              style={{
                display: "block",
                fontSize: "9px",
                fontWeight: "800",
                marginBottom: "5px",
              }}
            >
              DIALOGUE / SCRIPT
            </label>

            <textarea
              value={voiceText}
              onChange={(event) =>
                setVoiceText(
                  event.target.value
                )
              }
              rows={6}
              maxLength={5000}
              placeholder="Enter the dialogue you want your AI character to speak..."
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

            <div
              style={{
                marginTop: "5px",
                textAlign: "right",
                fontSize: "8px",
                opacity: 0.4,
              }}
            >
              {voiceText.length} / 5000
            </div>

            {/* GENERATE BUTTON */}

            <button
              type="button"
              onClick={
                generateAIVoice
              }
              disabled={
                isGeneratingVoice
              }
              style={{
                width: "100%",
                marginTop: "9px",
                padding: "12px",
                borderRadius: "8px",
                border:
                  "1px solid rgba(255,212,59,0.45)",
                background:
                  "rgba(255,212,59,0.15)",
                color: "inherit",
                fontSize: "10px",
                fontWeight: "800",
                cursor:
                  isGeneratingVoice
                    ? "wait"
                    : "pointer",
                opacity:
                  isGeneratingVoice
                    ? 0.65
                    : 1,
              }}
            >
              {isGeneratingVoice
                ? "⏳ CREATING AI VOICE..."
                : "🎙️ GENERATE AI VOICE"}
            </button>

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
              {generatedVoiceStatus}
            </div>

            {/* ERROR */}

            {generatedVoiceError && (
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
                {generatedVoiceError}
              </div>
            )}

            {/* GENERATED VOICE */}

            {generatedVoiceUrl && (
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
                  ✅ AI VOICE READY
                </div>

                <audio
                  controls
                  preload="metadata"
                  src={generatedVoiceUrl}
                  onPlay={() =>
                    setGeneratedVoiceStatus(
                      "▶️ AI voice is playing."
                    )
                  }
                  onPause={() =>
                    setGeneratedVoiceStatus(
                      "⏸️ AI voice paused."
                    )
                  }
                  onEnded={() =>
                    setGeneratedVoiceStatus(
                      "🎙️ AI voice finished."
                    )
                  }
                  onError={() =>
                    setGeneratedVoiceStatus(
                      "❌ Browser could not load the generated voice."
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
                    playGeneratedVoice
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
                  ▶️ PLAY AI VOICE
                </button>
              </div>
            )}
          </div>

          {/* VOICE WORKFLOW */}

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
              🎙️ VOICE WORKFLOW
            </div>

            <div
              style={{
                fontSize: "9px",
                lineHeight: 1.6,
                opacity: 0.55,
              }}
            >
              Enter dialogue → choose language →
              enter 9jaLingo voice → generate →
              preview → use in your video.
            </div>
          </div>

          <div
            style={{
              marginTop: "9px",
              textAlign: "center",
              fontSize: "8px",
              lineHeight: 1.5,
              opacity: 0.38,
            }}
          >
            BOMBA Voice Studio — powered by 9jaLingo.
          </div>
        </div>
      )}

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