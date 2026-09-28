"use client";

import { useEffect, useRef, useState } from "react";

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

const soundOptions = [
  {
    icon: "🎧",
    title: "Sound Effects",
    description: "Footsteps, doors, actions and more.",
  },
  {
    icon: "🎵",
    title: "Background Music",
    description: "Music that fits your video.",
  },
  {
    icon: "🌍",
    title: "Environment",
    description: "Rain, streets, crowds and ambience.",
  },
];

export default function StudioBoard() {
  const [activeModule, setActiveModule] = useState(null);
  const [soundType, setSoundType] = useState("Background Music");
  const [volume, setVolume] = useState(70);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundStatus, setSoundStatus] = useState(
    "Ready for free sound testing."
  );

  const audioContextRef = useRef(null);
  const masterGainRef = useRef(null);
  const activeNodesRef = useRef([]);
  const stopTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      stopSound();
    };
  }, []);

  function getAudioContext() {
    if (typeof window === "undefined") {
      throw new Error("Browser audio is unavailable.");
    }

    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContextClass) {
      throw new Error(
        "This browser does not support Web Audio."
      );
    }

    if (!audioContextRef.current) {
      const context = new AudioContextClass();

      const gain = context.createGain();

      gain.gain.value = volume / 100;

      gain.connect(context.destination);

      audioContextRef.current = context;
      masterGainRef.current = gain;
    }

    return audioContextRef.current;
  }

  function updateVolume(value) {
    const nextVolume = Number(value);

    setVolume(nextVolume);

    if (masterGainRef.current) {
      masterGainRef.current.gain.value =
        nextVolume / 100;
    }
  }

  function stopSound() {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }

    activeNodesRef.current.forEach((node) => {
      try {
        node.stop();
      } catch {
        // Already stopped.
      }

      try {
        node.disconnect();
      } catch {
        // Already disconnected.
      }
    });

    activeNodesRef.current = [];

    setIsPlaying(false);
  }

  function makeTone(
    context,
    frequency,
    startTime,
    duration,
    waveform,
    level
  ) {
    const oscillator =
      context.createOscillator();

    const gain =
      context.createGain();

    oscillator.type = waveform;

    oscillator.frequency.setValueAtTime(
      frequency,
      startTime
    );

    gain.gain.setValueAtTime(
      0,
      startTime
    );

    gain.gain.linearRampToValueAtTime(
      level,
      startTime + 0.05
    );

    gain.gain.linearRampToValueAtTime(
      0,
      startTime + duration
    );

    oscillator.connect(gain);
    gain.connect(masterGainRef.current);

    oscillator.start(startTime);
    oscillator.stop(
      startTime + duration + 0.05
    );

    activeNodesRef.current.push(
      oscillator
    );
  }

  function makeNoise(
    context,
    startTime,
    duration,
    level
  ) {
    const buffer =
      context.createBuffer(
        1,
        context.sampleRate * duration,
        context.sampleRate
      );

    const data =
      buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      data[i] =
        Math.random() * 2 - 1;
    }

    const source =
      context.createBufferSource();

    const filter =
      context.createBiquadFilter();

    const gain =
      context.createGain();

    source.buffer = buffer;

    filter.type = "lowpass";
    filter.frequency.value = 1200;

    gain.gain.setValueAtTime(
      0,
      startTime
    );

    gain.gain.linearRampToValueAtTime(
      level,
      startTime + 0.2
    );

    gain.gain.linearRampToValueAtTime(
      0,
      startTime + duration
    );

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGainRef.current);

    source.start(startTime);
    source.stop(startTime + duration);

    activeNodesRef.current.push(source);
  }

  function createBackgroundMusic(context) {
    const start =
      context.currentTime + 0.05;

    const notes = [
      261.63,
      329.63,
      392.0,
      329.63,
      293.66,
      349.23,
      440.0,
      349.23,
      261.63,
      329.63,
      392.0,
      523.25,
      392.0,
      329.63,
      293.66,
      261.63,
      329.63,
      392.0,
    ];

    notes.forEach((frequency, index) => {
      makeTone(
        context,
        frequency,
        start + index,
        0.8,
        "sine",
        0.08
      );
    });

    for (let i = 0; i < 9; i++) {
      makeTone(
        context,
        130.81,
        start + i * 2,
        1.6,
        "triangle",
        0.035
      );
    }
  }

  function createSoundEffects(context) {
    const start =
      context.currentTime + 0.05;

    for (let i = 0; i < 7; i++) {
      const time =
        start + i * 2.5;

      makeTone(
        context,
        100 + i * 45,
        time,
        0.18,
        "square",
        0.16
      );

      makeNoise(
        context,
        time,
        0.35,
        0.08
      );
    }
  }

  function createEnvironment(context) {
    const start =
      context.currentTime + 0.05;

    makeNoise(
      context,
      start,
      18,
      0.12
    );

    for (let i = 0; i < 18; i++) {
      makeTone(
        context,
        700 + (i % 5) * 90,
        start + i,
        0.12,
        "sine",
        0.025
      );
    }
  }

  async function previewSound() {
    if (isPlaying) {
      stopSound();
      setSoundStatus("Sound stopped.");
      return;
    }

    setSoundStatus("Starting sound...");

    try {
      const context = getAudioContext();

      if (context.state === "suspended") {
        await context.resume();
      }

      stopSound();

      if (soundType === "Background Music") {
        createBackgroundMusic(context);
      } else if (soundType === "Sound Effects") {
        createSoundEffects(context);
      } else if (soundType === "Environment") {
        createEnvironment(context);
      }

      setIsPlaying(true);

      setSoundStatus(
        `${soundType} is playing.`
      );

      stopTimerRef.current =
        setTimeout(() => {
          activeNodesRef.current = [];
          setIsPlaying(false);
          setSoundStatus(
            "Sound finished. Ready again."
          );
        }, 18000);
    } catch (error) {
      console.error(
        "BOMBA SOUND TEST ERROR:",
        error
      );

      setIsPlaying(false);

      setSoundStatus(
        `Audio error: ${
          error?.message ||
          "Unable to play sound."
        }`
      );
    }
  }

  function selectSound(type) {
    stopSound();

    setSoundType(type);

    setSoundStatus(
      `${type} selected. Press PREVIEW SOUND.`
    );
  }

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
                🔊 Build Your Sound
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: "8px",
            }}
          >
            {soundOptions.map(
              ({ icon, title, description }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() =>
                    selectSound(title)
                  }
                  style={{
                    padding: "11px",
                    minHeight: "82px",
                    borderRadius: "10px",
                    border:
                      soundType === title
                        ? "1px solid rgba(255,212,59,0.65)"
                        : "1px solid rgba(255,255,255,0.10)",
                    background:
                      soundType === title
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

          <div
            style={{
              marginTop: "9px",
              textAlign: "center",
              fontSize: "8px",
              lineHeight: 1.5,
              opacity: 0.38,
            }}
          >
            Free browser test mode — no AI credits required.
            Real AI sound will be connected later.
          </div>
        </div>
      )}
    </section>
  );
}