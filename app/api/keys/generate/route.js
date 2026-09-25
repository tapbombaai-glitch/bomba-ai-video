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

    // Simple email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return Response.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // 2. Check if this email already has a key
    const { data: existingKey } = await supabase
      .from("bomba_keys")
      .select("key_code, videos_allowed, videos_used")
      .eq("email", cleanEmail)
      .single();

    if (existingKey) {
      return Response.json({
        success: true,
        key: existingKey.key_code,
        videos_allowed: existingKey.videos_allowed,
        videos_used: existingKey.videos_used,
        message: "You already have a BOMBA API Key.",
      });
    }

    // 3. Generate new key
    const key_code =
      "bomba_" +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 8);

    // 4. Insert into database
    const { data, error } = await supabase
      .from("bomba_keys")
      .insert([
        {
          key_code,
          email: cleanEmail,
          videos_allowed: 20,
          videos_used: 0,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("BOMBA API KEY ERROR:", error);
      return Response.json(
        { error: error.message || "Failed to create API Key." },
        { status: 500 }
      );
    }

    // 5. Success response
    return Response.json({
      success: true,
      key: data.key_code,
      videos_allowed: data.videos_allowed,
      videos_used: data.videos_used,
      message: "BOMBA API Key created successfully.",
    });
  } catch (error) {
    console.error("BOMBA API KEY ERROR:", error);
    return Response.json(
      { error: "Unable to create API Key." },
      { status: 500 }
    );
  }
}