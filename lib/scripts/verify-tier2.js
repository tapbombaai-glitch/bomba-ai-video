// ============================================
// BOMBA AI — BACKGROUND VERIFICATION
// File: scripts/verify-tier2.js
//
// Purpose:
// Verify all 11 BOMBA backgrounds through
// the real Scene Builder.
//
// READ-ONLY TEST
// No video generation
// No Eternal AI
// No Cloudinary
// No FFmpeg
// No credits
// ============================================

import { buildScenes } from "../lib/bomba/sceneBuilder.js";

const testScenes = [
  // --------------------------------------------
  // TIER 1 — CORE (6)
  // --------------------------------------------

  {
    description: "A man walked across the desert sand",
    expectedBackground: "sand-background",
  },

  {
    description: "They met beside the river in a romantic moment",
    expectedBackground: "river-romantic",
  },

  {
    description: "The river at night was mysterious",
    expectedBackground: "river-night",
  },

  {
    description: "They watched the beautiful river sunset",
    expectedBackground: "river-sunset",
  },

  {
    description: "The family returned to their village",
    expectedBackground: "village-warm",
  },

  {
    description: "They entered the mysterious forest",
    expectedBackground: "forest-mystery",
  },

  // --------------------------------------------
  // TIER 2 — HIGH IMPACT (5)
  // --------------------------------------------

  {
    description: "Amaka went to the market to buy onions",
    expectedBackground: "market-busy",
  },

  {
    description: "They entered the modern mansion in the city",
    expectedBackground: "house-modern",
  },

  {
    description: "He was walking on the roadside travelling to the village",
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
];

const built = buildScenes(testScenes);

let passed = 0;
let failed = 0;

console.log("\n============================================");
console.log("BOMBA AI — ALL 11 BACKGROUND VERIFICATION");
console.log("============================================");
console.log("Read-only test.");
console.log("No video generation.");
console.log("No Eternal AI.");
console.log("No Cloudinary.");
console.log("No FFmpeg.");
console.log("No credits.\n");

built.forEach((scene, index) => {
  const expected =
    testScenes[index].expectedBackground;

  const actual =
    scene.background?.imageId;

  const localPath =
    scene.background?.localPath;

  const valid =
    actual === expected &&
    typeof localPath === "string" &&
    localPath.length > 0;

  if (valid) {
    passed++;
  } else {
    failed++;
  }

  console.log(
    `Scene ${scene.sceneNumber}: ${
      testScenes[index].description
    }`
  );

  console.log(
    `  → expected: ${expected}`
  );

  console.log(
    `  → actual: ${actual}`
  );

  console.log(
    `  → localPath: ${localPath}`
  );

  console.log(
    `  → ${
      valid
        ? "✅ PASS"
        : "❌ FAIL"
    }`
  );

  console.log("--------------------------------------------");
});

console.log("\n============================================");
console.log(`PASSED: ${passed}/11`);
console.log(`FAILED: ${failed}/11`);
console.log("============================================\n");

if (
  passed === 11 &&
  failed === 0
) {
  console.log(
    "🔒 ALL 11 BACKGROUNDS VERIFIED — SAFE TO PROCEED"
  );
} else {
  console.error(
    "🛑 BACKGROUND CHECK FAILED — DO NOT GENERATE VIDEO"
  );

  process.exit(1);
}