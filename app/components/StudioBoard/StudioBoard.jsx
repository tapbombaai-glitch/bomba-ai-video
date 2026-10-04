"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  initializeProduction,
  getProduction,
  subscribeToProduction,
  changeStage,
} from "../../../lib/bomba/productionStore";

/* =========================================================
   BOMBA AI — STUDIO BOARD
   ========================================================= */

const modules = [
  { number: "01", name: "IDEA", icon: "💡" },
  { number: "02", name: "PLAN", icon: "📋" },
  { number: "03", name: "CHARACTERS", icon: "👤" },
  { number: "04", name: "SCENES", icon: "🎬" },
  { number: "05", name: "DIALOGUE", icon: "💬" },
  { number: "06", name: "VOICE", icon: "🎙️" },
  { number: "07", name: "VIDEO", icon: "🎥" },
  { number: "08", name: "SOUND", icon: "🔊" },
  { number: "09", name: "TIMELINE", icon: "⏱️" },
  { number: "10", name: "PREVIEW", icon: "▶️" },
  { number: "11", name: "EXPORT", icon: "📤" },
];

const CONFIRMED_VOICES = {
  pcm: [
    { id: "ada_pcm", name: "Ada", gender: "Female" },
    { id: "blessing_pcm", name: "Blessing", gender: "Female" },
  ],
  ig: [
    { id: "adaeze_ig", name: "Adaeze", gender: "Female" },
    { id: "ifeanyi_ig", name: "Ifeanyi", gender: "Male" },
  ],
  yo: [
    { id: "adeola_yo", name: "Adeola", gender: "Female" },
    { id: "adekunle_yo", name: "Adekunle", gender: "Male" },
  ],
  ha: [
    { id: "aisha_ha", name: "Aisha", gender: "Female" },
    { id: "bello_ha", name: "Bello", gender: "Male" },
  ],
};

const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";

const CLOUDINARY_VOICE_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_VOICE_PRESET ||
  "bomba_voice";

/* =========================================================
   HELPERS
   ========================================================= */

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/* =========================================================
   CLOUDINARY VOICE UPLOAD
   ========================================================= */

async function uploadVoiceToCloudinary(audioBlob) {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error(
      "Cloudinary Cloud Name is not configured."
    );
  }

  const uploadUrl =
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      CLOUDINARY_CLOUD_NAME
    )}/video/upload`;

  const formData = new FormData();

  formData.append(
    "file",
    audioBlob,
    "bomba-voice.mp3"
  );

  formData.append(
    "upload_preset",
    CLOUDINARY_VOICE_PRESET
  );

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Cloudinary voice upload failed with HTTP ${response.status}.`
    );
  }

  if (!data?.public_id) {
    throw new Error(
      "Cloudinary uploaded the voice but did not return a public ID."
    );
  }

  return data;
}

/* =========================================================
   TEST STORY
   ========================================================= */

function createTestStoryFromIdea(idea) {
  const cleanIdea = safeText(idea).trim();

  if (!cleanIdea) {
    throw new Error(
      "Please enter an IDEA before building the story."
    );
  }

  const characters = [
    {
      id: "character-daniel",
      name: "Daniel",
      role: "Main Character",
      gender: "Male",
      voiceSlot: "VOICE_A",
    },
    {
      id: "character-sarah",
      name: "Sarah",
      role: "Support Character",
      gender: "Female",
      voiceSlot: "VOICE_B",
    },
    {
      id: "character-michael",
      name: "Michael",
      role: "Rival",
      gender: "Male",
      voiceSlot: "VOICE_C",
    },
    {
      id: "character-amara",
      name: "Amara",
      role: "Friend",
      gender: "Female",
      voiceSlot: "VOICE_D",
    },
    {
      id: "character-chief-okoro",
      name: "Chief Okoro",
      role: "Mentor",
      gender: "Male",
      voiceSlot: "VOICE_E",
    },
  ];

  const story = {
    id: makeId("test-story"),
    mode: "test",
    title: "The Idea That Could Change Everything",

    logline:
      `Daniel has an idea that could change his future, but fear, doubt and opposition threaten to stop him before he begins. ${cleanIdea}`,

    genre: "Drama / Inspirational",
    setting: "Modern Nigeria",

    beginning:
      "Daniel discovers an idea that he believes can change his life and help the people around him. He is excited but afraid of failure.",

    middle:
      "Sarah encourages Daniel to begin with what he has. As Daniel develops the idea, Michael challenges him and creates doubt.",

    conflict:
      "Daniel faces criticism, limited resources and pressure to abandon the idea.",

    turningPoint:
      "Daniel realizes that waiting for perfect conditions is the real obstacle. He chooses to take the first serious step.",

    ending:
      "Daniel begins the journey. The result is not immediate success, but the first step proves that the idea is worth pursuing.",

    themes: [
      "Courage",
      "Persistence",
      "Hope",
      "Self-belief",
      "Taking the first step",
    ],

    characters,

    scenes: [
      {
        sceneNumber: 1,
        title: "The Idea",
        location: "Daniel's Room",
        time: "Morning",
        description:
          "Daniel sits alone thinking about an idea that could change his future.",
        purpose: "Introduce Daniel and the central idea.",
      },
      {
        sceneNumber: 2,
        title: "A Friend's Advice",
        location: "Small Local Cafe",
        time: "Afternoon",
        description:
          "Daniel explains the idea to Sarah, who encourages him to start small.",
        purpose: "Give Daniel confidence and introduce support.",
      },
      {
        sceneNumber: 3,
        title: "The Doubt",
        location: "Street Outside Daniel's Workplace",
        time: "Evening",
        description:
          "Michael questions whether Daniel can actually succeed.",
        purpose: "Introduce external conflict.",
      },
      {
        sceneNumber: 4,
        title: "The Turning Point",
        location: "Chief Okoro's Compound",
        time: "Night",
        description:
          "Chief Okoro gives Daniel advice about courage and action.",
        purpose: "Create the emotional turning point.",
      },
      {
        sceneNumber: 5,
        title: "The First Step",
        location: "Daniel's Workspace",
        time: "Morning",
        description:
          "Daniel finally starts working on the idea instead of waiting.",
        purpose: "End with action and hope.",
      },
    ],

    shots: [
      {
        shotNumber: 1,
        sceneNumber: 1,
        shotType: "Wide Shot",
        description:
          "Daniel sits alone in his room staring at a notebook.",
        camera: "Slow push-in",
        character: "Daniel",
      },
      {
        shotNumber: 2,
        sceneNumber: 1,
        shotType: "Close Up",
        description:
          "Close-up of Daniel's worried but determined face.",
        camera: "Static close-up",
        character: "Daniel",
      },
      {
        shotNumber: 3,
        sceneNumber: 2,
        shotType: "Two Shot",
        description:
          "Daniel explains his idea while Sarah listens.",
        camera: "Medium two-shot",
        character: "Daniel, Sarah",
      },
      {
        shotNumber: 4,
        sceneNumber: 2,
        shotType: "Close Up",
        description:
          "Sarah smiles and encourages Daniel.",
        camera: "Gentle push-in",
        character: "Sarah",
      },
      {
        shotNumber: 5,
        sceneNumber: 3,
        shotType: "Medium Shot",
        description:
          "Michael confronts Daniel and questions his plan.",
        camera: "Handheld medium shot",
        character: "Michael, Daniel",
      },
      {
        shotNumber: 6,
        sceneNumber: 4,
        shotType: "Medium Close Up",
        description:
          "Chief Okoro calmly gives Daniel advice.",
        camera: "Slow dolly",
        character: "Chief Okoro, Daniel",
      },
    ],

    createdAt: new Date().toISOString(),
  };

  return {
    story,
    characters,
  };
}

/* =========================================================
   CHARACTER VOICES
   ========================================================= */

function assignCharacterVoices(
  characters,
  language
) {
  const providerVoices =
    CONFIRMED_VOICES[language] || [];

  return safeArray(characters).map(
    (character, index) => {
      const providerVoice =
        providerVoices[index] || null;

      return {
        ...character,

        voiceId:
          providerVoice?.id || null,

        voiceName:
          providerVoice?.name ||
          `Reserved Voice ${index + 1}`,

        voiceGender:
          providerVoice?.gender ||
          character.gender ||
          "Unknown",

        voiceStatus:
          providerVoice
            ? "ready"
            : "reserved",
      };
    }
  );
}

/* =========================================================
   DIALOGUE
   ========================================================= */

function createTestDialogueFromStory(
  story,
  characters,
  language
) {
  if (!story) {
    throw new Error(
      "A STORY is required before creating dialogue."
    );
  }

  if (!safeArray(characters).length) {
    throw new Error(
      "CHARACTERS are required before creating dialogue."
    );
  }

  const characterMap = {};

  for (const character of characters) {
    characterMap[character.name] =
      character;
  }

  function getCharacter(name) {
    return (
      characterMap[name] || {
        id: makeId("character"),
        name,
        role: "Character",
        voiceSlot: null,
        voiceId: null,
        voiceName: null,
        voiceStatus: "reserved",
      }
    );
  }

  function createLine(
    sceneNumber,
    lineNumber,
    characterName,
    text,
    emotion
  ) {
    const character =
      getCharacter(characterName);

    const words =
      safeText(text)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    const wordCount = words.length;

    const duration =
      Math.max(
        1,
        Number(
          (wordCount / 2.5).toFixed(1)
        )
      );

    return {
      id: `dialogue-${sceneNumber}-${lineNumber}`,

      sceneNumber,

      characterId:
        character.id,

      characterName:
        character.name,

      role:
        character.role,

      text,

      emotion,

      voice: {
        slot:
          character.voiceSlot || null,

        id:
          character.voiceId || null,

        name:
          character.voiceName || null,

        status:
          character.voiceStatus ||
          "reserved",
      },

      timing: {
        wordCount,
        durationSec: duration,
      },

      audio: {
        status: "pending",
        url: "",
      },
    };
  }

  const lines = [
    createLine(
      1,
      1,
      "Daniel",
      "I don think say this idea fit work, but I no wan give up.",
      "Worried"
    ),

    createLine(
      1,
      2,
      "Daniel",
      "Maybe na me dey think too much.",
      "Uncertain"
    ),

    createLine(
      2,
      3,
      "Sarah",
      "Then make you start small. You no need everything before you begin.",
      "Encouraging"
    ),

    createLine(
      2,
      4,
      "Daniel",
      "Na true. If I no start now, I fit regret am later.",
      "Hopeful"
    ),

    createLine(
      2,
      5,
      "Sarah",
      "Exactly. One step fit change everything.",
      "Confident"
    ),

    createLine(
      3,
      6,
      "Michael",
      "You really think say this your idea go work?",
      "Mocking"
    ),

    createLine(
      3,
      7,
      "Daniel",
      "I no know yet, but I go give am my best.",
      "Determined"
    ),

    createLine(
      3,
      8,
      "Michael",
      "Hope say you know wetin you dey enter.",
      "Doubtful"
    ),

    createLine(
      3,
      9,
      "Daniel",
      "I go learn as I dey go.",
      "Determined"
    ),

    createLine(
      4,
      10,
      "Chief Okoro",
      "My son, every big journey start with one small step.",
      "Wise"
    ),

    createLine(
      4,
      11,
      "Daniel",
      "But what if I fail?",
      "Afraid"
    ),

    createLine(
      4,
      12,
      "Chief Okoro",
      "Failure no be the end. Giving up na the real failure.",
      "Inspirational"
    ),

    createLine(
      5,
      13,
      "Amara",
      "Daniel, you don finally start!",
      "Excited"
    ),

    createLine(
      5,
      14,
      "Daniel",
      "Yes. I realize say waiting no go make the dream happen.",
      "Hopeful"
    ),

    createLine(
      5,
      15,
      "Amara",
      "Then keep going. We dey behind you.",
      "Supportive"
    ),

    createLine(
      5,
      16,
      "Daniel",
      "This na just the beginning.",
      "Determined"
    ),
  ];

  const sceneMap = {};

  for (const line of lines) {
    if (!sceneMap[line.sceneNumber]) {
      sceneMap[line.sceneNumber] = [];
    }

    sceneMap[line.sceneNumber].push(line);
  }

  const dialogueScenes = Object.keys(
    sceneMap
  ).map((sceneNumber) => ({
    sceneNumber: Number(sceneNumber),
    lines: sceneMap[sceneNumber],
  }));

  const estimatedDurationSec =
    lines.reduce(
      (total, line) =>
        total +
        Number(
          line?.timing?.durationSec || 0
        ),
      0
    );

  return {
    mode: "test",
    language,
    storyId: story.id,
    title: story.title,
    lines,
    scenes: dialogueScenes,
    totalLines: lines.length,
    estimatedDurationSec,
    createdAt:
      new Date().toISOString(),
  };
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function StudioBoard() {
  /* -------------------------------------------------------
     CORE PRODUCTION
  ------------------------------------------------------- */

  const [activeModule, setActiveModule] =
    useState(null);

  const [production, setProduction] =
    useState(null);

  /* -------------------------------------------------------
     IDEA
  ------------------------------------------------------- */

  const [ideaText, setIdeaText] =
    useState("");

  const [ideaStatus, setIdeaStatus] =
    useState(
      "Describe your movie, video, ad or story idea."
    );

  /* -------------------------------------------------------
     STORY
  ------------------------------------------------------- */

  const [storyStatus, setStoryStatus] =
    useState(
      "Save an IDEA first, then BOMBA can build the STORY."
    );

  const [isBuildingStory, setIsBuildingStory] =
    useState(false);

  const [storyMode, setStoryMode] =
    useState("test");

  /* -------------------------------------------------------
     CHARACTERS
  ------------------------------------------------------- */

  const [
    characterStatus,
    setCharacterStatus,
  ] = useState(
    "Characters will be created from the STORY."
  );

  const [
    characterLanguage,
    setCharacterLanguage,
  ] = useState("pcm");

  /* -------------------------------------------------------
     SCENES
  ------------------------------------------------------- */

  const [
    sceneStatus,
    setSceneStatus,
  ] = useState(
    "Build the STORY first. BOMBA will prepare the scene plan."
  );

  const [
    selectedSceneNumber,
    setSelectedSceneNumber,
  ] = useState(1);

  /* -------------------------------------------------------
     DIALOGUE
  ------------------------------------------------------- */

  const [
    dialogueStatus,
    setDialogueStatus,
  ] = useState(
    "Build the STORY and CHARACTERS first. BOMBA will prepare the dialogue."
  );

  const [
    selectedDialogueScene,
    setSelectedDialogueScene,
  ] = useState(1);

  const [
    isBuildingDialogue,
    setIsBuildingDialogue,
  ] = useState(false);

  /* -------------------------------------------------------
     VIDEO
  ------------------------------------------------------- */

  const [videoPlan, setVideoPlan] =
    useState(null);

  const [
    videoPlanStatus,
    setVideoPlanStatus,
  ] = useState("VIDEO PLAN WAITING");

  const [
    isBuildingVideoPlan,
    setIsBuildingVideoPlan,
  ] = useState(false);

  /* -------------------------------------------------------
     SOUND
  ------------------------------------------------------- */

  const [soundPrompt, setSoundPrompt] =
    useState(
      "cinematic emotional background music for a realistic movie scene"
    );

  const [soundDuration, setSoundDuration] =
    useState(5);

  const [
    generatedAudioUrl,
    setGeneratedAudioUrl,
  ] = useState("");

  const [
    isGeneratingSound,
    setIsGeneratingSound,
  ] = useState(false);

  const [
    generatedSoundStatus,
    setGeneratedSoundStatus,
  ] = useState(
    "Ready to create AI sound."
  );

  const [
    generatedSoundError,
    setGeneratedSoundError,
  ] = useState("");

  const generatedAudioRef =
    useRef(null);

  /* -------------------------------------------------------
     VOICE
  ------------------------------------------------------- */

  const [voiceText, setVoiceText] =
    useState(
      "Welcome to BOMBA AI. No stress, we go help you create your video. Just describe wetin you want, and BOMBA AI go build am."
    );

  const [voiceLanguage, setVoiceLanguage] =
    useState("pcm");

  const [voiceId, setVoiceId] =
    useState("ada_pcm");

  const [
    availableVoices,
    setAvailableVoices,
  ] = useState(CONFIRMED_VOICES.pcm);

  const [
    generatedVoiceUrl,
    setGeneratedVoiceUrl,
  ] = useState("");

  const [
    isGeneratingVoice,
    setIsGeneratingVoice,
  ] = useState(false);

  const [
    generatedVoiceStatus,
    setGeneratedVoiceStatus,
  ] = useState(
    "Ready to create AI voice."
  );

  const [
    generatedVoiceError,
    setGeneratedVoiceError,
  ] = useState("");

  const generatedVoiceRef =
    useRef(null);

  /* =======================================================
     INITIALIZE PRODUCTION
  ======================================================= */

  useEffect(() => {
    let currentProduction =
      getProduction();

    if (!currentProduction) {
      currentProduction =
        initializeProduction("");
    }

    setProduction(
      currentProduction
    );

    const savedIdea =
      currentProduction?.idea?.data
        ?.prompt || "";

    if (savedIdea) {
      setIdeaText(savedIdea);
    }

    const unsubscribe =
      subscribeToProduction(
        (nextProduction) => {
          setProduction(
            nextProduction
          );
        }
      );

    return () => {
      unsubscribe?.();
    };
  }, []);

  /* =======================================================
     SAVE IDEA
  ======================================================= */

  function saveIdeaToProduction() {
    const cleanIdea =
      ideaText.trim();

    if (!cleanIdea) {
      setIdeaStatus(
        "Please describe your idea first."
      );
      return;
    }

    try {
      const nextProduction =
        changeStage(
          "idea",
          {
            prompt: cleanIdea,
          }
        );

      setProduction(
        nextProduction
      );

      setIdeaStatus(
        "IDEA saved successfully. BOMBA is ready for the STORY."
      );

      setStoryStatus(
        "IDEA saved. Build the STORY next."
      );
    } catch (error) {
      console.error(
        "BOMBA IDEA error:",
        error
      );

      setIdeaStatus(
        error?.message ||
          "Unable to save IDEA."
      );
    }
  }

  /* =======================================================
     BUILD STORY
  ======================================================= */

  function buildTestStory() {
    const savedIdea =
      production?.idea?.data?.prompt ||
      ideaText.trim();

    if (!savedIdea) {
      setStoryStatus(
        "Save an IDEA before building the STORY."
      );
      setActiveModule("IDEA");
      return;
    }

    setIsBuildingStory(true);
    setStoryStatus(
      "BOMBA is building the test STORY..."
    );

    try {
      const result =
        createTestStoryFromIdea(
          savedIdea
        );

      const story =
        result.story;

      const characters =
        assignCharacterVoices(
          result.characters,
          characterLanguage
        );

      let nextProduction =
        changeStage(
          "story",
          {
            mode: storyMode,
            plan: story,
          }
        );

      /*
       * IMPORTANT:
       * The Production Brain automatically invalidates
       * dependent stages when STORY changes.
       */

      nextProduction =
        changeStage(
          "characters",
          {
            mode: storyMode,
            language:
              characterLanguage,
            characters,
          }
        );

      setProduction(
        nextProduction
      );

      setStoryStatus(
        "STORY built successfully."
      );

      setCharacterStatus(
        `${characters.length} characters prepared successfully.`
      );

      setSceneStatus(
        "Build DIALOGUE next, then BOMBA can prepare SCENES."
      );

      setDialogueStatus(
        "STORY and CHARACTERS are ready. Build DIALOGUE next."
      );
    } catch (error) {
      console.error(
        "BOMBA STORY error:",
        error
      );

      setStoryStatus(
        error?.message ||
          "Unable to build STORY."
      );
    } finally {
      setIsBuildingStory(false);
    }
  }

  /* =======================================================
     BUILD DIALOGUE
  ======================================================= */

  function buildTestDialogue() {
    const currentStory =
      production?.story?.data?.plan ||
      null;

    const currentCharacters =
      safeArray(
        production?.characters?.data
          ?.characters
      );

    if (!currentStory) {
      setDialogueStatus(
        "Build the STORY first."
      );
      setActiveModule("PLAN");
      return;
    }

    if (!currentCharacters.length) {
      setDialogueStatus(
        "Build CHARACTERS first."
      );
      setActiveModule(
        "CHARACTERS"
      );
      return;
    }

    setIsBuildingDialogue(true);

    setDialogueStatus(
      "BOMBA is building the dialogue..."
    );

    try {
      const dialogue =
        createTestDialogueFromStory(
          currentStory,
          currentCharacters,
          characterLanguage
        );

      const nextProduction =
        changeStage(
          "dialogue",
          {
            mode: "test",
            language:
              characterLanguage,
            plan: dialogue,
            lines:
              dialogue.lines,
          }
        );

      setProduction(
        nextProduction
      );

      setDialogueStatus(
        `${dialogue.totalLines} dialogue lines created successfully.`
      );

      setSceneStatus(
        "Dialogue is ready. BOMBA can now prepare SCENES."
      );
    } catch (error) {
      console.error(
        "BOMBA DIALOGUE error:",
        error
      );

      setDialogueStatus(
        error?.message ||
          "Unable to build dialogue."
      );
    } finally {
      setIsBuildingDialogue(false);
    }
  }

  /* =======================================================
     BUILD SCENES
  ======================================================= */

  function buildScenes() {
    const currentStory =
      production?.story?.data?.plan ||
      null;

    if (!currentStory) {
      setSceneStatus(
        "Build the STORY first."
      );
      return;
    }

    const currentScenes =
      safeArray(
        currentStory.scenes
      );

    if (!currentScenes.length) {
      setSceneStatus(
        "The STORY does not contain any scenes."
      );
      return;
    }

    try {
      const nextProduction =
        changeStage(
          "scenes",
          {
            mode:
              currentStory.mode ||
              "test",

            storyId:
              currentStory.id,

            scenes:
              currentScenes,

            totalScenes:
              currentScenes.length,

            createdAt:
              new Date().toISOString(),
          }
        );

      setProduction(
        nextProduction
      );

      setSelectedSceneNumber(
        currentScenes[0]
          ?.sceneNumber || 1
      );

      setSceneStatus(
        `${currentScenes.length} scenes prepared successfully.`
      );
    } catch (error) {
      console.error(
        "BOMBA SCENES error:",
        error
      );

      setSceneStatus(
        error?.message ||
          "Unable to prepare scenes."
      );
    }
  }

  /* =======================================================
     BUILD SHOTS
  ======================================================= */

  function buildShots() {
    const currentStory =
      production?.story?.data?.plan ||
      null;

    if (!currentStory) {
      setSceneStatus(
        "Build the STORY first."
      );
      return;
    }

    const currentShots =
      safeArray(
        currentStory.shots
      );

    if (!currentShots.length) {
      setSceneStatus(
        "The STORY does not contain any shots."
      );
      return;
    }

    try {
      const nextProduction =
        changeStage(
          "shots",
          {
            mode:
              currentStory.mode ||
              "test",

            storyId:
              currentStory.id,

            shots:
              currentShots,

            totalShots:
              currentShots.length,

            createdAt:
              new Date().toISOString(),
          }
        );

      setProduction(
        nextProduction
      );

      setSceneStatus(
        `${currentShots.length} shots prepared successfully.`
      );
    } catch (error) {
      console.error(
        "BOMBA SHOTS error:",
        error
      );

      setSceneStatus(
        error?.message ||
          "Unable to prepare shots."
      );
    }
  }

  /* =======================================================
     BUILD VIDEO PLAN
  ======================================================= */

  function buildVideoPlan() {
    const currentStory =
      production?.story?.data?.plan ||
      null;

    const currentCharacters =
      safeArray(
        production?.characters?.data
          ?.characters
      );

    const currentScenes =
      safeArray(
        production?.scenes?.data
          ?.scenes
      );

    const currentShots =
      safeArray(
        production?.shots?.data
          ?.shots
      );

    const dialogueLines =
      safeArray(
        production?.dialogue?.data
          ?.lines
      );

    if (!currentStory) {
      setVideoPlanStatus(
        "Build STORY first."
      );
      return;
    }

    if (!currentScenes.length) {
      setVideoPlanStatus(
        "Prepare SCENES before building VIDEO."
      );
      return;
    }

    if (!currentShots.length) {
      setVideoPlanStatus(
        "Prepare SHOTS before building VIDEO."
      );
      return;
    }

    setIsBuildingVideoPlan(true);

    setVideoPlanStatus(
      "BOMBA is building the VIDEO plan..."
    );

    try {
      const videoScenes =
        currentScenes.map(
          (scene) => {
            const sceneShots =
              currentShots.filter(
                (shot) =>
                  Number(
                    shot.sceneNumber
                  ) ===
                  Number(
                    scene.sceneNumber
                  )
              );

            return {
              sceneNumber:
                scene.sceneNumber,

              title:
                scene.title ||
                `Scene ${scene.sceneNumber}`,

              location:
                scene.location || "",

              time:
                scene.time || "",

              shots:
                sceneShots.map(
                  (shot) => {
                    const relatedDialogue =
                      dialogueLines.find(
                        (line) =>
                          Number(
                            line.sceneNumber
                          ) ===
                            Number(
                              shot.sceneNumber
                            ) &&
                          safeText(
                            line.characterName
                          )
                        );

                    return {
                      ...shot,

                      dialogue:
                        relatedDialogue
                          ?.text || "",

                      character:
                        shot.character ||
                        relatedDialogue
                          ?.characterName ||
                        "",
                    };
                  }
                ),
            };
          }
        );

      const nextVideoPlan = {
        mode:
          currentStory.mode ||
          "test",

        storyId:
          currentStory.id,

        title:
          currentStory.title,

        totalScenes:
          currentScenes.length,

        totalShots:
          currentShots.length,

        voiceConnected:
          Boolean(
            production?.voices?.data
          ),

        soundConnected:
          Boolean(
            production?.sound?.data
          ),

        scenes:
          videoScenes,

        createdAt:
          new Date().toISOString(),
      };

      const nextProduction =
        changeStage(
          "video",
          nextVideoPlan
        );

      setProduction(
        nextProduction
      );

      setVideoPlan(
        nextVideoPlan
      );

      setVideoPlanStatus(
        "VIDEO PLAN ready."
      );
    } catch (error) {
      console.error(
        "BOMBA VIDEO error:",
        error
      );

      setVideoPlanStatus(
        error?.message ||
          "Unable to build VIDEO plan."
      );
    } finally {
      setIsBuildingVideoPlan(false);
    }
  }

  /* =======================================================
     SOUND
  ======================================================= */

  async function generateAISound() {
    const cleanPrompt =
      soundPrompt.trim();

    if (!cleanPrompt) {
      setGeneratedSoundError(
        "Please enter a sound prompt."
      );
      return;
    }

    setIsGeneratingSound(true);
    setGeneratedSoundError("");

    setGeneratedSoundStatus(
      "Generating AI sound..."
    );

    try {
      const response =
        await fetch(
          "/api/sound/generate",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              type:
                "Background Music",

              prompt:
                cleanPrompt,

              duration:
                Number(soundDuration),
            }),
          }
        );

      const text =
        await response.text();

      let data = {};

      try {
        data = text
          ? JSON.parse(text)
          : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Sound generation failed with HTTP ${response.status}.`
        );
      }

      if (
        data?.audioUrl &&
        typeof data.audioUrl ===
          "string"
      ) {
        setGeneratedAudioUrl(
          data.audioUrl
        );

        setGeneratedSoundStatus(
          "AI sound is ready."
        );

        try {
          const nextProduction =
            changeStage(
              "sound",
              {
                type:
                  "Background Music",

                prompt:
                  cleanPrompt,

                duration:
                  Number(soundDuration),

                audioUrl:
                  data.audioUrl,

                status:
                  "completed",

                createdAt:
                  new Date().toISOString(),
              }
            );

          setProduction(
            nextProduction
          );
        } catch (storeError) {
          console.error(
            "BOMBA sound store error:",
            storeError
          );
        }

        return;
      }

      if (
        data?.status ===
          "processing"
      ) {
        setGeneratedSoundStatus(
          "Sound generation is processing. Please try again shortly."
        );
        return;
      }

      throw new Error(
        data?.error ||
          "The sound API did not return an audio URL."
      );
    } catch (error) {
      console.error(
        "BOMBA SOUND error:",
        error
      );

      setGeneratedSoundError(
        error?.message ||
          "Unable to generate sound."
      );

      setGeneratedSoundStatus(
        "Sound generation failed."
      );
    } finally {
      setIsGeneratingSound(false);
    }
  }

  function stopGeneratedSound() {
    if (generatedAudioRef.current) {
      generatedAudioRef.current.pause();

      try {
        generatedAudioRef.current.currentTime = 0;
      } catch {}

      generatedAudioRef.current =
        null;
    }
  }

  function playGeneratedSound() {
    if (!generatedAudioUrl) {
      return;
    }

    stopGeneratedSound();

    const audio =
      new Audio(
        generatedAudioUrl
      );

    generatedAudioRef.current =
      audio;

    audio.play().catch((error) => {
      console.error(
        "BOMBA sound playback error:",
        error
      );
    });
  }

  /* =======================================================
     VOICE LANGUAGE
  ======================================================= */

  useEffect(() => {
    if (activeModule !== "VOICE") {
      return;
    }

    const voices =
      CONFIRMED_VOICES[
        voiceLanguage
      ] || [];

    setAvailableVoices(
      voices
    );

    setVoiceId(
      (current) => {
        const exists =
          voices.some(
            (voice) =>
              voice.id === current
          );

        return exists
          ? current
          : voices[0]?.id || "";
      }
    );
  }, [
    activeModule,
    voiceLanguage,
  ]);

  /* =======================================================
     VOICE GENERATION
  ======================================================= */

  async function generateAIVoice() {
    const cleanText =
      voiceText.trim();

    if (!cleanText) {
      setGeneratedVoiceError(
        "Please enter text for the voice."
      );
      return;
    }

    if (!voiceId) {
      setGeneratedVoiceError(
        "Please select a voice."
      );
      return;
    }

    setIsGeneratingVoice(true);
    setGeneratedVoiceError("");

    setGeneratedVoiceStatus(
      "Generating AI voice..."
    );

    try {
      const response =
        await fetch(
          "/api/voice/generate",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              text:
                cleanText,

              voiceId,

              language:
                voiceLanguage,
            }),
          }
        );

      if (!response.ok) {
        const errorText =
          await response.text();

        let errorData = {};

        try {
          errorData =
            errorText
              ? JSON.parse(
                  errorText
                )
              : {};
        } catch {
          errorData = {};
        }

        throw new Error(
          errorData?.error ||
            errorData?.message ||
            `Voice generation failed with HTTP ${response.status}.`
        );
      }

      const audioBuffer =
        await response.arrayBuffer();

      if (!audioBuffer.byteLength) {
        throw new Error(
          "The voice API returned an empty audio response."
        );
      }

      const audioBlob =
        new Blob(
          [audioBuffer],
          {
            type: "audio/mpeg",
          }
        );

      const localUrl =
        URL.createObjectURL(
          audioBlob
        );

      setGeneratedVoiceUrl(
        localUrl
      );

      setGeneratedVoiceStatus(
        "Voice generated. Uploading to Cloudinary..."
      );

      try {
        const cloudinary =
          await uploadVoiceToCloudinary(
            audioBlob
          );

        const currentDialogueLines =
          safeArray(
            production?.dialogue
              ?.data?.lines
          );

        const matchedLine =
          currentDialogueLines.find(
            (line) =>
              safeText(
                line.text
              ).trim() ===
                cleanText &&
              line?.voice?.id ===
                voiceId
          );

        const existingVoiceLines =
          safeArray(
            production?.voices
              ?.data?.lines
          );

        const generatedVoiceLine =
          {
            id:
              matchedLine?.id ||
              makeId("voice"),

            dialogueId:
              matchedLine?.id ||
              null,

            text:
              cleanText,

            language:
              voiceLanguage,

            voiceId,

            voiceName:
              availableVoices.find(
                (voice) =>
                  voice.id ===
                  voiceId
              )?.name ||
              voiceId,

            audioUrl:
              cloudinary?.secure_url ||
              cloudinary?.url ||
              "",

            cloudinaryPublicId:
              cloudinary?.public_id ||
              "",

            resourceType:
              cloudinary?.resource_type ||
              "video",

            status:
              "completed",

            createdAt:
              new Date().toISOString(),
          };

        const filteredLines =
          existingVoiceLines.filter(
            (line) =>
              line?.id !==
              generatedVoiceLine.id
          );

        const nextProduction =
          changeStage(
            "voices",
            {
              mode: "test",

              language:
                voiceLanguage,

              lines: [
                ...filteredLines,
                generatedVoiceLine,
              ],

              latest:
                generatedVoiceLine,

              createdAt:
                new Date().toISOString(),
            }
          );

        setProduction(
          nextProduction
        );

        if (
          typeof window !==
          "undefined"
        ) {
          window.localStorage.setItem(
            "bomba_voice_public_id",
            cloudinary.public_id
          );

          window.localStorage.setItem(
            "bomba_voice_cloudinary_resource_type",
            cloudinary.resource_type ||
              "video"
          );

          window.localStorage.setItem(
            "bomba_voice_language",
            voiceLanguage
          );

          window.localStorage.setItem(
            "bomba_voice_text",
            cleanText
          );

          window.localStorage.setItem(
            "bomba_voice_id",
            voiceId
          );
        }

        setGeneratedVoiceStatus(
          "Voice is ready and saved to BOMBA."
        );
      } catch (cloudinaryError) {
        console.error(
          "Cloudinary voice upload/store error:",
          cloudinaryError
        );

        setGeneratedVoiceStatus(
          "Voice generated locally, but Cloudinary upload failed."
        );

        setGeneratedVoiceError(
          cloudinaryError?.message ||
            "Cloudinary upload failed."
        );
      }
    } catch (error) {
      console.error(
        "BOMBA VOICE error:",
        error
      );

      setGeneratedVoiceError(
        error?.message ||
          "Unable to generate AI voice."
      );

      setGeneratedVoiceStatus(
        "Voice generation failed."
      );
    } finally {
      setIsGeneratingVoice(false);
    }
  }

  function stopGeneratedVoice() {
    if (generatedVoiceRef.current) {
      generatedVoiceRef.current.pause();

      try {
        generatedVoiceRef.current.currentTime = 0;
      } catch {}

      generatedVoiceRef.current =
        null;
    }
  }

  function playGeneratedVoice() {
    if (!generatedVoiceUrl) {
      return;
    }

    stopGeneratedVoice();

    const audio =
      new Audio(
        generatedVoiceUrl
      );

    generatedVoiceRef.current =
      audio;

    audio.play().catch((error) => {
      console.error(
        "BOMBA voice playback error:",
        error
      );
    });
  }

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      stopGeneratedSound();
      stopGeneratedVoice();
    };
  }, []);

  /* =======================================================
     DERIVED PRODUCTION DATA
  ======================================================= */

  const story =
    production?.story?.data?.plan ||
    null;

  const characters =
    safeArray(
      production?.characters?.data
        ?.characters
    );

  const scenes =
    safeArray(
      production?.story?.data?.plan
        ?.scenes
    );

  const shots =
    safeArray(
      production?.story?.data?.plan
        ?.shots
    );

  const dialoguePlan =
    production?.dialogue?.data
      ?.plan || null;

  const dialogueScenes =
    safeArray(
      dialoguePlan?.scenes
    );

  const selectedScene =
    scenes.find(
      (scene) =>
        Number(
          scene?.sceneNumber
        ) ===
        Number(
          selectedSceneNumber
        )
    ) ||
    scenes[0] ||
    null;

  const selectedSceneShots =
    shots.filter(
      (shot) =>
        Number(
          shot?.sceneNumber
        ) ===
        Number(
          selectedScene
            ?.sceneNumber
        )
    );

  const selectedDialogueSceneData =
    dialogueScenes.find(
      (scene) =>
        Number(
          scene?.sceneNumber
        ) ===
        Number(
          selectedDialogueScene
        )
    ) ||
    dialogueScenes[0] ||
    null;

  /* =======================================================
     STATUS
  ======================================================= */

  function getModuleStatus(
    moduleName
  ) {
    switch (moduleName) {
      case "IDEA":
        return production?.idea
          ?.status === "ready" ||
          production?.idea
            ?.status === "completed"
          ? "ready"
          : "waiting";

      case "PLAN":
        return production?.story
          ?.status === "ready" ||
          production?.story
            ?.status === "completed"
          ? "ready"
          : "waiting";

      case "CHARACTERS":
        return characters.length
          ? "ready"
          : "waiting";

      case "SCENES":
        return production?.scenes
          ?.status === "ready" ||
          production?.scenes
            ?.status === "completed"
          ? "ready"
          : scenes.length
            ? "planned"
            : "waiting";

      case "DIALOGUE":
        return production?.dialogue
          ?.status === "ready" ||
          production?.dialogue
            ?.status === "completed"
          ? "ready"
          : "waiting";

      case "VOICE":
        return production?.voices
          ?.status === "ready" ||
          production?.voices
            ?.status === "completed"
          ? "ready"
          : availableVoices.length
            ? "planned"
            : "waiting";

      case "VIDEO":
        return production?.video
          ?.status === "ready" ||
          production?.video
            ?.status === "completed"
          ? "ready"
          : "waiting";

      case "SOUND":
        return production?.sound
          ?.status === "ready" ||
          production?.sound
            ?.status === "completed"
          ? "ready"
          : generatedAudioUrl
            ? "ready"
            : "waiting";

      default:
        return "waiting";
    }
  }

  function getModuleSignal(
    moduleName
  ) {
    const status =
      getModuleStatus(
        moduleName
      );

    if (status === "ready") {
      return "READY";
    }

    if (status === "planned") {
      return "PLANNED";
    }

    return "WAITING";
  }

  /* =======================================================
     PLAN SAVE
  ======================================================= */

  function savePlan(plan) {
    if (!plan) {
      return;
    }

    const currentIdea =
      production?.idea?.data
        ?.prompt ||
      ideaText.trim();

    try {
      const nextProduction =
        changeStage(
          "story",
          {
            mode: "manual",

            plan: {
              ...(story || {}),
              ...plan,

              id:
                story?.id ||
                makeId("story"),

              title:
                story?.title ||
                "BOMBA AI Story",

              createdAt:
                story?.createdAt ||
                new Date().toISOString(),
            },

            idea:
              currentIdea,
          }
        );

      setProduction(
        nextProduction
      );

      setStoryStatus(
        "PLAN saved successfully."
      );
    } catch (error) {
      console.error(
        "BOMBA PLAN error:",
        error
      );

      setStoryStatus(
        error?.message ||
          "Unable to save PLAN."
      );
    }
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <section className="w-full text-white">
      {/* HEADER */}

      <div className="mb-8">
        <div className="mb-2 text-xs font-semibold tracking-[0.3em] text-yellow-400">
          BOMBA AI
        </div>

        <h1 className="text-3xl font-black">
          VIDEO PRODUCTION
        </h1>

        <p className="mt-2 text-sm text-white/50">
          Build your production from IDEA
          to final video.
        </p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-400/5 px-3 py-1.5 text-xs text-green-300">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          Production Brain connected
        </div>
      </div>

      {/* MODULE GRID */}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {modules.map((module) => (
          <button
            key={module.name}
            type="button"
            onClick={() =>
              setActiveModule(
                module.name
              )
            }
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-yellow-400/40 hover:bg-white/[0.07]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/30">
                {module.number}
              </span>

              <span className="text-lg">
                {module.icon}
              </span>
            </div>

            <div className="mt-3 text-xs font-bold tracking-wider">
              {module.name}
            </div>

            <div className="mt-2 text-[10px] text-white/40">
              {getModuleSignal(
                module.name
              )}
            </div>
          </button>
        ))}
      </div>

      {/* ===================================================
          IDEA
      =================================================== */}

      {activeModule === "IDEA" && (
        <div className="mt-8 rounded-3xl border border-white/10 bg-black/40 p-5">
          <div className="mb-6">
            <div className="text-xs font-semibold tracking-[0.25em] text-yellow-400">
              MODULE 01
            </div>

            <h2 className="mt-2 text-2xl font-bold">
              IDEA
            </h2>

            <p className="mt-2 text-sm text-white/50">
              Start with the idea for your
              movie, video, advert or story.
            </p>
          </div>

          <textarea
            value={ideaText}
            onChange={(event) =>
              setIdeaText(
                event.target.value
              )
            }
            placeholder="Describe your movie, video, ad or story idea..."
            rows={7}
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-yellow-400/50"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={
                saveIdeaToProduction
              }
              className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-yellow-300"
            >
              SAVE IDEA
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveModule(null)
              }
              className="rounded-xl border border-white/10 px-5 py-3 text-sm text-white/60 hover:bg-white/5"
            >
              CLOSE
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
            {ideaStatus}
          </div>
        </div>
      )}

      {/* ===================================================
          PLAN
      =================================================== */}

      {activeModule === "PLAN" && (
        <div className="mt-8 rounded-3xl border border-white/10 bg-black/40 p-5">
          <div className="mb-6">
            <div className="text-xs font-semibold tracking-[0.25em] text-yellow-400">
              MODULE 02
            </div>

            <h2 className="mt-2 text-2xl font-bold">
              PLAN
            </h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Idea
              </label>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/60">
                {ideaText ||
                  "Save an IDEA first."}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Story
              </label>

              <textarea
                defaultValue={
                  story?.beginning || ""
                }
                onChange={(event) =>
                  savePlan({
                    beginning:
                      event.target.value,
                  })
                }
                placeholder="Describe what happens in the story..."
                rows={4}
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm outline-none placeholder:text-white/30 focus:border-yellow-400/50"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Characters
              </label>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                {characters.length
                  ? characters
                      .map(
                        (character) =>
                          character.name
                      )
                      .join(", ")
                  : "Characters will appear here after STORY generation."}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Scenes
              </label>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                {scenes.length
                  ? `${scenes.length} scenes prepared.`
                  : "Scenes will be prepared after the STORY."}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Shots
              </label>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                {shots.length
                  ? `${shots.length} shots prepared.`
                  : "Shots will be prepared from the STORY."}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={
                buildTestStory
              }
              disabled={
                isBuildingStory
              }
              className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black disabled:opacity-50"
            >
              {isBuildingStory
                ? "BUILDING..."
                : "BUILD TEST STORY"}
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveModule(null)
              }
              className="rounded-xl border border-white/10 px-5 py-3 text-sm text-white/60"
            >
              CLOSE
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
            {storyStatus}
          </div>
        </div>
      )}

      {/* ===================================================
          CHARACTERS
      =================================================== */}

      {activeModule ===
        "CHARACTERS" && (
        <div className="mt-8 rounded-3xl border border-white/10 bg-black/40 p-5">
          <div className="mb-6">
            <div className="text-xs font-semibold tracking-[0.25em] text-yellow-400">
              MODULE 03
            </div>

            <h2 className="mt-2 text-2xl font-bold">
              CHARACTERS
            </h2>
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold">
              Voice Language
            </label>

            <select
              value={
                characterLanguage
              }
              onChange={(event) => {
                const language =
                  event.target.value;

                setCharacterLanguage(
                  language
                );
              }}
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none"
            >
              <option value="pcm">
                Nigerian Pidgin
              </option>

              <option value="yo">
                Yoruba
              </option>

              <option value="ig">
                Igbo
              </option>

              <option value="ha">
                Hausa
              </option>
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {characters.length ? (
              characters.map(
                (character) => (
                  <div
                    key={
                      character.id ||
                      character.name
                    }
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold">
                          {character.name}
                        </div>

                        <div className="mt-1 text-xs text-white/40">
                          {character.role}
                        </div>
                      </div>

                      <span className="text-xl">
                        👤
                      </span>
                    </div>

                    <div className="mt-4 text-xs text-white/50">
                      Voice:{" "}
                      {character.voiceName ||
                        "Reserved"}
                    </div>

                    <div className="mt-1 text-xs text-white/40">
                      {character.voiceStatus ||
                        "reserved"}
                    </div>
                  </div>
                )
              )
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/50 md:col-span-2">
                Build the STORY first.
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={
                buildTestStory
              }
              disabled={
                isBuildingStory
              }
              className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black disabled:opacity-50"
            >
              {isBuildingStory
                ? "BUILDING..."
                : "REFRESH CHARACTERS"}
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveModule(null)
              }
              className="rounded-xl border border-white/10 px-5 py-3 text-sm text-white/60"
            >
              CLOSE
            </button>
          </div>

          <div className="mt-4 text-sm text-white/50">
            {characterStatus}
          </div>
        </div>
      )}

      {/* ===================================================
          SCENES
      =================================================== */}

      {activeModule === "SCENES" && (
        <div className="mt-8 rounded-3xl border border-white/10 bg-black/40 p-5">
          <div className="mb-6">
            <div className="text-xs font-semibold tracking-[0.25em] text-yellow-400">
              MODULE 04
            </div>

            <h2 className="mt-2 text-2xl font-bold">
              SCENE SYSTEM
            </h2>
          </div>

          <div className="mb-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={
                buildScenes
              }
              disabled={
                !story ||
                !scenes.length
              }
              className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black disabled:opacity-40"
            >
              PREPARE SCENES
            </button>

            <button
              type="button"
              onClick={
                buildShots
              }
              disabled={
                !scenes.length ||
                !shots.length
              }
              className="rounded-xl border border-yellow-400/30 px-5 py-3 text-sm font-bold text-yellow-300 disabled:opacity-40"
            >
              PREPARE SHOTS
            </button>
          </div>

          <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
            <div className="space-y-2">
              {scenes.map(
                (scene) => (
                  <button
                    key={
                      scene.sceneNumber
                    }
                    type="button"
                    onClick={() =>
                      setSelectedSceneNumber(
                        scene.sceneNumber
                      )
                    }
                    className={`w-full rounded-xl border p-3 text-left ${
                      Number(
                        selectedSceneNumber
                      ) ===
                      Number(
                        scene.sceneNumber
                      )
                        ? "border-yellow-400/50 bg-yellow-400/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="text-xs text-white/30">
                      SCENE{" "}
                      {
                        scene.sceneNumber
                      }
                    </div>

                    <div className="mt-1 text-sm font-bold">
                      {scene.title}
                    </div>
                  </button>
                )
              )}
            </div>

            <div>
              {selectedScene ? (
                <>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="text-xl font-bold">
                      {
                        selectedScene.title
                      }
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-white/50 sm:grid-cols-2">
                      <div>
                        Location:{" "}
                        {
                          selectedScene.location
                        }
                      </div>

                      <div>
                        Time:{" "}
                        {
                          selectedScene.time
                        }
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-white/60">
                      {
                        selectedScene.description
                      }
                    </p>

                    <div className="mt-3 text-xs text-yellow-400">
                      Purpose:{" "}
                      {
                        selectedScene.purpose
                      }
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {selectedSceneShots.map(
                      (shot) => (
                        <div
                          key={
                            shot.shotNumber
                          }
                          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-bold text-yellow-400">
                              SHOT{" "}
                              {
                                shot.shotNumber
                              }
                            </div>

                            <div className="text-xs text-white/30">
                              {
                                shot.shotType
                              }
                            </div>
                          </div>

                          <p className="mt-3 text-sm text-white/70">
                            {
                              shot.description
                            }
                          </p>

                          <div className="mt-3 text-xs text-white/40">
                            Camera:{" "}
                            {
                              shot.camera
                            }
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/50">
                  Build the STORY first.
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 text-sm text-white/50">
            {sceneStatus}
          </div>
        </div>
      )}

      {/* ===================================================
          DIALOGUE
      =================================================== */}

      {activeModule ===
        "DIALOGUE" && (
        <div className="mt-8 rounded-3xl border border-white/10 bg-black/40 p-5">
          <div className="mb-6">
            <div className="text-xs font-semibold tracking-[0.25em] text-yellow-400">
              MODULE 05
            </div>

            <h2 className="mt-2 text-2xl font-bold">
              DIALOGUE SYSTEM
            </h2>
          </div>

          <button
            type="button"
            onClick={
              buildTestDialogue
            }
            disabled={
              isBuildingDialogue ||
              !story ||
              !characters.length
            }
            className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black disabled:opacity-40"
          >
            {isBuildingDialogue
              ? "BUILDING..."
              : "BUILD TEST DIALOGUE"}
          </button>

          {dialogueScenes.length >
            0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {dialogueScenes.map(
                (scene) => (
                  <button
                    key={
                      scene.sceneNumber
                    }
                    type="button"
                    onClick={() =>
                      setSelectedDialogueScene(
                        scene.sceneNumber
                      )
                    }
                    className={`rounded-lg px-3 py-2 text-xs ${
                      Number(
                        selectedDialogueScene
                      ) ===
                      Number(
                        scene.sceneNumber
                      )
                        ? "bg-yellow-400 text-black"
                        : "bg-white/5 text-white/60"
                    }`}
                  >
                    Scene{" "}
                    {
                      scene.sceneNumber
                    }
                  </button>
                )
              )}
            </div>
          )}

          <div className="mt-6 space-y-3">
            {safeArray(
              selectedDialogueSceneData
                ?.lines
            ).map((line) => (
              <div
                key={
                  line.id ||
                  makeId("line")
                }
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold">
                    {
                      line.characterName
                    }
                  </div>

                  <div className="text-xs text-yellow-400">
                    {
                      line.emotion
                    }
                  </div>
                </div>

                <p className="mt-3 text-sm leading-6 text-white/70">
                  {line.text}
                </p>

                <div className="mt-3 text-xs text-white/40">
                  Voice:{" "}
                  {
                    line.voice
                      ?.name
                  }{" "}
                  ·{" "}
                  {
                    line.voice
                      ?.status
                  }
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 text-sm text-white/50">
            {dialogueStatus}
          </div>
        </div>
      )}

      {/* ===================================================
          VOICE
      =================================================== */}

      {activeModule === "VOICE" && (
        <div className="mt-8 rounded-3xl border border-white/10 bg-black/40 p-5">
          <div className="mb-6">
            <div className="text-xs font-semibold tracking-[0.25em] text-yellow-400">
              MODULE 06
            </div>

            <h2 className="mt-2 text-2xl font-bold">
              VOICE STUDIO
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Language
              </label>

              <select
                value={
                  voiceLanguage
                }
                onChange={(event) =>
                  setVoiceLanguage(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none"
              >
                <option value="pcm">
                  Nigerian Pidgin
                </option>

                <option value="ig">
                  Igbo
                </option>

                <option value="yo">
                  Yoruba
                </option>

                <option value="ha">
                  Hausa
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Voice
              </label>

              <select
                value={voiceId}
                onChange={(event) =>
                  setVoiceId(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none"
              >
                {availableVoices.map(
                  (voice) => (
                    <option
                      key={voice.id}
                      value={voice.id}
                    >
                      {voice.name} —{" "}
                      {voice.gender}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <textarea
            value={voiceText}
            onChange={(event) =>
              setVoiceText(
                event.target.value
              )
            }
            rows={7}
            placeholder="Enter the text you want BOMBA to speak..."
            className="mt-5 w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm outline-none placeholder:text-white/30 focus:border-yellow-400/50"
          />

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={
                generateAIVoice
              }
              disabled={
                isGeneratingVoice
              }
              className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black disabled:opacity-40"
            >
              {isGeneratingVoice
                ? "GENERATING..."
                : "GENERATE AI VOICE"}
            </button>

            <button
              type="button"
              onClick={
                playGeneratedVoice
              }
              disabled={
                !generatedVoiceUrl
              }
              className="rounded-xl border border-white/10 px-5 py-3 text-sm disabled:opacity-30"
            >
              ▶ PLAY
            </button>

            <button
              type="button"
              onClick={() => {
                stopGeneratedVoice();
                setActiveModule(
                  null
                );
              }}
              className="rounded-xl border border-white/10 px-5 py-3 text-sm text-white/60"
            >
              CLOSE
            </button>
          </div>

          {generatedVoiceUrl && (
            <audio
              controls
              preload="metadata"
              src={
                generatedVoiceUrl
              }
              className="mt-5 w-full"
              onPlay={(event) => {
                generatedVoiceRef.current =
                  event.currentTarget;
              }}
            />
          )}

          <div className="mt-4 text-sm text-white/50">
            {generatedVoiceStatus}
          </div>

          {generatedVoiceError && (
            <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300">
              {
                generatedVoiceError
              }
            </div>
          )}
        </div>
      )}

      {/* ===================================================
          VIDEO
      =================================================== */}

      {activeModule === "VIDEO" && (
        <div className="mt-8 rounded-3xl border border-white/10 bg-black/40 p-5">
          <div className="mb-6">
            <div className="text-xs font-semibold tracking-[0.25em] text-yellow-400">
              MODULE 07
            </div>

            <h2 className="mt-2 text-2xl font-bold">
              VIDEO PRODUCTION
            </h2>
          </div>

          <button
            type="button"
            onClick={
              buildVideoPlan
            }
            disabled={
              isBuildingVideoPlan ||
              !story ||
              !scenes.length
            }
            className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black disabled:opacity-40"
          >
            {isBuildingVideoPlan
              ? "BUILDING..."
              : "BUILD VIDEO PLAN"}
          </button>

          <div className="mt-4 text-sm text-white/50">
            {videoPlanStatus}
          </div>

          {videoPlan && (
            <div className="mt-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/40">
                    SCENES
                  </div>

                  <div className="mt-2 text-2xl font-bold">
                    {
                      videoPlan.totalScenes
                    }
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/40">
                    SHOTS
                  </div>

                  <div className="mt-2 text-2xl font-bold">
                    {
                      videoPlan.totalShots
                    }
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/40">
                    CONNECTIONS
                  </div>

                  <div className="mt-2 text-xs text-white/60">
                    Voice:{" "}
                    {videoPlan.voiceConnected
                      ? "Connected"
                      : "Waiting"}
                    <br />
                    Sound:{" "}
                    {videoPlan.soundConnected
                      ? "Connected"
                      : "Waiting"}
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {safeArray(
                  videoPlan.scenes
                ).map(
                  (videoScene) => (
                    <div
                      key={
                        videoScene.sceneNumber
                      }
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="font-bold">
                        Scene{" "}
                        {
                          videoScene.sceneNumber
                        }{" "}
                        —{" "}
                        {
                          videoScene.title
                        }
                      </div>

                      <div className="mt-3 space-y-2">
                        {safeArray(
                          videoScene.shots
                        ).map(
                          (shot) => (
                            <div
                              key={
                                shot.id ||
                                shot.shotNumber
                              }
                              className="rounded-xl border border-white/10 bg-black/20 p-3"
                            >
                              <div className="flex justify-between">
                                <span className="text-xs font-bold text-yellow-400">
                                  SHOT{" "}
                                  {
                                    shot.shotNumber
                                  }
                                </span>

                                <span className="text-xs text-white/30">
                                  {
                                    shot.shotType
                                  }
                                </span>
                              </div>

                              <p className="mt-2 text-sm text-white/60">
                                {
                                  shot.description
                                }
                              </p>

                              <div className="mt-2 text-xs text-white/40">
                                Camera:{" "}
                                {
                                  shot.camera
                                }
                              </div>

                              {shot.character && (
                                <div className="mt-1 text-xs text-white/40">
                                  Character:{" "}
                                  {
                                    shot.character
                                  }
                                </div>
                              )}

                              {shot.dialogue && (
                                <div className="mt-2 text-xs text-white/50">
                                  Dialogue:{" "}
                                  {
                                    shot.dialogue
                                  }
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================
          SOUND
      =================================================== */}

      {activeModule === "SOUND" && (
        <div className="mt-8 rounded-3xl border border-white/10 bg-black/40 p-5">
          <div className="mb-6">
            <div className="text-xs font-semibold tracking-[0.25em] text-yellow-400">
              MODULE 08
            </div>

            <h2 className="mt-2 text-2xl font-bold">
              SOUND STUDIO
            </h2>
          </div>

          <textarea
            value={soundPrompt}
            onChange={(event) =>
              setSoundPrompt(
                event.target.value
              )
            }
            rows={5}
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm outline-none placeholder:text-white/30 focus:border-yellow-400/50"
          />

          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold">
              Duration
            </label>

            <select
              value={soundDuration}
              onChange={(event) =>
                setSoundDuration(
                  Number(
                    event.target.value
                  )
                )
              }
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm"
            >
              <option value={5}>
                5 seconds
              </option>

              <option value={10}>
                10 seconds
              </option>

              <option value={15}>
                15 seconds
              </option>

              <option value={30}>
                30 seconds
              </option>
            </select>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={
                generateAISound
              }
              disabled={
                isGeneratingSound
              }
              className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black disabled:opacity-40"
            >
              {isGeneratingSound
                ? "GENERATING..."
                : "GENERATE AI SOUND"}
            </button>

            <button
              type="button"
              onClick={
                playGeneratedSound
              }
              disabled={
                !generatedAudioUrl
              }
              className="rounded-xl border border-white/10 px-5 py-3 text-sm disabled:opacity-30"
            >
              ▶ PLAY
            </button>

            <button
              type="button"
              onClick={() => {
                stopGeneratedSound();
                setActiveModule(
                  null
                );
              }}
              className="rounded-xl border border-white/10 px-5 py-3 text-sm text-white/60"
            >
              CLOSE
            </button>
          </div>

          {generatedAudioUrl && (
            <audio
              ref={
                generatedAudioRef
              }
              controls
              preload="metadata"
              src={
                generatedAudioUrl
              }
              className="mt-5 w-full"
            />
          )}

          <div className="mt-4 text-sm text-white/50">
            {
              generatedSoundStatus
            }
          </div>

          {generatedSoundError && (
            <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300">
              {
                generatedSoundError
              }
            </div>
          )}
        </div>
      )}

      {/* ===================================================
          TIMELINE
      =================================================== */}

      {activeModule ===
        "TIMELINE" && (
        <div className="mt-8 rounded-3xl border border-white/10 bg-black/40 p-6">
          <div className="text-xs font-semibold tracking-[0.25em] text-yellow-400">
            MODULE 09
          </div>

          <h2 className="mt-2 text-2xl font-bold">
            TIMELINE
          </h2>

          <p className="mt-3 text-sm leading-6 text-white/50">
            Timeline will connect VIDEO,
            VOICES and SOUND.
          </p>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/50">
            Production Brain dependency:
            VIDEO + VOICES + SOUND →
            TIMELINE
          </div>
        </div>
      )}

      {/* ===================================================
          PREVIEW
      =================================================== */}

      {activeModule ===
        "PREVIEW" && (
        <div className="mt-8 rounded-3xl border border-white/10 bg-black/40 p-6">
          <div className="text-xs font-semibold tracking-[0.25em] text-yellow-400">
            MODULE 10
          </div>

          <h2 className="mt-2 text-2xl font-bold">
            PREVIEW
          </h2>

          <div className="mt-5 aspect-video rounded-2xl border border-white/10 bg-black flex items-center justify-center">
            <div className="text-sm text-white/30">
              Preview will appear here
              after TIMELINE generation.
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          EXPORT
      =================================================== */}

      {activeModule ===
        "EXPORT" && (
        <div className="mt-8 rounded-3xl border border-white/10 bg-black/40 p-6">
          <div className="text-xs font-semibold tracking-[0.25em] text-yellow-400">
            MODULE 11
          </div>

          <h2 className="mt-2 text-2xl font-bold">
            EXPORT
          </h2>

          <p className="mt-3 text-sm leading-6 text-white/50">
            Export becomes available after
            PREVIEW and TIMELINE are
            completed.
          </p>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/50">
            Production Brain dependency:
            PREVIEW + TIMELINE →
            EXPORT
          </div>
        </div>
      )}
    </section>
  );
}