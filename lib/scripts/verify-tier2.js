// scripts/verify-tier2.js

import { buildScenes } from "../lib/bomba/sceneBuilder.js";

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

const built = buildScenes(testScenes);

let allValid = true;

built.forEach((scene, index) => {
  const expected = testScenes[index].expectedBackground;
  const actual = scene.background?.imageId;
  const localPath = scene.background?.localPath;

  const valid =
    actual === expected &&
    typeof localPath === "string" &&
    localPath.length > 0;

  if (!valid) {
    allValid = false;
  }

  console.log(`\nScene ${scene.sceneNumber}: ${scene.description}`);
  console.log(`  → environment: ${scene.environment}`);
  console.log(`  → mood: ${scene.mood}`);
  console.log(`  → expected: ${expected}`);
  console.log(`  → background.imageId: ${actual}`);
  console.log(`  → background.localPath: ${localPath}`);
  console.log(`  → ${valid ? "✅ PASS" : "❌ FAIL"}`);
});

console.log(
  `\n${
    allValid
      ? "✅ ALL BACKGROUND TESTS PASSED — SAFE TO PROCEED"
      : "❌ CHECK FAILED — DO NOT GENERATE VIDEO"
  }`
);

if (!allValid) {
  process.exit(1);
}