import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const ETERNALAI_API_KEY =
  process.env.ETERNALAI_API_KEY || "";

const ETERNALAI_BASE_URL =
  "https://open.eternalai.org";

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function cleanString(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

async function createCharacter(character) {
  const name =
    cleanString(character?.name) ||
    "Unnamed Character";

  const role =
    cleanString(character?.role) ||
    "Supporting character";

  const description =
    cleanString(character?.description);

  const age =
    cleanString(character?.age);

  const gender =
    cleanString(character?.gender);

  const prompt = [
    `Create a realistic cinematic character named ${name}.`,
    `Role in the story: ${role}.`,
    age
      ? `Age: ${age}.`
      : "",
    gender
      ? `Gender: ${gender}.`
      : "",
    description
      ? `Character description: ${description}.`
      : "",
    "Nigerian setting and cultural context where appropriate.",
    "Photorealistic human appearance.",
    "Natural facial features.",
    "Consistent identity suitable for cinematic video generation.",
    "No cartoon, anime, illustration, or fantasy rendering unless explicitly required by the story.",
  ]
    .filter(Boolean)
    .join(" ");

  const response =
    await fetch(
      `${ETERNALAI_BASE_URL}/v2/character/create`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "x-api-key":
            ETERNALAI_API_KEY,
        },

        body: JSON.stringify({
          prompt,
        }),

        cache: "no-store",
      }
    );

  const responseText =
    await response.text();

  const data =
    safeParse(responseText);

  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.detail ||
        data?.message ||
        `Eternal AI character creation failed with HTTP ${response.status}.`
    );
  }

  const characterId =
    data?.result?.id;

  if (!characterId) {
    throw new Error(
      "Eternal AI created the character request but returned no character ID."
    );
  }

  return {
    ...character,

    name,
    role,
    characterId,

    status:
      data?.result?.status ||
      "pending",

    avatarUrl:
      data?.result?.avatar_url ||
      null,
  };
}

async function pollCharacter(
  characterId
) {
  const maxAttempts = 20;

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {
    const response =
      await fetch(
        `${ETERNALAI_BASE_URL}/v2/character/poll-result/${encodeURIComponent(
          characterId
        )}`,
        {
          method: "GET",

          headers: {
            "x-api-key":
              ETERNALAI_API_KEY,
          },

          cache: "no-store",
        }
      );

    const responseText =
      await response.text();

    const data =
      safeParse(responseText);

    if (!response.ok) {
      throw new Error(
        data?.error ||
          data?.detail ||
          data?.message ||
          `Character status check failed with HTTP ${response.status}.`
      );
    }

    const result =
      data?.result || {};

    const avatarUrl =
      result?.avatar_url ||
      null;

    const status =
      cleanString(
        data?.status ||
          result?.status
      ).toLowerCase();

    if (avatarUrl) {
      return {
        id:
          result?.id ||
          characterId,

        username:
          result?.username ||
          null,

        displayName:
          result?.display_name ||
          null,

        description:
          result?.description ||
          null,

        avatarUrl,

        age:
          result?.age ||
          null,

        gender:
          result?.gender ||
          null,

        category:
          result?.category ||
          null,

        status: "completed",
      };
    }

    if (
      status === "failed" ||
      status === "error"
    ) {
      throw new Error(
        result?.error ||
          data?.error ||
          "Eternal AI character generation failed."
      );
    }

    await new Promise(
      (resolve) =>
        setTimeout(resolve, 3000)
    );
  }

  throw new Error(
    `Character ${characterId} did not finish generating within the allowed time.`
  );
}

export async function POST(request) {
  try {
    if (!ETERNALAI_API_KEY) {
      return NextResponse.json(
        {
          status: "failed",

          code:
            "ETERNALAI_API_KEY_MISSING",

          error:
            "ETERNALAI_API_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    const body =
      await request.json();

    const characters =
      Array.isArray(
        body?.characters
      )
        ? body.characters
        : [];

    if (!characters.length) {
      return NextResponse.json(
        {
          status: "failed",

          code:
            "CHARACTERS_MISSING",

          error:
            "At least one character is required.",
        },
        { status: 400 }
      );
    }

    console.log(
      "======================================"
    );

    console.log(
      "BOMBA AUTOMATIC CHARACTER GENERATION"
    );

    console.log(
      "CHARACTER COUNT:",
      characters.length
    );

    console.log(
      "======================================"
    );

    const createdCharacters = [];

    for (
      let index = 0;
      index < characters.length;
      index++
    ) {
      const character =
        characters[index];

      console.log(
        `BOMBA CHARACTER ${index + 1}/${characters.length}:`,
        character?.name
      );

      const created =
        await createCharacter(
          character
        );

      console.log(
        "BOMBA CHARACTER CREATED:",
        created
      );

      const completed =
        await pollCharacter(
          created.characterId
        );

      createdCharacters.push({
        ...created,
        characterId:
          completed.id ||
          created.characterId,

        username:
          completed.username,

        displayName:
          completed.displayName,

        avatarUrl:
          completed.avatarUrl,

        generatedDescription:
          completed.description,

        generatedAge:
          completed.age,

        generatedGender:
          completed.gender,

        status:
          completed.status,
      });

      console.log(
        "BOMBA CHARACTER READY:",
        created.name
      );
    }

    return NextResponse.json(
      {
        status: "completed",

        characters:
          createdCharacters,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "BOMBA AUTOMATIC CHARACTER ERROR:",
      error
    );

    return NextResponse.json(
      {
        status: "failed",

        error:
          error?.message ||
          "Unable to automatically generate BOMBA characters.",
      },
      { status: 500 }
    );
  }
}