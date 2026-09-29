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

  const [soundCategory, setSoundCategory] =
    useState("Licensed Music");

  const [selectedSound, setSelectedSound] =
    useState(null);

  const [volume, setVolume] = useState(70);

  const [isPlaying, setIsPlaying] =
    useState(false);

  const [soundStatus, setSoundStatus] = useState(
    "Choose a professional sound to preview."
  );

  const audioRef = useRef(null);

  const currentSounds =
    soundLibrary[soundCategory] || [];

  /* =======================================================
     CLEAN UP AUDIO WHEN COMPONENT UNMOUNTS
  ======================================================= */

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);

  /* =======================================================
     STOP SOUND
  ======================================================= */

  function stopSound() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    setIsPlaying(false);
  }

  /* =======================================================
     SELECT SOUND CATEGORY
  ======================================================= */

  function selectCategory(category) {
    stopSound();

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
    stopSound();

    setSelectedSound(sound);

    setSoundStatus(
      `${sound.title} selected. Press PREVIEW SOUND.`
    );
  }

  /* =======================================================
     PREVIEW SOUND
  ======================================================= */

  async function previewSound() {
    if (!selectedSound) {
      setSoundStatus(
        "Choose a sound before previewing."
      );
      return;
    }

    if (isPlaying) {
      stopSound();
      setSoundStatus("Sound stopped.");
      return;
    }

    try {
      stopSound();

      const audio =
        new Audio(selectedSound.file);

      audio.volume = volume / 100;

      audioRef.current = audio;

      audio.addEventListener(
        "ended",
        () => {
          setIsPlaying(false);
          setSoundStatus(
            "Sound finished. Ready again."
          );
        }
      );

      audio.addEventListener(
        "error",
        () => {
          setIsPlaying(false);
          setSoundStatus(
            "Unable to load this audio file."
          );
        }
      );

      setSoundStatus(
        `Loading ${selectedSound.title}...`
      );

      await audio.play();

      setIsPlaying(true);

      setSoundStatus(
        `${selectedSound.title} is playing.`
      );
    } catch (error) {
      console.error(
        "BOMBA SOUND PLAYER ERROR:",
        error
      );

      setIsPlaying(false);

      setSoundStatus(
        "Audio could not be played. Check the MP3 file."
      );
    }
  }

  /* =======================================================
     VOLUME
  ======================================================= */

  function updateVolume(value) {
    const nextVolume = Number(value);

    setVolume(nextVolume);

    if (audioRef.current) {
      audioRef.current.volume =
        nextVolume / 100;
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
      {/* ===================================================
          HEADER
      =================================================== */}

      <div style={{ marginBottom: "12px" }}>
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

      {/* ===================================================
          PRODUCTION MODULES
      =================================================== */}

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

              <span style={{ minWidth: 0 }}>
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

      {/* ===================================================
          SOUND STUDIO
      =================================================== */}

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
                🔊 Professional Sound
              </h3>
            </div>

            <button
              type="button"
              onClick={() => {
                stopSound();
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

          {/* SOUND CATEGORIES */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: "8px",
            }}
          >
            {soundCategories.map(
              ({
                icon,
                title,
                description,
              }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() =>
                    selectCategory(title)
                  }
                  style={{
                    padding: "11px",
                    minHeight: "82px",
                    borderRadius: "10px",
                    border:
                      soundCategory === title
                        ? "1px solid rgba(255,212,59,0.65)"
                        : "1px solid rgba(255,255,255,0.10)",
                    background:
                      soundCategory === title
                        ? "rgba(255,212,59,0.10)"
                        : "rgba(255,255,255,0.035)",
                    color: "inherit",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      fontSize: "18px",
                      marginBottom: "5px",
                    }}
                  >
                    {icon}
                  </div>

                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: "800",
                      marginBottom: "3px",
                    }}
                  >
                    {title}
                  </div>

                  <div
                    style={{
                      fontSize: "9px",
                      lineHeight: 1.4,
                      opacity: 0.55,
                    }}
                  >
                    {description}
                  </div>
                </button>
              )
            )}
          </div>

          {/* SOUND LIST */}

          <div
            style={{
              marginTop: "12px",
              padding: "10px",
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
                fontWeight: "700",
                letterSpacing: "1px",
                marginBottom: "9px",
                opacity: 0.65,
              }}
            >
              {soundCategory.toUpperCase()}
            </div>

            {currentSounds.map((sound) => (
              <button
                key={sound.id}
                type="button"
                onClick={() =>
                  selectSound(sound)
                }
                style={{
                  width: "100%",
                  marginBottom: "7px",
                  padding: "10px",
                  borderRadius: "8px",
                  border:
                    selectedSound?.id === sound.id
                      ? "1px solid rgba(255,212,59,0.65)"
                      : "1px solid rgba(255,255,255,0.08)",
                  background:
                    selectedSound?.id === sound.id
                      ? "rgba(255,212,59,0.08)"
                      : "rgba(255,255,255,0.025)",
                  color: "inherit",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "800",
                  }}
                >
                  {sound.title}
                </div>

                <div
                  style={{
                    marginTop: "3px",
                    fontSize: "9px",
                    opacity: 0.55,
                  }}
                >
                  {sound.description}
                </div>

                {sound.creator && (
                  <div
                    style={{
                      marginTop: "5px",
                      fontSize: "8px",
                      opacity: 0.4,
                    }}
                  >
                    Music by {sound.creator} ·{" "}
                    {sound.source}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* VOLUME */}

          <div
            style={{
              marginTop: "12px",
              padding: "10px",
              borderRadius: "9px",
              background:
                "rgba(255,255,255,0.035)",
              border:
                "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "7px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                }}
              >
                🔊 VOLUME
              </span>

              <span
                style={{
                  fontSize: "10px",
                  opacity: 0.6,
                }}
              >
                {volume}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(event) =>
                updateVolume(
                  event.target.value
                )
              }
              style={{
                width: "100%",
                cursor: "pointer",
              }}
            />
          </div>

          {/* PREVIEW BUTTON */}

          <button
            type="button"
            onClick={previewSound}
            style={{
              width: "100%",
              marginTop: "10px",
              padding: "12px",
              borderRadius: "9px",
              border:
                "1px solid rgba(255,212,59,0.35)",
              background: isPlaying
                ? "rgba(255,80,80,0.10)"
                : "rgba(255,212,59,0.10)",
              color: "inherit",
              fontSize: "11px",
              fontWeight: "800",
              cursor: "pointer",
            }}
          >
            {isPlaying
              ? "⏹️ STOP SOUND"
              : "▶️ PREVIEW SOUND"}
          </button>

          {/* STATUS */}

          <div
            style={{
              marginTop: "9px",
              textAlign: "center",
              fontSize: "9px",
              lineHeight: 1.5,
              opacity: 0.65,
            }}
          >
            {soundStatus}
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
            BOMBA Sound Library — licensed assets
            and BOMBA Originals only.
          </div>
        </div>
      )}
    </section>
  );
}