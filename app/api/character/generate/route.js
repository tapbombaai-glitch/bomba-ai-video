import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const ETERNALAI_API_KEY =
  process.env.ETERNALAI_API_KEY;

const ETERNALAI_BASE_URL =
  "https://open.eternalai.org";

const CREATE_URL =
  `${ETERNALAI_BASE_URL}/v2/character/create`;

const POLL_URL =
  `${ETERNALAI_BASE_URL}/v2/character/poll-result`;

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function cleanString(value, fallback = "") {
  return typeof value === "string"
    ? value.trim()
    : fallback;
}

/* =========================================================
   POST
   CREATE AI CHARACTER
========================================================= */

export async function POST(request) {
  try {
    if (!ETERNALAI_API_KEY) {
      return NextResponse.json(
        {
          status: "failed",
          code: "ETERNALAI_API_KEY_MISSING",
          error:
            "ETERNALAI_API_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const prompt = cleanString(
      body?.prompt ||
      body?.description ||
      body?.characterDescription
    );

    if (!prompt) {
      return NextResponse.json(
        {
          status: "failed",
          code: "CHARACTER_PROMPT_MISSING",
          error:
            "A character description is required.",
        },
        { status: 400 }
      );
    }

    if (prompt.length > 5000) {
      return NextResponse.json(
        {
          status: "failed",
          code: "CHARACTER_PROMPT_TOO_LONG",
          error:
            "Character description is too long.",
        },
        { status: 400 }
      );
    }

    console.log(
      "================================================="
    );

    console.log(
      "BOMBA CHARACTER ENGINE → ETERNAL AI"
    );

    console.log({
      promptLength: prompt.length,
    });

    console.log(
      "================================================="
    );

    const response = await fetch(
      CREATE_URL,
      {
        method: "POST",

        headers: {
          "x-api-key":
            ETERNALAI_API_KEY,

          "Content-Type":
            "application/json",
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

    console.log(
      "BOMBA ETERNAL AI CHARACTER HTTP:",
      response.status
    );

    console.log(
      "BOMBA ETERNAL AI CHARACTER RESPONSE:",
      responseText.slice(0, 1500)
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "failed",

          code:
            response.status === 401
              ? "ETERNALAI_AUTH_FAILED"
              : response.status === 429
              ? "ETERNALAI_RATE_LIMIT"
              : "ETERNALAI_CHARACTER_REQUEST_FAILED",

          error:
            data?.error ||
            data?.detail ||
            data?.message ||
            `Eternal AI returned HTTP ${response.status}.`,

          raw:
            responseText.slice(
              0,
              1000
            ),
        },

        {
          status:
            response.status >= 400 &&
            response.status < 500
              ? response.status
              : 502,
        }
      );
    }

    const character =
      data?.result || {};

    const characterId =
      character?.id;

    const requestId =
      data?.request_id ||
      data?.result?.request_id;

    if (!characterId) {
      return NextResponse.json(
        {
          status: "failed",

          code:
            "CHARACTER_ID_MISSING",

          error:
            "Eternal AI accepted the character request but did not return a character ID.",

          raw:
            responseText.slice(
              0,
              1000
            ),
        },

        { status: 502 }
      );
    }

    /*
     * EternalAI documents that character creation
     * is asynchronous. The character starts as
     * pending and its avatar_url becomes available
     * after polling.
     */

    return NextResponse.json(
      {
        status: "queued",

        provider: "eternalai",

        characterId,

        requestId:
          requestId || null,

        character: {
          id: characterId,

          username:
            character?.username ||
            "",

          displayName:
            character?.display_name ||
            "",

          description:
            character?.description ||
            "",

          avatarUrl:
            character?.avatar_url ||
            "",

          status:
            character?.status ||
            "pending",
        },
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
      "BOMBA CHARACTER POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        status: "failed",

        code:
          "ETERNALAI_CHARACTER_UNEXPECTED_ERROR",

        error:
          error?.message ||
          "Unexpected error while creating AI character.",
      },

      { status: 500 }
    );
  }
}

/* =========================================================
   GET
   CHECK CHARACTER GENERATION STATUS
========================================================= */

export async function GET(request) {
  try {
    if (!ETERNALAI_API_KEY) {
      return NextResponse.json(
        {
          status: "failed",

          code:
            "ETERNALAI_API_KEY_MISSING",

          error:
            "ETERNALAI_API_KEY is missing.",
        },

        { status: 500 }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const characterId =
      searchParams.get(
        "characterId"
      ) ||
      searchParams.get("id");

    if (!characterId) {
      return NextResponse.json(
        {
          status: "failed",

          code:
            "CHARACTER_ID_MISSING",

          error:
            "Missing character ID.",
        },

        { status: 400 }
      );
    }

    const statusUrl =
      `${POLL_URL}/${encodeURIComponent(
        characterId
      )}`;

    console.log(
      "BOMBA CHARACTER STATUS CHECK:",
      characterId
    );

    const response =
      await fetch(statusUrl, {
        method: "GET",

        headers: {
          "x-api-key":
            ETERNALAI_API_KEY,
        },

        cache: "no-store",
      });

    const responseText =
      await response.text();

    const data =
      safeParse(responseText);

    console.log(
      "BOMBA CHARACTER STATUS HTTP:",
      response.status
    );

    console.log(
      "BOMBA CHARACTER STATUS RESPONSE:",
      responseText.slice(
        0,
        1500
      )
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "failed",

          code:
            "ETERNALAI_CHARACTER_STATUS_FAILED",

          error:
            data?.error ||
            data?.detail ||
            data?.message ||
            `Character status check failed with HTTP ${response.status}.`,

          characterId,
        },

        { status: 502 }
      );
    }

    const character =
      data?.result || {};

    const avatarUrl =
      character?.avatar_url ||
      "";

    const characterStatus =
      String(
        data?.status ||
        character?.status ||
        ""
      ).toLowerCase();

    /*
     * SUCCESS
     */

    if (
      characterStatus ===
        "success" ||
      characterStatus ===
        "completed" ||
      Boolean(avatarUrl)
    ) {
      if (!avatarUrl) {
        return NextResponse.json(
          {
            status: "failed",

            code:
              "CHARACTER_AVATAR_MISSING",

            error:
              "Eternal AI completed the character but returned no avatar image.",

            characterId,
          },

          { status: 502 }
        );
      }

      console.log(
        "BOMBA CHARACTER READY:",
        avatarUrl
      );

      return NextResponse.json(
        {
          status: "completed",

          provider: "eternalai",

          characterId,

          character: {
            id:
              character?.id ||
              characterId,

            username:
              character?.username ||
              "",

            displayName:
              character?.display_name ||
              "",

            description:
              character?.description ||
              "",

            avatarUrl,

            age:
              character?.age ??
              null,

            gender:
              character?.gender ||
              "",

            status:
              character?.status ||
              "approved",
          },

          imageUrl:
            avatarUrl,
        },

        {
          status: 200,

          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    /*
     * FAILED
     */

    if (
      characterStatus ===
        "failed" ||
      characterStatus ===
        "error" ||
      characterStatus ===
        "cancelled" ||
      characterStatus ===
        "canceled"
    ) {
      return NextResponse.json(
        {
          status: "failed",

          provider: "eternalai",

          characterId,

          error:
            data?.error ||
            character?.error ||
            character?.message ||
            "AI character generation failed.",
        },

        { status: 502 }
      );
    }

    /*
     * STILL PROCESSING
     */

    return NextResponse.json(
      {
        status: "processing",

        provider: "eternalai",

        characterId,

        progress:
          data?.progress ??
          null,

        character: {
          id:
            character?.id ||
            characterId,

          username:
            character?.username ||
            "",

          displayName:
            character?.display_name ||
            "",

          status:
            character?.status ||
            "pending",
        },
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
      "BOMBA CHARACTER GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        status: "failed",

        code:
          "ETERNALAI_CHARACTER_STATUS_ERROR",

        error:
          error?.message ||
          "Error while checking AI character generation.",
      },

      { status: 500 }
    );
  }
}