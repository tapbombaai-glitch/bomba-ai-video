import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "GROQ_API_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    const body = await req.json();

    const {
      type,
      idea,
      language = "pcm",
      story,
      characters,
    } = body;

    if (!type) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing generation type.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // STORY + CHARACTERS + SCENES + SHOTS
    // =====================================================

    if (type === "story") {
      if (typeof idea !== "string" || !idea.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: "Idea is required.",
          },
          { status: 400 }
        );
      }

      const cleanIdea = idea.trim();

      const prompt = `
You are BOMBA AI, a professional Nigerian film director,
screenwriter and story developer.

USER VIDEO IDEA:
"${cleanIdea}"

Create a complete cinematic production plan.

The production should feel realistic, emotional and strongly connected
to modern Nigeria.

The preferred dialogue language later will be:
${language === "pcm" ? "Nigerian Pidgin" : language}

Return ONLY valid JSON.

Use exactly this structure:

{
  "title": "",
  "logline": "",
  "genre": "",
  "setting": "Modern Nigeria",
  "beginning": "",
  "middle": "",
  "conflict": "",
  "turningPoint": "",
  "ending": "",
  "themes": [
    "",
    "",
    ""
  ],
  "characters": [
    {
      "id": "character-001",
      "name": "",
      "role": "Main Character",
      "gender": "Male",
      "description": "",
      "goal": "",
      "conflict": "",
      "voiceSlot": "VOICE_A"
    }
  ],
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "",
      "location": "",
      "time": "",
      "description": "",
      "purpose": ""
    }
  ],
  "shots": [
    {
      "shotNumber": 1,
      "sceneNumber": 1,
      "shotType": "",
      "camera": "",
      "description": ""
    }
  ]
}

RULES:

- Create 4 to 6 strong characters.
- Give every character a unique id.
- Give every character a voiceSlot.
- Create 5 to 7 scenes.
- Every scene must have a unique sceneNumber.
- Create 6 to 10 cinematic shots.
- Every shot must reference an existing sceneNumber.
- Make the locations and situations realistic for Nigeria.
- Make the story emotionally engaging.
- Make the main character's goal clear.
- Create a meaningful conflict.
- Give the story a strong turning point.
- Give the ending a clear direction.
- Do not create voice IDs.
- Do not create audio URLs.
- Do not create fake provider information.
- Return ONLY valid JSON.
`;

      const completion =
        await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",

          messages: [
            {
              role: "system",
              content:
                "You are BOMBA AI's production story engine. Return only valid JSON. Never use markdown.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],

          temperature: 0.7,
          max_tokens: 4000,

          response_format: {
            type: "json_object",
          },
        });

      const content =
        completion.choices[0]?.message?.content;

      if (!content) {
        throw new Error(
          "GROQ returned an empty response."
        );
      }

      const generatedStory = JSON.parse(content);

      return NextResponse.json({
        success: true,
        type: "story",
        story: generatedStory,
      });
    }

    // =====================================================
    // DIALOGUE
    // =====================================================

    if (type === "dialogue") {
      if (!story) {
        return NextResponse.json(
          {
            success: false,
            error: "Story is required.",
          },
          { status: 400 }
        );
      }

      if (
        !Array.isArray(characters) ||
        characters.length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Characters are required.",
          },
          { status: 400 }
        );
      }

      const languageName =
        language === "pcm"
          ? "Nigerian Pidgin"
          : language;

      const characterText = characters
        .map(
          (character: any) =>
            `- ${character.name} (${character.role}): ${character.description}`
        )
        .join("\n");

      const sceneText = Array.isArray(story.scenes)
        ? story.scenes
            .map(
              (scene: any) =>
                `Scene ${scene.sceneNumber}: ${scene.title} - ${scene.description}`
            )
            .join("\n")
        : "";

      const prompt = `
You are BOMBA AI's professional dialogue writer.

Write natural, emotional dialogue for this Nigerian story.

DIALOGUE LANGUAGE:
${languageName}

STORY TITLE:
${story.title}

LOGLINE:
${story.logline}

CHARACTERS:
${characterText}

SCENES:
${sceneText}

Return ONLY valid JSON using exactly this structure:

{
  "language": "${language}",
  "lines": [
    {
      "sceneNumber": 1,
      "lineNumber": 1,
      "characterName": "",
      "text": "",
      "emotion": "natural"
    }
  ]
}

RULES:

- Create 12 to 20 dialogue lines total.
- Every line must belong to an existing scene.
- Every characterName must match one of the supplied characters exactly.
- Make the dialogue natural and emotional.
- If the language is pcm, use natural Nigerian Pidgin.
- Do not add narration inside dialogue lines.
- Do not create voice IDs.
- Do not create audio URLs.
- Return ONLY valid JSON.
`;

      const completion =
        await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",

          messages: [
            {
              role: "system",
              content:
                "You are BOMBA AI's professional Nigerian dialogue engine. Return only valid JSON.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],

          temperature: 0.75,
          max_tokens: 3000,

          response_format: {
            type: "json_object",
          },
        });

      const content =
        completion.choices[0]?.message?.content;

      if (!content) {
        throw new Error(
          "GROQ returned an empty dialogue response."
        );
      }

      const generatedDialogue =
        JSON.parse(content);

      return NextResponse.json({
        success: true,
        type: "dialogue",
        dialogue: generatedDialogue,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Invalid generation type. Use 'story' or 'dialogue'.",
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error(
      "BOMBA GROQ PRODUCTION BRAIN ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "GROQ generation failed.",
      },
      { status: 500 }
    );
  }
}