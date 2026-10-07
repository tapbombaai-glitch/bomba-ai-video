/**
 * BOMBA AI — Scene Builder
 *
 * Converts BOMBA story information into production scenes
 * and automatically assigns the correct local background
 * from the BOMBA image library.
 *
 * IMPORTANT:
 * - Does NOT generate images.
 * - Does NOT call Eternal AI.
 * - Does NOT call Cloudinary.
 * - Does NOT use FFmpeg.
 * - Does NOT generate video.
 * - Only builds scene metadata.
 */

import {
  BOMBA_IMAGE_LIBRARY,
  BOMBA_IMAGE_MOODS,
  BOMBA_IMAGE_TYPES,
  getImageById,
  getImagesByEnvironment,
  getImagesByMood,
} from "./imageLibrary";

/**
 * ---------------------------------------------------------
 * BACKGROUND RULES
 * ---------------------------------------------------------
 *
 * These rules tell BOMBA which background to prefer
 * for common environments and moods.
 */

const BACKGROUND_RULES = {
  village: {
    preferredIds: ["village-warm"],
    moods: [
      BOMBA_IMAGE_MOODS.VILLAGE,
      BOMBA_IMAGE_MOODS.PEACEFUL,
      BOMBA_IMAGE_MOODS.DRAMA,
      BOMBA_IMAGE_MOODS.ADVENTURE,
    ],
  },

  river: {
    preferredIds: [
      "river-romantic",
      "river-sunset",
      "river-night",
    ],
    moods: [
      BOMBA_IMAGE_MOODS.RIVER,
      BOMBA_IMAGE_MOODS.ROMANCE,
      BOMBA_IMAGE_MOODS.EMOTIONAL,
      BOMBA_IMAGE_MOODS.MYSTERY,
      BOMBA_IMAGE_MOODS.NIGHT,
      BOMBA_IMAGE_MOODS.SUNSET,
    ],
  },

  forest: {
    preferredIds: ["forest-mystery"],
    moods: [
      BOMBA_IMAGE_MOODS.FOREST,
      BOMBA_IMAGE_MOODS.MYSTERY,
      BOMBA_IMAGE_MOODS.HORROR,
      BOMBA_IMAGE_MOODS.FANTASY,
      BOMBA_IMAGE_MOODS.ADVENTURE,
    ],
  },

  sand: {
    preferredIds: ["sand-background"],
    moods: [
      BOMBA_IMAGE_MOODS.ADVENTURE,
      BOMBA_IMAGE_MOODS.VILLAGE,
      BOMBA_IMAGE_MOODS.DRAMA,
      BOMBA_IMAGE_MOODS.NATURE,
    ],
  },
};

/**
 * ---------------------------------------------------------
 * NORMALIZE TEXT
 * ---------------------------------------------------------
 */

function normalize(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLowerCase();
}

/**
 * ---------------------------------------------------------
 * DETECT ENVIRONMENT
 * ---------------------------------------------------------
 *
 * Looks at scene text and tries to determine the
 * environment automatically.
 */

export function detectSceneEnvironment(scene = {}) {
  const text = [
    scene.title,
    scene.name,
    scene.description,
    scene.location,
    scene.setting,
    scene.environment,
    scene.action,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    text.includes("river") ||
    text.includes("stream") ||
    text.includes("waterfall") ||
    text.includes("water")
  ) {
    return "river";
  }

  if (
    text.includes("village") ||
    text.includes("compound") ||
    text.includes("hut") ||
    text.includes("farm")
  ) {
    return "village";
  }

  if (
    text.includes("forest") ||
    text.includes("jungle") ||
    text.includes("woods") ||
    text.includes("bush")
  ) {
    return "forest";
  }

  if (
    text.includes("sand") ||
    text.includes("desert") ||
    text.includes("dune")
  ) {
    return "sand";
  }

  return null;
}

/**
 * ---------------------------------------------------------
 * DETECT MOOD
 * ---------------------------------------------------------
 */

export function detectSceneMood(scene = {}) {
  const text = [
    scene.title,
    scene.name,
    scene.description,
    scene.location,
    scene.setting,
    scene.mood,
    scene.action,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    text.includes("romantic") ||
    text.includes("romance") ||
    text.includes("love")
  ) {
    return BOMBA_IMAGE_MOODS.ROMANCE;
  }

  if (
    text.includes("emotional") ||
    text.includes("sad") ||
    text.includes("cry") ||
    text.includes("heartbreak")
  ) {
    return BOMBA_IMAGE_MOODS.EMOTIONAL;
  }

  if (
    text.includes("peaceful") ||
    text.includes("calm") ||
    text.includes("quiet") ||
    text.includes("beautiful")
  ) {
    return BOMBA_IMAGE_MOODS.PEACEFUL;
  }

  if (
    text.includes("mystery") ||
    text.includes("mysterious") ||
    text.includes("secret") ||
    text.includes("strange")
  ) {
    return BOMBA_IMAGE_MOODS.MYSTERY;
  }

  if (
    text.includes("horror") ||
    text.includes("scary") ||
    text.includes("fear") ||
    text.includes("dark")
  ) {
    return BOMBA_IMAGE_MOODS.HORROR;
  }

  if (
    text.includes("action") ||
    text.includes("fight") ||
    text.includes("chase") ||
    text.includes("battle")
  ) {
    return BOMBA_IMAGE_MOODS.ACTION;
  }

  if (
    text.includes("funny") ||
    text.includes("comedy") ||
    text.includes("laugh")
  ) {
    return BOMBA_IMAGE_MOODS.COMEDY;
  }

  if (
    text.includes("sunset") ||
    text.includes("evening")
  ) {
    return BOMBA_IMAGE_MOODS.SUNSET;
  }

  if (
    text.includes("night") ||
    text.includes("midnight") ||
    text.includes("darkness")
  ) {
    return BOMBA_IMAGE_MOODS.NIGHT;
  }

  if (
    text.includes("village")
  ) {
    return BOMBA_IMAGE_MOODS.VILLAGE;
  }

  if (
    text.includes("nature") ||
    text.includes("forest") ||
    text.includes("green")
  ) {
    return BOMBA_IMAGE_MOODS.NATURE;
  }

  return null;
}

/**
 * ---------------------------------------------------------
 * SELECT BACKGROUND
 * ---------------------------------------------------------
 *
 * Main function responsible for connecting:
 *
 * Scene → Environment → Mood → Image Library
 */

export function selectSceneBackground(scene = {}) {
  /*
   * If the scene already contains an imageId,
   * respect it.
   */
  if (scene.background?.imageId) {
    const existingImage = getImageById(
      scene.background.imageId
    );

    if (existingImage) {
      return createBackgroundResult(
        existingImage,
        scene
      );
    }
  }

  if (scene.imageId) {
    const existingImage = getImageById(
      scene.imageId
    );

    if (existingImage) {
      return createBackgroundResult(
        existingImage,
        scene
      );
    }
  }

  const environment =
    normalize(scene.environment) ||
    detectSceneEnvironment(scene);

  const mood =
    normalize(scene.mood) ||
    detectSceneMood(scene);

  /*
   * -------------------------------------------------------
   * 1. Environment-specific selection
   * -------------------------------------------------------
   */

  if (environment) {
    const environmentRules =
      BACKGROUND_RULES[environment];

    if (environmentRules) {
      /*
       * First try preferred image IDs.
       */

      for (
        const preferredId of
          environmentRules.preferredIds
      ) {
        const image =
          getImageById(preferredId);

        if (!image) {
          continue;
        }

        /*
         * If there is a mood, make sure the image
         * can support that mood when possible.
         */

        if (
          mood &&
          Array.isArray(image.moods) &&
          image.moods.includes(mood)
        ) {
          return createBackgroundResult(
            image,
            scene
          );
        }
      }

      /*
       * If no perfect mood match exists,
       * use any valid environment image.
       */

      const environmentImages =
        getImagesByEnvironment(
          environment
        );

      if (
        environmentImages.length > 0
      ) {
        /*
         * Try mood match first.
         */

        if (mood) {
          const moodMatch =
            environmentImages.find(
              (image) =>
                Array.isArray(
                  image.moods
                ) &&
                image.moods.includes(
                  mood
                )
            );

          if (moodMatch) {
            return createBackgroundResult(
              moodMatch,
              scene
            );
          }
        }

        return createBackgroundResult(
          environmentImages[0],
          scene
        );
      }
    }
  }

  /*
   * -------------------------------------------------------
   * 2. Mood-only selection
   * -------------------------------------------------------
   */

  if (mood) {
    const moodImages =
      getImagesByMood(mood);

    if (moodImages.length > 0) {
      return createBackgroundResult(
        moodImages[0],
        scene
      );
    }
  }

  /*
   * -------------------------------------------------------
   * 3. Safe fallback
   * -------------------------------------------------------
   *
   * If BOMBA cannot understand the scene,
   * use the sand background as a neutral
   * registered background.
   */

  const fallback =
    getImageById(
      "sand-background"
    );

  if (fallback) {
    return createBackgroundResult(
      fallback,
      scene
    );
  }

  /*
   * Extremely defensive fallback.
   */

  return {
    imageId: null,
    imageUrl: null,
    localPath: null,
    title: null,
    source: null,
    status: "unavailable",
  };
}

/**
 * ---------------------------------------------------------
 * CREATE BACKGROUND RESULT
 * ---------------------------------------------------------
 */

function createBackgroundResult(
  image,
  scene = {}
) {
  if (!image) {
    return {
      imageId: null,
      imageUrl: null,
      localPath: null,
      title: null,
      source: null,
      status: "unavailable",
    };
  }

  return {
    imageId: image.id,

    /*
     * imageUrl remains null because your current
     * imageLibrary is metadata-only.
     */

    imageUrl:
      image.imageUrl || null,

    /*
     * This is the actual public Next.js path.
     */

    localPath:
      image.localPath || null,

    title:
      image.title || null,

    description:
      image.description || null,

    type:
      image.type ||
      BOMBA_IMAGE_TYPES.BACKGROUND,

    environment:
      image.environment ||
      normalize(scene.environment) ||
      detectSceneEnvironment(scene) ||
      null,

    moods:
      Array.isArray(image.moods)
        ? image.moods
        : [],

    source:
      image.source || "local",

    status:
      image.status || "registered",
  };
}

/**
 * ---------------------------------------------------------
 * BUILD ONE SCENE
 * ---------------------------------------------------------
 */

export function buildScene(
  sceneInput = {},
  index = 0
) {
  const scene = {
    ...sceneInput,
  };

  const environment =
    normalize(scene.environment) ||
    detectSceneEnvironment(scene);

  const mood =
    normalize(scene.mood) ||
    detectSceneMood(scene);

  const background =
    selectSceneBackground({
      ...scene,
      environment,
      mood,
    });

  return {
    id:
      scene.id ||
      `scene-${index + 1}`,

    sceneNumber:
      scene.sceneNumber ||
      index + 1,

    title:
      scene.title ||
      scene.name ||
      `Scene ${index + 1}`,

    description:
      scene.description ||
      "",

    location:
      scene.location ||
      null,

    setting:
      scene.setting ||
      null,

    environment,

    mood,

    action:
      scene.action ||
      null,

    characters:
      Array.isArray(scene.characters)
        ? scene.characters
        : [],

    dialogue:
      Array.isArray(scene.dialogue)
        ? scene.dialogue
        : [],

    background,

    status:
      scene.status ||
      "ready",
  };
}

/**
 * ---------------------------------------------------------
 * BUILD ALL SCENES
 * ---------------------------------------------------------
 */

export function buildScenes(
  scenes = []
) {
  if (!Array.isArray(scenes)) {
    return [];
  }

  return scenes.map(
    (scene, index) =>
      buildScene(
        scene,
        index
      )
  );
}

/**
 * ---------------------------------------------------------
 * BUILD SCENES FROM STORY
 * ---------------------------------------------------------
 *
 * This function is useful when the story already
 * contains a scenes array.
 */

export function buildScenesFromStory(
  story = {}
) {
  if (!story) {
    return [];
  }

  const scenes =
    Array.isArray(story.scenes)
      ? story.scenes
      : [];

  return buildScenes(
    scenes
  );
}

/**
 * ---------------------------------------------------------
 * GET SCENE BACKGROUND PATH
 * ---------------------------------------------------------
 *
 * Simple helper for components that only need
 * the public image path.
 */

export function getSceneBackgroundPath(
  scene
) {
  const background =
    scene?.background;

  if (
    background &&
    typeof background.localPath ===
      "string" &&
    background.localPath.length > 0
  ) {
    return background.localPath;
  }

  return null;
}

/**
 * ---------------------------------------------------------
 * VALIDATE SCENE BACKGROUND
 * ---------------------------------------------------------
 */

export function validateSceneBackground(
  scene
) {
  const background =
    scene?.background;

  if (!background) {
    return {
      valid: false,
      reason:
        "Scene has no background.",
    };
  }

  if (!background.imageId) {
    return {
      valid: false,
      reason:
        "Scene background has no imageId.",
    };
  }

  if (!background.localPath) {
    return {
      valid: false,
      reason:
        "Scene background has no localPath.",
    };
  }

  const registeredImage =
    getImageById(
      background.imageId
    );

  if (!registeredImage) {
    return {
      valid: false,
      reason:
        "Background image is not registered in BOMBA_IMAGE_LIBRARY.",
    };
  }

  return {
    valid: true,
    reason: null,
  };
}