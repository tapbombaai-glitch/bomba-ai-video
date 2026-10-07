import { buildScenes } from "../../lib/bomba/sceneBuilder.js";

const testScenes = [
  {
    description: "Amaka went to the market to buy onions",
    expectedBackground: "market-busy",
  },
  {
    description: "They entered the mansion in the city",
    expectedBackground: "house-modern",
  },
  {
    description: "He was walking on the road travelling to the village",
    expectedBackground: "street-roadside",
  },
  {
    description: "The wedding celebration was full of people",
    expectedBackground: "party-celebration",
  },
  {
    description: "The pastor prayed in the church on Sunday service",
    expectedBackground: "church-background",
  },
  {
    description: "River at night was mysterious",
    expectedBackground: "river-night",
  },
];

export default function VerifyTier2Page() {
  const built = buildScenes(testScenes);

  const results = built.map((scene, index) => {
    const expected = testScenes[index].expectedBackground;
    const actual = scene.background?.imageId;
    const localPath = scene.background?.localPath;

    const valid =
      actual === expected &&
      typeof localPath === "string" &&
      localPath.length > 0;

    return {
      sceneNumber: scene.sceneNumber,
      description: scene.description,
      environment: scene.environment,
      mood: scene.mood,
      expected,
      actual,
      localPath,
      valid,
    };
  });

  const allValid = results.every((scene) => scene.valid);

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
      <h1>BOMBA AI — Tier 2 Background Verification</h1>

      <p>
        Read-only test. No video generation. No Eternal AI. No credits.
      </p>

      <h2 style={{ marginTop: "30px" }}>
        {allValid
          ? "✅ ALL BACKGROUND TESTS PASSED"
          : "❌ CHECK FAILED — DO NOT GENERATE VIDEO"}
      </h2>

      {results.map((scene) => (
        <section
          key={scene.sceneNumber}
          style={{
            marginTop: "20px",
            padding: "18px",
            border: "1px solid #444",
            borderRadius: "12px",
          }}
        >
          <h3>
            Scene {scene.sceneNumber}{" "}
            {scene.valid ? "✅ PASS" : "❌ FAIL"}
          </h3>

          <p>
            <strong>Description:</strong> {scene.description}
          </p>

          <p>
            <strong>Environment:</strong> {scene.environment}
          </p>

          <p>
            <strong>Mood:</strong> {scene.mood}
          </p>

          <p>
            <strong>Expected:</strong> {scene.expected}
          </p>

          <p>
            <strong>Actual:</strong> {scene.actual || "MISSING"}
          </p>

          <p>
            <strong>Local Path:</strong>{" "}
            {scene.localPath || "MISSING"}
          </p>
        </section>
      ))}

      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          borderRadius: "12px",
          border: "2px solid #555",
        }}
      >
        <strong>
          {allValid
            ? "🔒 SAFE TO PROCEED TO THE NEXT CHECKPOINT"
            : "🛑 STOP — BACKGROUND VERIFICATION FAILED"}
        </strong>
      </div>
    </main>
  );
}