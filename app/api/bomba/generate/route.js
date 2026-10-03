import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  try {
    const body = await request.json();

    const { type } = body;

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "GROQ_API_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    // =========================================================
    // STORY GENERATION
    // =========================================================
    if (type === "story") {
      const { idea, language = "pcm" } = body;

      if (!idea || !idea.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: "Video idea is required.",
          },
          { status: 400 }
        );
      }

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content: `
You are BOMBA AI, an African AI video production brain.

Turn the user's video idea into a complete production plan.

Return ONLY valid JSON.

The JSON must have exactly this structure:

{
  "story": {
    "title": "",
    "genre": "",
    "setting": "",
    "summary": "",
    "beginning": "",
    "middle": "",
    "ending": ""
  },
  "characters": [
    {
      "name": "",
      "role": "",
      "age": "",
      "gender": "",
      "description": "",
      "personality": ""
    }
  ],
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "",
      "location": "",
      "time": "",
      "description": "",
      "action": ""
    }
  ],
  "shots": [
    {
      "shotNumber": 1,
      "sceneNumber": 1,
      "shotType": "",
      "camera": "",
      "description": "",
      "duration": 5
    }
  ]
}

Rules:
- Create a coherent story from the user's idea.
- Create useful characters that actually belong in the story.
- Create 3 to 8 scenes.
- Create 1 to 4 shots for each scene.
- Keep shot descriptions visual and useful for future video generation.
- Use Nigerian/African context when appropriate.
- The requested language is: ${language}.
- Do not include markdown.
- Do not include explanations outside the JSON.
            `,
          },
          {
            role: "user",
            content: `Create a production plan from this video idea:\n\n${idea}`,
          },
        ],
      });

      const content =
        completion.choices?.[0]?.message?.content || "";

      let result;

      try {
        result = JSON.parse(content);
      } catch (parseError) {
        console.error("BOMBA STORY JSON ERROR:", parseError);
        console.error("GROQ RESPONSE:", content);

        return NextResponse.json(
          {
            success: false,
            error: "GROQ returned invalid story JSON.",
            raw: content,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        type: "story",
        ...result,
      });
    }

    // =========================================================
    // DIALOGUE GENERATION
    // =========================================================
    if (type === "dialogue") {
      const {
        story,
        characters,
        language = "pcm",
      } = body;

      if (!story) {
        return NextResponse.json(
          {
            success: false,
            error: "Story is required.",
          },
          { status: 400 }
        );
      }

      if (!Array.isArray(characters) || characters.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Characters are required.",
          },
          { status: 400 }
        );
      }

      const characterText = characters
        .map(
          (character) =>
            `- ${character.name} (${character.role}): ${character.description}`
        )
        .join("\n");

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.8,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content: `
You are BOMBA AI, an African AI video production brain.

Write natural dialogue for the provided story.

Return ONLY valid JSON.

The JSON must have exactly this structure:

{
  "dialogue": [
    {
      "sceneNumber": 1,
      "lineNumber": 1,
      "character": "",
      "text": "",
      "emotion": "",
      "direction": ""
    }
  ]
}

Rules:
- Every character name must match one of the supplied characters.
- Dialogue must fit the story and scene.
- Make conversations natural.
- Do not make every line unnecessarily long.
- Include emotional direction where useful.
- Use the requested language: ${language}.
- Do not include markdown.
- Do not include explanations outside the JSON.
            `,
          },
          {
            role: "user",
            content: `
STORY:
${JSON.stringify(story, null, 2)}

CHARACTERS:
${characterText}

Create the complete dialogue for the story.
            `,
          },
        ],
      });

      const content =
        completion.choices?.[0]?.message?.content || "";

      let result;

      try {
        result = JSON.parse(content);
      } catch (parseError) {
        console.error("BOMBA DIALOGUE JSON ERROR:", parseError);
        console.error("GROQ RESPONSE:", content);

        return NextResponse.json(
          {
            success: false,
            error: "GROQ returned invalid dialogue JSON.",
            raw: content,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        type: "dialogue",
        ...result,
      });
    }

    // =========================================================
    // UNKNOWN REQUEST
    // =========================================================
    return NextResponse.json(
      {
        success: false,
        error: `Unsupported generation type: ${type || "missing"}`,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("BOMBA GROQ GENERATION ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "BOMBA AI generation failed.",
      },
      { status: 500 }
    );
  }
}