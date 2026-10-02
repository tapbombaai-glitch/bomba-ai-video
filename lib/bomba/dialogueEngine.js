// lib/bomba/dialogueEngine.js

/**
 * BOMBA AI — Test Dialogue Engine
 *
 * TEST MODE ONLY.
 *
 * Reads the existing STORY + CHARACTERS + SCENES
 * and creates structured dialogue.
 *
 * No OpenAI.
 * No voice API.
 * No video API.
 * No Cloudinary.
 */

export function createTestDialogue({
  story,
  characters = [],
  scenes = [],
}) {
  if (!story) {
    throw new Error("Story is required.");
  }

  const sourceScenes =
    scenes.length > 0
      ? scenes
      : story.scenes || [];

  if (!sourceScenes.length) {
    throw new Error(
      "No scenes are available for dialogue."
    );
  }

  const sourceCharacters =
    characters.length > 0
      ? characters
      : story.characters || [];

  const dialogueScenes =
    sourceScenes.map((scene, sceneIndex) => {
      const sceneCharacters =
        getSceneCharacters(
          sourceCharacters,
          sceneIndex
        );

      const lines =
        createSceneDialogue(
          scene,
          sceneCharacters,
          story
        );

      return {
        sceneNumber:
          scene.sceneNumber ||
          sceneIndex + 1,

        title:
          scene.title ||
          `Scene ${sceneIndex + 1}`,

        location:
          scene.location || "",

        time:
          scene.time || "",

        lines,
      };
    });

  return {
    mode: "test",

    language: "pcm",

    status: "ready",

    scenes: dialogueScenes,

    createdAt:
      new Date().toISOString(),
  };
}

function getSceneCharacters(
  characters,
  sceneIndex
) {
  if (!characters.length) {
    return [];
  }

  const main =
    characters[0];

  const second =
    characters[1];

  const third =
    characters[2];

  const fourth =
    characters[3];

  const fifth =
    characters[4];

  const groups = [
    [main],
    [main, second],
    [main, second, fourth],
    [main, second, fifth],
    [main, second, third],
  ];

  return (
    groups[
      sceneIndex %
        groups.length
    ] || [main]
  ).filter(Boolean);
}

function createSceneDialogue(
  scene,
  characters,
  story
) {
  const first =
    characters[0];

  const second =
    characters[1];

  const third =
    characters[2];

  const lines = [];

  if (first) {
    lines.push(
      createLine(
        first,
        scene,
        buildOpeningLine(
          first,
          scene,
          story
        )
      )
    );
  }

  if (second) {
    lines.push(
      createLine(
        second,
        scene,
        buildResponseLine(
          second,
          scene
        )
      )
    );
  }

  if (third) {
    lines.push(
      createLine(
        third,
        scene,
        buildConflictLine(
          third,
          scene
        )
      )
    );
  }

  return lines.filter(Boolean);
}

function createLine(
  character,
  scene,
  text
) {
  return {
    id: `dialogue-${scene.sceneNumber || "scene"}-${character.id}`,

    characterId:
      character.id || null,

    character:
      character.name ||
      "Character",

    voiceSlot:
      character.voiceSlot ||
      null,

    voiceId:
      character.voice?.voiceId ||
      null,

    voiceName:
      character.voice?.voiceName ||
      null,

    provider:
      character.voice?.provider ||
      "pending_provider_voice",

    language:
      character.voice?.language ||
      "pcm",

    sceneNumber:
      scene.sceneNumber || null,

    text,

    emotion:
      detectEmotion(text),

    status: "ready",
  };
}

function buildOpeningLine(
  character,
  scene,
  story
) {
  const description =
    scene.description ||
    "Something important is happening.";

  return `${character.name}: ${description}`;
}

function buildResponseLine(
  character,
  scene
) {
  return `${character.name}: We need to think carefully about what happens next.`;
}

function buildConflictLine(
  character,
  scene
) {
  return `${character.name}: This decision could change everything, so we cannot ignore the risk.`;
}

function detectEmotion(text) {
  const value =
    text.toLowerCase();

  if (
    value.includes("risk") ||
    value.includes("conflict") ||
    value.includes("problem")
  ) {
    return "serious";
  }

  if (
    value.includes("together") ||
    value.includes("help")
  ) {
    return "hopeful";
  }

  return "neutral";
}