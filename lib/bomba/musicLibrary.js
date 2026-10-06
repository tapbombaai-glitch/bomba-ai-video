/**
 * BOMBA AI — Music Library
 *
 * Central catalog for BOMBA background music.
 *
 * IMPORTANT:
 * - Metadata only.
 * - Does not generate music.
 * - Does not download music.
 * - Does not upload music.
 * - Does not touch Cloudinary.
 * - Does not touch FFmpeg.
 * - Does not touch Cartesia.
 * - Does not touch Production Store.
 * - Does not alter the production pipeline.
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

export const BOMBA_MUSIC_LIBRARY = [
  {
    id: "pixabay-soft-soft-music-576656",

    title: "Soft - Soft Music",

    artist: "AtlasAudio",

    moods: [
      BOMBA_MUSIC_MOODS.ROMANCE,
      BOMBA_MUSIC_MOODS.PEACEFUL,
      BOMBA_MUSIC_MOODS.EMOTIONAL,
      BOMBA_MUSIC_MOODS.DRAMA,
      BOMBA_MUSIC_MOODS.NATURE,
    ],

    genre: "soft cinematic",

    durationSeconds: null,

    source: "pixabay",

    sourceUrl:
      "https://pixabay.com/music/soft-house-soft-soft-music-576656/",

    audioUrl:
      "/music/soft-soft-music-576656.mp3",

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

export function getAllMusic() {
  return BOMBA_MUSIC_LIBRARY;
}

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

export function getInstrumentalMusic() {
  return BOMBA_MUSIC_LIBRARY.filter(
    (track) => track.instrumental === true
  );
}

export function getPlayableMusic() {
  return BOMBA_MUSIC_LIBRARY.filter(
    (track) =>
      typeof track.audioUrl === "string" &&
      (
        /^https?:\/\//i.test(track.audioUrl) ||
        track.audioUrl.startsWith("/")
      )
  );
}