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
      return null;
    }

    if (!audioContextRef.current) {
      const AudioContext =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContext) {
        return null;
      }

      audioContextRef.current = new AudioContext();

      masterGainRef.current =
        audioContextRef.current.createGain();

      masterGainRef.current.gain.value =
        volume / 100;

      masterGainRef.current.connect(
        audioContextRef.current.destination
      );
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
        if (typeof node.stop === "function") {
          node.stop();
        }
      } catch {
        // Node may already be stopped.
      }

      try {
        node.disconnect();
      } catch {
        // Node may already be disconnected.
      }
    });

    activeNodesRef.current = [];

    setIsPlaying(false);
  }

  function createOscillator(
    context,
    frequency,
    startTime,
    duration,
    type = "sine",
    gainAmount = 0.12
  ) {
    const oscillator =
      context.createOscillator();

    const gain =
      context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(
      frequency,
      startTime
    );

    gain.gain.setValueAtTime(
      0,
      startTime
    );

    gain.gain.linearRampToValueAtTime(
      gainAmount,
      startTime + 0.08
    );

    gain.gain.linearRampToValueAtTime(
      0,
      startTime + duration
    );

    oscillator.connect(gain);
    gain.connect(masterGainRef.current);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.05);

    activeNodesRef.current.push(
      oscillator
    );

    return oscillator;
  }

  function createNoise(
    context,
    startTime,
    duration,
    filterType,
    frequency,
    gainAmount
  ) {
    const bufferSize =
      context.sampleRate * duration;

    const buffer =
      context.createBuffer(
        1,
        bufferSize,
        context.sampleRate
      );

    const data =
      buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
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

    filter.type = filterType;
    filter.frequency.setValueAtTime(
      frequency,
      startTime
    );

    gain.gain.setValueAtTime(
      0,
      startTime
    );

    gain.gain.linearRampToValueAtTime(
      gainAmount,
      startTime + 0.15
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

    activeNodesRef.current.push(
      source
    );

    return source;
  }

  function createBackgroundMusic(context) {
    const start = context.currentTime + 0.05;
    const duration = 18;

    const chords = [
      [261.63, 329.63, 392.0],
      [220.0, 261.63, 329.63],
      [174.61, 220.0, 261.63],
      [196.0, 246.94, 293.66],
    ];

    for (let i = 0; i < 12; i++) {
      const chord =
        chords[i % chords.length];

      const chordStart =
        start + i * 1.5;

      chord.forEach((frequency, index) => {
        createOscillator(
          context,
          frequency,
          chordStart,
          1.35,
          "sine",
          index === 0 ? 0.08 : 0.045
        );
      });
    }

    for (let i = 0; i < 18; i++) {
      const melodyNotes = [
        523.25,
        587.33,
        659.25,
        783.99,
        659.25,
        587.33,
      ];

      createOscillator(
        context,
        melodyNotes[i % melodyNotes.length],
        start + i,
        0.65,
        "triangle",
        0.035
      );
    }
  }

  function createSoundEffects(context) {
    const start = context.currentTime + 0.05;

    for (let i = 0; i < 6; i++) {
      const hitStart =
        start + i * 2.8;

      createOscillator(
        context,
        120 + i * 35,
        hitStart,
        0.18,
        "square",
        0.12
      );

      createNoise(
        context,
        hitStart,
        0.35,
        "highpass",
        900,
        0.08
      );

      createOscillator(
        context,
        70,
        hitStart + 0.08,
        0.4,
        "sine",
        0.07
      );
    }
  }

  function createEnvironment(context) {
    const start = context.currentTime + 0.05;

    createNoise(
      context,
      start,
      18,
      "lowpass",
      900,
      0.12
    );

    for (let i = 0; i < 18; i++) {
      const dropStart =
        start + i * 1.0;

      createOscillator(
        context,
        900 + (i % 4) * 120,
        dropStart,
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

    const context =
      getAudioContext();

    if (!context) {
      setSoundStatus(
        "Your browser does not support Web Audio."
      );
      return;
    }

    try {
      if (context.state === "suspended") {
        await context.resume();
      }

      stopSound();

      if (soundType === "Background Music") {
        createBackgroundMusic(context);
      }

      if (soundType === "Sound Effects") {
        createSoundEffects(context);
      }

      if (soundType === "Environment") {
        createEnvironment(context);
      }

      setIsPlaying(true);

      setSoundStatus(
        `${soundType} test is playing for about 18 seconds.`
      );

      stopTimerRef.current =
        setTimeout(() => {
          activeNodesRef.current = [];
          setIsPlaying(false);
          setSoundStatus(
            "Sound test finished. Ready again."
          );
        }, 18500);
    } catch (error) {
      console.error(
        "BOMBA TEST SOUND ERROR:",
        error
      );

      setSoundStatus(
        "Unable to play test sound."
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
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: "14px",
        background: "rgba(255,255,255,0.025)",
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
              opacity: 0.55,
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