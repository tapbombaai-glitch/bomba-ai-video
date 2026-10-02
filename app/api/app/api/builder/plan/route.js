// app/api/builder/plan/route.js

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || "";

const OPENAI_MODEL =
  process.env.OPENAI_BUILDER_MODEL ||
  "gpt-4.1-mini";

const OPENAI_URL =
  "https://api.openai.com/v1/responses";

const STORY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: {
      type: "string",
    },
    logline: {
      type: "string",
    },
    genre: {
      type: "string",
    },
    setting: {
      type: "string",
    },
    beginning: {
      type: "string",
    },
    middle: {
      type: "string",
    },
    ending: {
      type: "string",
    },
    conflict: {
      type: "string",
    },
    turningPoint: {
      type: "string",
    },
    themes: {
      type: "array",
      items: {
        type: "string",
      },
    },
    characters: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: {
            type: "string",
          },
          role: {
            type: "string",
          },
          description: {
            type: "string",
          },
          goal: {
            type: "string",
          },
          conflict: {
            type: "string",
          },
        },
        required: [
          "name",
          "role",
          "description",
          "goal",
          "conflict",
        ],
      },
    },
    scenes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          sceneNumber: {
            type: "integer",
          },
          title: {
            type: "string",
          },
          location: {
            type: "string",
          },
          time: {
            type: "string",
          },
          description: {
            type: "string",
          },
          action: {
            type: "string",
          },
          purpose: {
            type: "string",
          },
        },
        required: [
          "sceneNumber",
          "title",
          "location",
          "time",
          "description",
          "action",
          "purpose",
        ],
      },
    },
    shots: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          shotNumber: {
            type: "integer",
          },
          sceneNumber: {
            type: "integer",
          },
          shotType: {
            type: "string",
          },
          camera: {
            type: "string",
          },
          description: {
            type: "string",
          },
        },
        required: [
          "shotNumber",
          "sceneNumber",
          "shotType",
          "camera",
          "description",
        ],
      },
    },
  },
  required: [
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
  ],
};

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
     * Keep this route safe while OpenAI billing/credits
     * are unavailable.
     *
     * The route is ready for the real AI connection,
     * but it must never pretend a story was generated.
     */
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        {
          status: "waiting_for_ai",
          code: "OPENAI_API_KEY_MISSING",
          error:
            "BOMBA Story Engine is ready, but OPENAI_API_KEY is not configured.",
        },
        { status: 503 }
      );
    }

    const systemPrompt = `
You are BOMBA AI Director, the production brain of a professional
AI video studio.

Your job is to turn one video idea into a production-ready story plan.

Think like a film director, screenwriter and AI video production planner.

The result must be practical for later stages:

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

Important rules:

1. Preserve the user's core idea.
2. Do not replace the user's concept with an unrelated story.
3. Make the story cinematic and visually producible.
4. Keep characters consistent.
5. Make scenes logically connected.
6. Create useful camera directions for later AI video generation.
7. Do not generate dialogue yet.
8. Do not generate voice instructions yet.
9. Do not generate actual video prompts for external video APIs yet.
10. Do not invent personal facts about the user.
11. If the idea is Nigerian or African, preserve the requested cultural setting naturally.
12. Return only the requested structured JSON.
`;

    const userPrompt = `
Create a BOMBA production story plan from this idea:

${idea}
`;

    const openAIResponse =
      await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${OPENAI_API_KEY}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,

          input: [
            {
              role: "system",
              content: [
                {
                  type: "input_text",
                  text: systemPrompt,
                },
              ],
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: userPrompt,
                },
              ],
            },
          ],

          text: {
            format: {
              type: "json_schema",
              name: "bomba_story_plan",
              strict: true,
              schema: STORY_SCHEMA,
            },
          },
        }),
      });

    const responseText =
      await openAIResponse.text();

    let responseData = {};

    try {
      responseData =
        responseText
          ? JSON.parse(responseText)
          : {};
    } catch {
      responseData = {};
    }

    if (!openAIResponse.ok) {
      console.error(
        "BOMBA OPENAI STORY ENGINE ERROR:",
        responseText.slice(0, 2000)
      );

      const openAIError =
        responseData?.error?.message ||
        responseData?.error ||
        responseText ||
        `OpenAI request failed with HTTP ${openAIResponse.status}.`;

      return NextResponse.json(
        {
          status:
            openAIResponse.status === 402 ||
            openAIResponse.status === 429
              ? "waiting_for_ai"
              : "failed",
          code:
            openAIResponse.status === 402 ||
            openAIResponse.status === 429
              ? "OPENAI_BILLING_OR_LIMIT"
              : "OPENAI_REQUEST_FAILED",
          error: openAIError,
        },
        {
          status:
            openAIResponse.status === 402 ||
            openAIResponse.status === 429
              ? 503
              : 502,
        }
      );
    }

    const storyText =
      responseData?.output_text;

    if (
      typeof storyText !== "string" ||
      !storyText.trim()
    ) {
      console.error(
        "BOMBA OPENAI STORY ENGINE RETURNED NO OUTPUT:",
        JSON.stringify(responseData).slice(
          0,
          3000
        )
      );

      return NextResponse.json(
        {
          status: "failed",
          error:
            "OpenAI returned no story plan.",
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
        "BOMBA STORY JSON PARSE ERROR:",
        storyText.slice(0, 3000)
      );

      return NextResponse.json(
        {
          status: "failed",
          error:
            "BOMBA received an invalid story plan from the AI engine.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        status: "completed",
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
      "BOMBA STORY ENGINE ERROR:",
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