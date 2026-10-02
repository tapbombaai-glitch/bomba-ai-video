// app/api/builder/plan/route.js

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const GROQ_API_KEY =
  process.env.GROQ_API_KEY || "";

const GROQ_MODEL =
  process.env.GROQ_BUILDER_MODEL ||
  "llama-3.3-70b-versatile";

const GROQ_URL =
  "https://api.groq.com/openai/v1/chat/completions";

export async function POST(request) {
  try {
    const body = await request.json();

    const idea =
      typeof body?.idea === "string"
        ? body.idea.trim()
        : "";

    if (!idea) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "A saved BOMBA video idea is required.",
        },
        { status: 400 }
      );
    }

    if (idea.length > 10000) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "The video idea is too long. Maximum is 10000 characters.",
        },
        { status: 400 }
      );
    }

    /*
     * GROQ API KEY CHECK
     *
     * The actual secret stays inside the
     * server environment as GROQ_API_KEY.
     */
    if (!GROQ_API_KEY) {
      return NextResponse.json(
        {
          status: "waiting_for_ai",
          code: "GROQ_API_KEY_MISSING",
          error:
            "BOMBA Story Engine is ready, but GROQ_API_KEY is not configured.",
        },
        { status: 503 }
      );
    }

    /*
     * BOMBA STORY ENGINE
     *
     * Groq JSON Object Mode is used here because
     * llama-3.3-70b-versatile supports JSON Object Mode.
     *
     * The prompt explicitly defines the JSON structure
     * that BOMBA expects.
     */
    const systemPrompt = `
You are BOMBA AI Director, the production brain of a professional
AI video studio.

Your job is to turn ONE video idea into a production-ready story plan.

Think like a film director, screenwriter and AI video production planner.

The production pipeline is:

IDEA
→ STORY
→ CHARACTERS
→ DIALOGUE
→ VOICES
→ SCENES
→ SHOTS
→ VIDEO
→ SOUND
→ TIMELINE
→ PREVIEW
→ EXPORT

IMPORTANT RULES:

1. Preserve the user's core idea.
2. Do not replace the user's concept with an unrelated story.
3. Make the story cinematic and visually producible.
4. Keep characters consistent.
5. Make scenes logically connected.
6. Create useful camera directions for later AI video generation.
7. Do not generate dialogue yet.
8. Do not generate voice instructions yet.
9. Do not generate actual external video API prompts yet.
10. Do not invent personal facts about the user.
11. If the idea is Nigerian or African, preserve the requested cultural setting naturally.
12. Return ONLY valid JSON.
13. Do not use Markdown.
14. Do not wrap the JSON in code fences.

RETURN THIS EXACT JSON SHAPE:

{
  "title": "string",
  "logline": "string",
  "genre": "string",
  "setting": "string",
  "beginning": "string",
  "middle": "string",
  "ending": "string",
  "conflict": "string",
  "turningPoint": "string",
  "themes": [
    "string"
  ],
  "characters": [
    {
      "name": "string",
      "role": "string",
      "description": "string",
      "goal": "string",
      "conflict": "string"
    }
  ],
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "string",
      "location": "string",
      "time": "string",
      "description": "string",
      "action": "string",
      "purpose": "string"
    }
  ],
  "shots": [
    {
      "shotNumber": 1,
      "sceneNumber": 1,
      "shotType": "string",
      "camera": "string",
      "description": "string"
    }
  ]
}

The JSON must contain all of these fields.

Create practical cinematic content that can later be passed
to BOMBA's dialogue, voice, scene, shot and video stages.
`;

    const userPrompt = `
Create a BOMBA production story plan from this video idea:

${idea}

Remember:
Return ONLY valid JSON matching the required BOMBA structure.
`;

    const groqResponse = await fetch(
      GROQ_URL,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${GROQ_API_KEY}`,
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          model: GROQ_MODEL,

          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],

          response_format: {
            type: "json_object",
          },

          temperature: 0.7,

          max_tokens: 12000,
        }),
      }
    );

    const responseText =
      await groqResponse.text();

    let responseData = {};

    try {
      responseData =
        responseText
          ? JSON.parse(responseText)
          : {};
    } catch {
      responseData = {};
    }

    if (!groqResponse.ok) {
      console.error(
        "BOMBA GROQ STORY ENGINE ERROR:",
        responseText.slice(0, 3000)
      );

      const groqError =
        responseData?.error?.message ||
        responseData?.error ||
        responseText ||
        `Groq request failed with HTTP ${groqResponse.status}.`;

      return NextResponse.json(
        {
          status:
            groqResponse.status === 401 ||
            groqResponse.status === 429
              ? "waiting_for_ai"
              : "failed",

          code:
            groqResponse.status === 401
              ? "GROQ_AUTH_FAILED"
              : groqResponse.status === 429
              ? "GROQ_RATE_LIMIT"
              : "GROQ_REQUEST_FAILED",

          error: groqError,
        },
        {
          status:
            groqResponse.status === 401 ||
            groqResponse.status === 429
              ? 503
              : 502,
        }
      );
    }

    const storyText =
      responseData?.choices?.[0]?.message?.content;

    if (
      typeof storyText !== "string" ||
      !storyText.trim()
    ) {
      console.error(
        "BOMBA GROQ STORY ENGINE RETURNED NO OUTPUT:",
        JSON.stringify(responseData).slice(
          0,
          4000
        )
      );

      return NextResponse.json(
        {
          status: "failed",
          error:
            "Groq returned no story plan.",
        },
        { status: 502 }
      );
    }

    let story;

    try {
      story = JSON.parse(
        storyText
      );
    } catch {
      console.error(
        "BOMBA GROQ STORY JSON PARSE ERROR:",
        storyText.slice(0, 4000)
      );

      return NextResponse.json(
        {
          status: "failed",
          error:
            "BOMBA received invalid JSON from the AI engine.",
        },
        { status: 502 }
      );
    }

    /*
     * Basic validation before BOMBA accepts
     * the generated story.
     */
    const requiredFields = [
      "title",
      "logline",
      "genre",
      "setting",
      "beginning",
      "middle",
      "ending",
      "conflict",
      "turningPoint",
      "themes",
      "characters",
      "scenes",
      "shots",
    ];

    const missingFields =
      requiredFields.filter(
        (field) =>
          !Object.prototype.hasOwnProperty.call(
            story,
            field
          )
      );

    if (missingFields.length > 0) {
      console.error(
        "BOMBA GROQ STORY MISSING FIELDS:",
        missingFields
      );

      return NextResponse.json(
        {
          status: "failed",
          error:
            "BOMBA received an incomplete story plan from the AI engine.",
          missingFields,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        status: "completed",
        provider: "groq",
        model: GROQ_MODEL,
        story,
      },
      {
        status: 200,

        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "BOMBA GROQ STORY ENGINE ERROR:",
      error
    );

    return NextResponse.json(
      {
        status: "failed",
        error:
          error?.message ||
          "Unable to create BOMBA story plan.",
      },
      { status: 500 }
    );
  }
}