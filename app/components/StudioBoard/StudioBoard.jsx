"use client";

import { useState } from "react";

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

export default function StudioBoard() {
  const [activeModule, setActiveModule] = useState(null);

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
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "8px",
        }}
      >
        {modules.map((module) => (
          <button
            key={module.number}
            type="button"
            onClick={() => setActiveModule(module.name)}
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
            border: "1px solid rgba(255,212,59,0.20)",
            background: "rgba(255,212,59,0.04)",
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
              onClick={() => setActiveModule(null)}
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
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
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "8px",
            }}
          >
            {[
              ["🎧", "Sound Effects", "Footsteps, doors, actions and more."],
              ["🎵", "Background Music", "Music that fits your video."],
              ["🌍", "Environment", "Rain, streets, crowds and ambience."],
              ["🔊", "Volume", "Control the sound level."],
            ].map(([icon, title, description]) => (
              <button
                key={title}
                type="button"
                style={{
                  padding: "11px",
                  minHeight: "82px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.035)",
                  color: "inherit",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "18px", marginBottom: "5px" }}>
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
            ))}
          </div>

          <button
            type="button"
            style={{
              width: "100%",
              marginTop: "10px",
              padding: "11px",
              borderRadius: "9px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: "inherit",
              fontSize: "11px",
              fontWeight: "800",
              cursor: "pointer",
            }}
          >
            ▶️ PREVIEW SOUND
          </button>

          <p
            style={{
              margin: "10px 0 0",
              fontSize: "9px",
              lineHeight: 1.5,
              opacity: 0.45,
              textAlign: "center",
            }}
          >
            AI sound generation will be connected here next.
          </p>
        </div>
      )}
    </section>
  );
}