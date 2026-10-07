import { buildScenes } from "../../lib/bomba/sceneBuilder.js";

const testScenes = [
  /*
   * -------------------------------------------------------
   * TIER 1 — CORE BACKGROUNDS
   * -------------------------------------------------------
   */

  {
    name: "Sand",
    description: "They walked across the wide desert sand",
    expectedBackground: "sand-background",
  },

  {
    name: "River Romance",
    description: "The couple stood beside the river in love",
    expectedBackground: "river-romantic",
  },

  {
    name: "River Night",
    description: "River at night was mysterious",
    expectedBackground: "river-night",
  },

  {
    name: "River Sunset",
    description: "They watched the beautiful sunset beside the river",
    expectedBackground: "river-sunset",
  },

  {
    name: "Village",
    description: "Amaka returned to her village and entered the family compound",
    expectedBackground: "village-warm",
  },

  {
    name: "Forest",
    description: "He entered the dark forest and heard a strange sound",
    expectedBackground: "forest-mystery",
  },

  /*
   * -------------------------------------------------------
   * TIER 2 — HIGH IMPACT BACKGROUNDS
   * -------------------------------------------------------
   */

  {
    name: "Market",
    description: "Amaka went to the market to buy onions",
    expectedBackground: "market-busy",
  },

  {
    name: "Modern House",
    description: "They entered the mansion in the city",
    expectedBackground: "house-modern",
  },

  {
    name: "Street",
    description: "He was walking on the road travelling to another village",
    expectedBackground: "street-roadside",
  },

  {
    name: "Celebration",
    description: "The wedding celebration was full of people",
    expectedBackground: "party-celebration",
  },

  {
    name: "Church",
    description: "The pastor prayed in the church on Sunday service",
    expectedBackground: "church-background",
  },
];

export default function VerifyTier2Page() {
  const built = buildScenes(testScenes);

  const results = built.map((scene, index) => {
    const test = testScenes[index];

    const expected = test.expectedBackground;
    const actual = scene.background?.imageId;
    const localPath = scene.background?.localPath;

    const valid =
      actual === expected &&
      typeof localPath === "string" &&
      localPath.length > 0;

    return {
      sceneNumber: scene.sceneNumber,
      name: test.name,
      description: scene.description,
      environment: scene.environment,
      mood: scene.mood,
      expected,
      actual,
      localPath,
      valid,
    };
  });

  const allValid =
    results.length === 11 &&
    results.every((scene) => scene.valid);

  const passedCount =
    results.filter((scene) => scene.valid).length;

  const failedCount =
    results.filter((scene) => !scene.valid).length;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
        background: "#111",
        color: "#fff",
      }}
    >
      <h1>
        BOMBA AI — Complete Background Verification
      </h1>

      <p>
        Read-only test. No video generation. No Eternal AI.
        No Cloudinary. No FFmpeg. No credits.
      </p>

      <div
        style={{
          marginTop: "24px",
          padding: "20px",
          borderRadius: "12px",
          border: allValid
            ? "2px solid #2ecc71"
            : "2px solid #e74c3c",
        }}
      >
        <h2>
          {allValid
            ? "✅ ALL 11 BACKGROUNDS PASSED"
            : "❌ BACKGROUND VERIFICATION FAILED"}
        </h2>

        <p>
          <strong>Passed:</strong> {passedCount} / 11
        </p>

        <p>
          <strong>Failed:</strong> {failedCount} / 11
        </p>
      </div>

      <h2 style={{ marginTop: "30px" }}>
        Tier 1 — Core
      </h2>

      {results
        .slice(0, 6)
        .map((scene) => (
          <SceneResult
            key={scene.sceneNumber}
            scene={scene}
          />
        ))}

      <h2 style={{ marginTop: "40px" }}>
        Tier 2 — High Impact
      </h2>

      {results
        .slice(6, 11)
        .map((scene) => (
          <SceneResult
            key={scene.sceneNumber}
            scene={scene}
          />
        ))}

      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          borderRadius: "12px",
          border: allValid
            ? "2px solid #2ecc71"
            : "2px solid #e74c3c",
        }}
      >
        <strong>
          {allValid
            ? "🔒 ALL 11 BACKGROUNDS VERIFIED — SAFE TO PROCEED"
            : "🛑 STOP — DO NOT GENERATE VIDEO"}
        </strong>
      </div>
    </main>
  );
}

function SceneResult({ scene }) {
  return (
    <section
      style={{
        marginTop: "20px",
        padding: "18px",
        border: scene.valid
          ? "1px solid #2ecc71"
          : "1px solid #e74c3c",
        borderRadius: "12px",
      }}
    >
      <h3>
        Background {scene.sceneNumber}: {scene.name}{" "}
        {scene.valid ? "✅ PASS" : "❌ FAIL"}
      </h3>

      <p>
        <strong>Description:</strong>{" "}
        {scene.description}
      </p>

      <p>
        <strong>Environment:</strong>{" "}
        {scene.environment || "MISSING"}
      </p>

      <p>
        <strong>Mood:</strong>{" "}
        {scene.mood || "MISSING"}
      </p>

      <p>
        <strong>Expected:</strong>{" "}
        {scene.expected}
      </p>

      <p>
        <strong>Actual:</strong>{" "}
        {scene.actual || "MISSING"}
      </p>

      <p>
        <strong>Local Path:</strong>{" "}
        {scene.localPath || "MISSING"}
      </p>
    </section>
  );
}