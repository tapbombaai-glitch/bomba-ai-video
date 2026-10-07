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
 * TIER 2 — HIGH IMPACT KEYWORDS
 * ---------------------------------------------------------
 *
 * These backgrounds have priority over the older
 * Tier 1 environment selection.
 */

const TIER_2_KEYWORDS = {
  "market-busy": [
    "market",
    "shop",
    "shops",
    "stall",
    "stalls",
    "bazaar",
    "trader",
    "traders",
    "buying",
    "selling",
    "marketplace",
  ],

  "house-modern": [
    "modern house",
    "modern home",
    "mansion",
    "estate",
    "city house",
    "rich house",
    "duplex",
  ],

  "street-roadside": [
    "road",
    "street",
    "highway",
    "roadside",
    "waka",
    "travel",
    "travelling",
    "traveling",
    "journey",
    "on the way",
  ],

  "party-celebration": [
    "party",
    "celebration",
    "wedding",
    "gathering",
    "festival",
    "birthday",
    "ceremony",
  ],

  "church-background": [
    "church",
    "chapel",
    "pastor",
    "worship",
    "prayer",
    "funeral",
    "sunday service",
    "service",
  ],
};

/**
 * ---------------------------------------------------------
 * TIER 2 BACKGROUND DETECTION
 * ---------------------------------------------------------
 */

function detectTier2Background(scene = {}) {
  const text = [
    scene.title,
    scene.name,
    scene.description,
    scene.location,
    scene.setting,
    scene.environment,
    scene.action,
    scene.mood,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const [imageId, keywords] of Object.entries(
    TIER_2_KEYWORDS
  )) {
    const matched = keywords.some((keyword) =>
      text.includes(keyword)
    );

    if (matched) {
      const image = getImageById(imageId);

      if (image) {
        return image;
      }
    }
  }

  return null;
}

/**
 * ---------------------------------------------------------
 * BACKGROUND RULES — TIER 1
 * ---------------------------------------------------------
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
      BOMBA_IMAGE_MOODS.NATURE,
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

  /*
   * TIER 2 ENVIRONMENTS
   *
   * These are checked first.
   */

  if (
    text.includes("market") ||
    text.includes("shop") ||
    text.includes("stall") ||
    text.includes("bazaar") ||
    text.includes("marketplace")
  ) {
    return "market";
  }

  if (
    text.includes("modern house") ||
    text.includes("modern home") ||
    text.includes("mansion") ||
    text.includes("estate") ||
    text.includes("duplex")
  ) {
    return "modern-house";
  }

  if (
    text.includes("road") ||
    text.includes("street") ||
    text.includes("highway") ||
    text.includes("roadside") ||
    text.includes("journey") ||
    text.includes("travel")
  ) {
    return "street";
  }

  if (
    text.includes("party") ||
    text.includes("celebration") ||
    text.includes("wedding") ||
    text.includes("gathering") ||
    text.includes("festival") ||
    text.includes("birthday") ||
    text.includes("ceremony")
  ) {
    return "celebration";
  }

  if (
    text.includes("church") ||
    text.includes("chapel") ||
    text.includes("pastor") ||
    text.includes("worship") ||
    text.includes("prayer") ||
    text.includes("funeral") ||
    text.includes("sunday service")
  ) {
    return "church";
  }

  /*
   * TIER 1 ENVIRONMENTS
   */

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
    text.includes("party") ||
    text.includes("celebration") ||
    text.includes("wedding") ||
    text.includes("festival") ||
    text.includes("birthday")
  ) {
    return BOMBA_IMAGE_MOODS.FESTIVE;
  }

  if (
    text.includes("market") ||
    text.includes("busy") ||
    text.includes("crowded") ||
    text.includes("shop")
  ) {
    return BOMBA_IMAGE_MOODS.BUSY;
  }

  if (
    text.includes("modern") ||
    text.includes("mansion") ||
    text.includes("duplex") ||
    text.includes("estate")
  ) {
    return BOMBA_IMAGE_MOODS.MODERN;
  }

  if (
    text.includes("road") ||
    text.includes("street") ||
    text.includes("travel") ||
    text.includes("journey")
  ) {
    return BOMBA_IMAGE_MOODS.JOURNEY;
  }

  if (
    text.includes("church") ||
    text.includes("worship") ||
    text.includes("prayer") ||
    text.includes("funeral") ||
    text.includes("solemn")
  ) {
    return BOMBA_IMAGE_MOODS.SOLEMN;
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

  if (text.includes("village")) {
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
 * Priority:
 *
 * 1. Explicit scene image
 * 2. Tier 2 keyword match
 * 3. Tier 1 environment
 * 4. Mood
 * 5. Sand fallback
 */

export function selectSceneBackground(scene = {}) {
  /*
   * -------------------------------------------------------
   * 1. RESPECT EXPLICIT IMAGE
   * -------------------------------------------------------
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

  /*
   * -------------------------------------------------------
   * 2. TIER 2 KEYWORD SELECTION
   * -------------------------------------------------------
   *
   * Specific human-life locations win first.
   */

  const tier2Image =
    detectTier2Background(scene);

  if (tier2Image) {
    return createBackgroundResult(
      tier2Image,
      scene
    );
  }

  /*
   * -------------------------------------------------------
   * 3. ENVIRONMENT
   * -------------------------------------------------------
   */

  const environment =
    normalize(scene.environment) ||
    detectSceneEnvironment(scene);

  const mood =
    normalize(scene.mood) ||
    detectSceneMood(scene);

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
       * Then try any registered image
       * from the same environment.
       */

      const environmentImages =
        getImagesByEnvironment(
          environment
        );

      if (environmentImages.length > 0) {
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
   * 4. MOOD-ONLY SELECTION
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
   * 5. SAFE FALLBACK
   * -------------------------------------------------------
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

    imageUrl:
      image.imageUrl || null,

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