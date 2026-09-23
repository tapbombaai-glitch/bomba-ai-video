"use client";

import { useState } from "react";

export default function Home() {
  const [mode, setMode] = useState("Movie");
  const [prompt, setPrompt] = useState("");

  const modes = [
    "Movie",
    "Program",
    "Acting",
    "Ad",
    "Social Media",
    "Presenter",
    "Story",
  ];

  return (
    <main className="studio">
      <header className="topbar">
        <div>
          <div className="brand">BOMBA AI</div>
          <div className="subtitle">VIDEO STUDIO</div>
        </div>

        <button className="profileButton">TB</button>
      </header>

      <section className="hero">
        <div className="badge">AI VIDEO PRODUCTION STUDIO</div>

        <h1>
          Turn your idea into a
          <span> realistic AI video.</span>
        </h1>

        <p>
          Create characters, scenes, dialogue, voices, sound and cinematic
          videos from one simple idea.
        </p>
      </section>

      <section className="studioCard">
        <h2>What do you want to create?</h2>

        <div className="modeGrid">
          {modes.map((item) => (
            <button
              key={item}
              className={mode === item ? "mode active" : "mode"}
              onClick={() => setMode(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="promptBox">
          <label>Describe your video</label>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: A young Nigerian man enters a busy market, meets his friend, they talk and laugh while people move around them..."
          />

          <div className="promptFooter">
            <span>{prompt.length} characters</span>

            <button className="generateButton">
              🎬 Generate Video
            </button>
          </div>
        </div>
      </section>

      <section className="workflow">
        <h2>Production Workflow</h2>

        <div className="workflowGrid">
          <div>
            <strong>01</strong>
            <h3>Plan</h3>
            <p>Turn your idea into scenes and shots.</p>
          </div>

          <div>
            <strong>02</strong>
            <h3>Characters</h3>
            <p>Create consistent realistic characters.</p>
          </div>

          <div>
            <strong>03</strong>
            <h3>Scenes</h3>
            <p>Build realistic locations and actions.</p>
          </div>

          <div>
            <strong>04</strong>
            <h3>Generate</h3>
            <p>Generate cinematic video clips.</p>
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
