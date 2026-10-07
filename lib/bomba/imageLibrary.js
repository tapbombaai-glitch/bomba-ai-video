/**
 * BOMBA AI — Image Library
 *
 * Central catalog for BOMBA visual/background assets.
 *
 * IMPORTANT:
 * - Exactly 11 backgrounds.
 * - Metadata only.
 * - Does not generate images.
 * - Does not download images.
 * - Does not upload images.
 * - Does not touch Cloudinary.
 * - Does not touch FFmpeg.
 * - Does not touch the Production Store.
 * - Does not alter the production pipeline.
 *
 * TIER 1 — CORE: 6
 * TIER 2 — HIGH IMPACT: 5
 *
 * TOTAL: 11 — LOCKED
 */

export const BOMBA_IMAGE_MOODS = {
  ROMANCE: "romance",
  EMOTIONAL: "emotional",
  PEACEFUL: "peaceful",
  MYSTERY: "mystery",
  HORROR: "horror",
  ACTION: "action",
  COMEDY: "comedy",
  NATURE: "nature",
  CITY: "city",
  FANTASY: "fantasy",
  DRAMA: "drama",
  ADVENTURE: "adventure",
  VILLAGE: "village",
  RIVER: "river",
  SUNSET: "sunset",
  NIGHT: "night",

  // Tier 2 moods
  BUSY: "busy",
  MODERN: "modern",
  JOURNEY: "journey",
  FESTIVE: "festive",
  SOLEMN: "solemn",
};

export const BOMBA_IMAGE_TYPES = {
  BACKGROUND: "background",
  LOCATION: "location",
  ENVIRONMENT: "environment",
  CHARACTER_REFERENCE: "character-reference",
};

/**
 * =========================================================
 * BOMBA IMAGE LIBRARY
 * =========================================================
 *
 * 6 CORE + 5 HIGH IMPACT = 11 TOTAL
 */

export const BOMBA_IMAGE_LIBRARY = [
  /**
   * =======================================================
   * TIER 1 — CORE
   * =======================================================
   */

  {
    id: "sand-background",

    title: "Sand Background",

    description:
      "Warm sandy environment suitable for story scenes.",

    type: BOMBA_IMAGE_TYPES.BACKGROUND,

    moods: [
      BOMBA_IMAGE_MOODS.ADVENTURE,
      BOMBA_IMAGE_MOODS.VILLAGE,
      BOMBA_IMAGE_MOODS.DRAMA,
      BOMBA_IMAGE_MOODS.NATURE,
      BOMBA_IMAGE_MOODS.PEACEFUL,
    ],

    environment: "sand",

    imageUrl: null,

    localPath:
      "/backgrounds/sand-background.jpg",

    source: "local",

    tier: 1,

    status: "registered",
  },

  {
    id: "river-romantic",

    title: "Romantic River",

    description:
      "Soft river environment for emotional or romantic scenes.",

    type: BOMBA_IMAGE_TYPES.ENVIRONMENT,

    moods: [
      BOMBA_IMAGE_MOODS.ROMANCE,
      BOMBA_IMAGE_MOODS.EMOTIONAL,
      BOMBA_IMAGE_MOODS.MYSTERY,
      BOMBA_IMAGE_MOODS.RIVER,
      BOMBA_IMAGE_MOODS.NATURE,
      BOMBA_IMAGE_MOODS.PEACEFUL,
    ],

    environment: "river",

    imageUrl: null,

    localPath:
      "/backgrounds/river-romantic.jpg",

    source: "local",

    tier: 1,

    status: "registered",
  },

  {
    id: "river-night",

    title: "River at Night",

    description:
      "Dark river environment for mysterious or suspenseful scenes.",

    type: BOMBA_IMAGE_TYPES.ENVIRONMENT,

    moods: [
      BOMBA_IMAGE_MOODS.MYSTERY,
      BOMBA_IMAGE_MOODS.DRAMA,
      BOMBA_IMAGE_MOODS.HORROR,
      BOMBA_IMAGE_MOODS.RIVER,
      BOMBA_IMAGE_MOODS.NIGHT,
    ],

    environment: "river",

    imageUrl: null,

    localPath:
      "/backgrounds/river-night.jpg",

    source: "local",

    tier: 1,

    status: "registered",
  },

  {
    id: "river-sunset",

    title: "River Sunset",

    description:
      "Warm sunset river environment for romantic and emotional scenes.",

    type: BOMBA_IMAGE_TYPES.ENVIRONMENT,

    moods: [
      BOMBA_IMAGE_MOODS.ROMANCE,
      BOMBA_IMAGE_MOODS.EMOTIONAL,
      BOMBA_IMAGE_MOODS.PEACEFUL,
      BOMBA_IMAGE_MOODS.RIVER,
      BOMBA_IMAGE_MOODS.SUNSET,
      BOMBA_IMAGE_MOODS.DRAMA,
    ],

    environment: "river",

    imageUrl: null,

    localPath:
      "/backgrounds/river-sunset.jpg",

    source: "local",

    tier: 1,

    status: "registered",
  },

  {
    id: "village-warm",

    title: "Warm Village",

    description:
      "Warm village environment for African folktale scenes.",

    type: BOMBA_IMAGE_TYPES.LOCATION,

    moods: [
      BOMBA_IMAGE_MOODS.VILLAGE,
      BOMBA_IMAGE_MOODS.DRAMA,
      BOMBA_IMAGE_MOODS.ADVENTURE,
      BOMBA_IMAGE_MOODS.PEACEFUL,
      BOMBA_IMAGE_MOODS.NATURE,
    ],

    environment: "village",

    imageUrl: null,

    localPath:
      "/backgrounds/village-warm.jpg",

    source: "local",

    tier: 1,

    status: "registered",
  },

  {
    id: "forest-mystery",

    title: "Mysterious Forest",

    description:
      "Atmospheric forest environment for mysterious stories.",

    type: BOMBA_IMAGE_TYPES.ENVIRONMENT,

    moods: [
      BOMBA_IMAGE_MOODS.MYSTERY,
      BOMBA_IMAGE_MOODS.FANTASY,
      BOMBA_IMAGE_MOODS.HORROR,
      BOMBA_IMAGE_MOODS.ADVENTURE,
      BOMBA_IMAGE_MOODS.NATURE,
      BOMBA_IMAGE_MOODS.DRAMA,
    ],

    environment: "forest",

    imageUrl: null,

    localPath:
      "/backgrounds/forest-mystery.jpg",

    source: "local",

    tier: 1,

    status: "registered",
  },

  /**
   * =======================================================
   * TIER 2 — HIGH IMPACT
   * =======================================================
   */

  {
    id: "market-busy",

    title: "Busy Nigerian Market",

    description:
      "Busy Nigerian market environment for trading, shopping, community and town scenes.",

    type: BOMBA_IMAGE_TYPES.LOCATION,

    moods: [
      BOMBA_IMAGE_MOODS.BUSY,
      BOMBA_IMAGE_MOODS.CITY,
      BOMBA_IMAGE_MOODS.DRAMA,
      BOMBA_IMAGE_MOODS.COMEDY,
      BOMBA_IMAGE_MOODS.ADVENTURE,
    ],

    environment: "market",

    imageUrl: null,

    localPath:
      "/backgrounds/market-busy.jpg",

    source: "local",

    tier: 2,

    purpose:
      "Market / shops / marketplace",

    status: "registered",
  },

  {
    id: "house-modern",

    title: "Modern Nigerian House",

    description:
      "Modern Nigerian residential environment for contemporary family, wealthy, urban and contrast scenes.",

    type: BOMBA_IMAGE_TYPES.LOCATION,

    moods: [
      BOMBA_IMAGE_MOODS.MODERN,
      BOMBA_IMAGE_MOODS.CITY,
      BOMBA_IMAGE_MOODS.DRAMA,
      BOMBA_IMAGE_MOODS.ROMANCE,
      BOMBA_IMAGE_MOODS.PEACEFUL,
    ],

    environment: "modern-house",

    imageUrl: null,

    localPath:
      "/backgrounds/house-modern.jpg",

    source: "local",

    tier: 2,

    purpose:
      "Modern home / interior-exterior contrast",

    status: "registered",
  },

  {
    id: "street-roadside",

    title: "Nigerian Street Roadside",

    description:
      "Nigerian roadside environment for travel, walking, journeys and movement between locations.",

    type: BOMBA_IMAGE_TYPES.LOCATION,

    moods: [
      BOMBA_IMAGE_MOODS.JOURNEY,
      BOMBA_IMAGE_MOODS.CITY,
      BOMBA_IMAGE_MOODS.ADVENTURE,
      BOMBA_IMAGE_MOODS.DRAMA,
      BOMBA_IMAGE_MOODS.BUSY,
    ],

    environment: "street",

    imageUrl: null,

    localPath:
      "/backgrounds/street-roadside.jpg",

    source: "local",

    tier: 2,

    purpose:
      "Street / travel / roadside",

    status: "registered",
  },

  {
    id: "party-celebration",

    title: "Party Celebration",

    description:
      "Celebration environment for weddings, gatherings, festivals, parties and community events.",

    type: BOMBA_IMAGE_TYPES.LOCATION,

    moods: [
      BOMBA_IMAGE_MOODS.FESTIVE,
      BOMBA_IMAGE_MOODS.COMEDY,
      BOMBA_IMAGE_MOODS.ROMANCE,
      BOMBA_IMAGE_MOODS.EMOTIONAL,
      BOMBA_IMAGE_MOODS.VILLAGE,
    ],

    environment: "celebration",

    imageUrl: null,

    localPath:
      "/backgrounds/party-celebration.jpg",

    source: "local",

    tier: 2,

    purpose:
      "Celebration / wedding / gathering",

    status: "registered",
  },

  {
    id: "church-background",

    title: "Nigerian Church",

    description:
      "Church environment for worship, prayer, weddings, funerals and important story moments.",

    type: BOMBA_IMAGE_TYPES.LOCATION,

    moods: [
      BOMBA_IMAGE_MOODS.SOLEMN,
      BOMBA_IMAGE_MOODS.EMOTIONAL,
      BOMBA_IMAGE_MOODS.PEACEFUL,
      BOMBA_IMAGE_MOODS.ROMANCE,
      BOMBA_IMAGE_MOODS.DRAMA,
    ],

    environment: "church",

    imageUrl: null,

    localPath:
      "/backgrounds/church-background.jpg",

    source: "local",

    tier: 2,

    purpose:
      "Church / worship / wedding / funeral",

    status: "registered",
  },
];

/**
 * =========================================================
 * LOCKED LIBRARY COUNTS
 * =========================================================
 */

export const TOTAL_BACKGROUNDS = 11;

export const TIER_1_COUNT = 6;

export const TIER_2_COUNT = 5;

/**
 * =========================================================
 * SAFETY CHECK
 * =========================================================
 *
 * This prevents the library from silently growing beyond
 * the locked 11-background limit.
 */

if (
  BOMBA_IMAGE_LIBRARY.length !==
  TOTAL_BACKGROUNDS
) {
  throw new Error(
    `BOMBA Image Library error: expected ${TOTAL_BACKGROUNDS} backgrounds but found ${BOMBA_IMAGE_LIBRARY.length}.`
  );
}

/**
 * =========================================================
 * GET ALL IMAGES
 * =========================================================
 */

export function getAllImages() {
  return BOMBA_IMAGE_LIBRARY;
}

/**
 * =========================================================
 * GET IMAGES BY MOOD
 * =========================================================
 */

export function getImagesByMood(mood) {
  if (!mood) {
    return [];
  }

  const normalizedMood =
    String(mood)
      .trim()
      .toLowerCase();

  return BOMBA_IMAGE_LIBRARY.filter(
    (image) =>
      Array.isArray(image.moods) &&
      image.moods.includes(
        normalizedMood
      )
  );
}

/**
 * =========================================================
 * GET IMAGES BY ENVIRONMENT
 * =========================================================
 */

export function getImagesByEnvironment(
  environment
) {
  if (!environment) {
    return [];
  }

  const normalizedEnvironment =
    String(environment)
      .trim()
      .toLowerCase();

  return BOMBA_IMAGE_LIBRARY.filter(
    (image) =>
      image.environment ===
      normalizedEnvironment
  );
}

/**
 * =========================================================
 * GET IMAGE BY ID
 * =========================================================
 */

export function getImageById(id) {
  if (!id) {
    return null;
  }

  return (
    BOMBA_IMAGE_LIBRARY.find(
      (image) =>
        image.id === id
    ) || null
  );
}

/**
 * =========================================================
 * GET PLAYABLE IMAGES
 * =========================================================
 *
 * Returns externally hosted images only.
 *
 * Local public backgrounds are intentionally handled
 * through getLocalImages().
 */

export function getPlayableImages() {
  return BOMBA_IMAGE_LIBRARY.filter(
    (image) =>
      typeof image.imageUrl ===
        "string" &&
      /^https?:\/\//i.test(
        image.imageUrl
      )
  );
}

/**
 * =========================================================
 * GET LOCAL IMAGES
 * =========================================================
 */

export function getLocalImages() {
  return BOMBA_IMAGE_LIBRARY.filter(
    (image) =>
      typeof image.localPath ===
        "string" &&
      image.localPath.length > 0
  );
}

/**
 * =========================================================
 * GET TIER 1 IMAGES
 * =========================================================
 */

export function getTier1Images() {
  return BOMBA_IMAGE_LIBRARY.filter(
    (image) =>
      image.tier === 1
  );
}

/**
 * =========================================================
 * GET TIER 2 IMAGES
 * =========================================================
 */

export function getTier2Images() {
  return BOMBA_IMAGE_LIBRARY.filter(
    (image) =>
      image.tier === 2
  );
}

/**
 * =========================================================
 * GET BACKGROUND PATH
 * =========================================================
 *
 * Returns the public path that the browser can use.
 */

export function getBackgroundPath(
  id
) {
  const image =
    getImageById(id);

  if (!image) {
    return null;
  }

  return image.localPath || null;
}