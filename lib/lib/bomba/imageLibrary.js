/**
 * BOMBA AI — Image Library
 *
 * Central catalog for BOMBA visual/background assets.
 *
 * IMPORTANT:
 * - Metadata only.
 * - Does not generate images.
 * - Does not download images.
 * - Does not upload images.
 * - Does not touch Cloudinary.
 * - Does not touch FFmpeg.
 * - Does not touch the Production Store.
 * - Does not alter the production pipeline.
 *
 * Actual image files can be connected later.
 */

/**
 * Available visual moods.
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
};

/**
 * Available visual/background types.
 */
export const BOMBA_IMAGE_TYPES = {
  BACKGROUND: "background",
  LOCATION: "location",
  ENVIRONMENT: "environment",
  CHARACTER_REFERENCE: "character-reference",
};

/**
 * BOMBA visual library.
 *
 * imageUrl stays null until the actual
 * approved image file is placed in the project.
 */
export const BOMBA_IMAGE_LIBRARY = [
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
    ],

    environment: "sand",

    imageUrl: null,

    localPath:
      "/backgrounds/sand-background.jpg",

    source: "local",

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
    ],

    environment: "river",

    imageUrl: null,

    localPath:
      "/backgrounds/river-romantic.jpg",

    source: "local",

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
    ],

    environment: "river",

    imageUrl: null,

    localPath:
      "/backgrounds/river-sunset.jpg",

    source: "local",

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
    ],

    environment: "village",

    imageUrl: null,

    localPath:
      "/backgrounds/village-warm.jpg",

    source: "local",

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
    ],

    environment: "forest",

    imageUrl: null,

    localPath:
      "/backgrounds/forest-mystery.jpg",

    source: "local",

    status: "registered",
  },
];

/**
 * Return the complete image library.
 */
export function getAllImages() {
  return BOMBA_IMAGE_LIBRARY;
}

/**
 * Return images matching a mood.
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
      image.moods.includes(normalizedMood)
  );
}

/**
 * Return images matching an environment.
 */
export function getImagesByEnvironment(environment) {
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
 * Return one image by ID.
 */
export function getImageById(id) {
  if (!id) {
    return null;
  }

  return (
    BOMBA_IMAGE_LIBRARY.find(
      (image) => image.id === id
    ) || null
  );
}

/**
 * Return only images that have
 * an actual playable/displayable URL.
 */
export function getPlayableImages() {
  return BOMBA_IMAGE_LIBRARY.filter(
    (image) =>
      typeof image.imageUrl === "string" &&
      /^https?:\/\//i.test(image.imageUrl)
  );
}

/**
 * Return only images that have
 * a registered local project path.
 */
export function getLocalImages() {
  return BOMBA_IMAGE_LIBRARY.filter(
    (image) =>
      typeof image.localPath === "string" &&
      image.localPath.length > 0
  );
}