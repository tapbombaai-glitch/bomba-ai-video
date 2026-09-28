"use client";

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
            style={{
              width: "100%",
              minHeight: "58px",
              padding: "9px",
              borderRadius: "10px",
              border:
                "1px solid rgba(255,255,255,0.10)",
              background:
                "rgba(255,255,255,0.035)",
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
    </section>
  );
}