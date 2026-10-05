"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import PlanPanel from "./components/Plan/PlanPanel";
import StudioBoard from "./components/StudioBoard/StudioBoard";

import {
  initializeProduction,
  changeStage,
  getProduction,
} from "../lib/bomba/productionStore";

export default function Home() {
  const [mode, setMode] = useState("Movie");
  const [prompt, setPrompt] = useState("");
  const [characterImage, setCharacterImage] = useState(null);

  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const [showApiKey, setShowApiKey] = useState(false);
  const [apiEmail, setApiEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiLoading, setApiLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState("");

  const pollingRef = useRef(null);

  const fileInputRef = useRef(null);

  const modes = [
    "Movie",
    "Program",
    "Acting",
    "Ad",
    "Social Media",
    "Presenter",
    "Story",
  ];

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        pollingRef.current.cancelled = true;
        pollingRef.current = null;
      }
    };
  }, []);

  /* =====================================================
     SAFE JSON RESPONSE READER
  ===================================================== */

  const readJsonResponse = async (res) => {
    const text = await res.text();

    console.log("BOMBA RAW RESPONSE:", text);

    if (!text || !text.trim()) {
      return {};
    }

    try {
      const parsed = JSON.parse(text);

      if (
        parsed === null ||
        typeof parsed !== "object"
      ) {
        return {};
      }

      return parsed;
    } catch {
      throw new Error(
        text.length > 500
          ? text.substring(0, 500)
          : text
      );
    }
  };

  /* =====================================================
     SAFE ERROR
  ===================================================== */

  const getSafeErrorMessage = (
    data,
    fallback
  ) => {
    const possibleMessages = [
      data?.error,
      data?.message,
      data?.detail,
      data?.details,
      data?.rawEternalError,
      data?.rawWanError,
      fallback,
    ];

    for (const message of possibleMessages) {
      if (
        typeof message === "string" &&
        message.trim() &&
        message.trim().toLowerCase() !== "null" &&
        message.trim().toLowerCase() !== "undefined"
      ) {
        return message.trim();
      }
    }

    return fallback;
  };

  /* =====================================================
     IMAGE UPLOAD
  ===================================================== */

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCharacterImage(reader.result);
        setError("");
      }
    };

    reader.onerror = () => {
      alert(
        "Failed to read the image. Please try another file."
      );
    };

    reader.readAsDataURL(file);
  };

  const removeCharacterImage = () => {
    setCharacterImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* =====================================================
     STOP POLLING
  ===================================================== */

  const stopPolling = () => {
    if (pollingRef.current) {
      pollingRef.current.cancelled = true;
      pollingRef.current = null;
    }
  };

  /* =====================================================
     WAIT
  ===================================================== */

  const wait = (milliseconds) => {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  };

  /* =====================================================
     EXTRACT VIDEO URL
  ===================================================== */

  const extractVideoUrl = (data) => {
    const possibleUrls = [
      data?.videoUrl,
      data?.video_url,
      data?.video?.url,
      data?.output,
      Array.isArray(data?.output)
        ? data.output[0]
        : null,
    ];

    for (const value of possibleUrls) {
      if (
        typeof value === "string" &&
        value.trim()
      ) {
        return value.trim();
      }
    }

    return null;
  };

  /* =====================================================
     EXTRACT JOB ID
  ===================================================== */

  const extractJobId = (data) => {
    const possibleIds = [
      data?.id,
      data?.jobId,
      data?.request_id,
      data?.predictionId,
      data?.eventId,
    ];

    for (const value of possibleIds) {
      if (
        typeof value === "string" &&
        value.trim()
      ) {
        return value.trim();
      }
    }

    return null;
  };

  /* =====================================================
     MARK PRODUCTION STAGE
  ===================================================== */

  const markStage = (
    stage,
    data
  ) => {
    try {
      return changeStage(stage, data);
    } catch (stageError) {
      console.error(
        `BOMBA ${stage.toUpperCase()} STAGE ERROR:`,
        stageError
      );

      return null;
    }
  };

  /* =====================================================
     CREATE MASTER STORY
  ===================================================== */

  const createMasterStory = (
    cleanIdea
  ) => {
    const title =
      cleanIdea.length > 70
        ? cleanIdea.substring(0, 70)
        : cleanIdea;

    return {
      id: `story-${Date.now()}`,

      title:
        title ||
        "BOMBA AI Production",

      logline:
        `A cinematic ${mode.toLowerCase()} story based on: ${cleanIdea}`,

      genre:
        mode === "Ad"
          ? "Commercial"
          : mode === "Social Media"
            ? "Social"
            : "Drama / Cinematic",

      setting:
        "Modern Nigeria",

      beginning:
        `The story begins with the main character experiencing the situation described in the idea: ${cleanIdea}`,

      middle:
        "The main character moves through the environment, interacts naturally with the people around them, and the situation develops.",

      conflict:
        "A realistic obstacle or moment of uncertainty creates tension.",

      turningPoint:
        "The main character makes an important decision that changes the direction of the story.",

      ending:
        "The story concludes with a natural cinematic resolution.",

      themes: [
        "Human connection",
        "Real life",
        "Courage",
        "Growth",
      ],

      scenes: [
        {
          sceneNumber: 1,
          title: "Opening",
          location: "Modern Nigerian environment",
          time: "Morning",
          description:
            `Establish the world and introduce the main character. ${cleanIdea}`,
          action:
            "The main character enters the environment naturally.",
        },

        {
          sceneNumber: 2,
          title: "The Encounter",
          location: "Busy Nigerian street",
          time: "Afternoon",
          description:
            "The main character encounters another person.",
          action:
            "The characters interact naturally.",
        },

        {
          sceneNumber: 3,
          title: "The Challenge",
          location: "Urban Nigerian environment",
          time: "Evening",
          description:
            "The central conflict becomes clear.",
          action:
            "The main character reacts to the situation.",
        },

        {
          sceneNumber: 4,
          title: "Turning Point",
          location: "Quiet Nigerian location",
          time: "Night",
          description:
            "The character makes an important decision.",
          action:
            "The situation changes direction.",
        },

        {
          sceneNumber: 5,
          title: "Resolution",
          location: "Modern Nigerian environment",
          time: "Morning",
          description:
            "The story reaches its conclusion.",
          action:
            "The characters move forward.",
        },
      ],

      shots: [
        {
          shotNumber: 1,
          sceneNumber: 1,
          type: "Wide Shot",
          camera:
            "Slow cinematic push-in",
          description:
            "Establish the environment and main character.",
          character:
            "Main Character",
        },

        {
          shotNumber: 2,
          sceneNumber: 1,
          type: "Medium Shot",
          camera:
            "Natural handheld movement",
          description:
            "Show the main character moving naturally.",
          character:
            "Main Character",
        },

        {
          shotNumber: 3,
          sceneNumber: 2,
          type: "Two Shot",
          camera:
            "Eye-level cinematic camera",
          description:
            "Show the characters interacting.",
          character:
            "Main Character and Friend",
        },

        {
          shotNumber: 4,
          sceneNumber: 3,
          type: "Close Up",
          camera:
            "Slow push-in",
          description:
            "Capture the emotional reaction.",
          character:
            "Main Character",
        },

        {
          shotNumber: 5,
          sceneNumber: 4,
          type: "Over Shoulder",
          camera:
            "Subtle dolly movement",
          description:
            "Show the important conversation.",
          character:
            "Main Character",
        },

        {
          shotNumber: 6,
          sceneNumber: 5,
          type: "Wide Cinematic",
          camera:
            "Slow pull-back",
          description:
            "End with a cinematic resolution.",
          character:
            "Main Character",
        },
      ],
    };
  };

  /* =====================================================
     CREATE MASTER CHARACTERS
  ===================================================== */

  const createMasterCharacters = () => {
    return [
      {
        id: "character-main",
        name: "Main Character",
        role: "Main Character",
        gender: "Male",
        voiceId: "ada_pcm",
        voiceName: "Ada",
        voiceGender: "Female",
        voiceStatus: "ready",
      },

      {
        id: "character-friend",
        name: "Friend",
        role: "Support Character",
        gender: "Female",
        voiceId: "blessing_pcm",
        voiceName: "Blessing",
        voiceGender: "Female",
        voiceStatus: "ready",
      },

      {
        id: "character-rival",
        name: "Rival",
        role: "Rival",
        gender: "Male",
        voiceId: "ifeanyi_ig",
        voiceName: "Ifeanyi",
        voiceGender: "Male",
        voiceStatus: "ready",
      },
    ];
  };

  /* =====================================================
     CREATE MASTER DIALOGUE
  ===================================================== */

  const createMasterDialogue = (
    story,
    characters
  ) => {
    const main =
      characters[0];

    const friend =
      characters[1];

    const lines = [
      {
        id: `dialogue-1-${Date.now()}`,
        sceneNumber: 1,
        characterId: main.id,
        characterName: main.name,
        role: main.role,
        text:
          "Today, I feel like something is about to change.",
        emotion: "thoughtful",
        voice: main.voiceId,
        timing: "0-5",
        audio: null,
      },

      {
        id: `dialogue-2-${Date.now()}`,
        sceneNumber: 2,
        characterId: friend.id,
        characterName: friend.name,
        role: friend.role,
        text:
          "You know say sometimes, na just one step we need to take.",
        emotion: "encouraging",
        voice: friend.voiceId,
        timing: "5-10",
        audio: null,
      },

      {
        id: `dialogue-3-${Date.now()}`,
        sceneNumber: 3,
        characterId: main.id,
        characterName: main.name,
        role: main.role,
        text:
          "I no go allow fear stop me from trying.",
        emotion: "determined",
        voice: main.voiceId,
        timing: "10-15",
        audio: null,
      },

      {
        id: `dialogue-4-${Date.now()}`,
        sceneNumber: 4,
        characterId: friend.id,
        characterName: friend.name,
        role: friend.role,
        text:
          "Then make we start. One small step at a time.",
        emotion: "hopeful",
        voice: friend.voiceId,
        timing: "15-20",
        audio: null,
      },

      {
        id: `dialogue-5-${Date.now()}`,
        sceneNumber: 5,
        characterId: main.id,
        characterName: main.name,
        role: main.role,
        text:
          "This is only the beginning.",
        emotion: "confident",
        voice: main.voiceId,
        timing: "20-23",
        audio: null,
      },
    ];

    return {
      mode: "master",
      language: "pcm",
      storyId: story.id,
      title: story.title,
      lines,
      scenes: story.scenes,
      totalLines: lines.length,
      estimatedDurationSec: 23,
      createdAt:
        new Date().toISOString(),
    };
  };

  /* =====================================================
     BUILD MASTER VIDEO PLAN
  ===================================================== */

  const createMasterVideoPlan = (
    story,
    characters,
    dialogue
  ) => {
    const scenes = story.scenes || [];
    const shots = story.shots || [];

    const videoScenes =
      scenes.map((scene) => {
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

        const sceneDialogue =
          dialogue.lines.filter(
            (line) =>
              Number(
                line.sceneNumber
              ) ===
              Number(
                scene.sceneNumber
              )
          );

        return {
          ...scene,
          shots: sceneShots,
          dialogue:
            sceneDialogue,
        };
      });

    return {
      mode,
      storyId: story.id,
      title: story.title,
      totalScenes:
        scenes.length,
      totalShots:
        shots.length,
      voiceConnected: true,
      soundConnected: true,
      characters,
      scenes: videoScenes,
      createdAt:
        new Date().toISOString(),
    };
  };

  /* =====================================================
     GENERATE BOMBA AI VOICE FOR MASTER WORKFLOW
  ===================================================== */

  const generateMasterVoice = async (
    dialogue
  ) => {
    const lines =
      Array.isArray(dialogue?.lines)
        ? dialogue.lines
        : [];

    if (!lines.length) {
      throw new Error(
        "No dialogue was available for the voice stage."
      );
    }

    setStatus(
      "Generating BOMBA AI voices... 🎙️"
    );

    // -----------------------------------------
    // Generate every dialogue line separately
    // -----------------------------------------

    const generatedAudio = [];

    for (
      let index = 0;
      index < lines.length;
      index++
    ) {
      const line = lines[index];

      if (!line) continue;

      const speaker =
        line?.speaker ||
        line?.characterName ||
        line?.character ||
        line?.name ||
        "";

      const text =
        String(
          line?.text ||
          line?.dialogue ||
          line?.line ||
          ""
        ).trim();

      if (!text) continue;

      // ---------------------------------------
      // Use the voice assigned to the character
      // ---------------------------------------

      let voiceId =
        line?.voice ||
        "";

      if (!voiceId) {
        if (
          line?.characterId ===
          "character-friend"
        ) {
          voiceId =
            "blessing_pcm";
        } else {
          voiceId =
            "ada_pcm";
        }
      }

      const language =
        "pcm";

      // ---------------------------------------
      // Convert timing such as "5-10"
      // into startTime = 5
      // ---------------------------------------

      let startTime = 0;

      if (
        typeof line?.timing ===
        "string"
      ) {
        const timingParts =
          line.timing
            .split("-")
            .map((value) =>
              Number(value.trim())
            );

        if (
          Number.isFinite(
            timingParts[0]
          )
        ) {
          startTime =
            timingParts[0];
        }
      } else if (
        Number.isFinite(
          Number(line?.startTime)
        )
      ) {
        startTime =
          Number(line.startTime);
      }

      console.log(
        "======================================"
      );

      console.log(
        `BOMBA VOICE LINE ${index + 1}`
      );

      console.log(
        "Speaker:",
        speaker
      );

      console.log(
        "Voice:",
        voiceId
      );

      console.log(
        "Start Time:",
        startTime
      );

      console.log(
        "Text:",
        text
      );

      // ---------------------------------------
      // Generate this dialogue line
      // ---------------------------------------

      const response =
        await fetch(
          "/api/voice/generate",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "audio/mpeg, application/json",
            },

            body: JSON.stringify({
              text,
              voiceId,
              language,
              character:
                speaker,
            }),
          }
        );

      if (!response.ok) {
        let data = {};

        try {
          data =
            await readJsonResponse(
              response
            );
        } catch {}

        throw new Error(
          getSafeErrorMessage(
            data,
            `Voice generation failed for ${
              speaker ||
              "unknown character"
            }.`
          )
        );
      }

      // ---------------------------------------
      // Read generated audio
      // ---------------------------------------

      const audioBuffer =
        await response.arrayBuffer();

      if (
        !audioBuffer.byteLength
      ) {
        throw new Error(
          `BOMBA AI returned an empty voice file for ${
            speaker ||
            "unknown character"
          }.`
        );
      }

      const audioBlob =
        new Blob(
          [audioBuffer],
          {
            type: "audio/mpeg",
          }
        );

      const localAudioUrl =
        URL.createObjectURL(
          audioBlob
        );

      // ---------------------------------------
      // Upload this voice line to Cloudinary
      // ---------------------------------------

      let cloudinaryData =
        null;

      const cloudName =
        process.env
          .NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
        "";

      const uploadPreset =
        process.env
          .NEXT_PUBLIC_CLOUDINARY_VOICE_PRESET ||
        "bomba_voice";

      if (!cloudName) {
        throw new Error(
          "Cloudinary Cloud Name is not configured."
        );
      }

      try {
        const formData =
          new FormData();

        formData.append(
          "file",
          audioBlob,
          `bomba-voice-${index + 1}.mp3`
        );

        formData.append(
          "upload_preset",
          uploadPreset
        );

        const cloudinaryResponse =
          await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
            {
              method: "POST",
              body: formData,
            }
          );

        const cloudinaryText =
          await cloudinaryResponse.text();

        if (
          !cloudinaryResponse.ok
        ) {
          throw new Error(
            cloudinaryText ||
              `Cloudinary upload failed with HTTP ${cloudinaryResponse.status}.`
          );
        }

        try {
          cloudinaryData =
            cloudinaryText
              ? JSON.parse(
                  cloudinaryText
                )
              : {};
        } catch {
          cloudinaryData = {};
        }
      } catch (
        cloudinaryError
      ) {
        throw new Error(
          `Cloudinary voice upload failed for ${
            speaker ||
            "unknown character"
          }: ${
            cloudinaryError?.message ||
            "Unknown Cloudinary error."
          }`
        );
      }

      if (
        !cloudinaryData?.public_id
      ) {
        throw new Error(
          `Cloudinary did not return a public ID for ${
            speaker ||
            "unknown character"
          }.`
        );
      }

      // ---------------------------------------
      // Store complete voice track
      // ---------------------------------------

      generatedAudio.push({
        index,

        speaker,

        text,

        voiceId,

        language,

        audioUrl:
          cloudinaryData?.secure_url ||
          cloudinaryData?.url ||
          localAudioUrl,

        cloudinaryPublicId:
          cloudinaryData.public_id,

        resourceType:
          cloudinaryData.resource_type ||
          "video",

        startTime,

        timing:
          line?.timing ||
          `${startTime}`,

        status:
          "completed",

        blob:
          audioBlob,
      });

      console.log(
        "BOMBA VOICE TRACK READY:",
        {
          index,
          speaker,
          voiceId,
          startTime,
          publicId:
            cloudinaryData.public_id,
        }
      );
    }

    // -----------------------------------------
    // Make sure we actually generated tracks
    // -----------------------------------------

    if (!generatedAudio.length) {
      throw new Error(
        "BOMBA AI did not generate any dialogue voice tracks."
      );
    }

    // -----------------------------------------
    // Build final voice track list
    // -----------------------------------------

    const voiceTracks =
      generatedAudio.map(
        (item) => ({
          speaker:
            item.speaker,

          text:
            item.text,

          voiceId:
            item.voiceId,

          language:
            item.language,

          publicId:
            item.cloudinaryPublicId,

          cloudinaryPublicId:
            item.cloudinaryPublicId,

          resourceType:
            item.resourceType,

          audioUrl:
            item.audioUrl,

          startTime:
            item.startTime,

          status:
            item.status,
        })
      );

    // -----------------------------------------
    // Save all voice tracks for finalizer
    // -----------------------------------------

    try {
      localStorage.setItem(
        "bomba_voice_tracks",
        JSON.stringify(
          voiceTracks
        )
      );

      // Keep the old single-voice key
      // for backward compatibility.
      localStorage.setItem(
        "bomba_voice_public_id",
        voiceTracks[0]
          ?.publicId || ""
      );

      localStorage.setItem(
        "bomba_voice_cloudinary_resource_type",
        voiceTracks[0]
          ?.resourceType ||
          "video"
      );

      localStorage.setItem(
        "bomba_voice_language",
        language
      );
    } catch (
      storageError
    ) {
      console.warn(
        "BOMBA: Could not save voice tracks to localStorage.",
        storageError
      );
    }

    console.log(
      "======================================"
    );

    console.log(
      "BOMBA MASTER VOICE TRACKS READY"
    );

    console.log(
      "VOICE TRACK COUNT:",
      voiceTracks.length
    );

    console.log(
      "VOICE TRACKS:",
      voiceTracks
    );

    console.log(
      "======================================"
    );

    // -----------------------------------------
    // Return complete voice production
    // -----------------------------------------

    return {
      mode:
        "master",

      language,

      status:
        "completed",

      characterVoices:
        lines.reduce(
          (map, line) => {
            if (
              line?.characterName
            ) {
              map[
                line.characterName
              ] =
                line?.voice ||
                "ada_pcm";
            }

            return map;
          },
          {}
        ),

      dialogue:
        generatedAudio,

      voiceTracks,

      voices:
        voiceTracks,

      totalTracks:
        voiceTracks.length,

      createdAt:
        new Date().toISOString(),
    };
  };

  /* =====================================================
     GENERATE MASTER SOUND
  ===================================================== */

  const generateMasterSound = async () => {
    setStatus(
      "Generating cinematic sound... 🔊"
    );

    const soundPrompt =
      `cinematic emotional background music for a realistic ${mode.toLowerCase()} video, natural Nigerian atmosphere, subtle professional film score`;

    const duration = 23;

    const response =
      await fetch(
        "/api/sound/generate",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
          },
          body: JSON.stringify({
            type: "Background Music",
            prompt:
              soundPrompt,
            duration,
          }),
        }
      );

    const data =
      await readJsonResponse(
        response
      );

    if (!response.ok) {
      throw new Error(
        getSafeErrorMessage(
          data,
          "BOMBA AI sound generation failed."
        )
      );
    }

    return {
      type: "Background Music",
      prompt: soundPrompt,
      duration,
      audioUrl:
        data?.audioUrl ||
        data?.audio_url ||
        null,
      status:
        data?.audioUrl ||
        data?.audio_url
          ? "completed"
          : "processing",
      createdAt:
        new Date().toISOString(),
    };
  };

    /* =====================================================
     FINALIZE VIDEO WITH BOMBA VOICES
  ===================================================== */

  const finalizeVideoWithVoice = async (
    generatedVideoUrl
  ) => {
    if (!generatedVideoUrl) {
      return generatedVideoUrl;
    }

    let voiceTracks = [];

    try {
      const storedTracks =
        localStorage.getItem(
          "bomba_voice_tracks"
        );

      if (storedTracks) {
        const parsedTracks =
          JSON.parse(storedTracks);

        if (
          Array.isArray(
            parsedTracks
          )
        ) {
          voiceTracks =
            parsedTracks.filter(
              (track) =>
                track?.publicId
            );
        }
      }
    } catch (storageError) {
      console.error(
        "BOMBA VOICE TRACK STORAGE ERROR:",
        storageError
      );
    }

    // -----------------------------------------
    // Backward compatibility with old
    // single-voice storage
    // -----------------------------------------

    if (!voiceTracks.length) {
      let legacyVoicePublicId = "";

      try {
        legacyVoicePublicId =
          localStorage.getItem(
            "bomba_voice_public_id"
          ) || "";
      } catch (storageError) {
        console.error(
          "BOMBA LEGACY VOICE STORAGE ERROR:",
          storageError
        );
      }

      if (legacyVoicePublicId) {
        voiceTracks = [
          {
            publicId:
              legacyVoicePublicId,
            startTime: 0,
          },
        ];
      }
    }

    if (!voiceTracks.length) {
      console.log(
        "BOMBA: No Cloudinary voice tracks found. Keeping original video."
      );

      return generatedVideoUrl;
    }

    // -----------------------------------------
    // Clean tracks before sending them
    // -----------------------------------------

    voiceTracks =
      voiceTracks.map(
        (track) => ({
          publicId:
            String(
              track?.publicId ||
              track?.cloudinaryPublicId ||
              ""
            ).trim(),

          startTime:
            Number.isFinite(
              Number(
                track?.startTime
              )
            )
              ? Number(
                  track.startTime
                )
              : 0,
        })
      ).filter(
        (track) =>
          track.publicId
      );

    if (!voiceTracks.length) {
      console.log(
        "BOMBA: Voice tracks were empty after cleanup. Keeping original video."
      );

      return generatedVideoUrl;
    }

    console.log(
      "======================================"
    );

    console.log(
      "BOMBA FINALIZER VOICE HANDOFF"
    );

    console.log(
      "VOICE TRACK COUNT:",
      voiceTracks.length
    );

    console.log(
      "VOICE TRACKS:",
      voiceTracks
    );

    console.log(
      "======================================"
    );

    setStatus(
      `Video ready. Adding ${voiceTracks.length} BOMBA AI voice tracks... 🎙️`
    );

    const finalizeResponse =
      await fetch(
        "/api/video/finalize",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body: JSON.stringify({
            videoUrl:
              generatedVideoUrl,

            voiceTracks,
          }),
        }
      );

    const finalizeData =
      await readJsonResponse(
        finalizeResponse
      );

    if (
      !finalizeResponse.ok ||
      finalizeData?.status !==
        "completed" ||
      !finalizeData?.videoUrl
    ) {
      throw new Error(
        getSafeErrorMessage(
          finalizeData,
          "Unable to attach the BOMBA AI voices to the video."
        )
      );
    }

    console.log(
      "BOMBA FINAL VIDEO WITH VOICES READY:",
      finalizeData.videoUrl
    );

    return finalizeData.videoUrl;
  };

  /* =====================================================
     COMPLETE FINAL PRODUCTION STAGES
  ===================================================== */

  const completeFinalStages = (
    finalVideoUrl,
    production
  ) => {
    try {
      const timelineData = {
        videoUrl:
          finalVideoUrl,
        video:
          production?.video?.data ||
          null,
        voices:
          production?.voices?.data ||
          null,
        sound:
          production?.sound?.data ||
          null,
        status: "completed",
        createdAt:
          new Date().toISOString(),
      };

      const afterTimeline =
        markStage(
          "timeline",
          timelineData
        );

      const previewData = {
        videoUrl:
          finalVideoUrl,
        timeline:
          afterTimeline?.timeline?.data ||
          timelineData,
        status: "completed",
        createdAt:
          new Date().toISOString(),
      };

      const afterPreview =
        markStage(
          "preview",
          previewData
        );

      markStage(
        "export",
        {
          videoUrl:
            finalVideoUrl,
          preview:
            afterPreview?.preview?.data ||
            previewData,
          status: "completed",
          exportedAt:
            new Date().toISOString(),
        }
      );
    } catch (stageError) {
      console.error(
        "BOMBA FINAL STAGES ERROR:",
        stageError
      );
    }
  };

  /* =====================================================
     CHECK VIDEO
  ===================================================== */

  const pollVideo = async (
    predictionId
  ) => {
    const controller = {
      cancelled: false,
    };

    stopPolling();

    pollingRef.current =
      controller;

    const maxAttempts = 20;
    const startedAt =
      Date.now();

    for (
      let attempts = 1;
      attempts <= maxAttempts;
      attempts++
    ) {
      if (
        controller.cancelled
      ) {
        return;
      }

      try {
        const elapsedSeconds =
          Math.floor(
            (Date.now() -
              startedAt) /
              1000
          );

        setStatus(
          attempts === 1
            ? "Connecting to Eternal AI... 🎬 0 sec"
            : `Eternal AI is still generating your video... ${elapsedSeconds} sec`
        );

        const pollUrl =
          `/api/video/generate?id=${encodeURIComponent(
            predictionId
          )}`;

        const res =
          await fetch(
            pollUrl,
            {
              method: "GET",
              cache:
                "no-store",
              headers: {
                Accept:
                  "application/json, video/*",
              },
            }
          );

        if (
          controller.cancelled
        ) {
          return;
        }

        const contentType =
          res.headers.get(
            "content-type"
          ) || "";

        /* =============================================
           DIRECT VIDEO
        ============================================= */

        if (
          res.ok &&
          contentType
            .toLowerCase()
            .startsWith("video/")
        ) {
          const videoBlob =
            await res.blob();

          if (!videoBlob.size) {
            throw new Error(
              "Eternal AI returned an empty video file."
            );
          }

          const generatedVideoUrl =
            URL.createObjectURL(
              videoBlob
            );

          const finalVideoUrl =
            await finalizeVideoWithVoice(
              generatedVideoUrl
            );

          completeFinalStages(
            finalVideoUrl,
            null
          );

          setVideoUrl(
            finalVideoUrl
          );

          setStatus(
            "Production complete! 🎬🎙️🔊"
          );

          setError("");
          setLoading(false);

          pollingRef.current =
            null;

          return;
        }

        let data;

        try {
          data =
            await readJsonResponse(
              res
            );
        } catch (
          parseError
        ) {
          if (
            attempts <
            maxAttempts
          ) {
            await wait(
              3000
            );

            continue;
          }

          throw parseError;
        }

        const returnedVideoUrl =
          extractVideoUrl(
            data
          );

        /* =============================================
           JSON VIDEO
        ============================================= */

        if (
          res.ok &&
          returnedVideoUrl
        ) {
          const finalVideoUrl =
            await finalizeVideoWithVoice(
              returnedVideoUrl
            );

          completeFinalStages(
            finalVideoUrl,
            null
          );

          setVideoUrl(
            finalVideoUrl
          );

          setStatus(
            "Production complete! 🎬🎙️🔊"
          );

          setError("");
          setLoading(false);

          pollingRef.current =
            null;

          return;
        }

        const currentStatus =
          typeof data.status ===
          "string"
            ? data.status.toLowerCase()
            : "";

        /* =============================================
           FAILED
        ============================================= */

        if (
          currentStatus ===
            "failed" ||
          currentStatus ===
            "error" ||
          currentStatus ===
            "canceled" ||
          currentStatus ===
            "cancelled"
        ) {
          throw new Error(
            getSafeErrorMessage(
              data,
              "Eternal AI video generation failed."
            )
          );
        }

        /* =============================================
           EXPIRED
        ============================================= */

        if (
          res.status ===
            410 ||
          currentStatus ===
            "expired"
        ) {
          throw new Error(
            getSafeErrorMessage(
              data,
              "The Eternal AI generation request expired."
            )
          );
        }

        /* =============================================
           PROCESSING
        ============================================= */

        if (
          currentStatus ===
            "processing" ||
          currentStatus ===
            "queued" ||
          currentStatus ===
            "in_queue" ||
          currentStatus ===
            "in_progress" ||
          currentStatus ===
            "pending" ||
          currentStatus ===
            "started" ||
          res.status ===
            202
        ) {
          if (
            attempts <
            maxAttempts
          ) {
            await wait(
              3000
            );

            continue;
          }

          throw new Error(
            "The video is taking longer than expected. Eternal AI may still be generating it."
          );
        }

        if (!res.ok) {
          throw new Error(
            getSafeErrorMessage(
              data,
              `Unable to check video status (${res.status}).`
            )
          );
        }

        if (
          attempts <
          maxAttempts
        ) {
          await wait(
            3000
          );

          continue;
        }

        throw new Error(
          "Eternal AI did not return a final video result."
        );
      } catch (err) {
        console.error(
          "BOMBA VIDEO STATUS ERROR:",
          err
        );

        if (
          controller.cancelled
        ) {
          return;
        }

        if (
          attempts <
          maxAttempts
        ) {
          setStatus(
            "Eternal AI is still working... reconnecting..."
          );

          await wait(
            3000
          );

          continue;
        }

        pollingRef.current =
          null;

        setError(
          getSafeErrorMessage(
            {
              error:
                err?.message,
            },
            "Unable to retrieve the generated video."
          )
        );

        setStatus("");
        setLoading(false);

        return;
      }
    }

    pollingRef.current =
      null;

    setError(
      "The video is taking longer than expected. Please try again shortly."
    );

    setStatus("");
    setLoading(false);
  };

  /* =====================================================
     MASTER PRODUCTION WORKFLOW
  ===================================================== */

  const runMasterProduction =
    async () => {
      const cleanIdea =
        prompt.trim();

      if (!cleanIdea) {
        throw new Error(
          "Please describe your video first."
        );
      }

      if (!characterImage) {
        throw new Error(
          "Please upload a picture first."
        );
      }

      console.log(
        "======================================"
      );

      console.log(
        "BOMBA MASTER PRODUCTION START"
      );

      console.log(
        "======================================"
      );

      /* =============================================
         IDEA
      ============================================= */

      setStatus(
        "01/12 — Saving your idea... 💡"
      );

      let production =
        initializeProduction(
          cleanIdea
        );

      production =
        markStage(
          "idea",
          {
            prompt:
              cleanIdea,
            mode,
            characterImage,
            createdAt:
              new Date().toISOString(),
          }
        ) ||
        production;

      /* =============================================
         STORY / PLAN
      ============================================= */

      setStatus(
        "02/12 — Building your story and plan... 📋"
      );

      const story =
        createMasterStory(
          cleanIdea
        );

      production =
        markStage(
          "story",
          {
            mode,
            plan: story,
            idea: cleanIdea,
            createdAt:
              new Date().toISOString(),
          }
        ) ||
        production;

      /* =============================================
         CHARACTERS
      ============================================= */

      setStatus(
        "03/12 — Creating characters... 👤"
      );

      const characters =
        createMasterCharacters();

      production =
        markStage(
          "characters",
          {
            mode,
            language: "pcm",
            characters,
            totalCharacters:
              characters.length,
            createdAt:
              new Date().toISOString(),
          }
        ) ||
        production;

      /* =============================================
         DIALOGUE
      ============================================= */

      setStatus(
        "04/12 — Writing dialogue... 💬"
      );

      const dialogue =
        createMasterDialogue(
          story,
          characters
        );

      production =
        markStage(
          "dialogue",
          {
            ...dialogue,
            createdAt:
              new Date().toISOString(),
          }
        ) ||
        production;

      /* =============================================
         SCENES
      ============================================= */

      setStatus(
        "05/12 — Preparing scenes... 🎬"
      );

      production =
        markStage(
          "scenes",
          {
            mode,
            storyId:
              story.id,
            scenes:
              story.scenes,
            totalScenes:
              story.scenes.length,
            createdAt:
              new Date().toISOString(),
          }
        ) ||
        production;

      /* =============================================
         SHOTS
      ============================================= */

      setStatus(
        "06/12 — Preparing cinematic shots... 📷"
      );

      production =
        markStage(
          "shots",
          {
            mode,
            storyId:
              story.id,
            shots:
              story.shots,
            totalShots:
              story.shots.length,
            createdAt:
              new Date().toISOString(),
          }
        ) ||
        production;

      /* =============================================
         VOICE
      ============================================= */

      setStatus(
        "07/12 — Generating AI voice... 🎙️"
      );

      let voiceData;

      try {
        voiceData =
  await generateMasterVoice(
    dialogue
  );
        production =
          markStage(
            "voices",
            voiceData
          ) ||
          production;
      } catch (voiceError) {
        console.error(
          "BOMBA MASTER VOICE ERROR:",
          voiceError
        );

        /*
         * Voice is important, but we don't kill
         * the entire production if the voice API
         * temporarily fails.
         */
        production =
          markStage(
            "voices",
            {
              status:
                "failed",
              error:
                voiceError?.message ||
                "Voice generation failed.",
              createdAt:
                new Date().toISOString(),
            }
          ) ||
          production;
      }

      /* =============================================
         SOUND
      ============================================= */

      setStatus(
        "08/12 — Generating cinematic sound... 🔊"
      );

      let soundData;

      try {
        soundData =
          await generateMasterSound();

        production =
          markStage(
            "sound",
            soundData
          ) ||
          production;
      } catch (soundError) {
        console.error(
          "BOMBA MASTER SOUND ERROR:",
          soundError
        );

        production =
          markStage(
            "sound",
            {
              status:
                "failed",
              error:
                soundError?.message ||
                "Sound generation failed.",
              createdAt:
                new Date().toISOString(),
            }
          ) ||
          production;
      }

      /* =============================================
         VIDEO PLAN
      ============================================= */

      setStatus(
        "09/12 — Connecting scenes, shots, dialogue, voice and sound... 🎥"
      );

      const videoPlan =
        createMasterVideoPlan(
          story,
          characters,
          dialogue
        );

      production =
        markStage(
          "video",
          {
            ...videoPlan,
            status:
              "ready",
          }
        ) ||
        production;

      /* =============================================
         TIMELINE PREPARATION
      ============================================= */

      setStatus(
        "10/12 — Preparing production timeline... ⏱️"
      );

      /*
       * The actual timeline is finalized after
       * Eternal AI returns the video.
       */

      /* =============================================
         ETERNAL AI VIDEO
      ============================================= */

      setStatus(
        "11/12 — Sending the complete production to Eternal AI... 🎬"
      );

      const realisticPrompt = `
Photorealistic live-action cinematic video.

No cartoon.
No anime.
No illustration.
No CGI-looking humans.

Natural human skin texture.
Realistic body movement.
Natural facial expressions.
Natural lighting.
Realistic Nigerian environment.
Professional cinematic camera movement.

Mode:
${mode}

Original idea:
${cleanIdea}

Story:
${story.logline}

Beginning:
${story.beginning}

Middle:
${story.middle}

Conflict:
${story.conflict}

Turning point:
${story.turningPoint}

Ending:
${story.ending}

Characters:
${characters
  .map(
    (character) =>
      `${character.name}: ${character.role}`
  )
  .join("\n")}

Scenes:
${story.scenes
  .map(
    (scene) =>
      `Scene ${scene.sceneNumber}: ${scene.title}. ${scene.description}`
  )
  .join("\n")}

Cinematic shots:
${story.shots
  .map(
    (shot) =>
      `Shot ${shot.shotNumber}, Scene ${shot.sceneNumber}: ${shot.type}. ${shot.description}. Camera: ${shot.camera}`
  )
  .join("\n")}

Dialogue:
${dialogue.lines
  .map(
    (line) =>
      `${line.characterName}: ${line.text}`
  )
  .join("\n")}

Create a coherent cinematic video based on the production plan above.
`.trim();

      const res =
        await fetch(
          "/api/video/generate",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body: JSON.stringify({
              mode,

              prompt:
                realisticPrompt,

              imageData:
                characterImage,

              characterImage:
                characterImage,

              /*
               * These fields allow the API route
               * to use the structured production
               * when it supports them.
               */
              production: {
                idea: cleanIdea,

                story,

                characters,

                dialogue,

                scenes:
                  story.scenes,

                shots:
                  story.shots,

                voice:
                  voiceData ||
                  null,

                sound:
                  soundData ||
                  null,

                video:
                  videoPlan,
              },
            }),
          }
        );

      let data;

      try {
        data =
          await readJsonResponse(
            res
          );
      } catch (
        parseError
      ) {
        throw new Error(
          parseError?.message ||
            "The video server returned an invalid response."
        );
      }

      if (!res.ok) {
        throw new Error(
          getSafeErrorMessage(
            data,
            "Failed to generate video."
          )
        );
      }

      console.log(
        "BOMBA MASTER VIDEO RESPONSE:",
        data
      );

      /* =============================================
         DIRECT VIDEO
      ============================================= */

      const directVideoUrl =
        extractVideoUrl(data);

      if (directVideoUrl) {
        const finalVideoUrl =
          await finalizeVideoWithVoice(
            directVideoUrl
          );

        completeFinalStages(
          finalVideoUrl,
          production
        );

        setVideoUrl(
          finalVideoUrl
        );

        setStatus(
          "12/12 — BOMBA production complete! 🎬🎙️🔊"
        );

        return finalVideoUrl;
      }

      /* =============================================
         VIDEO JOB
      ============================================= */

      const jobId =
        extractJobId(data);

      if (jobId) {
        setStatus(
          "Eternal AI has started generating your complete video... 🎬"
        );

        await pollVideo(
          jobId
        );

        return null;
      }

      throw new Error(
        getSafeErrorMessage(
          data,
          "No video job or video URL was returned by the video server."
        )
      );
    };

  /* =====================================================
     MAIN GENERATE BUTTON
  ===================================================== */

  const handleGenerateVideo =
    async () => {
      if (loading) return;

      stopPolling();

      setLoading(true);
      setError("");
      setVideoUrl(null);

      try {
        await runMasterProduction();
      } catch (err) {
        console.error(
          "BOMBA MASTER PRODUCTION ERROR:",
          err
        );

        setError(
          getSafeErrorMessage(
            {
              error:
                err?.message,
            },
            "Something went wrong while creating your BOMBA production."
          )
        );

        setStatus("");
        setLoading(false);
      }
    };

  /* =====================================================
     API KEY
  ===================================================== */

  const generateApiKey =
    async () => {
      setApiMessage("");
      setApiKey("");

      if (!apiEmail.trim()) {
        setApiMessage(
          "Please enter your email address."
        );

        return;
      }

      setApiLoading(true);

      try {
        const keyCode =
          "bomba_" +
          Math.random()
            .toString(36)
            .substring(2, 15);

        const {
          data,
          error,
        } = await supabase
          .from("bomba_keys")
          .insert([
            {
              key_code:
                keyCode,

              email:
                apiEmail.trim(),

              videos_allowed:
                20,

              videos_used:
                0,
            },
          ])
          .select()
          .single();

        if (error) {
          throw new Error(
            error.message ||
              "Unable to create API Key."
          );
        }

        if (
          !data ||
          !data.key_code
        ) {
          throw new Error(
            "The API Key was not returned by the database."
          );
        }

        setApiKey(
          data.key_code
        );

        setApiMessage(
          "Your BOMBA API Key has been created successfully."
        );
      } catch (err) {
        console.error(
          err
        );

        setApiMessage(
          err?.message ||
            "Unable to create API Key. Please try again."
        );
      } finally {
        setApiLoading(
          false
        );
      }
    };

  const copyApiKey =
    async () => {
      if (!apiKey) return;

      try {
        await navigator.clipboard.writeText(
          apiKey
        );

        setApiMessage(
          "API Key copied successfully! 📋"
        );
      } catch {
        setApiMessage(
          "Unable to copy automatically. Please copy the key manually."
        );
      }
    };

  /* =====================================================
     VIDEO PLAYER ERROR
  ===================================================== */

  const handleVideoError =
    () => {
      console.error(
        "BOMBA VIDEO PLAYER ERROR:",
        videoUrl
      );

      setError(
        "The video was generated, but the browser could not play the returned video file."
      );
    };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <main>
      {/* =================================================
          TOP BAR
      ================================================= */}

      <header className="topbar">
        <div>
          <div className="brand">
            BOMBA AI
          </div>

          <div className="subtitle">
            VIDEO STUDIO
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setShowApiKey(true);
              setApiMessage("");
            }}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border:
                "1px solid #FFD43B",
              background: "#FFD43B",
              color: "#000",
              fontWeight: "800",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            🔑 API KEY
          </button>

          <button
            type="button"
            className="profileButton"
          >
            TB
          </button>
        </div>
      </header>

      {/* =================================================
          API KEY PANEL
      ================================================= */}

      {showApiKey && (
        <section
          style={{
            margin: "20px auto",
            width:
              "calc(100% - 32px)",
            maxWidth: "720px",
            background: "#111111",
            border:
              "1px solid #292929",
            borderRadius: "18px",
            padding: "24px",
            boxSizing:
              "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#ffffff",
                }}
              >
                🔑 Get Your BOMBA API Key
              </h2>

              <p
                style={{
                  color: "#aaaaaa",
                  lineHeight: "1.5",
                  marginBottom: 0,
                }}
              >
                Enter your email address to generate
                your BOMBA API Key.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowApiKey(false)
              }
              style={{
                border:
                  "1px solid #444",
                background: "#080808",
                color: "#ffffff",
                borderRadius: "9px",
                padding: "8px 12px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <label
            style={{
              display: "block",
              color: "#dddddd",
              fontSize: "14px",
              marginBottom: "8px",
              marginTop: "20px",
            }}
          >
            Email Address
          </label>

          <input
            type="email"
            value={apiEmail}
            onChange={(event) =>
              setApiEmail(
                event.target.value
              )
            }
            placeholder="you@example.com"
            disabled={apiLoading}
            style={{
              width: "100%",
              boxSizing:
                "border-box",
              padding: "14px",
              borderRadius: "10px",
              border:
                "1px solid #333333",
              background: "#080808",
              color: "#ffffff",
              fontSize: "16px",
              outline: "none",
              marginBottom: "14px",
            }}
          />

          <button
            type="button"
            onClick={
              generateApiKey
            }
            disabled={apiLoading}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "10px",
              background:
                apiLoading
                  ? "#8d7920"
                  : "#FFD43B",
              color: "#000000",
              fontWeight: "800",
              fontSize: "15px",
              cursor:
                apiLoading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {apiLoading
              ? "GENERATING..."
              : "GENERATE API KEY"}
          </button>

          {apiKey && (
            <div
              style={{
                marginTop: "18px",
                padding: "16px",
                borderRadius: "12px",
                background: "#080808",
                border:
                  "1px solid #FFD43B",
              }}
            >
              <div
                style={{
                  color: "#aaaaaa",
                  fontSize: "12px",
                  marginBottom: "8px",
                }}
              >
                YOUR BOMBA API KEY
              </div>

              <div
                style={{
                  color: "#FFD43B",
                  fontWeight: "700",
                  wordBreak:
                    "break-all",
                  marginBottom:
                    "12px",
                }}
              >
                {apiKey}
              </div>

              <button
                type="button"
                onClick={
                  copyApiKey
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "9px",
                  border:
                    "1px solid #FFD43B",
                  background:
                    "transparent",
                  color: "#FFD43B",
                  fontWeight: "800",
                  cursor: "pointer",
                }}
              >
                📋 COPY API KEY
              </button>
            </div>
          )}

          {apiMessage && (
            <div
              style={{
                marginTop: "14px",
                padding: "11px",
                borderRadius: "9px",
                background: "#181818",
                color: "#dddddd",
                fontSize: "14px",
                lineHeight: "1.5",
              }}
            >
              {apiMessage}
            </div>
          )}
        </section>
      )}

      {/* =================================================
          HERO
      ================================================= */}

      <section className="hero">
        <div className="badge">
          AI VIDEO PRODUCTION STUDIO
        </div>

        <h1>
          Turn your idea into a
          <span>
            {" "}
            realistic AI video.
          </span>
        </h1>

        <p>
          Create characters, scenes, dialogue, voices,
          sound and cinematic videos from one simple idea.
        </p>
      </section>

      {/* =================================================
          STUDIO CARD
      ================================================= */}

      <section className="studioCard">
        <h2>
          What do you want to create?
        </h2>

        <div className="modeGrid">
          {modes.map(
            (item) => (
              <button
                key={item}
                type="button"
                className={
                  mode === item
                    ? "mode active"
                    : "mode"
                }
                onClick={() =>
                  setMode(item)
                }
              >
                {item}
              </button>
            )
          )}
        </div>

        {/* CHARACTER */}

        <div className="characterUpload">
          <div className="characterHeader">
            <div>
              <h3>
                👤 Your Character
              </h3>

              <p>
                Upload your photo to use yourself as the
                main character.
              </p>
            </div>
          </div>

          {!characterImage ? (
            <label className="uploadBox">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={
                  handleImageUpload
                }
                hidden
              />

              <div className="uploadIcon">
                📸
              </div>

              <strong>
                + Add Your Photo
              </strong>

              <span>
                PNG, JPG or WEBP · Maximum 10MB
              </span>
            </label>
          ) : (
            <div className="characterPreview">
              <img
                src={characterImage}
                alt="Your BOMBA character"
              />

              <div className="characterPreviewInfo">
                <strong>
                  ✅ Character Photo Added
                </strong>

                <span>
                  This photo will be used as your
                  character reference.
                </span>

                <div className="characterActions">
                  <label className="changePhoto">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={
                        handleImageUpload
                      }
                      hidden
                    />

                    Change Photo
                  </label>

                  <button
                    type="button"
                    className="removePhoto"
                    onClick={
                      removeCharacterImage
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PROMPT */}

        <div className="promptBox">
          <label>
            Describe your video
          </label>

          <textarea
            value={prompt}
            onChange={(e) =>
              setPrompt(
                e.target.value
              )
            }
            placeholder="Example: I walk into a busy Nigerian market, meet my friend, shake hands with him and we laugh while people move naturally around us..."
          />

          <div className="promptFooter">
            <span>
              {prompt.length} characters
            </span>

            <button
              type="button"
              className="generateButton"
              onClick={
                handleGenerateVideo
              }
              disabled={loading}
            >
              {loading
                ? "Producing..."
                : "🎬 Generate Video"}
            </button>
          </div>
        </div>

        {/* MASTER STATUS */}

        {status && (
          <div
            style={{
              marginTop: "16px",
              color: "#facc15",
              fontSize: "14px",
              lineHeight: "1.6",
            }}
          >
            {status}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div
            style={{
              marginTop: "12px",
              padding: "12px",
              background: "#3f1111",
              border:
                "1px solid #ef4444",
              borderRadius: "8px",
              color: "#fca5a5",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        {/* VIDEO RESULT */}

        {videoUrl && (
          <div
            style={{
              marginTop: "24px",
            }}
          >
            <h3
              style={{
                marginBottom: "12px",
              }}
            >
              Your Realistic Video
            </h3>

            <video
              key={videoUrl}
              src={videoUrl}
              controls
              playsInline
              preload="metadata"
              onError={
                handleVideoError
              }
              style={{
                width: "100%",
                borderRadius: "12px",
                background: "#000",
              }}
            />

            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display:
                  "inline-block",
                marginTop: "12px",
                color: "#facc15",
                textDecoration:
                  "underline",
              }}
            >
              Open Video
            </a>

            <div
              style={{
                marginTop: "8px",
                color: "#888",
                fontSize: "12px",
              }}
            >
              If the video player does not start,
              tap "Open Video" to test the returned file
              directly.
            </div>
          </div>
        )}
      </section>

      {/* =================================================
          PLAN
      ================================================= */}

      <PlanPanel
        idea={prompt}
      />

      {/* =================================================
          BOMBA AI STUDIO BOARD
      ================================================= */}

      <StudioBoard />

      {/* =================================================
          OLD WORKFLOW
      ================================================= */}

      <section className="workflow">
        <h2>
          Production Workflow
        </h2>

        <div className="workflowGrid">
          <div>
            <strong>
              01
            </strong>

            <h3>
              Plan
            </h3>

            <p>
              Turn your idea into scenes and shots.
            </p>
          </div>

          <div>
            <strong>
              02
            </strong>

            <h3>
              Characters
            </h3>

            <p>
              Create consistent realistic characters.
            </p>
          </div>

          <div>
            <strong>
              03
            </strong>

            <h3>
              Scenes
            </h3>

            <p>
              Build realistic locations and actions.
            </p>
          </div>

          <div>
            <strong>
              04
            </strong>

            <h3>
              Generate
            </h3>

            <p>
              Generate cinematic video clips.
            </p>
          </div>
        </div>
      </section>

      {/* =================================================
          FUTURE FEATURES
      ================================================= */}

      <section className="future">
        <h2>
          Coming into the Studio
        </h2>

        <div className="featureList">
          <span>
            🎭 Consistent Characters
          </span>

          <span>
            🗣️ Natural Voices
          </span>

          <span>
            👄 Lip Sync
          </span>

          <span>
            🎬 Cinematic Camera
          </span>

          <span>
            🔊 Sound Effects
          </span>

          <span>
            🎵 Background Music
          </span>

          <span>
            🏠 Realistic Environments
          </span>

          <span>
            📺 Full Episodes
          </span>
        </div>
      </section>
    </main>
  );
}