"use client";

import { useEffect, useRef, useState } from "react";

import {
  initializeProduction,
  getProduction,
  subscribeToProduction,
  changeStage,
} from "../../../lib/bomba/productionStore";

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

async function uploadVoiceToCloudinary(audioBlob) {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error("Cloudinary Cloud Name is not configured.");
  }

  const uploadUrl =
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      CLOUDINARY_CLOUD_NAME
    )}/video/upload`;

  const formData = new FormData();

  formData.append("file", audioBlob, "bomba-voice.mp3");
  formData.append("upload_preset", CLOUDINARY_VOICE_PRESET);

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
   BOMBA TEST STORY ENGINE
   No OpenAI call.
========================================================= */

function createTestStoryFromIdea(idea) {
  const cleanIdea = idea.trim();

  const characters = [
    {
      id: "character-001",
      name: "Daniel",
      role: "Main Character",
      gender: "Male",
      description:
        "A determined young man trying to turn his idea into a successful reality.",
      goal: "Prove that his idea can work.",
      conflict:
        "Limited resources and pressure from people around him.",
      voiceSlot: "VOICE_A",
    },
    {
      id: "character-002",
      name: "Sarah",
      role: "Support Character",
      gender: "Female",
      description:
        "A close friend who believes in Daniel and challenges his decisions.",
      goal: "Help Daniel make the right choices.",
      conflict:
        "She worries that Daniel is taking too many risks.",
      voiceSlot: "VOICE_B",
    },
    {
      id: "character-003",
      name: "Michael",
      role: "Rival",
      gender: "Male",
      description:
        "A confident competitor who wants to succeed using his own approach.",
      goal: "Beat Daniel and prove himself.",
      conflict:
        "His ambition creates tension between the characters.",
      voiceSlot: "VOICE_C",
    },
    {
      id: "character-004",
      name: "Amara",
      role: "Friend",
      gender: "Female",
      description:
        "A practical friend who helps the group see another solution.",
      goal: "Keep the team focused.",
      conflict:
        "She must decide when to challenge the others.",
      voiceSlot: "VOICE_D",
    },
    {
      id: "character-005",
      name: "Chief Okoro",
      role: "Mentor",
      gender: "Male",
      description:
        "An experienced older mentor who gives the characters important advice.",
      goal: "Help the younger generation avoid unnecessary mistakes.",
      conflict:
        "The younger characters do not always listen to his warnings.",
      voiceSlot: "VOICE_E",
    },
  ];

  const story = {
    id: `test-story-${Date.now()}`,
    mode: "test",
    title: "The Idea That Could Change Everything",
    logline:
      `A young creator fights to turn this idea into reality: ${cleanIdea}`,
    genre: "Drama / Inspirational",
    setting: "Modern Nigeria",
    beginning:
      `The story begins with Daniel deciding to act on the idea: ${cleanIdea}`,
    middle:
      "The plan becomes more difficult than expected. Pressure, doubt and competition force the characters to make important decisions.",
    conflict:
      "Daniel must overcome limited resources, pressure and opposition while keeping the original vision alive.",
    turningPoint:
      "The characters discover that working together gives them a better chance of succeeding.",
    ending:
      "The group takes one final step forward, turning the original idea into a real opportunity.",
    themes: [
      "Courage",
      "Persistence",
      "Friendship",
      "Opportunity",
      "Teamwork",
    ],
    characters,
    scenes: [
      {
        sceneNumber: 1,
        title: "The Idea",
        location: "Daniel's workspace",
        time: "Morning",
        description:
          "Daniel explains the idea and decides to take the first step.",
        purpose: "Introduce the main character and central idea.",
      },
      {
        sceneNumber: 2,
        title: "The Challenge",
        location: "A busy Nigerian city",
        time: "Afternoon",
        description:
          "The first major problem appears and the plan becomes difficult.",
        purpose: "Introduce the central conflict.",
      },
      {
        sceneNumber: 3,
        title: "The Team",
        location: "Small meeting space",
        time: "Evening",
        description:
          "Daniel, Sarah, Michael and Amara discuss possible solutions.",
        purpose: "Develop character relationships.",
      },
      {
        sceneNumber: 4,
        title: "The Warning",
        location: "Quiet outdoor location",
        time: "Night",
        description:
          "Chief Okoro gives the group advice before their biggest decision.",
        purpose: "Create the turning point.",
      },
      {
        sceneNumber: 5,
        title: "The Decision",
        location: "The project location",
        time: "Morning",
        description:
          "The characters act together and take the next major step.",
        purpose: "Move the story toward resolution.",
      },
    ],
    shots: [
      {
        shotNumber: 1,
        sceneNumber: 1,
        shotType: "Wide Shot",
        camera: "Slow cinematic push-in",
        description:
          "Show Daniel in his workspace before moving closer to him.",
      },
      {
        shotNumber: 2,
        sceneNumber: 1,
        shotType: "Medium Shot",
        camera: "Eye-level",
        description:
          "Daniel studies his plan and prepares to act.",
      },
      {
        shotNumber: 3,
        sceneNumber: 2,
        shotType: "Tracking Shot",
        camera: "Smooth forward movement",
        description:
          "Follow Daniel as he faces the first challenge.",
      },
      {
        shotNumber: 4,
        sceneNumber: 3,
        shotType: "Group Shot",
        camera: "Slow side movement",
        description:
          "Show the characters discussing the problem together.",
      },
      {
        shotNumber: 5,
        sceneNumber: 4,
        shotType: "Close-Up",
        camera: "Slow push-in",
        description:
          "Focus on Chief Okoro while he gives his warning.",
      },
      {
        shotNumber: 6,
        sceneNumber: 5,
        shotType: "Wide Cinematic Shot",
        camera: "Slow crane movement",
        description:
          "Show the group taking the final step together.",
      },
    ],
  };

  return story;
}

/* =========================================================
   VOICE SLOT ASSIGNMENT
========================================================= */

function assignCharacterVoices(characters, language) {
  const providerVoices =
    CONFIRMED_VOICES[language] || [];

  return characters.map((character, index) => {
    const providerVoice =
      providerVoices[index] || null;

    return {
      ...character,
      voice: {
        slot:
          character.voiceSlot ||
          `VOICE_${String.fromCharCode(65 + index)}`,
        voiceId:
          providerVoice?.id || null,
        voiceName:
          providerVoice?.name ||
          `Reserved Voice ${index + 1}`,
        language,
        provider: providerVoice
          ? "9jaLingo"
          : "pending_provider_voice",
        status: providerVoice
          ? "ready"
          : "reserved",
      },
    };
  });
}

/* =========================================================
   BOMBA TEST DIALOGUE ENGINE
   No OpenAI call.

   This creates structured dialogue from:
   STORY + CHARACTERS + SCENES.

   Each dialogue line carries:
   - scene
   - character
   - voice assignment
   - language
   - estimated duration
========================================================= */

function createTestDialogueFromStory(
  story,
  characters,
  language
) {
  if (!story) {
    throw new Error(
      "Story is required before building dialogue."
    );
  }

  if (!characters?.length) {
    throw new Error(
      "Characters are required before building dialogue."
    );
  }

  const characterMap = {};

  for (const character of characters) {
    characterMap[character.name] =
      character;
  }

  const getCharacter = (name) => {
    const character =
      characterMap[name];

    if (!character) {
      throw new Error(
        `Character "${name}" was not found.`
      );
    }

    return character;
  };

  const createLine = (
    sceneNumber,
    lineNumber,
    characterName,
    text,
    emotion = "natural"
  ) => {
    const character =
      getCharacter(characterName);

    const wordCount =
      text
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;

    const durationEstimateSec =
      Math.max(
        1,
        Number(
          (wordCount / 2.5).toFixed(1)
        )
      );

    return {
      id: `dialogue-${sceneNumber}-${lineNumber}`,
      sceneNumber,
      lineNumber,
      characterId: character.id,
      characterName: character.name,
      role: character.role,
      text,
      language,
      emotion,
      voice: {
        slot:
          character.voice?.slot ||
          character.voiceSlot ||
          null,
        voiceId:
          character.voice?.voiceId ||
          null,
        voiceName:
          character.voice?.voiceName ||
          null,
        status:
          character.voice?.status ||
          "reserved",
      },
      timing: {
        durationEstimateSec,
      },
      audio: {
        status: "pending",
        url: null,
        publicId: null,
      },
    };
  };

  const dialogue = [
    createLine(
      1,
      1,
      "Daniel",
      "I don think say this idea fit work, but I no wan give up.",
      "determined"
    ),
    createLine(
      1,
      2,
      "Sarah",
      "Then make you start small. You no need everything before you begin.",
      "encouraging"
    ),
    createLine(
      1,
      3,
      "Daniel",
      "Na true. If I no start now, I fit regret am later.",
      "hopeful"
    ),

    createLine(
      2,
      1,
      "Daniel",
      "This thing harder pass wetin I expect.",
      "worried"
    ),
    createLine(
      2,
      2,
      "Michael",
      "I tell you. Big dreams need more than just talking.",
      "challenging"
    ),
    createLine(
      2,
      3,
      "Daniel",
      "Maybe. But I still believe say we fit make am work.",
      "determined"
    ),

    createLine(
      3,
      1,
      "Daniel",
      "Make we sit down and find another way forward.",
      "focused"
    ),
    createLine(
      3,
      2,
      "Sarah",
      "I fit help with the plan. We just need everybody to cooperate.",
      "supportive"
    ),
    createLine(
      3,
      3,
      "Michael",
      "Maybe I too dey look at this thing from only my own side.",
      "reflective"
    ),
    createLine(
      3,
      4,
      "Amara",
      "Then make we work together. That one fit change everything.",
      "optimistic"
    ),

    createLine(
      4,
      1,
      "Chief Okoro",
      "Young people, sometimes the biggest problem no be lack of money. Na fear.",
      "wise"
    ),
    createLine(
      4,
      2,
      "Daniel",
      "So you think say we should continue?",
      "uncertain"
    ),
    createLine(
      4,
      3,
      "Chief Okoro",
      "If the purpose is good, take the next step and learn as you go.",
      "encouraging"
    ),

    createLine(
      5,
      1,
      "Daniel",
      "Okay. This time, we move together.",
      "confident"
    ),
    createLine(
      5,
      2,
      "Sarah",
      "Yes. No more waiting.",
      "determined"
    ),
    createLine(
      5,
      3,
      "Amara",
      "Everybody ready?",
      "excited"
    ),
    createLine(
      5,
      4,
      "Daniel",
      "Let's do am.",
      "confident"
    ),
  ];

  const scenes = story.scenes || [];

  const sceneDialogue = scenes.map(
    (scene) => {
      const lines =
        dialogue.filter(
          (line) =>
            Number(line.sceneNumber) ===
            Number(scene.sceneNumber)
        );

      const totalDuration =
        lines.reduce(
          (total, line) =>
            total +
            Number(
              line.timing
                ?.durationEstimateSec ||
                0
            ),
          0
        );

      return {
        sceneNumber:
          scene.sceneNumber,
        title: scene.title,
        location: scene.location,
        time: scene.time,
        lines,
        estimatedDialogueDurationSec:
          Number(
            totalDuration.toFixed(1)
          ),
      };
    }
  );

  const totalDuration =
    dialogue.reduce(
      (total, line) =>
        total +
        Number(
          line.timing
            ?.durationEstimateSec ||
            0
        ),
      0
    );

  return {
    mode: "test",
    language,
    storyId: story.id,
    title: story.title,
    lines: dialogue,
    scenes: sceneDialogue,
    totalLines: dialogue.length,
    estimatedDurationSec:
      Number(totalDuration.toFixed(1)),
    createdAt:
      new Date().toISOString(),
  };
}

export default function StudioBoard() {
  const [activeModule, setActiveModule] = useState(null);

  /* =======================================================
     BOMBA PRODUCTION BRAIN
  ======================================================= */

  const [production, setProduction] = useState(null);

  /* =======================================================
     IDEA
  ======================================================= */

  const [ideaText, setIdeaText] = useState("");

  const [ideaStatus, setIdeaStatus] = useState(
    "Describe your movie, video, ad or story idea."
  );

  const ideaInitializedRef = useRef(false);

  /* =======================================================
     STORY
  ======================================================= */

  const [storyStatus, setStoryStatus] = useState(
    "Save an IDEA first, then BOMBA can build the STORY."
  );

  const [isBuildingStory, setIsBuildingStory] =
    useState(false);

  const [storyMode, setStoryMode] =
    useState("test");

  /* =======================================================
     CHARACTERS
  ======================================================= */

  const [characterStatus, setCharacterStatus] =
    useState(
      "Characters will be created from the STORY."
    );

  const [characterLanguage, setCharacterLanguage] =
    useState("pcm");

  /* =======================================================
     SCENES
  ======================================================= */

  const [sceneStatus, setSceneStatus] = useState(
    "Build the STORY first. BOMBA will prepare the scene plan."
  );

  const [selectedSceneNumber, setSelectedSceneNumber] =
    useState(1);

  /* =======================================================
     DIALOGUE
  ======================================================= */

  const [dialogueStatus, setDialogueStatus] =
    useState(
      "Build the STORY and CHARACTERS first. BOMBA will prepare the dialogue."
    );

  const [selectedDialogueScene, setSelectedDialogueScene] =
    useState(1);

  const [isBuildingDialogue, setIsBuildingDialogue] =
    useState(false);

  /* =======================================================
     SOUND
  ======================================================= */

  const [soundPrompt, setSoundPrompt] = useState(
    "cinematic emotional background music for a realistic movie scene"
  );

  const [soundDuration, setSoundDuration] = useState(5);
  const [generatedAudioUrl, setGeneratedAudioUrl] =
    useState("");
  const [isGeneratingSound, setIsGeneratingSound] =
    useState(false);

  const [generatedSoundStatus, setGeneratedSoundStatus] =
    useState("Ready to create AI sound.");

  const [generatedSoundError, setGeneratedSoundError] =
    useState("");

  const generatedAudioRef = useRef(null);

  /* =======================================================
     VOICE
  ======================================================= */

  const [voiceText, setVoiceText] = useState(
    "Welcome to BOMBA AI. No stress, we go help you create your video. Just describe wetin you want, and BOMBA AI go build am."
  );

  const [voiceLanguage, setVoiceLanguage] = useState("pcm");

  const [voiceId, setVoiceId] = useState("ada_pcm");

  const [availableVoices, setAvailableVoices] =
    useState(CONFIRMED_VOICES.pcm);

  const [generatedVoiceUrl, setGeneratedVoiceUrl] =
    useState("");

  const [isGeneratingVoice, setIsGeneratingVoice] =
    useState(false);

  const [generatedVoiceStatus, setGeneratedVoiceStatus] =
    useState("Ready to create AI voice.");

  const [generatedVoiceError, setGeneratedVoiceError] =
    useState("");

  const generatedVoiceRef = useRef(null);

  /* =======================================================
     INITIALIZE PRODUCTION
  ======================================================= */

  useEffect(() => {
    let currentProduction = getProduction();

    if (!currentProduction) {
      currentProduction = initializeProduction("");
    }

    setProduction(currentProduction);

    if (!ideaInitializedRef.current) {
      const savedIdea =
        currentProduction?.idea?.data?.prompt || "";

      if (savedIdea) {
        setIdeaText(savedIdea);
      }

      ideaInitializedRef.current = true;
    }

    const unsubscribe = subscribeToProduction(
      (nextProduction) => {
        setProduction(nextProduction);
      }
    );

    return unsubscribe;
  }, []);

  /* =======================================================
     SAVE IDEA
  ======================================================= */

  function saveIdeaToProduction() {
    const cleanIdea = ideaText.trim();

    if (!cleanIdea) {
      setIdeaStatus(
        "⚠️ Enter your video idea first."
      );

      return;
    }

    try {
      const nextProduction = changeStage(
        "idea",
        {
          prompt: cleanIdea,
        }
      );

      setProduction(nextProduction);

      setIdeaStatus(
        "✅ IDEA SAVED TO BOMBA. STORY is now the next production stage."
      );
    } catch (error) {
      console.error(
        "BOMBA IDEA SAVE ERROR:",
        error
      );

      setIdeaStatus(
        `❌ ${
          error?.message ||
          "Unable to save your idea."
        }`
      );
    }
  }

  /* =======================================================
     BUILD STORY — TEST MODE
  ======================================================= */

  function buildTestStory() {
    const idea =
      production?.idea?.data?.prompt ||
      ideaText.trim();

    if (!idea) {
      setStoryStatus(
        "⚠️ Save your IDEA before building the STORY."
      );

      return;
    }

    setIsBuildingStory(true);
    setStoryStatus(
      "🧠 BOMBA is building the STORY in Test Mode..."
    );

    try {
      const story =
        createTestStoryFromIdea(idea);

      changeStage(
        "story",
        {
          mode: "test",
          plan: story,
        }
      );

      const characters =
        assignCharacterVoices(
          story.characters,
          characterLanguage
        );

      const productionWithCharacters =
        changeStage(
          "characters",
          {
            mode: "test",
            characters,
            voiceAssignments:
              characters.map(
                (character) => ({
                  characterId:
                    character.id,
                  characterName:
                    character.name,
                  voice:
                    character.voice,
                })
              ),
          }
        );

      setProduction(
        productionWithCharacters
      );

      setStoryMode("test");

      const reservedCount =
        characters.filter(
          (character) =>
            character.voice?.status ===
            "reserved"
        ).length;

      setStoryStatus(
        reservedCount > 0
          ? `✅ TEST STORY CREATED. ${characters.length} characters created. ${reservedCount} voice slots are reserved for additional provider voices.`
          : `✅ TEST STORY CREATED. ${characters.length} characters and voice assignments are ready.`
      );

      setCharacterStatus(
        `✅ ${characters.length} characters created from the STORY.`
      );

      setSceneStatus(
        `🟡 SCENE PLAN READY. ${story.scenes?.length || 0} scenes and ${story.shots?.length || 0} shots are available from the STORY.`
      );

      setDialogueStatus(
        "💬 STORY and CHARACTERS are ready. Dialogue can now be built."
      );

      setSelectedSceneNumber(1);
      setSelectedDialogueScene(1);
    } catch (error) {
      console.error(
        "BOMBA TEST STORY ERROR:",
        error
      );

      setStoryStatus(
        `❌ ${
          error?.message ||
          "Unable to build the test story."
        }`
      );
    } finally {
      setIsBuildingStory(false);
    }
  }

  /* =======================================================
     BUILD DIALOGUE — TEST MODE
  ======================================================= */

  function buildTestDialogue() {
    const currentStory =
      production?.story?.data?.plan ||
      null;

    const currentCharacters =
      production?.characters?.data
        ?.characters || [];

    if (!currentStory) {
      setDialogueStatus(
        "⚠️ Build the STORY before creating dialogue."
      );

      return;
    }

    if (!currentCharacters.length) {
      setDialogueStatus(
        "⚠️ Build the CHARACTERS before creating dialogue."
      );

      return;
    }

    setIsBuildingDialogue(true);
    setDialogueStatus(
      "🧠 BOMBA is building structured dialogue from the STORY, CHARACTERS and SCENES..."
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
            scenes:
              dialogue.scenes,
            totalLines:
              dialogue.totalLines,
            estimatedDurationSec:
              dialogue.estimatedDurationSec,
          }
        );

      setProduction(
        nextProduction
      );

      setDialogueStatus(
        `✅ DIALOGUE READY. ${dialogue.totalLines} dialogue lines created across ${dialogue.scenes.length} scenes.`
      );

      setSelectedDialogueScene(1);
    } catch (error) {
      console.error(
        "BOMBA TEST DIALOGUE ERROR:",
        error
      );

      setDialogueStatus(
        `❌ ${
          error?.message ||
          "Unable to build the test dialogue."
        }`
      );
    } finally {
      setIsBuildingDialogue(false);
    }
  }

  /* =======================================================
     SOUND GENERATION
  ======================================================= */

  async function generateAISound() {
    const cleanPrompt =
      soundPrompt.trim();

    if (!cleanPrompt) {
      setGeneratedSoundError(
        "Enter a sound description first."
      );

      setGeneratedSoundStatus(
        "⚠️ Sound description is required."
      );

      return;
    }

    stopGeneratedSound();

    setIsGeneratingSound(true);
    setGeneratedAudioUrl("");
    setGeneratedSoundError("");

    setGeneratedSoundStatus(
      "⏳ BOMBA AI is connecting to the sound engine..."
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
              type: "Background Music",
              prompt: cleanPrompt,
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
        throw new Error(
          "Sound server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Sound generation failed with HTTP ${response.status}.`
        );
      }

      if (
        data?.status ===
          "completed" &&
        data?.audioUrl
      ) {
        setGeneratedAudioUrl(
          data.audioUrl
        );

        setGeneratedSoundStatus(
          "✅ AI sound created successfully. Press PLAY AI SOUND."
        );

        return;
      }

      if (
        data?.status ===
        "processing"
      ) {
        setGeneratedSoundStatus(
          "⏳ Sound is still processing. Generate again shortly."
        );

        return;
      }

      throw new Error(
        data?.error ||
          "The sound engine did not return an audio file."
      );
    } catch (error) {
      console.error(
        "BOMBA AI SOUND GENERATION ERROR:",
        error
      );

      const message =
        error?.message ||
        "Unable to generate AI sound.";

      setGeneratedSoundError(
        message
      );

      setGeneratedSoundStatus(
        `❌ ${message}`
      );
    } finally {
      setIsGeneratingSound(
        false
      );
    }
  }

  function playGeneratedSound() {
    if (!generatedAudioUrl) {
      setGeneratedSoundStatus(
        "⚠️ Generate a sound first."
      );

      return;
    }

    stopGeneratedSound();

    try {
      const audio =
        new Audio(
          generatedAudioUrl
        );

      audio.preload = "auto";

      generatedAudioRef.current =
        audio;

      audio.onended = () => {
        setGeneratedSoundStatus(
          "🎵 AI sound finished. Ready again."
        );
      };

      audio.onerror = () => {
        setGeneratedSoundStatus(
          "❌ Generated audio could not be played."
        );
      };

      const promise =
        audio.play();

      if (promise) {
        promise
          .then(() => {
            setGeneratedSoundStatus(
              "▶️ AI sound is playing."
            );
          })
          .catch(() => {
            setGeneratedSoundStatus(
              "❌ Browser blocked the generated audio."
            );
          });
      }
    } catch {
      setGeneratedSoundStatus(
        "❌ Unable to play generated audio."
      );
    }
  }

  /* =======================================================
     VOICE LANGUAGE
  ======================================================= */

  useEffect(() => {
    if (activeModule !== "VOICE") return;

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
              voice.id ===
              current
          );

        return exists
          ? current
          : voices[0]?.id ||
              "";
      }
    );
  }, [
    activeModule,
    voiceLanguage,
  ]);

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      stopGeneratedSound();
      stopGeneratedVoice();
    };
  }, []);

  function stopGeneratedSound() {
    if (
      generatedAudioRef.current
    ) {
      try {
        generatedAudioRef.current.pause();
        generatedAudioRef.current.currentTime = 0;
      } catch {}

      generatedAudioRef.current =
        null;
    }
  }

  function stopGeneratedVoice() {
    if (
      generatedVoiceRef.current
    ) {
      try {
        generatedVoiceRef.current.pause();
        generatedVoiceRef.current.currentTime = 0;
      } catch {}

      generatedVoiceRef.current =
        null;
    }
  }

  /* =======================================================
     9JALINGO VOICE GENERATION
  ======================================================= */

  async function generateAIVoice() {
    const cleanText =
      voiceText.trim();

    const cleanVoiceId =
      voiceId.trim();

    if (!cleanText) {
      setGeneratedVoiceError(
        "Enter the dialogue you want the AI voice to speak."
      );

      setGeneratedVoiceStatus(
        "⚠️ Voice text is required."
      );

      return;
    }

    if (!cleanVoiceId) {
      setGeneratedVoiceError(
        "Choose a 9jaLingo voice first."
      );

      setGeneratedVoiceStatus(
        "⚠️ 9jaLingo voice is required."
      );

      return;
    }

    stopGeneratedVoice();

    setGeneratedVoiceUrl("");
    setGeneratedVoiceError("");
    setIsGeneratingVoice(true);

    setGeneratedVoiceStatus(
      "⏳ BOMBA AI is sending your dialogue to 9jaLingo..."
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
              text: cleanText,
              voiceId:
                cleanVoiceId,
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
            errorText ||
            `Voice generation failed with HTTP ${response.status}.`
        );
      }

      const audioBuffer =
        await response.arrayBuffer();

      if (
        !audioBuffer.byteLength
      ) {
        throw new Error(
          "9jaLingo returned an empty audio file."
        );
      }

      const audioBlob =
        new Blob(
          [audioBuffer],
          {
            type: "audio/mpeg",
          }
        );

      const audioUrl =
        URL.createObjectURL(
          audioBlob
        );

      setGeneratedVoiceUrl(
        audioUrl
      );

      setGeneratedVoiceStatus(
        "☁️ Uploading your voice automatically..."
      );

      const cloudinaryResult =
        await uploadVoiceToCloudinary(
          audioBlob
        );

      const voicePublicId =
        cloudinaryResult.public_id;

      localStorage.setItem(
        "bomba_voice_public_id",
        voicePublicId
      );

      localStorage.setItem(
        "bomba_voice_cloudinary_resource_type",
        "video"
      );

      localStorage.setItem(
        "bomba_voice_language",
        voiceLanguage
      );

      localStorage.setItem(
        "bomba_voice_text",
        cleanText
      );

      localStorage.setItem(
        "bomba_voice_id",
        cleanVoiceId
      );

      setGeneratedVoiceStatus(
        `✅ ${cleanVoiceId} voice ready. Your next video will automatically include this voice.`
      );
    } catch (error) {
      console.error(
        "BOMBA 9JALINGO VOICE GENERATION ERROR:",
        error
      );

      const message =
        error?.message ||
        "Unable to generate AI voice.";

      setGeneratedVoiceError(
        message
      );

      setGeneratedVoiceStatus(
        `❌ ${message}`
      );
    } finally {
      setIsGeneratingVoice(
        false
      );
    }
  }

  function playGeneratedVoice() {
    if (!generatedVoiceUrl) {
      setGeneratedVoiceStatus(
        "⚠️ Generate a voice first."
      );

      return;
    }

    stopGeneratedVoice();

    try {
      const audio =
        new Audio(
          generatedVoiceUrl
        );

      audio.preload = "auto";

      generatedVoiceRef.current =
        audio;

      audio.onended = () => {
        setGeneratedVoiceStatus(
          "🎙️ AI voice finished. Ready again."
        );
      };

      audio.onerror = () => {
        setGeneratedVoiceStatus(
          "❌ Generated voice could not be played."
        );
      };

      const promise =
        audio.play();

      if (promise) {
        promise
          .then(() => {
            setGeneratedVoiceStatus(
              "▶️ AI voice is playing."
            );
          })
          .catch(() => {
            setGeneratedVoiceStatus(
              "❌ Browser blocked the generated voice."
            );
          });
      }
    } catch {
      setGeneratedVoiceStatus(
        "❌ Unable to play generated voice."
      );
    }
  }

  const story =
    production?.story?.data?.plan ||
    null;

  const characters =
    production?.characters?.data
      ?.characters || [];

  const scenes =
    story?.scenes || [];

  const shots =
    story?.shots || [];

  const dialoguePlan =
    production?.dialogue?.data?.plan ||
    null;

  const dialogueScenes =
    dialoguePlan?.scenes || [];

  const selectedScene =
    scenes.find(
      (scene) =>
        Number(scene.sceneNumber) ===
        Number(selectedSceneNumber)
    ) || scenes[0] || null;

  const selectedSceneShots =
    selectedScene
      ? shots.filter(
          (shot) =>
            Number(shot.sceneNumber) ===
            Number(
              selectedScene.sceneNumber
            )
        )
      : [];

  const selectedDialogueSceneData =
    dialogueScenes.find(
      (scene) =>
        Number(scene.sceneNumber) ===
        Number(selectedDialogueScene)
    ) ||
    dialogueScenes[0] ||
    null;

  function getModuleStatus(moduleName) {
    switch (moduleName) {
      case "IDEA":
        return production?.idea?.status === "ready"
          ? "ready"
          : "waiting";

      case "PLAN":
        return production?.story?.status === "ready"
          ? "ready"
          : "waiting";

      case "CHARACTERS":
        return characters.length > 0
          ? "ready"
          : "waiting";

      case "SCENES":
        if (
          production?.scenes?.status ===
          "completed"
        ) {
          return "ready";
        }

        if (scenes.length > 0) {
          return "planned";
        }

        return "waiting";

      case "DIALOGUE":
        if (
          production?.dialogue?.status ===
          "completed"
        ) {
          return "ready";
        }

        if (
          production?.dialogue?.status ===
          "ready" &&
          dialoguePlan
        ) {
          return "ready";
        }

        return "waiting";

      case "VOICE":
        return availableVoices.length > 0
          ? "ready"
          : "waiting";

      case "SOUND":
        return generatedAudioUrl
          ? "ready"
          : "waiting";

      case "VIDEO":
      case "TIMELINE":
      case "PREVIEW":
      case "EXPORT":
      default:
        return "waiting";
    }
  }

  function getModuleSignal(status) {
    if (status === "ready") {
      return {
        symbol: "🟢",
        label: "READY",
        color: "rgba(70,255,150,0.85)",
      };
    }

    if (status === "planned") {
      return {
        symbol: "🟡",
        label: "PLANNED",
        color: "rgba(255,212,59,0.85)",
      };
    }

    return {
      symbol: "⚪",
      label: "WAITING",
      color: "rgba(255,255,255,0.42)",
    };
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <section
      style={{
        marginTop: "24px",
        padding: "14px",
        border:
          "1px solid rgba(255,255,255,0.10)",
        borderRadius: "14px",
        background:
          "rgba(255,255,255,0.025)",
      }}
    >
      <div
        style={{
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "1.5px",
            opacity: 0.65,
          }}
        >
          BOMBA AI
        </div>

        <h2
          style={{
            margin: "4px 0 3px",
            fontSize: "18px",
            fontWeight: "800",
          }}
        >
          VIDEO PRODUCTION
        </h2>

        <p
          style={{
            margin: 0,
            fontSize: "12px",
            opacity: 0.6,
          }}
        >
          Build your video from idea to export.
        </p>
      </div>

      {production && (
        <div
          style={{
            marginBottom: "10px",
            padding: "8px 10px",
            borderRadius: "8px",
            background:
              "rgba(255,212,59,0.045)",
            border:
              "1px solid rgba(255,212,59,0.10)",
            fontSize: "8px",
            opacity: 0.55,
          }}
        >
          🧠 Production Brain connected
          {" • "}
          Project ready
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: "8px",
        }}
      >
        {modules.map(
          (module) => {
            const moduleStatus =
              getModuleStatus(
                module.name
              );

            const signal =
              getModuleSignal(
                moduleStatus
              );

            return (
              <button
                key={module.number}
                type="button"
                onClick={() =>
                  setActiveModule(
                    module.name
                  )
                }
                style={{
                  width: "100%",
                  minHeight: "58px",
                  padding: "9px",
                  borderRadius: "10px",
                  border:
                    activeModule ===
                    module.name
                      ? "1px solid rgba(255,212,59,0.65)"
                      : "1px solid rgba(255,255,255,0.10)",
                  background:
                    activeModule ===
                    module.name
                      ? "rgba(255,212,59,0.08)"
                      : "rgba(255,255,255,0.035)",
                  color: "inherit",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "space-between",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "18px",
                        lineHeight: 1,
                      }}
                    >
                      {module.icon}
                    </span>

                    <span>
                      <span
                        style={{
                          display: "block",
                          fontSize: "9px",
                          opacity: 0.45,
                          marginBottom: "2px",
                        }}
                      >
                        {module.number}
                      </span>

                      <span
                        style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: "800",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {module.name}
                      </span>
                    </span>
                  </div>

                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      fontSize: "7px",
                      fontWeight: "800",
                      color: signal.color,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {signal.symbol}
                    {" "}
                    {signal.label}
                  </span>
                </div>
              </button>
            );
          }
        )}
      </div>

      {/* =====================================================
          IDEA
      ===================================================== */}

      {activeModule === "IDEA" && (
        <div
          style={{
            marginTop: "14px",
            padding: "14px",
            borderRadius: "12px",
            border:
              "1px solid rgba(255,212,59,0.20)",
            background:
              "rgba(255,212,59,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "1px",
                  opacity: 0.55,
                }}
              >
                PRODUCTION START
              </div>

              <h3
                style={{
                  margin: "4px 0 0",
                  fontSize: "16px",
                  fontWeight: "800",
                }}
              >
                💡 Your Video Idea
              </h3>
            </div>

            <button
              type="button"
              onClick={() =>
                setActiveModule(null)
              }
              style={{
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(255,255,255,0.05)",
                color: "inherit",
                borderRadius: "8px",
                padding: "6px 9px",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              CLOSE
            </button>
          </div>

          <div
            style={{
              padding: "12px",
              borderRadius: "10px",
              border:
                "1px solid rgba(255,212,59,0.30)",
              background:
                "rgba(255,212,59,0.07)",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: "800",
                letterSpacing: "1px",
                marginBottom: "5px",
              }}
            >
              🧠 BOMBA DIRECTOR
            </div>

            <div
              style={{
                fontSize: "9px",
                opacity: 0.58,
                lineHeight: 1.5,
                marginBottom: "10px",
              }}
            >
              Start with one idea. BOMBA will keep
              this idea as the foundation of the
              production.
            </div>

            <label
              style={{
                display: "block",
                fontSize: "9px",
                fontWeight: "800",
                marginBottom: "5px",
              }}
            >
              DESCRIBE YOUR VIDEO IDEA
            </label>

            <textarea
              value={ideaText}
              onChange={(event) => {
                setIdeaText(
                  event.target.value
                );

                if (
                  ideaStatus.startsWith(
                    "❌"
                  ) ||
                  ideaStatus.startsWith(
                    "⚠️"
                  )
                ) {
                  setIdeaStatus(
                    "Describe your movie, video, ad or story idea."
                  );
                }
              }}
              rows={7}
              maxLength={10000}
              placeholder="Example: A young Nigerian entrepreneur starts a tech company from a small room in Lagos and faces one major challenge..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                resize: "vertical",
                padding: "10px",
                borderRadius: "8px",
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(0,0,0,0.25)",
                color: "inherit",
                fontSize: "11px",
                lineHeight: 1.5,
                outline: "none",
              }}
            />

            <div
              style={{
                marginTop: "5px",
                textAlign: "right",
                fontSize: "8px",
                opacity: 0.4,
              }}
            >
              {ideaText.length} / 10000
            </div>

            <button
              type="button"
              onClick={
                saveIdeaToProduction
              }
              disabled={
                !ideaText.trim()
              }
              style={{
                width: "100%",
                marginTop: "9px",
                padding: "12px",
                borderRadius: "8px",
                border:
                  "1px solid rgba(255,212,59,0.45)",
                background:
                  "rgba(255,212,59,0.15)",
                color: "inherit",
                fontSize: "10px",
                fontWeight: "800",
                cursor:
                  ideaText.trim()
                    ? "pointer"
                    : "not-allowed",
                opacity:
                  ideaText.trim()
                    ? 1
                    : 0.45,
              }}
            >
              💡 SAVE IDEA TO BOMBA
            </button>

            <div
              style={{
                marginTop: "10px",
                padding: "9px",
                borderRadius: "8px",
                background:
                  "rgba(0,0,0,0.20)",
                fontSize: "9px",
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              {ideaStatus}
            </div>

            {production?.idea?.status ===
              "ready" && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  borderRadius: "8px",
                  background:
                    "rgba(70,255,150,0.06)",
                  border:
                    "1px solid rgba(70,255,150,0.16)",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: "800",
                    marginBottom: "5px",
                  }}
                >
                  ✅ IDEA CONNECTED TO PRODUCTION BRAIN
                </div>

                <div
                  style={{
                    fontSize: "9px",
                    opacity: 0.6,
                    lineHeight: 1.5,
                  }}
                >
                  BOMBA has the idea. The next
                  production stage is{" "}
                  <strong>STORY</strong>.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          STORY
      ===================================================== */}

      {activeModule === "PLAN" && (
        <div
          style={{
            marginTop: "14px",
            padding: "14px",
            borderRadius: "12px",
            border:
              "1px solid rgba(255,212,59,0.20)",
            background:
              "rgba(255,212,59,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "1px",
                  opacity: 0.55,
                }}
              >
                STORY ENGINE
              </div>

              <h3
                style={{
                  margin: "4px 0 0",
                  fontSize: "16px",
                  fontWeight: "800",
                }}
              >
                📖 BOMBA STORY
              </h3>
            </div>

            <button
              type="button"
              onClick={() =>
                setActiveModule(null)
              }
              style={{
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(255,255,255,0.05)",
                color: "inherit",
                borderRadius: "8px",
                padding: "6px 9px",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              CLOSE
            </button>
          </div>

          <div
            style={{
              padding: "12px",
              borderRadius: "10px",
              border:
                "1px solid rgba(255,212,59,0.25)",
              background:
                "rgba(255,212,59,0.055)",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: "800",
                marginBottom: "6px",
              }}
            >
              🧪 TEST MODE
            </div>

            <div
              style={{
                fontSize: "9px",
                opacity: 0.6,
                lineHeight: 1.5,
                marginBottom: "10px",
              }}
            >
              OpenAI is not required for this test.
              BOMBA will build a structured test
              story from the saved IDEA.
            </div>

            <div
              style={{
                padding: "9px",
                borderRadius: "8px",
                background:
                  "rgba(0,0,0,0.22)",
                fontSize: "9px",
                lineHeight: 1.5,
                marginBottom: "9px",
              }}
            >
              <strong>Current IDEA:</strong>{" "}
              {production?.idea?.data?.prompt ||
                "No saved idea yet."}
            </div>

            <button
              type="button"
              onClick={buildTestStory}
              disabled={
                isBuildingStory ||
                !production?.idea?.data?.prompt
              }
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border:
                  "1px solid rgba(255,212,59,0.45)",
                background:
                  "rgba(255,212,59,0.15)",
                color: "inherit",
                fontSize: "10px",
                fontWeight: "800",
                cursor:
                  isBuildingStory
                    ? "wait"
                    : "pointer",
                opacity:
                  isBuildingStory ||
                  !production?.idea?.data?.prompt
                    ? 0.5
                    : 1,
              }}
            >
              {isBuildingStory
                ? "⏳ BUILDING STORY..."
                : "📖 BUILD TEST STORY"}
            </button>

            <div
              style={{
                marginTop: "10px",
                padding: "9px",
                borderRadius: "8px",
                background:
                  "rgba(0,0,0,0.20)",
                fontSize: "9px",
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              {storyStatus}
            </div>
          </div>

          {story && (
            <div
              style={{
                marginTop: "12px",
                padding: "12px",
                borderRadius: "10px",
                background:
                  "rgba(255,255,255,0.035)",
                border:
                  "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "800",
                  marginBottom: "5px",
                }}
              >
                🎬 {story.title}
              </div>

              <div
                style={{
                  fontSize: "9px",
                  opacity: 0.65,
                  lineHeight: 1.5,
                  marginBottom: "10px",
                }}
              >
                {story.logline}
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "7px",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                  }}
                >
                  <strong>Genre:</strong>{" "}
                  {story.genre}
                </div>

                <div
                  style={{
                    fontSize: "9px",
                  }}
                >
                  <strong>Setting:</strong>{" "}
                  {story.setting}
                </div>

                <div
                  style={{
                    fontSize: "9px",
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Beginning:</strong>{" "}
                  {story.beginning}
                </div>

                <div
                  style={{
                    fontSize: "9px",
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Conflict:</strong>{" "}
                  {story.conflict}
                </div>

                <div
                  style={{
                    fontSize: "9px",
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Turning Point:</strong>{" "}
                  {story.turningPoint}
                </div>

                <div
                  style={{
                    fontSize: "9px",
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Ending:</strong>{" "}
                  {story.ending}
                </div>
              </div>

              <div
                style={{
                  marginTop: "10px",
                  fontSize: "9px",
                  fontWeight: "800",
                }}
              >
                🎞️ {story.scenes?.length || 0} scenes
                {" • "}
                📷 {story.shots?.length || 0} shots
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          CHARACTERS
      ===================================================== */}

      {activeModule ===
        "CHARACTERS" && (
        <div
          style={{
            marginTop: "14px",
            padding: "14px",
            borderRadius: "12px",
            border:
              "1px solid rgba(255,212,59,0.20)",
            background:
              "rgba(255,212,59,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "1px",
                  opacity: 0.55,
                }}
              >
                CHARACTER SYSTEM
              </div>

              <h3
                style={{
                  margin: "4px 0 0",
                  fontSize: "16px",
                  fontWeight: "800",
                }}
              >
                👥 CHARACTERS
              </h3>
            </div>

            <button
              type="button"
              onClick={() =>
                setActiveModule(null)
              }
              style={{
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(255,255,255,0.05)",
                color: "inherit",
                borderRadius: "8px",
                padding: "6px 9px",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              CLOSE
            </button>
          </div>

          <div
            style={{
              padding: "10px",
              borderRadius: "9px",
              background:
                "rgba(255,255,255,0.035)",
              border:
                "1px solid rgba(255,255,255,0.08)",
              marginBottom: "10px",
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: "9px",
                fontWeight: "800",
                marginBottom: "5px",
              }}
            >
              CHARACTER VOICE LANGUAGE
            </label>

            <select
              value={characterLanguage}
              onChange={(event) =>
                setCharacterLanguage(
                  event.target.value
                )
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px",
                borderRadius: "8px",
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(0,0,0,0.35)",
                color: "inherit",
                fontSize: "10px",
              }}
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

            <div
              style={{
                marginTop: "8px",
                fontSize: "8px",
                opacity: 0.5,
                lineHeight: 1.5,
              }}
            >
              Changing the language here prepares
              the character voice assignments for the
              production.
            </div>
          </div>

          <div
            style={{
              padding: "9px",
              borderRadius: "8px",
              background:
                "rgba(0,0,0,0.20)",
              fontSize: "9px",
              textAlign: "center",
              marginBottom: "10px",
            }}
          >
            {characterStatus}
          </div>

          {!characters.length && (
            <div
              style={{
                padding: "12px",
                borderRadius: "9px",
                background:
                  "rgba(255,255,255,0.035)",
                fontSize: "9px",
                lineHeight: 1.5,
                opacity: 0.65,
              }}
            >
              Build the STORY first. BOMBA will
              create the characters from the story
              and prepare their voice assignments.
            </div>
          )}

          {characters.length > 0 && (
            <div
              style={{
                display: "grid",
                gap: "8px",
              }}
            >
              {characters.map(
                (character, index) => (
                  <div
                    key={
                      character.id ||
                      `character-${index}`
                    }
                    style={{
                      padding: "11px",
                      borderRadius: "9px",
                      background:
                        "rgba(255,255,255,0.035)",
                      border:
                        "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: "800",
                          }}
                        >
                          {character.name}
                        </div>

                        <div
                          style={{
                            marginTop: "2px",
                            fontSize: "8px",
                            opacity: 0.5,
                          }}
                        >
                          {character.role}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: "8px",
                          padding:
                            "4px 7px",
                          borderRadius: "6px",
                          background:
                            character.voice
                              ?.status ===
                            "ready"
                              ? "rgba(70,255,150,0.08)"
                              : "rgba(255,212,59,0.08)",
                          border:
                            character.voice
                              ?.status ===
                            "ready"
                              ? "1px solid rgba(70,255,150,0.18)"
                              : "1px solid rgba(255,212,59,0.18)",
                        }}
                      >
                        {character.voice
                          ?.status ===
                        "ready"
                          ? "VOICE READY"
                          : "VOICE SLOT"}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "9px",
                        lineHeight: 1.5,
                        opacity: 0.62,
                      }}
                    >
                      {character.description}
                    </div>

                    <div
                      style={{
                        marginTop: "8px",
                        padding: "7px",
                        borderRadius: "7px",
                        background:
                          "rgba(0,0,0,0.22)",
                        fontSize: "8px",
                      }}
                    >
                      🎙️{" "}
                      <strong>
                        {character.voice
                          ?.voiceName ||
                          "Reserved Voice"}
                      </strong>
                      {" • "}
                      {character.voice
                        ?.voiceId ||
                        character.voice
                          ?.slot ||
                        "Pending"}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          SCENE SYSTEM
      ===================================================== */}

      {activeModule === "SCENES" && (
        <div
          style={{
            marginTop: "14px",
            padding: "14px",
            borderRadius: "12px",
            border:
              "1px solid rgba(255,212,59,0.20)",
            background:
              "rgba(255,212,59,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "1px",
                  opacity: 0.55,
                }}
              >
                SCENE SYSTEM
              </div>

              <h3
                style={{
                  margin: "4px 0 0",
                  fontSize: "16px",
                  fontWeight: "800",
                }}
              >
                🎬 SCENES
              </h3>
            </div>

            <button
              type="button"
              onClick={() =>
                setActiveModule(null)
              }
              style={{
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(255,255,255,0.05)",
                color: "inherit",
                borderRadius: "8px",
                padding: "6px 9px",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              CLOSE
            </button>
          </div>

          <div
            style={{
              padding: "10px",
              borderRadius: "9px",
              background:
                scenes.length > 0
                  ? "rgba(255,212,59,0.06)"
                  : "rgba(255,255,255,0.035)",
              border:
                scenes.length > 0
                  ? "1px solid rgba(255,212,59,0.18)"
                  : "1px solid rgba(255,255,255,0.08)",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                fontWeight: "800",
                marginBottom: "5px",
              }}
            >
              {scenes.length > 0
                ? "🟡 SCENE PLAN CONNECTED"
                : "⚪ SCENE PLAN WAITING"}
            </div>

            <div
              style={{
                fontSize: "8px",
                opacity: 0.58,
                lineHeight: 1.5,
              }}
            >
              {scenes.length > 0
                ? `${scenes.length} scenes and ${shots.length} planned shots are being read directly from the STORY.`
                : "Build the STORY first. The Scene System will read the scenes and shots from the STORY."}
            </div>
          </div>

          {scenes.length === 0 && (
            <div
              style={{
                padding: "12px",
                borderRadius: "9px",
                background:
                  "rgba(255,255,255,0.035)",
                fontSize: "9px",
                lineHeight: 1.5,
                opacity: 0.65,
              }}
            >
              No scene plan is available yet.
              Build the TEST STORY from 02 PLAN first.
            </div>
          )}

          {scenes.length > 0 && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: "7px",
                  marginBottom: "10px",
                }}
              >
                {scenes.map(
                  (scene) => {
                    const active =
                      Number(
                        selectedScene?.sceneNumber
                      ) ===
                      Number(
                        scene.sceneNumber
                      );

                    const sceneShots =
                      shots.filter(
                        (shot) =>
                          Number(
                            shot.sceneNumber
                          ) ===
                          Number(
                            scene.sceneNumber
                          )
                      );

                    return (
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
                        style={{
                          padding: "9px",
                          borderRadius: "8px",
                          border: active
                            ? "1px solid rgba(255,212,59,0.55)"
                            : "1px solid rgba(255,255,255,0.08)",
                          background: active
                            ? "rgba(255,212,59,0.10)"
                            : "rgba(255,255,255,0.035)",
                          color: "inherit",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "8px",
                            opacity: 0.5,
                            marginBottom: "3px",
                          }}
                        >
                          SCENE{" "}
                          {scene.sceneNumber}
                        </div>

                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: "800",
                          }}
                        >
                          {scene.title}
                        </div>

                        <div
                          style={{
                            marginTop: "4px",
                            fontSize: "7px",
                            opacity: 0.5,
                          }}
                        >
                          {sceneShots.length} shot
                          {sceneShots.length === 1
                            ? ""
                            : "s"}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>

              {selectedScene && (
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "10px",
                    background:
                      "rgba(255,255,255,0.035)",
                    border:
                      "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent:
                        "space-between",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "8px",
                          opacity: 0.5,
                          marginBottom: "3px",
                        }}
                      >
                        SCENE{" "}
                        {selectedScene.sceneNumber}
                      </div>

                      <div
                        style={{
                          fontSize: "15px",
                          fontWeight: "800",
                        }}
                      >
                        {selectedScene.title}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "4px 7px",
                        borderRadius: "6px",
                        background:
                          "rgba(255,212,59,0.08)",
                        border:
                          "1px solid rgba(255,212,59,0.18)",
                        fontSize: "7px",
                        fontWeight: "800",
                        whiteSpace: "nowrap",
                      }}
                    >
                      🟡 PLANNED
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: "7px",
                      marginTop: "10px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "9px",
                      }}
                    >
                      <strong>📍 Location:</strong>{" "}
                      {selectedScene.location ||
                        "Not specified"}
                    </div>

                    <div
                      style={{
                        fontSize: "9px",
                      }}
                    >
                      <strong>🕐 Time:</strong>{" "}
                      {selectedScene.time ||
                        "Not specified"}
                    </div>

                    <div
                      style={{
                        fontSize: "9px",
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>🎭 Action:</strong>{" "}
                      {selectedScene.description ||
                        "No action description yet."}
                    </div>

                    <div
                      style={{
                        fontSize: "9px",
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>🎯 Purpose:</strong>{" "}
                      {selectedScene.purpose ||
                        "No scene purpose yet."}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "12px",
                      fontSize: "10px",
                      fontWeight: "800",
                    }}
                  >
                    📷 SHOTS
                  </div>

                  {selectedSceneShots.length ===
                    0 && (
                    <div
                      style={{
                        marginTop: "7px",
                        padding: "9px",
                        borderRadius: "7px",
                        background:
                          "rgba(0,0,0,0.20)",
                        fontSize: "8px",
                        opacity: 0.6,
                      }}
                    >
                      No shots planned for this scene yet.
                    </div>
                  )}

                  {selectedSceneShots.length >
                    0 && (
                    <div
                      style={{
                        display: "grid",
                        gap: "7px",
                        marginTop: "7px",
                      }}
                    >
                      {selectedSceneShots.map(
                        (shot) => (
                          <div
                            key={
                              shot.shotNumber
                            }
                            style={{
                              padding: "9px",
                              borderRadius: "8px",
                              background:
                                "rgba(0,0,0,0.20)",
                              border:
                                "1px solid rgba(255,255,255,0.07)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent:
                                  "space-between",
                                gap: "8px",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "9px",
                                  fontWeight: "800",
                                }}
                              >
                                SHOT{" "}
                                {
                                  shot.shotNumber
                                }
                              </div>

                              <div
                                style={{
                                  fontSize: "7px",
                                  opacity: 0.5,
                                }}
                              >
                                {shot.shotType ||
                                  "Shot"}
                              </div>
                            </div>

                            <div
                              style={{
                                marginTop: "5px",
                                fontSize: "8px",
                                opacity: 0.62,
                                lineHeight: 1.5,
                              }}
                            >
                              {shot.description ||
                                "No shot description yet."}
                            </div>

                            <div
                              style={{
                                marginTop: "5px",
                                fontSize: "7px",
                                opacity: 0.45,
                              }}
                            >
                              🎥{" "}
                              {shot.camera ||
                                "Camera not specified"}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* =====================================================
          DIALOGUE SYSTEM
      ===================================================== */}

      {activeModule === "DIALOGUE" && (
        <div
          style={{
            marginTop: "14px",
            padding: "14px",
            borderRadius: "12px",
            border:
              "1px solid rgba(255,212,59,0.20)",
            background:
              "rgba(255,212,59,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "1px",
                  opacity: 0.55,
                }}
              >
                DIALOGUE SYSTEM
              </div>

              <h3
                style={{
                  margin: "4px 0 0",
                  fontSize: "16px",
                  fontWeight: "800",
                }}
              >
                💬 DIALOGUE
              </h3>
            </div>

            <button
              type="button"
              onClick={() =>
                setActiveModule(null)
              }
              style={{
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(255,255,255,0.05)",
                color: "inherit",
                borderRadius: "8px",
                padding: "6px 9px",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              CLOSE
            </button>
          </div>

          <div
            style={{
              padding: "10px",
              borderRadius: "9px",
              background:
                dialoguePlan
                  ? "rgba(70,255,150,0.06)"
                  : "rgba(255,255,255,0.035)",
              border:
                dialoguePlan
                  ? "1px solid rgba(70,255,150,0.18)"
                  : "1px solid rgba(255,255,255,0.08)",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                fontWeight: "800",
                marginBottom: "5px",
              }}
            >
              {dialoguePlan
                ? "🟢 DIALOGUE CONNECTED"
                : "⚪ DIALOGUE WAITING"}
            </div>

            <div
              style={{
                fontSize: "8px",
                opacity: 0.58,
                lineHeight: 1.5,
              }}
            >
              {dialoguePlan
                ? `${dialoguePlan.totalLines || 0} dialogue lines are connected to ${dialogueScenes.length || 0} scenes.`
                : "BOMBA will build structured dialogue from the STORY, CHARACTERS and SCENES."}
            </div>
          </div>

          <div
            style={{
              padding: "10px",
              borderRadius: "9px",
              background:
                "rgba(255,255,255,0.035)",
              border:
                "1px solid rgba(255,255,255,0.08)",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                fontWeight: "800",
                marginBottom: "5px",
              }}
            >
              🧪 TEST MODE
            </div>

            <div
              style={{
                fontSize: "8px",
                opacity: 0.55,
                lineHeight: 1.5,
                marginBottom: "9px",
              }}
            >
              No OpenAI call is required yet. This
              test creates structured dialogue so the
              next VOICE module can consume real
              character dialogue automatically.
            </div>

            <div
              style={{
                padding: "8px",
                borderRadius: "7px",
                background:
                  "rgba(0,0,0,0.20)",
                fontSize: "8px",
                lineHeight: 1.5,
                marginBottom: "8px",
              }}
            >
              <strong>Story:</strong>{" "}
              {story?.title ||
                "No story available."}
              <br />
              <strong>Characters:</strong>{" "}
              {characters.length}
              <br />
              <strong>Scenes:</strong>{" "}
              {scenes.length}
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
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border:
                  "1px solid rgba(255,212,59,0.45)",
                background:
                  "rgba(255,212,59,0.15)",
                color: "inherit",
                fontSize: "10px",
                fontWeight: "800",
                cursor:
                  isBuildingDialogue
                    ? "wait"
                    : "pointer",
                opacity:
                  isBuildingDialogue ||
                  !story ||
                  !characters.length
                    ? 0.5
                    : 1,
              }}
            >
              {isBuildingDialogue
                ? "⏳ BUILDING DIALOGUE..."
                : "💬 BUILD TEST DIALOGUE"}
            </button>

            <div
              style={{
                marginTop: "10px",
                padding: "9px",
                borderRadius: "8px",
                background:
                  "rgba(0,0,0,0.20)",
                fontSize: "9px",
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              {dialogueStatus}
            </div>
          </div>

          {dialoguePlan && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: "7px",
                  marginBottom: "10px",
                }}
              >
                {dialogueScenes.map(
                  (scene) => {
                    const active =
                      Number(
                        selectedDialogueScene
                      ) ===
                      Number(
                        scene.sceneNumber
                      );

                    return (
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
                        style={{
                          padding: "9px",
                          borderRadius: "8px",
                          border: active
                            ? "1px solid rgba(255,212,59,0.55)"
                            : "1px solid rgba(255,255,255,0.08)",
                          background: active
                            ? "rgba(255,212,59,0.10)"
                            : "rgba(255,255,255,0.035)",
                          color: "inherit",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "8px",
                            opacity: 0.5,
                            marginBottom: "3px",
                          }}
                        >
                          SCENE{" "}
                          {scene.sceneNumber}
                        </div>

                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: "800",
                          }}
                        >
                          {scene.title}
                        </div>

                        <div
                          style={{
                            marginTop: "4px",
                            fontSize: "7px",
                            opacity: 0.5,
                          }}
                        >
                          {scene.lines?.length ||
                            0}{" "}
                          lines
                        </div>
                      </button>
                    );
                  }
                )}
              </div>

              {selectedDialogueSceneData && (
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "10px",
                    background:
                      "rgba(255,255,255,0.035)",
                    border:
                      "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent:
                        "space-between",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "8px",
                          opacity: 0.5,
                          marginBottom: "3px",
                        }}
                      >
                        SCENE{" "}
                        {
                          selectedDialogueSceneData.sceneNumber
                        }
                      </div>

                      <div
                        style={{
                          fontSize: "15px",
                          fontWeight: "800",
                        }}
                      >
                        {
                          selectedDialogueSceneData.title
                        }
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "4px 7px",
                        borderRadius: "6px",
                        background:
                          "rgba(70,255,150,0.08)",
                        border:
                          "1px solid rgba(70,255,150,0.18)",
                        fontSize: "7px",
                        fontWeight: "800",
                        whiteSpace: "nowrap",
                      }}
                    >
                      🟢 READY
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "9px",
                      padding: "8px",
                      borderRadius: "7px",
                      background:
                        "rgba(0,0,0,0.20)",
                      fontSize: "8px",
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>Language:</strong>{" "}
                    {dialoguePlan.language}
                    <br />
                    <strong>Estimated dialogue:</strong>{" "}
                    {
                      selectedDialogueSceneData.estimatedDialogueDurationSec
                    }
                    s
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: "8px",
                      marginTop: "10px",
                    }}
                  >
                    {(
                      selectedDialogueSceneData.lines ||
                      []
                    ).map(
                      (line) => (
                        <div
                          key={
                            line.id
                          }
                          style={{
                            padding: "10px",
                            borderRadius: "8px",
                            background:
                              "rgba(0,0,0,0.20)",
                            border:
                              "1px solid rgba(255,255,255,0.07)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent:
                                "space-between",
                              gap: "8px",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: "10px",
                                  fontWeight: "800",
                                }}
                              >
                                {line.characterName}
                              </div>

                              <div
                                style={{
                                  marginTop: "2px",
                                  fontSize: "7px",
                                  opacity: 0.45,
                                }}
                              >
                                {line.role}
                                {" • "}
                                {line.emotion}
                              </div>
                            </div>

                            <div
                              style={{
                                fontSize: "7px",
                                color:
                                  line.voice
                                    ?.status ===
                                  "ready"
                                    ? "rgba(70,255,150,0.85)"
                                    : "rgba(255,212,59,0.85)",
                                fontWeight: "800",
                                textAlign:
                                  "right",
                              }}
                            >
                              🎙️{" "}
                              {line.voice
                                ?.voiceName ||
                                "Reserved Voice"}
                              <br />
                              {line.voice
                                ?.voiceId ||
                                line.voice
                                  ?.slot ||
                                "Pending"}
                            </div>
                          </div>

                          <div
                            style={{
                              marginTop: "8px",
                              fontSize: "10px",
                              lineHeight: 1.55,
                            }}
                          >
                            “{line.text}”
                          </div>

                          <div
                            style={{
                              marginTop: "7px",
                              fontSize: "7px",
                              opacity: 0.45,
                            }}
                          >
                            ⏱️ Estimated{" "}
                            {
                              line.timing
                                ?.durationEstimateSec
                            }
                            s
                            {" • "}
                            {line.language}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              <div
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  borderRadius: "8px",
                  background:
                    "rgba(255,212,59,0.045)",
                  border:
                    "1px solid rgba(255,212,59,0.10)",
                  fontSize: "8px",
                  lineHeight: 1.5,
                  opacity: 0.7,
                }}
              >
                🧠 Production Brain now has structured
                dialogue. The next VOICE module can use
                each character's dialogue and voice
                assignment instead of asking the user to
                paste the script manually.
              </div>
            </>
          )}
        </div>
      )}

      {/* =====================================================
          VOICE STUDIO
      ===================================================== */}

      {activeModule === "VOICE" && (
        <div
          style={{
            marginTop: "14px",
            padding: "14px",
            borderRadius: "12px",
            border:
              "1px solid rgba(255,212,59,0.20)",
            background:
              "rgba(255,212,59,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "1px",
                  opacity: 0.55,
                }}
              >
                VOICE STUDIO
              </div>

              <h3
                style={{
                  margin: "4px 0 0",
                  fontSize: "16px",
                  fontWeight: "800",
                }}
              >
                🎙️ AI Voice
              </h3>
            </div>

            <button
              type="button"
              onClick={() => {
                stopGeneratedVoice();
                setActiveModule(null);
              }}
              style={{
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(255,255,255,0.05)",
                color: "inherit",
                borderRadius: "8px",
                padding: "6px 9px",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              CLOSE
            </button>
          </div>

          <div
            style={{
              padding: "12px",
              borderRadius: "10px",
              border:
                "1px solid rgba(255,212,59,0.30)",
              background:
                "rgba(255,212,59,0.07)",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: "800",
                letterSpacing: "1px",
                marginBottom: "5px",
              }}
            >
              ✨ BOMBA AI VOICE GENERATOR
            </div>

            <div
              style={{
                fontSize: "9px",
                opacity: 0.55,
                lineHeight: 1.5,
                marginBottom: "10px",
              }}
            >
              Choose a real 9jaLingo speaker and
              turn your dialogue into AI speech.
            </div>

            <label
              style={{
                display: "block",
                fontSize: "9px",
                fontWeight: "800",
                marginBottom: "5px",
              }}
            >
              LANGUAGE
            </label>

            <select
              value={voiceLanguage}
              onChange={(event) =>
                setVoiceLanguage(
                  event.target.value
                )
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px",
                marginBottom: "9px",
                borderRadius: "8px",
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(0,0,0,0.35)",
                color: "inherit",
                fontSize: "10px",
              }}
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

            <label
              style={{
                display: "block",
                fontSize: "9px",
                fontWeight: "800",
                marginBottom: "5px",
              }}
            >
              9JALINGO VOICE
            </label>

            <select
              value={voiceId}
              onChange={(event) =>
                setVoiceId(
                  event.target.value
                )
              }
              disabled={isGeneratingVoice}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px",
                marginBottom: "9px",
                borderRadius: "8px",
                border:
                  "1px solid rgba(255,212,59,0.35)",
                background:
                  "rgba(0,0,0,0.35)",
                color: "inherit",
                fontSize: "10px",
                outline: "none",
              }}
            >
              {availableVoices.map(
                (voice) => (
                  <option
                    key={voice.id}
                    value={voice.id}
                  >
                    {voice.name}
                    {voice.gender
                      ? ` — ${voice.gender}`
                      : ""}
                    {` (${voice.id})`}
                  </option>
                )
              )}
            </select>

            <div
              style={{
                fontSize: "8px",
                opacity: 0.45,
                marginBottom: "9px",
              }}
            >
              {availableVoices.length} confirmed
              9jaLingo speaker options.
            </div>

            <label
              style={{
                display: "block",
                fontSize: "9px",
                fontWeight: "800",
                marginBottom: "5px",
              }}
            >
              DIALOGUE / SCRIPT
            </label>

            <textarea
              value={voiceText}
              onChange={(event) =>
                setVoiceText(
                  event.target.value
                )
              }
              rows={6}
              maxLength={5000}
              placeholder="Enter the dialogue you want your AI character to speak..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                resize: "vertical",
                padding: "10px",
                borderRadius: "8px",
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(0,0,0,0.25)",
                color: "inherit",
                fontSize: "11px",
                lineHeight: 1.5,
                outline: "none",
              }}
            />

            <div
              style={{
                marginTop: "5px",
                textAlign: "right",
                fontSize: "8px",
                opacity: 0.4,
              }}
            >
              {voiceText.length} / 5000
            </div>

            <button
              type="button"
              onClick={generateAIVoice}
              disabled={isGeneratingVoice}
              style={{
                width: "100%",
                marginTop: "9px",
                padding: "12px",
                borderRadius: "8px",
                border:
                  "1px solid rgba(255,212,59,0.45)",
                background:
                  "rgba(255,212,59,0.15)",
                color: "inherit",
                fontSize: "10px",
                fontWeight: "800",
                cursor:
                  isGeneratingVoice
                    ? "wait"
                    : "pointer",
                opacity:
                  isGeneratingVoice
                    ? 0.65
                    : 1,
              }}
            >
              {isGeneratingVoice
                ? "⏳ CREATING AI VOICE..."
                : "🎙️ GENERATE AI VOICE"}
            </button>

            <div
              style={{
                marginTop: "10px",
                padding: "9px",
                borderRadius: "8px",
                background:
                  "rgba(0,0,0,0.20)",
                fontSize: "9px",
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              {generatedVoiceStatus}
            </div>

            {generatedVoiceError && (
              <div
                style={{
                  marginTop: "7px",
                  padding: "8px",
                  borderRadius: "7px",
                  background:
                    "rgba(255,70,70,0.08)",
                  border:
                    "1px solid rgba(255,70,70,0.20)",
                  fontSize: "8px",
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                }}
              >
                {generatedVoiceError}
              </div>
            )}

            {generatedVoiceUrl && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  borderRadius: "8px",
                  background:
                    "rgba(0,0,0,0.25)",
                  border:
                    "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: "800",
                    marginBottom: "7px",
                  }}
                >
                  ✅ AI VOICE READY
                </div>

                <audio
                  controls
                  preload="metadata"
                  src={generatedVoiceUrl}
                  style={{
                    width: "100%",
                    height: "40px",
                  }}
                />

                <button
                  type="button"
                  onClick={
                    playGeneratedVoice
                  }
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    padding: "10px",
                    borderRadius: "8px",
                    border:
                      "1px solid rgba(255,212,59,0.35)",
                    background:
                      "rgba(255,212,59,0.08)",
                    color: "inherit",
                    fontSize: "10px",
                    fontWeight: "800",
                    cursor: "pointer",
                  }}
                >
                  ▶️ PLAY AI VOICE
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          SOUND STUDIO
      ===================================================== */}

      {activeModule === "SOUND" && (
        <div
          style={{
            marginTop: "14px",
            padding: "14px",
            borderRadius: "12px",
            border:
              "1px solid rgba(255,212,59,0.20)",
            background:
              "rgba(255,212,59,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "1px",
                  opacity: 0.55,
                }}
              >
                SOUND STUDIO
              </div>

              <h3
                style={{
                  margin: "4px 0 0",
                  fontSize: "16px",
                  fontWeight: "800",
                }}
              >
                🔊 AI Sound
              </h3>
            </div>

            <button
              type="button"
              onClick={() => {
                stopGeneratedSound();
                setActiveModule(null);
              }}
              style={{
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(255,255,255,0.05)",
                color: "inherit",
                borderRadius: "8px",
                padding: "6px 9px",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              CLOSE
            </button>
          </div>

          <div
            style={{
              padding: "12px",
              borderRadius: "10px",
              border:
                "1px solid rgba(255,212,59,0.30)",
              background:
                "rgba(255,212,59,0.07)",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: "800",
                letterSpacing: "1px",
                marginBottom: "5px",
              }}
            >
              ✨ BOMBA AI SOUND GENERATOR
            </div>

            <div
              style={{
                fontSize: "9px",
                opacity: 0.55,
                lineHeight: 1.5,
                marginBottom: "10px",
              }}
            >
              Create original AI background music
              from your own description.
            </div>

            <textarea
              value={soundPrompt}
              onChange={(event) =>
                setSoundPrompt(
                  event.target.value
                )
              }
              rows={4}
              placeholder="Describe the music you want..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                resize: "vertical",
                padding: "10px",
                borderRadius: "8px",
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(0,0,0,0.25)",
                color: "inherit",
                fontSize: "11px",
                lineHeight: 1.5,
                outline: "none",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "9px",
              }}
            >
              <select
                value={soundDuration}
                onChange={(event) =>
                  setSoundDuration(
                    Number(
                      event.target.value
                    )
                  )
                }
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "8px",
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                  background:
                    "rgba(0,0,0,0.35)",
                  color: "inherit",
                  fontSize: "10px",
                }}
              >
                <option value={5}>
                  5 seconds
                </option>
                <option value={8}>
                  8 seconds
                </option>
                <option value={10}>
                  10 seconds
                </option>
                <option value={15}>
                  15 seconds
                </option>
                <option value={20}>
                  20 seconds
                </option>
                <option value={30}>
                  30 seconds
                </option>
              </select>

              <button
                type="button"
                onClick={
                  generateAISound
                }
                disabled={
                  isGeneratingSound
                }
                style={{
                  flex: 2,
                  padding: "10px",
                  borderRadius: "8px",
                  border:
                    "1px solid rgba(255,212,59,0.45)",
                  background:
                    "rgba(255,212,59,0.15)",
                  color: "inherit",
                  fontSize: "10px",
                  fontWeight: "800",
                  cursor:
                    isGeneratingSound
                      ? "wait"
                      : "pointer",
                  opacity:
                    isGeneratingSound
                      ? 0.65
                      : 1,
                }}
              >
                {isGeneratingSound
                  ? "⏳ CREATING SOUND..."
                  : "🎵 GENERATE AI SOUND"}
              </button>
            </div>

            <div
              style={{
                marginTop: "10px",
                padding: "9px",
                borderRadius: "8px",
                background:
                  "rgba(0,0,0,0.20)",
                fontSize: "9px",
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              {generatedSoundStatus}
            </div>

            {generatedSoundError && (
              <div
                style={{
                  marginTop: "7px",
                  padding: "8px",
                  borderRadius: "7px",
                  background:
                    "rgba(255,70,70,0.08)",
                  border:
                    "1px solid rgba(255,70,70,0.20)",
                  fontSize: "8px",
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                }}
              >
                {generatedSoundError}
              </div>
            )}

            {generatedAudioUrl && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  borderRadius: "8px",
                  background:
                    "rgba(0,0,0,0.25)",
                  border:
                    "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: "800",
                    marginBottom: "7px",
                  }}
                >
                  ✅ AI SOUND READY
                </div>

                <audio
                  controls
                  preload="metadata"
                  src={generatedAudioUrl}
                  style={{
                    width: "100%",
                    height: "40px",
                  }}
                />

                <button
                  type="button"
                  onClick={
                    playGeneratedSound
                  }
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    padding: "10px",
                    borderRadius: "8px",
                    border:
                      "1px solid rgba(255,212,59,0.35)",
                    background:
                      "rgba(255,212,59,0.08)",
                    color: "inherit",
                    fontSize: "10px",
                    fontWeight: "800",
                    cursor: "pointer",
                  }}
                >
                  ▶️ PLAY AI SOUND
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}