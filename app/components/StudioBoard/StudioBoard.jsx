"use client";

import { useEffect, useRef, useState } from "react";

import {
  initializeProduction,
  getProduction,
  subscribeToProduction,
} from "../../../lib/bomba/productionStore";

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

const CONFIRMED_VOICES = {
  pcm: [
    { id: "ada_pcm", name: "Ada", gender: "Female" },
    { id: "blessing_pcm", name: "Blessing", gender: "Female" },
  ],
  ig: [
    { id: "adaeze_ig", name: "Adaeze", gender: "Female" },
    { id: "ifeanyi_ig", name: "Ifeanyi", gender: "Male" },
  ],
  yo: [
    { id: "adeola_yo", name: "Adeola", gender: "Female" },
    { id: "adekunle_yo", name: "Adekunle", gender: "Male" },
  ],
  ha: [
    { id: "aisha_ha", name: "Aisha", gender: "Female" },
    { id: "bello_ha", name: "Bello", gender: "Male" },
  ],
};

const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";

const CLOUDINARY_VOICE_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_VOICE_PRESET ||
  "bomba_voice";

async function uploadVoiceToCloudinary(audioBlob) {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error("Cloudinary Cloud Name is not configured.");
  }

  const uploadUrl =
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      CLOUDINARY_CLOUD_NAME
    )}/video/upload`;

  const formData = new FormData();

  formData.append("file", audioBlob, "bomba-voice.mp3");
  formData.append("upload_preset", CLOUDINARY_VOICE_PRESET);

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Cloudinary voice upload failed with HTTP ${response.status}.`
    );
  }

  if (!data?.public_id) {
    throw new Error(
      "Cloudinary uploaded the voice but did not return a public ID."
    );
  }

  return data;
}

export default function StudioBoard() {
  const [activeModule, setActiveModule] = useState(null);

  /* =======================================================
     BOMBA PRODUCTION BRAIN
  ======================================================= */

  const [production, setProduction] = useState(null);

  useEffect(() => {
    let currentProduction = getProduction();

    if (!currentProduction) {
      currentProduction = initializeProduction("");
    }

    setProduction(currentProduction);

    const unsubscribe = subscribeToProduction(
      (nextProduction) => {
        setProduction(nextProduction);
      }
    );

    return unsubscribe;
  }, []);

  /* =======================================================
     SOUND
  ======================================================= */

  const [soundPrompt, setSoundPrompt] = useState(
    "cinematic emotional background music for a realistic movie scene"
  );

  const [soundDuration, setSoundDuration] = useState(5);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState("");
  const [isGeneratingSound, setIsGeneratingSound] = useState(false);

  const [generatedSoundStatus, setGeneratedSoundStatus] =
    useState("Ready to create AI sound.");

  const [generatedSoundError, setGeneratedSoundError] =
    useState("");

  const generatedAudioRef = useRef(null);

  /* =======================================================
     VOICE
  ======================================================= */

  const [voiceText, setVoiceText] = useState(
    "Welcome to BOMBA AI. No stress, we go help you create your video. Just describe wetin you want, and BOMBA AI go build am."
  );

  const [voiceLanguage, setVoiceLanguage] = useState("pcm");

  const [voiceId, setVoiceId] = useState("ada_pcm");

  const [availableVoices, setAvailableVoices] = useState(
    CONFIRMED_VOICES.pcm
  );

  const [isLoadingVoices, setIsLoadingVoices] = useState(false);

  const [generatedVoiceUrl, setGeneratedVoiceUrl] = useState("");
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);

  const [generatedVoiceStatus, setGeneratedVoiceStatus] =
    useState("Ready to create AI voice.");

  const [generatedVoiceError, setGeneratedVoiceError] =
    useState("");

  const generatedVoiceRef = useRef(null);

  /* =======================================================
     LOAD VOICES
  ======================================================= */

  useEffect(() => {
    if (activeModule !== "VOICE") return;

    const voices =
      CONFIRMED_VOICES[voiceLanguage] || [];

    setAvailableVoices(voices);

    setVoiceId((current) => {
      const exists = voices.some(
        (voice) => voice.id === current
      );

      return exists
        ? current
        : voices[0]?.id || "";
    });
  }, [activeModule, voiceLanguage]);

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      stopGeneratedSound();
      stopGeneratedVoice();
    };
  }, []);

  function stopGeneratedSound() {
    if (generatedAudioRef.current) {
      try {
        generatedAudioRef.current.pause();
        generatedAudioRef.current.currentTime = 0;
      } catch {}

      generatedAudioRef.current = null;
    }
  }

  function stopGeneratedVoice() {
    if (generatedVoiceRef.current) {
      try {
        generatedVoiceRef.current.pause();
        generatedVoiceRef.current.currentTime = 0;
      } catch {}

      generatedVoiceRef.current = null;
    }
  }

  /* =======================================================
     SOUND GENERATION
     EXISTING SYSTEM PRESERVED
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
      const response = await fetch(
        "/api/sound/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "Background Music",
            prompt: cleanPrompt,
            duration: Number(soundDuration),
          }),
        }
      );

      const text = await response.text();

      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          "Sound server returned an invalid response."
        );
      }

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

      if (data?.status === "processing") {
        setGeneratedSoundStatus(
          "⏳ Sound is still processing. Generate again shortly."
        );

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

  function playGeneratedSound() {
    if (!generatedAudioUrl) {
      setGeneratedSoundStatus(
        "⚠️ Generate a sound first."
      );

      return;
    }

    stopGeneratedSound();

    try {
      const audio =
        new Audio(generatedAudioUrl);

      audio.preload = "auto";

      generatedAudioRef.current =
        audio;

      audio.onended = () => {
        setGeneratedSoundStatus(
          "🎵 AI sound finished. Ready again."
        );
      };

      audio.onerror = () => {
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
          .catch(() => {
            setGeneratedSoundStatus(
              "❌ Browser blocked the generated audio."
            );
          });
      }
    } catch {
      setGeneratedSoundStatus(
        "❌ Unable to play generated audio."
      );
    }
  }

  /* =======================================================
     9JALINGO VOICE GENERATION
     ======================================================= */

  async function generateAIVoice() {
    const cleanText =
      voiceText.trim();

    const cleanVoiceId =
      voiceId.trim();

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
        "Choose a 9jaLingo voice first."
      );

      setGeneratedVoiceStatus(
        "⚠️ 9jaLingo voice is required."
      );

      return;
    }

    stopGeneratedVoice();

    setGeneratedVoiceUrl("");
    setGeneratedVoiceError("");
    setIsGeneratingVoice(true);

    setGeneratedVoiceStatus(
      "⏳ BOMBA AI is sending your dialogue to 9jaLingo..."
    );

    try {
      const response =
        await fetch(
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
              language:
                voiceLanguage,
            }),
          }
        );

      if (!response.ok) {
        const errorText =
          await response.text();

        let errorData = {};

        try {
          errorData =
            errorText
              ? JSON.parse(
                  errorText
                )
              : {};
        } catch {
          errorData = {};
        }

        throw new Error(
          errorData?.error ||
            errorText ||
            `Voice generation failed with HTTP ${response.status}.`
        );
      }

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
        "☁️ Uploading your voice automatically..."
      );

      const cloudinaryResult =
        await uploadVoiceToCloudinary(
          audioBlob
        );

      const voicePublicId =
        cloudinaryResult.public_id;

      localStorage.setItem(
        "bomba_voice_public_id",
        voicePublicId
      );

      localStorage.setItem(
        "bomba_voice_cloudinary_resource_type",
        "video"
      );

      localStorage.setItem(
        "bomba_voice_language",
        voiceLanguage
      );

      localStorage.setItem(
        "bomba_voice_text",
        cleanText
      );

      localStorage.setItem(
        "bomba_voice_id",
        cleanVoiceId
      );

      setGeneratedVoiceStatus(
        `✅ ${cleanVoiceId} voice ready. Your next video will automatically include this voice.`
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
      setIsGeneratingVoice(
        false
      );
    }
  }

  function playGeneratedVoice() {
    if (!generatedVoiceUrl) {
      setGeneratedVoiceStatus(
        "⚠️ Generate a voice first."
      );

      return;
    }

    stopGeneratedVoice();

    try {
      const audio =
        new Audio(
          generatedVoiceUrl
        );

      audio.preload = "auto";

      generatedVoiceRef.current =
        audio;

      audio.onended = () => {
        setGeneratedVoiceStatus(
          "🎙️ AI voice finished. Ready again."
        );
      };

      audio.onerror = () => {
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
          .catch(() => {
            setGeneratedVoiceStatus(
              "❌ Browser blocked the generated voice."
            );
          });
      }
    } catch {
      setGeneratedVoiceStatus(
        "❌ Unable to play generated voice."
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

      {production && (
        <div
          style={{
            marginBottom: "10px",
            padding: "8px 10px",
            borderRadius: "8px",
            background:
              "rgba(255,212,59,0.045)",
            border:
              "1px solid rgba(255,212,59,0.10)",
            fontSize: "8px",
            opacity: 0.55,
          }}
        >
          🧠 Production Brain connected
          {" • "}
          Project ready
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: "8px",
        }}
      >
        {modules.map(
          (module) => (
            <button
              key={
                module.number
              }
              type="button"
              onClick={() =>
                setActiveModule(
                  module.name
                )
              }
              style={{
                width: "100%",
                minHeight: "58px",
                padding: "9px",
                borderRadius: "10px",
                border:
                  activeModule ===
                  module.name
                    ? "1px solid rgba(255,212,59,0.65)"
                    : "1px solid rgba(255,255,255,0.10)",
                background:
                  activeModule ===
                  module.name
                    ? "rgba(255,212,59,0.08)"
                    : "rgba(255,255,255,0.035)",
                color: "inherit",
                textAlign:
                  "left",
                cursor:
                  "pointer",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontSize:
                      "18px",
                    lineHeight: 1,
                  }}
                >
                  {
                    module.icon
                  }
                </span>

                <span
                  style={{
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      display:
                        "block",
                      fontSize:
                        "9px",
                      opacity:
                        0.45,
                      marginBottom:
                        "2px",
                    }}
                  >
                    {
                      module.number
                    }
                  </span>

                  <span
                    style={{
                      display:
                        "block",
                      fontSize:
                        "11px",
                      fontWeight:
                        "800",
                      letterSpacing:
                        "0.5px",
                    }}
                  >
                    {
                      module.name
                    }
                  </span>
                </span>
              </div>
            </button>
          )
        )}
      </div>

      {/* =====================================================
          VOICE STUDIO
      ===================================================== */}

      {activeModule ===
        "VOICE" && (
        <div
          style={{
            marginTop:
              "14px",
            padding:
              "14px",
            borderRadius:
              "12px",
            border:
              "1px solid rgba(255,212,59,0.20)",
            background:
              "rgba(255,212,59,0.04)",
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap: "10px",
              marginBottom:
                "12px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize:
                    "10px",
                  fontWeight:
                    "700",
                  letterSpacing:
                    "1px",
                  opacity:
                    0.55,
                }}
              >
                VOICE STUDIO
              </div>

              <h3
                style={{
                  margin:
                    "4px 0 0",
                  fontSize:
                    "16px",
                  fontWeight:
                    "800",
                }}
              >
                🎙️ AI Voice
              </h3>
            </div>

            <button
              type="button"
              onClick={() => {
                stopGeneratedVoice();
                setActiveModule(
                  null
                );
              }}
              style={{
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(255,255,255,0.05)",
                color:
                  "inherit",
                borderRadius:
                  "8px",
                padding:
                  "6px 9px",
                fontSize:
                  "11px",
                cursor:
                  "pointer",
              }}
            >
              CLOSE
            </button>
          </div>

          <div
            style={{
              padding:
                "12px",
              borderRadius:
                "10px",
              border:
                "1px solid rgba(255,212,59,0.30)",
              background:
                "rgba(255,212,59,0.07)",
            }}
          >
            <div
              style={{
                fontSize:
                  "10px",
                fontWeight:
                  "800",
                letterSpacing:
                  "1px",
                marginBottom:
                  "5px",
              }}
            >
              ✨ BOMBA AI VOICE GENERATOR
            </div>

            <div
              style={{
                fontSize:
                  "9px",
                opacity:
                  0.55,
                lineHeight:
                  1.5,
                marginBottom:
                  "10px",
              }}
            >
              Choose a real 9jaLingo
              speaker and turn your
              dialogue into AI speech.
            </div>

            <label
              style={{
                display:
                  "block",
                fontSize:
                  "9px",
                fontWeight:
                  "800",
                marginBottom:
                  "5px",
              }}
            >
              LANGUAGE
            </label>

            <select
              value={
                voiceLanguage
              }
              onChange={(
                event
              ) =>
                setVoiceLanguage(
                  event
                    .target
                    .value
                )
              }
              style={{
                width:
                  "100%",
                boxSizing:
                  "border-box",
                padding:
                  "10px",
                marginBottom:
                  "9px",
                borderRadius:
                  "8px",
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(0,0,0,0.35)",
                color:
                  "inherit",
                fontSize:
                  "10px",
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

            <label
              style={{
                display:
                  "block",
                fontSize:
                  "9px",
                fontWeight:
                  "800",
                marginBottom:
                  "5px",
              }}
            >
              9JALINGO VOICE
            </label>

            <select
              value={voiceId}
              onChange={(
                event
              ) =>
                setVoiceId(
                  event
                    .target
                    .value
                )
              }
              disabled={
                isGeneratingVoice
              }
              style={{
                width:
                  "100%",
                boxSizing:
                  "border-box",
                padding:
                  "10px",
                marginBottom:
                  "9px",
                borderRadius:
                  "8px",
                border:
                  "1px solid rgba(255,212,59,0.35)",
                background:
                  "rgba(0,0,0,0.35)",
                color:
                  "inherit",
                fontSize:
                  "10px",
                outline:
                  "none",
              }}
            >
              {availableVoices.map(
                (voice) => (
                  <option
                    key={
                      voice.id
                    }
                    value={
                      voice.id
                    }
                  >
                    {voice.name}
                    {voice.gender
                      ? ` — ${voice.gender}`
                      : ""}
                    {` (${voice.id})`}
                  </option>
                )
              )}
            </select>

            <div
              style={{
                fontSize:
                  "8px",
                opacity:
                  0.45,
                marginBottom:
                  "9px",
              }}
            >
              {availableVoices.length} confirmed
              9jaLingo speaker options.
            </div>

            <label
              style={{
                display:
                  "block",
                fontSize:
                  "9px",
                fontWeight:
                  "800",
                marginBottom:
                  "5px",
              }}
            >
              DIALOGUE / SCRIPT
            </label>

            <textarea
              value={
                voiceText
              }
              onChange={(
                event
              ) =>
                setVoiceText(
                  event
                    .target
                    .value
                )
              }
              rows={6}
              maxLength={
                5000
              }
              placeholder="Enter the dialogue you want your AI character to speak..."
              style={{
                width:
                  "100%",
                boxSizing:
                  "border-box",
                resize:
                  "vertical",
                padding:
                  "10px",
                borderRadius:
                  "8px",
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(0,0,0,0.25)",
                color:
                  "inherit",
                fontSize:
                  "11px",
                lineHeight:
                  1.5,
                outline:
                  "none",
              }}
            />

            <div
              style={{
                marginTop:
                  "5px",
                textAlign:
                  "right",
                fontSize:
                  "8px",
                opacity:
                  0.4,
              }}
            >
              {
                voiceText.length
              } / 5000
            </div>

            <button
              type="button"
              onClick={
                generateAIVoice
              }
              disabled={
                isGeneratingVoice
              }
              style={{
                width:
                  "100%",
                marginTop:
                  "9px",
                padding:
                  "12px",
                borderRadius:
                  "8px",
                border:
                  "1px solid rgba(255,212,59,0.45)",
                background:
                  "rgba(255,212,59,0.15)",
                color:
                  "inherit",
                fontSize:
                  "10px",
                fontWeight:
                  "800",
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

            <div
              style={{
                marginTop:
                  "10px",
                padding:
                  "9px",
                borderRadius:
                  "8px",
                background:
                  "rgba(0,0,0,0.20)",
                fontSize:
                  "9px",
                lineHeight:
                  1.5,
                textAlign:
                  "center",
              }}
            >
              {
                generatedVoiceStatus
              }
            </div>

            {generatedVoiceError && (
              <div
                style={{
                  marginTop:
                    "7px",
                  padding:
                    "8px",
                  borderRadius:
                    "7px",
                  background:
                    "rgba(255,70,70,0.08)",
                  border:
                    "1px solid rgba(255,70,70,0.20)",
                  fontSize:
                    "8px",
                  lineHeight:
                    1.5,
                  wordBreak:
                    "break-word",
                }}
              >
                {
                  generatedVoiceError
                }
              </div>
            )}

            {generatedVoiceUrl && (
              <div
                style={{
                  marginTop:
                    "10px",
                  padding:
                    "10px",
                  borderRadius:
                    "8px",
                  background:
                    "rgba(0,0,0,0.25)",
                  border:
                    "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize:
                      "9px",
                    fontWeight:
                      "800",
                    marginBottom:
                      "7px",
                  }}
                >
                  ✅ AI VOICE READY
                </div>

                <audio
                  controls
                  preload="metadata"
                  src={
                    generatedVoiceUrl
                  }
                  style={{
                    width:
                      "100%",
                    height:
                      "40px",
                  }}
                />

                <button
                  type="button"
                  onClick={
                    playGeneratedVoice
                  }
                  style={{
                    width:
                      "100%",
                    marginTop:
                      "8px",
                    padding:
                      "10px",
                    borderRadius:
                      "8px",
                    border:
                      "1px solid rgba(255,212,59,0.35)",
                    background:
                      "rgba(255,212,59,0.08)",
                    color:
                      "inherit",
                    fontSize:
                      "10px",
                    fontWeight:
                      "800",
                    cursor:
                      "pointer",
                  }}
                >
                  ▶️ PLAY AI VOICE
                </button>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop:
                "12px",
              padding:
                "11px",
              borderRadius:
                "9px",
              background:
                "rgba(255,255,255,0.035)",
              border:
                "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                fontSize:
                  "10px",
                fontWeight:
                  "800",
                marginBottom:
                  "5px",
              }}
            >
              🎙️ VOICE WORKFLOW
            </div>

            <div
              style={{
                fontSize:
                  "9px",
                lineHeight:
                  1.6,
                opacity:
                  0.55,
              }}
            >
              Choose language → choose
              speaker → enter dialogue →
              generate → Cloudinary upload
              → ready for video.
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          SOUND STUDIO
      ===================================================== */}

      {activeModule ===
        "SOUND" && (
        <div
          style={{
            marginTop:
              "14px",
            padding:
              "14px",
            borderRadius:
              "12px",
            border:
              "1px solid rgba(255,212,59,0.20)",
            background:
              "rgba(255,212,59,0.04)",
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap:
                "10px",
              marginBottom:
                "12px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize:
                    "10px",
                  fontWeight:
                    "700",
                  letterSpacing:
                    "1px",
                  opacity:
                    0.55,
                }}
              >
                SOUND STUDIO
              </div>

              <h3
                style={{
                  margin:
                    "4px 0 0",
                  fontSize:
                    "16px",
                  fontWeight:
                    "800",
                }}
              >
                🔊 AI Sound
              </h3>
            </div>

            <button
              type="button"
              onClick={() => {
                stopGeneratedSound();
                setActiveModule(
                  null
                );
              }}
              style={{
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(255,255,255,0.05)",
                color:
                  "inherit",
                borderRadius:
                  "8px",
                padding:
                  "6px 9px",
                fontSize:
                  "11px",
                cursor:
                  "pointer",
              }}
            >
              CLOSE
            </button>
          </div>

          <div
            style={{
              padding:
                "12px",
              borderRadius:
                "10px",
              border:
                "1px solid rgba(255,212,59,0.30)",
              background:
                "rgba(255,212,59,0.07)",
            }}
          >
            <div
              style={{
                fontSize:
                  "10px",
                fontWeight:
                  "800",
                letterSpacing:
                  "1px",
                marginBottom:
                  "5px",
              }}
            >
              ✨ BOMBA AI SOUND GENERATOR
            </div>

            <div
              style={{
                fontSize:
                  "9px",
                opacity:
                  0.55,
                lineHeight:
                  1.5,
                marginBottom:
                  "10px",
              }}
            >
              Create original AI background
              music from your own description.
            </div>

            <textarea
              value={
                soundPrompt
              }
              onChange={(
                event
              ) =>
                setSoundPrompt(
                  event
                    .target
                    .value
                )
              }
              rows={4}
              placeholder="Describe the music you want..."
              style={{
                width:
                  "100%",
                boxSizing:
                  "border-box",
                resize:
                  "vertical",
                padding:
                  "10px",
                borderRadius:
                  "8px",
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(0,0,0,0.25)",
                color:
                  "inherit",
                fontSize:
                  "11px",
                lineHeight:
                  1.5,
                outline:
                  "none",
              }}
            />

            <div
              style={{
                display:
                  "flex",
                gap:
                  "8px",
                marginTop:
                  "9px",
              }}
            >
              <select
                value={
                  soundDuration
                }
                onChange={(
                  event
                ) =>
                  setSoundDuration(
                    Number(
                      event
                        .target
                        .value
                    )
                  )
                }
                style={{
                  flex:
                    1,
                  padding:
                    "10px",
                  borderRadius:
                    "8px",
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                  background:
                    "rgba(0,0,0,0.35)",
                  color:
                    "inherit",
                  fontSize:
                    "10px",
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
                  flex:
                    2,
                  padding:
                    "10px",
                  borderRadius:
                    "8px",
                  border:
                    "1px solid rgba(255,212,59,0.45)",
                  background:
                    "rgba(255,212,59,0.15)",
                  color:
                    "inherit",
                  fontSize:
                    "10px",
                  fontWeight:
                    "800",
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

            <div
              style={{
                marginTop:
                  "10px",
                padding:
                  "9px",
                borderRadius:
                  "8px",
                background:
                  "rgba(0,0,0,0.20)",
                fontSize:
                  "9px",
                lineHeight:
                  1.5,
                textAlign:
                  "center",
              }}
            >
              {
                generatedSoundStatus
              }
            </div>

            {generatedSoundError && (
              <div
                style={{
                  marginTop:
                    "7px",
                  padding:
                    "8px",
                  borderRadius:
                    "7px",
                  background:
                    "rgba(255,70,70,0.08)",
                  border:
                    "1px solid rgba(255,70,70,0.20)",
                  fontSize:
                    "8px",
                  lineHeight:
                    1.5,
                  wordBreak:
                    "break-word",
                }}
              >
                {
                  generatedSoundError
                }
              </div>
            )}

            {generatedAudioUrl && (
              <div
                style={{
                  marginTop:
                    "10px",
                  padding:
                    "10px",
                  borderRadius:
                    "8px",
                  background:
                    "rgba(0,0,0,0.25)",
                  border:
                    "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize:
                      "9px",
                    fontWeight:
                      "800",
                    marginBottom:
                      "7px",
                  }}
                >
                  ✅ AI SOUND READY
                </div>

                <audio
                  controls
                  preload="metadata"
                  src={
                    generatedAudioUrl
                  }
                  style={{
                    width:
                      "100%",
                    height:
                      "40px",
                  }}
                />

                <button
                  type="button"
                  onClick={
                    playGeneratedSound
                  }
                  style={{
                    width:
                      "100%",
                    marginTop:
                      "8px",
                    padding:
                      "10px",
                    borderRadius:
                      "8px",
                    border:
                      "1px solid rgba(255,212,59,0.35)",
                    background:
                      "rgba(255,212,59,0.08)",
                    color:
                      "inherit",
                    fontSize:
                      "10px",
                    fontWeight:
                      "800",
                    cursor:
                      "pointer",
                  }}
                >
                  ▶️ PLAY AI SOUND
                </button>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop:
                "12px",
              padding:
                "11px",
              borderRadius:
                "9px",
              background:
                "rgba(255,255,255,0.035)",
              border:
                "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                fontSize:
                  "10px",
                fontWeight:
                  "800",
                marginBottom:
                  "5px",
              }}
            >
              🎧 SOUND WORKFLOW
            </div>

            <div
              style={{
                fontSize:
                  "9px",
                lineHeight:
                  1.6,
                opacity:
                  0.55,
              }}
            >
              Describe the music → choose
              duration → generate → preview
              → use in your video project.
            </div>
          </div>
        </div>
      )}
    </section>
  );
}