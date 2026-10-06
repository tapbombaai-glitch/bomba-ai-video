/**
 * BOMBA AI — Music Library
 *
 * Central catalog for BOMBA background music.
 *
 * IMPORTANT:
 * - Metadata only.
 * - Does not call APIs.
 * - Does not upload files.
 * - Does not touch Production Store.
 * - Does not touch FFmpeg.
 * - Does not change the existing production pipeline.
 *
 * Music will be connected to the production pipeline later.
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

export const BOMBA_MUSIC_LIBRARY = [];

/**
 * Get every music track currently registered.
 */
export function getAllMusic() {
  return BOMBA_MUSIC_LIBRARY;
}

/**
 * Get music tracks matching a mood.
 */
export function getMusicByMood(mood) {
  if (!mood) {
    return [];
  }

  const normalizedMood =
    String(mood).trim().toLowerCase();

  return BOMBA_MUSIC_LIBRARY.filter(
    (track) =>
      Array.isArray(track.moods) &&
      track.moods.includes(normalizedMood)
  );
}

/**
 * Find a specific track by ID.
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