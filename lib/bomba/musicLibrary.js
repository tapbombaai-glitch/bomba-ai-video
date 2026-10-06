/**
 * BOMBA AI — Music Library
 *
 * Central catalog for BOMBA background music.
 *
 * IMPORTANT:
 * - Metadata only.
 * - Does not call external APIs.
 * - Does not download music.
 * - Does not upload audio.
 * - Does not touch Cloudinary.
 * - Does not touch FFmpeg.
 * - Does not touch Cartesia.
 * - Does not touch Production Store.
 * - Does not alter the production pipeline.
 *
 * Actual audio files will be connected later.
 */

export const BOMBA_MUSIC_MOODS = {
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
};

/**
 * Real music sources currently registered
 * for the BOMBA library.
 *
 * audioUrl remains null until the actual
 * approved audio file is imported into BOMBA.
 */
export const BOMBA_MUSIC_LIBRARY = [
  {
    id: "pixabay-subtle-background-audiodollar",

    title: "Subtle Background",

    artist: "AudioDollar",

    moods: [
      BOMBA_MUSIC_MOODS.ROMANCE,
      BOMBA_MUSIC_MOODS.PEACEFUL,
      BOMBA_MUSIC_MOODS.DRAMA,
      BOMBA_MUSIC_MOODS.NATURE,
      BOMBA_MUSIC_MOODS.FANTASY,
    ],

    genre: "cinematic",

    durationSeconds: 113,

    source: "pixabay",

    sourceUrl:
      "https://pixabay.com/music/build-up-scenes-subtle-background-552664/",

    audioUrl: null,

    license: "Pixabay Content License",

    contentIdRegistered: false,

    instrumental: true,

    status: "approved-source",
  },

  {
    id: "pixabay-soft-cinematic-background-jorisvermeer",

    title: "Soft Cinematic Background",

    artist: "JorisVermeer",

    moods: [
      BOMBA_MUSIC_MOODS.ROMANCE,
      BOMBA_MUSIC_MOODS.EMOTIONAL,
      BOMBA_MUSIC_MOODS.PEACEFUL,
      BOMBA_MUSIC_MOODS.DRAMA,
      BOMBA_MUSIC_MOODS.NATURE,
    ],

    genre: "cinematic",

    durationSeconds: 62,

    source: "pixabay",

    sourceUrl:
      "https://pixabay.com/music/modern-classical-soft-cinematic-background-506515/",

    audioUrl: null,

    license: "Pixabay Content License",

    contentIdRegistered: false,

    instrumental: true,

    status: "approved-source",
  },
];

/**
 * Return the complete music library.
 */
export function getAllMusic() {
  return BOMBA_MUSIC_LIBRARY;
}

/**
 * Return tracks matching a mood.
 */
export function getMusicByMood(mood) {
  if (!mood) {
    return [];
  }

  const normalizedMood =
    String(mood)
      .trim()
      .toLowerCase();

  return BOMBA_MUSIC_LIBRARY.filter(
    (track) =>
      Array.isArray(track.moods) &&
      track.moods.includes(normalizedMood)
  );
}

/**
 * Return a track by its unique ID.
 */
export function getMusicById(id) {
  if (!id) {
    return null;
  }

  return (
    BOMBA_MUSIC_LIBRARY.find(
      (track) => track.id === id
    ) || null
  );
}

/**
 * Return only tracks that are marked
 * as instrumental.
 */
export function getInstrumentalMusic() {
  return BOMBA_MUSIC_LIBRARY.filter(
    (track) => track.instrumental === true
  );
}

/**
 * Return only tracks that have an
 * actual audio URL available.
 *
 * This will become useful when we
 * import the real MP3 files later.
 */
export function getPlayableMusic() {
  return BOMBA_MUSIC_LIBRARY.filter(
    (track) =>
      typeof track.audioUrl === "string" &&
      /^https?:\/\//i.test(track.audioUrl)
  );
}