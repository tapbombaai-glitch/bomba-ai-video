async function generateMasterVoice(dialogue, characters = []) {
  if (!dialogue || !Array.isArray(dialogue) || dialogue.length === 0) {
    throw new Error("No dialogue was found for voice generation.");
  }

  /*
   * BOMBA CHARACTER VOICE SYSTEM
   *
   * Every character gets ONE voice.
   * That voice is reused for every line spoken by that character.
   *
   * We keep the mapping in localStorage so the same character
   * can keep the same voice during the current production.
   */

  const VOICE_LIBRARY = [
    {
      id: "ada_pcm",
      gender: "female",
      language: "pcm",
    },
    {
      id: "chukwuma",
      gender: "male",
      language: "pcm",
    },
    {
      id: "adeola",
      gender: "female",
      language: "yo",
    },
    {
      id: "ibrahim",
      gender: "male",
      language: "ha",
    },
    {
      id: "amara",
      gender: "female",
      language: "ig",
    },
  ];

  const VOICE_MAP_KEY = "bomba_character_voice_map";

  // -----------------------------------------
  // Load previous character → voice mapping
  // -----------------------------------------

  let savedVoiceMap = {};

  try {
    const saved = localStorage.getItem(VOICE_MAP_KEY);

    if (saved) {
      savedVoiceMap = JSON.parse(saved);
    }
  } catch (error) {
    console.warn(
      "BOMBA: Could not load saved character voice map.",
      error
    );
  }

  // -----------------------------------------
  // Normalize character names
  // -----------------------------------------

  const normalizeName = (name) =>
    String(name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  // -----------------------------------------
  // Find character information
  // -----------------------------------------

  const characterList = Array.isArray(characters)
    ? characters
    : [];

  const getCharacter = (speaker) => {
    const normalizedSpeaker = normalizeName(speaker);

    return characterList.find(
      (character) =>
        normalizeName(character?.name) === normalizedSpeaker
    );
  };

  // -----------------------------------------
  // Decide whether a character is male/female
  // -----------------------------------------

  const detectGender = (character) => {
    const description = [
      character?.name,
      character?.role,
      character?.description,
      character?.goal,
      character?.conflict,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const femaleWords = [
      "female",
      "woman",
      "girl",
      "lady",
      "mother",
      "mama",
      "wife",
      "sister",
      "daughter",
      "aunt",
      "woman",
      "she",
      "her",
    ];

    const maleWords = [
      "male",
      "man",
      "boy",
      "father",
      "chief",
      "husband",
      "brother",
      "son",
      "uncle",
      "police officer",
      "driver",
      "he",
      "his",
    ];

    const femaleScore = femaleWords.filter((word) =>
      description.includes(word)
    ).length;

    const maleScore = maleWords.filter((word) =>
      description.includes(word)
    ).length;

    if (femaleScore > maleScore) {
      return "female";
    }

    if (maleScore > femaleScore) {
      return "male";
    }

    // Default when the AI did not provide enough information.
    return "female";
  };

  // -----------------------------------------
  // Assign ONE voice to every character
  // -----------------------------------------

  const usedVoices = new Set(
    Object.values(savedVoiceMap)
  );

  const getVoiceForCharacter = (character) => {
    const name = character?.name || "Unknown";
    const normalizedName = normalizeName(name);

    // Existing assignment wins.
    if (savedVoiceMap[normalizedName]) {
      return savedVoiceMap[normalizedName];
    }

    const gender = detectGender(character);

    let candidates = VOICE_LIBRARY.filter(
      (voice) =>
        voice.gender === gender &&
        !usedVoices.has(voice.id)
    );

    // If all voices of that gender have been used,
    // allow reuse rather than failing the production.
    if (candidates.length === 0) {
      candidates = VOICE_LIBRARY.filter(
        (voice) => voice.gender === gender
      );
    }

    // Final fallback.
    if (candidates.length === 0) {
      candidates = VOICE_LIBRARY;
    }

    const selectedVoice = candidates[0];

    savedVoiceMap[normalizedName] = selectedVoice.id;
    usedVoices.add(selectedVoice.id);

    return selectedVoice.id;
  };

  // -----------------------------------------
  // Build voice assignments
  // -----------------------------------------

  const characterVoiceMap = {};

  for (const character of characterList) {
    if (!character?.name) continue;

    const normalizedName = normalizeName(character.name);

    characterVoiceMap[normalizedName] =
      getVoiceForCharacter(character);
  }

  // -----------------------------------------
  // Save mapping
  // -----------------------------------------

  try {
    localStorage.setItem(
      VOICE_MAP_KEY,
      JSON.stringify(savedVoiceMap)
    );
  } catch (error) {
    console.warn(
      "BOMBA: Could not save character voice map.",
      error
    );
  }

  console.log(
    "======================================"
  );
  console.log(
    "BOMBA CHARACTER VOICE MAP"
  );
  console.log(
    "======================================"
  );
  console.log(characterVoiceMap);

  // -----------------------------------------
  // Generate each dialogue line separately
  // -----------------------------------------

  const generatedAudio = [];

  for (let index = 0; index < dialogue.length; index++) {
    const line = dialogue[index];

    if (!line) continue;

    const speaker =
      line?.speaker ||
      line?.character ||
      line?.characterName ||
      line?.name ||
      "";

    const text =
      typeof line === "string"
        ? line.trim()
        : String(
            line?.text ||
            line?.dialogue ||
            line?.line ||
            ""
          ).trim();

    if (!text) continue;

    /*
     * If this is a plain string without a speaker,
     * use the default voice.
     *
     * Proper character dialogue should always have
     * a speaker.
     */

    const normalizedSpeaker =
      normalizeName(speaker);

    let voiceId =
      characterVoiceMap[normalizedSpeaker];

    let language = "pcm";

    if (!voiceId) {
      voiceId = "ada_pcm";

      console.warn(
        "BOMBA: No character voice found for:",
        speaker,
        "Using fallback voice:",
        voiceId
      );
    }

    const character = getCharacter(speaker);

    /*
     * Determine language from the selected voice.
     */

    const selectedVoice = VOICE_LIBRARY.find(
      (voice) => voice.id === voiceId
    );

    if (selectedVoice?.language) {
      language = selectedVoice.language;
    }

    console.log(
      `BOMBA VOICE LINE ${index + 1}:`,
      speaker || "Unknown",
      "→",
      voiceId,
      "→",
      language
    );

    // ---------------------------------------
    // Generate this character's audio
    // ---------------------------------------

    const response = await fetch(
      "/api/voice/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voiceId,
          language,
          character: speaker,
          characterData: character || null,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `Voice generation failed for ${speaker || "unknown character"}: ${
          errorText || response.status
        }`
      );
    }

    const audioBlob = await response.blob();

    if (!audioBlob.size) {
      throw new Error(
        `Empty voice audio returned for ${
          speaker || "unknown character"
        }.`
      );
    }

    const audioUrl =
      URL.createObjectURL(audioBlob);

    generatedAudio.push({
      index,
      speaker,
      text,
      voiceId,
      language,
      audioUrl,
      blob: audioBlob,
    });
  }

  // -----------------------------------------
  // Return complete character voice production
  // -----------------------------------------

  return {
    status: "completed",

    characterVoices: characterVoiceMap,

    dialogue: generatedAudio,

    // Useful summary for the rest of BOMBA.
    voices: generatedAudio.map((item) => ({
      speaker: item.speaker,
      voiceId: item.voiceId,
      language: item.language,
      text: item.text,
      audioUrl: item.audioUrl,
    })),
  };
}