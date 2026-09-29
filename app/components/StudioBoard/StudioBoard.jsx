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
   SOUND CATEGORIES
========================================================= */

const soundCategories = [
  {
    icon: "🎵",
    title: "BOMBA Originals",
    description: "Original music created for BOMBA.",
  },
  {
    icon: "🎼",
    title: "Licensed Music",
    description: "Music cleared for use in video projects.",
  },
  {
    icon: "🔊",
    title: "Sound Effects",
    description: "Professional effects for your scenes.",
  },
  {
    icon: "🌍",
    title: "Environment",
    description: "Rain, city, crowd and natural ambience.",
  },
];

/* =========================================================
   SOUND LIBRARY
========================================================= */

const soundLibrary = {
  "BOMBA Originals": [
    {
      id: "bomba-intro",
      title: "BOMBA Intro",
      description: "Original cinematic intro music.",
      file: "/audio/bomba/bomba-intro.mp3",
    },
    {
      id: "bomba-cinematic",
      title: "BOMBA Cinematic",
      description: "Modern cinematic background.",
      file: "/audio/bomba/bomba-cinematic.mp3",
    },
  ],

  "Licensed Music": [
    {
      id: "cinematic-background",
      title: "Subtle Background",
      description: "Cinematic background music by AudioDollar.",
      file: "/audio/music/cinematic-background.mp3",
      creator: "AudioDollar",
      source: "Pixabay",
    },
    {
      id: "motivational-background",
      title: "Motivational Background",
      description: "Professional motivational background.",
      file: "/audio/music/motivational-background.mp3",
    },
  ],

  "Sound Effects": [
    {
      id: "transition-whoosh",
      title: "Transition Whoosh",
      description: "Clean cinematic transition effect.",
      file: "/audio/sfx/transition-whoosh.mp3",
    },
    {
      id: "cinematic-impact",
      title: "Cinematic Impact",
      description: "Strong scene impact effect.",
      file: "/audio/sfx/cinematic-impact.mp3",
    },
  ],

  Environment: [
    {
      id: "city-ambience",
      title: "City Ambience",
      description: "Natural urban background atmosphere.",
      file: "/audio/environment/city-ambience.mp3",
    },
    {
      id: "rain-ambience",
      title: "Rain Ambience",
      description: "Soft atmospheric rain.",
      file: "/audio/environment/rain-ambience.mp3",
    },
  ],
};

/* =========================================================
   STUDIO BOARD
========================================================= */

export default function StudioBoard() {
  const [activeModule, setActiveModule] = useState(null);

  /* =======================================================
     LIBRARY SOUND STATE
  ======================================================= */

  const [soundCategory, setSoundCategory] =
    useState("Licensed Music");

  const [selectedSound, setSelectedSound] =
    useState(null);

  const [volume, setVolume] = useState(70);

  const [isPlaying, setIsPlaying] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(false);

  const [soundStatus, setSoundStatus] = useState(
    "Choose a professional sound to preview."
  );

  /* =======================================================
     AI SOUND STATE
  ======================================================= */

  const [soundPrompt, setSoundPrompt] =
    useState(
      "cinematic emotional background music for a realistic movie scene"
    );

  const [soundDuration, setSoundDuration] =
    useState(5);

  const [generatedAudioUrl, setGeneratedAudioUrl] =
    useState("");

  const [isGeneratingSound, setIsGeneratingSound] =
    useState(false);

  const [generatedSoundStatus, setGeneratedSoundStatus] =
    useState(
      "Ready to create AI sound."
    );

  const [generatedSoundError, setGeneratedSoundError] =
    useState("");

  /* =======================================================
     AUDIO REFERENCES
  ======================================================= */

  const audioRef = useRef(null);

  const generatedAudioRef = useRef(null);

  const currentSounds =
    soundLibrary[soundCategory] || [];

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  /* =======================================================
     STOP LIBRARY AUDIO
  ======================================================= */

  function stopLibrarySound() {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      } catch (error) {
        console.log(
          "Library audio cleanup skipped."
        );
      }

      audioRef.current = null;
    }

    setIsPlaying(false);
    setIsLoading(false);
  }

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
     STOP EVERYTHING
  ======================================================= */

  function stopAllAudio() {
    stopLibrarySound();
    stopGeneratedSound();
  }

  /* =======================================================
     SELECT SOUND CATEGORY
  ======================================================= */

  function selectCategory(category) {
    stopLibrarySound();

    setSoundCategory(category);

    setSelectedSound(null);

    setSoundStatus(
      `${category} selected. Choose a sound below.`
    );
  }

  /* =======================================================
     SELECT SOUND
  ======================================================= */

  function selectSound(sound) {
    stopLibrarySound();

    setSelectedSound(sound);

    setSoundStatus(
      `${sound.title} selected. Press PREVIEW SOUND.`
    );
  }

  /* =======================================================
     PREVIEW LIBRARY SOUND
  ======================================================= */

  function previewSound() {
    if (!selectedSound) {
      setSoundStatus(
        "⚠️ Choose a sound first."
      );
      return;
    }

    if (isPlaying) {
      stopLibrarySound();

      setSoundStatus(
        "⏹️ Sound stopped."
      );

      return;
    }

    stopGeneratedSound();
    stopLibrarySound();

    setIsLoading(true);

    setSoundStatus(
      `⏳ Loading ${selectedSound.title}...`
    );

    try {
      const audio = new Audio();

      audio.preload = "auto";

      audio.volume =
        Number(volume) / 100;

      audioRef.current = audio;

      audio.oncanplay = () => {
        setIsLoading(false);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setIsLoading(false);

        setSoundStatus(
          "🎵 Sound finished. Ready again."
        );
      };

      audio.onerror = () => {
        console.error(
          "BOMBA LIBRARY AUDIO ERROR:",
          audio.error
        );

        setIsPlaying(false);
        setIsLoading(false);

        setSoundStatus(
          `❌ Unable to load ${selectedSound.title}. Check the MP3 path.`
        );
      };

      audio.src = selectedSound.file;

      audio.load();

      const promise = audio.play();

      if (promise) {
        promise
          .then(() => {
            setIsLoading(false);
            setIsPlaying(true);

            setSoundStatus(
              `▶️ ${selectedSound.title} is playing.`
            );
          })
          .catch((error) => {
            console.error(
              "BOMBA LIBRARY PLAY ERROR:",
              error
            );

            setIsLoading(false);
            setIsPlaying(false);

            setSoundStatus(
              "❌ Browser could not play this audio file."
            );
          });
      }
    } catch (error) {
      console.error(
        "BOMBA LIBRARY AUDIO ERROR:",
        error
      );

      setIsLoading(false);
      setIsPlaying(false);

      setSoundStatus(
        "❌ Unable to play this sound."
      );
    }
  }

  /* =======================================================
     VOLUME
  ======================================================= */

  function updateVolume(value) {
    const nextVolume =
      Number(value);

    setVolume(nextVolume);

    if (audioRef.current) {
      audioRef.current.volume =
        nextVolume / 100;
    }

    if (generatedAudioRef.current) {
      generatedAudioRef.current.volume =
        nextVolume / 100;
    }
  }

  /* =======================================================
     GENERATE AI SOUND
  ======================================================= */

  async function generateAISound() {
    const cleanPrompt =
      soundPrompt.trim();

    if (!cleanPrompt) {
      setGeneratedSoundError(
        "Enter a sound description first."
      );

      setGeneratedSoundStatus(
        "⚠️ Sound description is required."
      );

      return;
    }

    stopAllAudio();

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
            duration:
              Number(soundDuration),
          }),
        }
      );

      console.log(
        "BOMBA AI SOUND HTTP STATUS:",
        response.status
      );

      const text =
        await response.text();

      console.log(
        "BOMBA AI SOUND RAW RESPONSE:",
        text
      );

      let data = {};

      try {
        data =
          text
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
        data?.status ===
          "completed" &&
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
        data?.status ===
        "processing"
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

      setGeneratedSoundError(
        message
      );

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

    stopLibrarySound();

    stopGeneratedSound();

    try {
      setGeneratedSoundStatus(
        "⏳ Loading generated AI sound..."
      );

      const audio =
        new Audio(
          generatedAudioUrl
        );

      audio.preload =
        "auto";

      audio.volume =
        Number(volume) / 100;

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

      const promise =
        audio.play();

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
            margin:
              "4px 0 3px",
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
                minHeight:
                  "58px",
                padding: "9px",
                borderRadius:
                  "10px",
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
                color:
                  "inherit",
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

      {/* SOUND STUDIO */}

      {activeModule ===
        "SOUND" && (
        <div
          style={{
            marginTop:
              "14px",
            padding: "14px",
            borderRadius:
              "12px",
            border:
              "1px solid rgba(255,212,59,0.20)",
            background:
              "rgba(255,212,59,0.04)",
          }}
        >
          {/* SOUND HEADER */}

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
                🔊 Professional Sound
              </h3>
            </div>

            <button
              type="button"
              onClick={() => {
                stopAllAudio();
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

          {/* AI SOUND GENERATOR */}

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
              Create original AI background music from your own description.
            </div>

            <textarea
              value={
                soundPrompt
              }
              onChange={(
                event
              ) =>
                setSoundPrompt(
                  event.target
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
                gap: "8px",
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
                      event.target
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
                <option
                  value={
                    5
                  }
                >
                  5 seconds
                </option>

                <option
                  value={
                    8
                  }
                >
                  8 seconds
                </option>

                <option
                  value={
                    10
                  }
                >
                  10 seconds
                </option>

                <option
                  value={
                    15
                  }
                >
                  15 seconds
                </option>

                <option
                  value={
                    20
                  }
                >
                  20 seconds
                </option>

                <option
                  value={
                    30
                  }
                >
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

            {/* AI STATUS */}

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

            {/* AI ERROR */}

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

            {/* GENERATED AUDIO */}

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

          {/* SOUND CATEGORIES */}

          <div
            style={{
              marginTop:
                "12px",
              display:
                "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap:
                "8px",
            }}
          >
            {soundCategories.map(
              ({
                icon,
                title,
                description,
              }) => (
                <button
                  key={
                    title
                  }
                  type="button"
                  onClick={() =>
                    selectCategory(
                      title
                    )
                  }
                  style={{
                    padding:
                      "11px",
                    minHeight:
                      "82px",
                    borderRadius:
                      "10px",
                    border:
                      soundCategory ===
                      title
                        ? "1px solid rgba(255,212,59,0.65)"
                        : "1px solid rgba(255,255,255,0.10)",
                    background:
                      soundCategory ===
                      title
                        ? "rgba(255,212,59,0.10)"
                        : "rgba(255,255,255,0.035)",
                    color:
                      "inherit",
                    textAlign:
                      "left",
                    cursor:
                      "pointer",
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        "18px",
                      marginBottom:
                        "5px",
                    }}
                  >
                    {
                      icon
                    }
                  </div>

                  <div
                    style={{
                      fontSize:
                        "11px",
                      fontWeight:
                        "800",
                      marginBottom:
                        "3px",
                    }}
                  >
                    {
                      title
                    }
                  </div>

                  <div
                    style={{
                      fontSize:
                        "9px",
                      lineHeight:
                        1.4,
                      opacity:
                        0.55,
                    }}
                  >
                    {
                      description
                    }
                  </div>
                </button>
              )
            )}
          </div>

          {/* SOUND LIBRARY */}

          <div
            style={{
              marginTop:
                "12px",
              padding:
                "10px",
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
                  "700",
                letterSpacing:
                  "1px",
                marginBottom:
                  "9px",
                opacity:
                  0.65,
              }}
            >
              {
                soundCategory.toUpperCase()
              }
            </div>

            {currentSounds.map(
              (sound) => (
                <div
                  key={
                    sound.id
                  }
                  style={{
                    marginBottom:
                      "8px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      selectSound(
                        sound
                      )
                    }
                    style={{
                      width:
                        "100%",
                      padding:
                        "10px",
                      borderRadius:
                        "8px",
                      border:
                        selectedSound?.id ===
                        sound.id
                          ? "1px solid rgba(255,212,59,0.65)"
                          : "1px solid rgba(255,255,255,0.08)",
                      background:
                        selectedSound?.id ===
                        sound.id
                          ? "rgba(255,212,59,0.08)"
                          : "rgba(255,255,255,0.025)",
                      color:
                        "inherit",
                      textAlign:
                        "left",
                      cursor:
                        "pointer",
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          "11px",
                        fontWeight:
                          "800",
                      }}
                    >
                      {
                        sound.title
                      }
                    </div>

                    <div
                      style={{
                        marginTop:
                          "3px",
                        fontSize:
                          "9px",
                        opacity:
                          0.55,
                      }}
                    >
                      {
                        sound.description
                      }
                    </div>

                    {sound.creator && (
                      <div
                        style={{
                          marginTop:
                            "5px",
                          fontSize:
                            "8px",
                          opacity:
                            0.4,
                        }}
                      >
                        Music by{" "}
                        {
                          sound.creator
                        }{" "}
                        ·{" "}
                        {
                          sound.source
                        }
                      </div>
                    )}
                  </button>

                  {selectedSound?.id ===
                    sound.id && (
                    <button
                      type="button"
                      onClick={
                        previewSound
                      }
                      disabled={
                        isLoading
                      }
                      style={{
                        width:
                          "100%",
                        marginTop:
                          "5px",
                        padding:
                          "8px",
                        borderRadius:
                          "7px",
                        border:
                          "1px solid rgba(255,212,59,0.30)",
                        background:
                          isPlaying
                            ? "rgba(255,80,80,0.10)"
                            : "rgba(255,212,59,0.08)",
                        color:
                          "inherit",
                        fontSize:
                          "9px",
                        fontWeight:
                          "800",
                        cursor:
                          isLoading
                            ? "wait"
                            : "pointer",
                      }}
                    >
                      {isLoading
                        ? "⏳ LOADING..."
                        : isPlaying
                        ? "⏹️ STOP SOUND"
                        : "▶️ PREVIEW THIS SOUND"}
                    </button>
                  )}
                </div>
              )
            )}
          </div>

          {/* VOLUME */}

          <div
            style={{
              marginTop:
                "12px",
              padding:
                "10px",
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
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  "7px",
              }}
            >
              <span
                style={{
                  fontSize:
                    "10px",
                  fontWeight:
                    "700",
                }}
              >
                🔊 VOLUME
              </span>

              <span
                style={{
                  fontSize:
                    "10px",
                  opacity:
                    0.6,
                }}
              >
                {
                  volume
                }%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={
                volume
              }
              onChange={(
                event
              ) =>
                updateVolume(
                  event.target
                    .value
                )
              }
              style={{
                width:
                  "100%",
                cursor:
                  "pointer",
              }}
            />
          </div>

          {/* MAIN LIBRARY PREVIEW */}

          <button
            type="button"
            onClick={
              previewSound
            }
            disabled={
              isLoading
            }
            style={{
              width:
                "100%",
              marginTop:
                "10px",
              padding:
                "12px",
              borderRadius:
                "9px",
              border:
                "1px solid rgba(255,212,59,0.35)",
              background:
                isPlaying
                  ? "rgba(255,80,80,0.10)"
                  : "rgba(255,212,59,0.10)",
              color:
                "inherit",
              fontSize:
                "11px",
              fontWeight:
                "800",
              cursor:
                isLoading
                  ? "wait"
                  : "pointer",
              opacity:
                isLoading
                  ? 0.7
                  : 1,
            }}
          >
            {isLoading
              ? "⏳ LOADING SOUND..."
              : isPlaying
              ? "⏹️ STOP SOUND"
              : "▶️ PREVIEW SOUND"}
          </button>

          {/* LIBRARY STATUS */}

          <div
            style={{
              marginTop:
                "9px",
              textAlign:
                "center",
              fontSize:
                "9px",
              lineHeight:
                1.5,
              opacity:
                0.65,
            }}
          >
            {
              soundStatus
            }
          </div>

          {/* FOOTER */}

          <div
            style={{
              marginTop:
                "9px",
              textAlign:
                "center",
              fontSize:
                "8px",
              lineHeight:
                1.5,
              opacity:
                0.38,
            }}
          >
            BOMBA Sound Studio — AI generated sound and licensed assets.
          </div>
        </div>
      )}
    </section>
  );
}