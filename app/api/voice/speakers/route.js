import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const NAIJALINGO_API_KEY =
  process.env.NAIJALINGO_API_KEY;

const NAIJALINGO_BASE_URL =
  process.env.NAIJALINGO_BASE_URL ||
  "https://api.9jalingo.org";

const FALLBACK_VOICES = {
  pcm: [
    {
      id: "ada_pcm",
      name: "Ada",
      language: "pcm",
      gender: "Female",
    },
    {
      id: "blessing_pcm",
      name: "Blessing",
      language: "pcm",
      gender: "Female",
    },
  ],

  ig: [
    {
      id: "adaeze_ig",
      name: "Adaeze",
      language: "ig",
      gender: "Female",
    },
    {
      id: "ifeanyi_ig",
      name: "Ifeanyi",
      language: "ig",
      gender: "Male",
    },
  ],

  yo: [
    {
      id: "adeola_yo",
      name: "Adeola",
      language: "yo",
      gender: "Female",
    },
    {
      id: "adekunle_yo",
      name: "Adekunle",
      language: "yo",
      gender: "Male",
    },
  ],

  ha: [
    {
      id: "aisha_ha",
      name: "Aisha",
      language: "ha",
      gender: "Female",
    },
    {
      id: "bello_ha",
      name: "Bello",
      language: "ha",
      gender: "Male",
    },
  ],
};

function normaliseVoices(data, language) {
  const raw =
    Array.isArray(data)
      ? data
      : Array.isArray(data?.speakers)
      ? data.speakers
      : Array.isArray(data?.voices)
      ? data.voices
      : Array.isArray(data?.data)
      ? data.data
      : [];

  return raw
    .map((speaker) => {
      const id =
        speaker?.id ||
        speaker?.voice_id ||
        speaker?.speaker_id ||
        speaker?.voice ||
        "";

      if (!id) return null;

      return {
        id: String(id),
        name:
          speaker?.name ||
          speaker?.display_name ||
          String(id),
        language:
          speaker?.language ||
          speaker?.lang ||
          language,
        gender:
          speaker?.gender ||
          speaker?.sex ||
          "",
      };
    })
    .filter(Boolean);
}

export async function GET(request) {
  try {
    const { searchParams } =
      new URL(request.url);

    const language =
      searchParams.get("language") ||
      "pcm";

    if (
      !["pcm", "ig", "yo", "ha"].includes(
        language
      )
    ) {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "Unsupported 9jaLingo language.",
        },
        { status: 400 }
      );
    }

    /*
     * Keep the API key on the server.
     * Never expose it to the browser.
     */
    if (!NAIJALINGO_API_KEY) {
      return NextResponse.json({
        status: "fallback",
        source: "bomba",
        language,
        voices:
          FALLBACK_VOICES[language] || [],
      });
    }

    /*
     * 9jaLingo's official SDK exposes
     * list_speakers(language=...).
     *
     * The REST speaker endpoint can vary by
     * API deployment, so BOMBA attempts the
     * speaker catalogue first and safely falls
     * back to confirmed documented speakers.
     */
    const endpoints = [
      `${NAIJALINGO_BASE_URL}/v1/speakers?language=${encodeURIComponent(
        language
      )}`,
      `${NAIJALINGO_BASE_URL}/v1/speakers?lang=${encodeURIComponent(
        language
      )}`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(
          endpoint,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${NAIJALINGO_API_KEY}`,
              "X-API-Key":
                NAIJALINGO_API_KEY,
              Accept:
                "application/json",
            },
            cache: "no-store",
          }
        );

        if (!response.ok) {
          continue;
        }

        const text =
          await response.text();

        let data = {};

        try {
          data = text
            ? JSON.parse(text)
            : {};
        } catch {
          continue;
        }

        const voices =
          normaliseVoices(
            data,
            language
          );

        if (voices.length > 0) {
          return NextResponse.json({
            status: "completed",
            source: "9jalingo",
            language,
            voices,
          });
        }
      } catch {
        /*
         * Try the next endpoint.
         */
      }
    }

    /*
     * Safe fallback using speaker IDs
     * confirmed in the official 9jaLingo
     * documentation.
     */
    return NextResponse.json({
      status: "fallback",
      source: "bomba",
      language,
      voices:
        FALLBACK_VOICES[language] || [],
    });
  } catch (error) {
    console.error(
      "BOMBA 9JALINGO SPEAKER LIST ERROR:",
      error
    );

    const language = "pcm";

    return NextResponse.json({
      status: "fallback",
      source: "bomba",
      language,
      voices:
        FALLBACK_VOICES[language],
    });
  }
}