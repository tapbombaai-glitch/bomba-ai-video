import { supabase } from "../../../../lib/supabase";

export async function POST(req) {
  try {
    const { email } = await req.json();

    // 1. Validate email
    if (!email || typeof email !== "string") {
      return Response.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 2. Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return Response.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // 3. Check whether this email already has a BOMBA key
    const { data: existingKey, error: lookupError } = await supabase
      .from("bomba_keys")
      .select("key_code, videos_allowed, videos_used")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (lookupError) {
      console.error("BOMBA API KEY LOOKUP ERROR:", lookupError);

      return Response.json(
        {
          error:
            lookupError.message ||
            "Unable to check your BOMBA API Key.",
        },
        { status: 500 }
      );
    }

    // 4. One email = one BOMBA key
    if (existingKey) {
      return Response.json({
        success: true,
        key: existingKey.key_code,
        videos_allowed: existingKey.videos_allowed,
        videos_used: existingKey.videos_used,
        remaining_videos: Math.max(
          0,
          (existingKey.videos_allowed || 0) -
            (existingKey.videos_used || 0)
        ),
        message: "You already have a BOMBA API Key.",
      });
    }

    // 5. Generate a new BOMBA API key
    const key_code =
      "bomba_" +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 8);

    // 6. Create the 3-video free trial
    const { data, error } = await supabase
      .from("bomba_keys")
      .insert([
        {
          key_code,
          email: cleanEmail,
          videos_allowed: 3,
          videos_used: 0,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("BOMBA API KEY CREATE ERROR:", error);

      return Response.json(
        {
          error:
            error.message ||
            "Failed to create your BOMBA API Key.",
        },
        { status: 500 }
      );
    }

    // 7. Return the new key and trial information
    return Response.json({
      success: true,
      key: data.key_code,
      videos_allowed: data.videos_allowed,
      videos_used: data.videos_used,
      remaining_videos: data.videos_allowed - data.videos_used,
      message:
        "BOMBA API Key created successfully. You have 3 free video generations.",
    });
  } catch (error) {
    console.error("BOMBA API KEY ERROR:", error);

    return Response.json(
      {
        error:
          error?.message ||
          "Unable to create BOMBA API Key.",
      },
      { status: 500 }
    );
  }
}