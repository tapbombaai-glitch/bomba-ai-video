import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const ETERNALAI_API_KEY = process.env.ETERNALAI_API_KEY;

const ETERNALAI_BASE_URL = "Browser could not play this audio file 😭😭";

const ETERNALAI_SUBMIT_URL =
${ETERNALAI_BASE_URL}/api/image-to-video;

const ETERNALAI_MODEL =
"wan-ai/wan2.2-i2v-a14b-lightning";

const DEFAULT_NEGATIVE_PROMPT =
"blurry, low quality, distorted face, deformed body, extra fingers, extra limbs, bad anatomy, unrealistic movement, flickering, duplicate person, text, watermark, logo, nsfw, nudity";

function safeParse(text) {
try {
return JSON.parse(text);
} catch {
return null;
}
}

async function proxyVideo(videoUrl) {
try {
const response = await fetch(videoUrl, {
cache: "no-store",
});

if (!response.ok) {  
  return NextResponse.json(  
    {  
      status: "failed",  
      error: `Failed to download video (HTTP ${response.status})`,  
    },  
    { status: 502 }  
  );  
}  

const contentType =  
  response.headers.get("content-type") ||  
  "video/mp4";  

const buffer = await response.arrayBuffer();  

return new NextResponse(buffer, {  
  status: 200,  
  headers: {  
    "Content-Type": contentType,  
    "Content-Length": String(buffer.byteLength),  
    "Cache-Control": "public, max-age=3600",  
  },  
});

} catch (error) {
console.error(
"BOMBA ETERNAL AI PROXY ERROR:",
error
);

return NextResponse.json(  
  {  
    status: "failed",  
    error: "Could not proxy the generated video.",  
  },  
  { status: 502 }  
);

}
}

/* =========================================================
POST → START ETERNAL AI GENERATION
========================================================= */

export async function POST(request) {
try {
if (!ETERNALAI_API_KEY) {
return NextResponse.json(
{
status: "failed",
error:
"ETERNALAI_API_KEY is not configured in Vercel.",
},
{ status: 500 }
);
}

const body = await request.json();  

const imageData =  
  body?.imageData ||  
  body?.image ||  
  body?.characterImage ||  
  null;  

const prompt =  
  typeof body?.prompt === "string"  
    ? body.prompt.trim()  
    : "";  

const mode =  
  body?.mode || "Story";  

if (!imageData) {  
  return NextResponse.json(  
    {  
      status: "failed",  
      error:  
        "Please upload a character photo first.",  
    },  
    { status: 400 }  
  );  
}  

if (!prompt) {  
  return NextResponse.json(  
    {  
      status: "failed",  
      error:  
        "Please describe the video you want.",  
    },  
    { status: 400 }  
  );  
}  

/*  
 * Eternal AI accepts either a publicly reachable  
 * image URL or a base64 data URI.  
 *  
 * Maximum image size: 15 MB.  
 */  

const finalPrompt = `${prompt}

Photorealistic live-action video, cinematic lighting, natural human movement, realistic skin texture, realistic facial expressions, natural body proportions, detailed environment, high quality.`;

/*  
 * BOMBA first test:  
 *  
 * 5 seconds  
 * 480p  
 *  
 * Eternal AI current pricing:  
 * $0.005 per generated second  
 * 5 seconds = $0.025  
 *  
 * Duration MUST be a string.  
 */  

const payload = {  
  prompt: finalPrompt,  

  image_url: imageData,  

  model_id: ETERNALAI_MODEL,  

  duration: "5",  

  aspect_ratio: "16:9",  

  resolution: "480p",  

  negative_prompt:  
    DEFAULT_NEGATIVE_PROMPT,  

  cfg_scale: 0.5,  
};  

console.log(  
  "BOMBA ETERNAL AI STARTING:",  
  {  
    model: ETERNALAI_MODEL,  
    mode,  
    duration: "5 seconds",  
    resolution: "480p",  
    aspectRatio: "16:9",  
  }  
);  

const response = await fetch(  
  ETERNALAI_SUBMIT_URL,  
  {  
    method: "POST",  

    headers: {  
      Authorization:  
        `Bearer ${ETERNALAI_API_KEY}`,  

      "Content-Type":  
        "application/json",  
    },  

    body: JSON.stringify(payload),  
  }  
);  

const text =  
  await response.text();  

const data =  
  safeParse(text);  

console.log(  
  "BOMBA ETERNAL AI START STATUS:",  
  response.status  
);  

console.log(  
  "BOMBA ETERNAL AI START RESPONSE:",  
  text.slice(0, 1500)  
);  

if (!response.ok) {  
  return NextResponse.json(  
    {  
      status: "failed",  
      error:  
        data?.error ||  
        data?.detail ||  
        `Eternal AI returned HTTP ${response.status}`,  

      raw: text.slice(0, 1000),  
    },  
    { status: response.status === 402 ? 402 : 502 }  
  );  
}  

const requestId =  
  data?.result?.request_id ||  
  data?.request_id ||  
  data?.id;  

if (!requestId) {  
  return NextResponse.json(  
    {  
      status: "failed",  
      error:  
        "Eternal AI did not return a request ID.",  

      raw: text.slice(0, 1000),  
    },  
    { status: 502 }  
  );  
}  

console.log(  
  "BOMBA ETERNAL AI REQUEST ID:",  
  requestId  
);  

return NextResponse.json({  
  status: "queued",  

  id: requestId,  

  jobId: requestId,  

  predictionId: requestId,  
});

} catch (error) {
console.error(
"BOMBA ETERNAL AI POST ERROR:",
error
);

return NextResponse.json(  
  {  
    status: "failed",  

    error:  
      error?.message ||  
      "Unexpected error while starting video generation.",  
  },  
  { status: 500 }  
);

}
}

/* =========================================================
GET → CHECK STATUS / RETURN VIDEO
========================================================= */

export async function GET(request) {
try {
if (!ETERNALAI_API_KEY) {
return NextResponse.json(
{
status: "failed",

error:  
        "ETERNALAI_API_KEY is missing.",  
    },  
    { status: 500 }  
  );  
}  

const { searchParams } =  
  new URL(request.url);  

const requestId =  
  searchParams.get("id") ||  
  searchParams.get("jobId") ||  
  searchParams.get("predictionId") ||  
  searchParams.get("eventId");  

if (!requestId) {  
  return NextResponse.json(  
    {  
      status: "failed",  

      error:  
        "Missing generation ID.",  
    },  
    { status: 400 }  
  );  
}  

/* -----------------------------------------  
   CHECK ETERNAL AI STATUS  
----------------------------------------- */  

const statusUrl =  
  `${ETERNALAI_BASE_URL}/api/image-to-video/${encodeURIComponent(  
    requestId  
  )}/status`;  

console.log(  
  "BOMBA ETERNAL AI STATUS URL:",  
  statusUrl  
);  

const statusRes =  
  await fetch(  
    statusUrl,  
    {  
      method: "GET",  

      headers: {  
        Authorization:  
          `Bearer ${ETERNALAI_API_KEY}`,  
      },  

      cache: "no-store",  
    }  
  );  

const statusText =  
  await statusRes.text();  

const statusData =  
  safeParse(statusText);  

console.log(  
  "BOMBA ETERNAL AI STATUS RESPONSE:",  
  statusText.slice(0, 1200)  
);  

if (!statusRes.ok) {  
  return NextResponse.json(  
    {  
      status: "failed",  

      error:  
        statusData?.error ||  
        statusData?.detail ||  
        `Eternal AI status check failed (HTTP ${statusRes.status})`,  

      raw: statusText.slice(0, 800),  

      jobId: requestId,  
    },  

    {  
      status: statusRes.status === 404  
        ? 502  
        : 502,  
    }  
  );  
}  

/*  
 * Eternal AI response:  
 *  
 * {  
 *   status: true,  
 *   result: {  
 *     request_id: "...",  
 *     status: "pending",  
 *     progress: 20,  
 *     video_url: null  
 *   }  
 * }  
 */  

const result =  
  statusData?.result ||  
  {};  

const generationStatus =  
  String(  
    result?.status ||  
    ""  
  ).toLowerCase();  

const progress =  
  result?.progress ?? null;  

console.log(  
  "BOMBA ETERNAL AI JOB STATUS:",  
  {  
    requestId,  

    status:  
      generationStatus,  

    progress,  
  }  
);  

/* -----------------------------------------  
   STILL WORKING  
----------------------------------------- */  

if (  
  generationStatus === "pending" ||  
  generationStatus === "processing" ||  
  generationStatus === "queued" ||  
  generationStatus === "in_queue" ||  
  generationStatus === "in_progress"  
) {  
  return NextResponse.json({  
    status: "processing",  

    jobId: requestId,  

    id: requestId,  

    progress,  
  });  
}  

/* -----------------------------------------  
   FAILED  
----------------------------------------- */  

if (  
  generationStatus === "failed" ||  
  generationStatus === "error"  
) {  
  return NextResponse.json(  
    {  
      status: "failed",  

      error:  
        result?.error ||  
        statusData?.error ||  
        "Eternal AI video generation failed.",  

      jobId: requestId,  
    },  

    {  
      status: 502,  
    }  
  );  
}  

/* -----------------------------------------  
   COMPLETED  
----------------------------------------- */  

if (  
  generationStatus === "completed" ||  
  generationStatus === "success" ||  
  generationStatus === "succeeded"  
) {  
  const videoUrl =  
    result?.video_url ||  
    result?.video?.url ||  
    statusData?.video_url ||  
    statusData?.video?.url ||  
    null;  

  if (!videoUrl) {  
    return NextResponse.json(  
      {  
        status: "failed",  

        error:  
          "Generation completed but Eternal AI returned no video URL.",  

        raw:  
          statusText.slice(  
            0,  
            1000  
          ),  

        jobId: requestId,  
      },  

      {  
        status: 502,  
      }  
    );  
  }  

  console.log(  
    "BOMBA ETERNAL AI VIDEO URL:",  
    videoUrl  
  );  

  /*  
   * Download the Eternal AI CDN video  
   * through BOMBA so the browser does not  
   * need to communicate directly with  
   * Eternal AI.  
   */  

  return proxyVideo(videoUrl);  
}  

/* -----------------------------------------  
   VIDEO URL EXISTS  
   ----------------------------------------- */  

if (result?.video_url) {  
  console.log(  
    "BOMBA ETERNAL AI VIDEO URL:",  
    result.video_url  
  );  

  return proxyVideo(  
    result.video_url  
  );  
}  

/* -----------------------------------------  
   UNKNOWN STATUS  
----------------------------------------- */  

return NextResponse.json({  
  status: "processing",  

  jobId: requestId,  

  id: requestId,  

  progress,  
});

} catch (error) {
console.error(
"BOMBA ETERNAL AI GET ERROR:",
error
);

return NextResponse.json(  
  {  
    status: "failed",  

    error:  
      error?.message ||  
      "Error while checking Eternal AI video generation.",  
  },  
  { status: 500 }  
);

}
}