"use client";

import { useState } from "react";

export default function Home() {
  const [mode, setMode] = useState("Movie");
  const [prompt, setPrompt] = useState("");
  const [bombaKey, setBombaKey] = useState("");
  const [loadingKey, setLoadingKey] = useState(false);

  const modes = [
    "Movie",
    "Program",
    "Acting",
    "Ad",
    "Social Media",
    "Presenter",
    "Story",
  ];

  const handleGenerateBombaKey = async () => {
    setLoadingKey(true);
    try {
      const res = await fetch('/api/keys/generate', { method: 'POST' });
      const data = await res.json();
      if (data.apiKey) {
        setBombaKey(data.apiKey);
      } else {
        alert("Error generating key: " + JSON.stringify(data));
      }
    } catch (err) {
      alert("Failed to generate key");
    }
    setLoadingKey(false);
  };

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

        {/* --- NEW BOMBA KEY SECTION --- */}
        <div style={{ marginTop: '30px', padding: '20px', background: '#111', borderRadius: '12px', border: '1px dashed #facc15' }}>
          <h3>🔑 Get Your Bomba API Key (FREE)</h3>
          <p style={{ fontSize: '14px', opacity: 0.7 }}>Use this key to access Bomba API without paying us</p>
          
          <button 
            onClick={handleGenerateBombaKey}
            disabled={loadingKey}
            style={{ marginTop: '10px', background: '#facc15', color: 'black', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {loadingKey ? "Generating..." : "Generate My Bomba Key"}
          </button>

          {bombaKey && (
            <div style={{ marginTop: '15px', padding: '10px', background: 'black', borderRadius: '8px', wordBreak: 'break-all' }}>
              <code style={{ color: '#facc15' }}>{bombaKey}</code>
              <p style={{ fontSize: '12px', marginTop: '5px' }}>Copy am! Na your own be this!</p>
            </div>
          )}
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
