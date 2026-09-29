import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const REPLICATE_API_TOKEN =
process.env.REPLICATE_API_TOKEN;

const REPLICATE_API_URL =
"https://api.replicate.com/v1/predictions";

const MUSICGEN_VERSION =
"meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb";

function getSoundPrompt(type, prompt) {
const cleanPrompt =
typeof prompt === "string"
? prompt.trim()
: "";

const soundType =
typeof type === "string"
? type.trim()
: "Background Music";

if (!cleanPrompt) {
return ${soundType}, cinematic background music, instrumental, clean production;
}

return `${cleanPrompt}

Style: ${soundType}.
Instrumental only.
No vocals.
No speech.
Clean cinematic production.
Suitable for a short AI video.`;
}

function extractOutputUrl(output) {
if (!output) {
return null;
}

if (typeof output === "string") {
return output;
}

if (Array.isArray(output)) {
for (const item of output) {
if (typeof item === "string") {
return item;
}

if (  
    item &&  
    typeof item.url === "function"  
  ) {  
    try {  
      return item.url();  
    } catch {}  
  }  

  if (  
    item &&  
    typeof item.url === "string"  
  ) {  
    return item.url;  
  }  
}

}

if (
typeof output.url === "function"
) {
try {
return output.url();
} catch {}
}

if (
typeof output.url === "string"
) {
return output.url;
}

return null;
}

async function getPrediction(predictionUrl) {
const response = await fetch(
predictionUrl,
{
method: "GET",
headers: {
Authorization:
Bearer ${REPLICATE_API_TOKEN},
"Content-Type":
"application/json",
},
cache: "no-store",
}
);

const text =
await response.text();

let data = null;

try {
data = JSON.parse(text);
} catch {
data = null;
}

return {
response,
data,
text,
};
}

/* =========================================================
POST → GENERATE AI SOUND
========================================================= */

export async function POST(request) {
try {
if (!REPLICATE_API_TOKEN) {
return NextResponse.json(
{
status: "failed",
error:
"REPLICATE_API_TOKEN is not configured in Vercel.",
},
{ status: 500 }
);
}

const body =  
  await request.json();  

const type =  
  body?.type ||  
  "Background Music";  

const prompt =  
  typeof body?.prompt === "string"  
    ? body.prompt.trim()  
    : "";  

let duration =  
  Number(body?.duration) || 5;  

/*  
 * PHONE-FRIENDLY TEST MODE  
 *  
 * Always keep the minimum at 5 seconds.  
 * Maximum allowed from BOMBA is 30 seconds.  
 */  

duration = Math.max(  
  5,  
  Math.min(30, Math.round(duration))  
);  

if (!prompt) {  
  return NextResponse.json(  
    {  
      status: "failed",  
      error:  
        "Please describe the sound you want.",  
    },  
    { status: 400 }  
  );  
}  

const finalPrompt =  
  getSoundPrompt(  
    type,  
    prompt  
  );  

const input = {  
  prompt: finalPrompt,  

  duration,  

  model_version:  
    "stereo-large",  

  output_format:  
    "mp3",  

  normalization_strategy:  
    "peak",  

  continuation: false,  

  top_k: 250,  

  top_p: 0,  

  temperature: 1,  

  classifier_free_guidance: 3,  
};  

console.log(  
  "BOMBA SOUND STARTING:",  
  {  
    duration,  
    type,  
    model:  
      MUSICGEN_VERSION,  
    outputFormat: "mp3",  
  }  
);  

const createResponse =  
  await fetch(  
    REPLICATE_API_URL,  
    {  
      method: "POST",  

      headers: {  
        Authorization:  
          `Bearer ${REPLICATE_API_TOKEN}`,  

        "Content-Type":  
          "application/json",  

        Prefer:  
          "wait=60",  
      },  

      body: JSON.stringify({  
        version:  
          MUSICGEN_VERSION,  

        input,  
      }),  
    }  
  );  

const createText =  
  await createResponse.text();  

let prediction = null;  

try {  
  prediction =  
    JSON.parse(createText);  
} catch {  
  prediction = null;  
}  

console.log(  
  "BOMBA SOUND CREATE STATUS:",  
  createResponse.status  
);  

console.log(  
  "BOMBA SOUND CREATE RESPONSE:",  
  createText.slice(0, 1500)  
);  

if (!createResponse.ok) {  
  return NextResponse.json(  
    {  
      status: "failed",  

      error:  
        prediction?.detail ||  
        prediction?.error ||  
        `Replicate returned HTTP ${createResponse.status}`,  

      raw:  
        createText.slice(  
          0,  
          1000  
        ),  
    },  
    {  
      status:  
        createResponse.status ===  
        402  
          ? 402  
          : 502,  
    }  
  );  
}  

/*  
 * Replicate can return the completed  
 * prediction immediately when Prefer:  
 * wait=60 is used.  
 */  

if (  
  prediction?.status ===  
    "succeeded" ||  
  prediction?.status ===  
    "successful" ||  
  prediction?.status ===  
    "completed"  
) {  
  const audioUrl =  
    extractOutputUrl(  
      prediction?.output  
    );  

  if (audioUrl) {  
    console.log(  
      "BOMBA SOUND COMPLETED IMMEDIATELY"  
    );  

    console.log(  
      "BOMBA SOUND URL:",  
      audioUrl  
    );  

    return NextResponse.json({  
      status: "completed",  

      audioUrl,  

      predictionId:  
        prediction.id,  

      duration,  
    });  
  }  
}  

const predictionUrl =  
  prediction?.urls?.get ||  
  prediction?.url ||  
  null;  

const predictionId =  
  prediction?.id ||  
  null;  

if (!predictionUrl) {  
  return NextResponse.json(  
    {  
      status: "failed",  

      error:  
        "Replicate did not return a prediction URL.",  

      raw:  
        createText.slice(  
          0,  
          1000  
        ),  
    },  
    { status: 502 }  
  );  
}  

console.log(  
  "BOMBA SOUND PREDICTION ID:",  
  predictionId  
);  

/*  
 * Poll Replicate.  
 *  
 * We wait up to approximately  
 * two minutes.  
 */  

for (  
  let attempt = 1;  
  attempt <= 60;  
  attempt++  
) {  
  await new Promise(  
    (resolve) =>  
      setTimeout(  
        resolve,  
        2000  
      )  
  );  

  const result =  
    await getPrediction(  
      predictionUrl  
    );  

  console.log(  
    "BOMBA SOUND POLL:",  
    {  
      attempt,  
      status:  
        result?.data?.status,  
    }  
  );  

  if (  
    !result.response.ok  
  ) {  
    return NextResponse.json(  
      {  
        status: "failed",  

        error:  
          result?.data?.detail ||  
          result?.data?.error ||  
          "Replicate status check failed.",  

        predictionId,  
      },  
      { status: 502 }  
    );  
  }  

  const status =  
    String(  
      result?.data?.status ||  
        ""  
    ).toLowerCase();  

  if (  
    status ===  
      "succeeded" ||  
    status ===  
      "successful" ||  
    status ===  
      "completed"  
  ) {  
    const audioUrl =  
      extractOutputUrl(  
        result?.data?.output  
      );  

    if (!audioUrl) {  
      return NextResponse.json(  
        {  
          status: "failed",  

          error:  
            "Sound generation completed, but Replicate returned no audio URL.",  

          predictionId,  
        },  
        { status: 502 }  
      );  
    }  

    console.log(  
      "BOMBA SOUND COMPLETED:"  
    );  

    console.log(  
      "BOMBA SOUND URL:",  
      audioUrl  
    );  

    return NextResponse.json({  
      status: "completed",  

      audioUrl,  

      predictionId,  

      duration,  
    });  
  }  

  if (  
    status === "failed" ||  
    status === "canceled" ||  
    status === "cancelled" ||  
    status === "aborted"  
  ) {  
    return NextResponse.json(  
      {  
        status: "failed",  

        error:  
          result?.data?.error ||  
          `Replicate sound generation ${status}.`,  

        predictionId,  
      },  
      { status: 502 }  
    );  
  }  
}  

/*  
 * Generation is still running.  
 * The frontend can report processing.  
 */  

return NextResponse.json({  
  status: "processing",  

  predictionId,  

  predictionUrl,  

  duration,  
});

} catch (error) {
console.error(
"BOMBA SOUND ERROR:",
error
);

return NextResponse.json(  
  {  
    status: "failed",  

    error:  
      error?.message ||  
      "Unexpected error while generating sound.",  
  },  
  { status: 500 }  
);

}
}