import { supabase } from "../../../../lib/supabase";

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return Response.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const key_code =
      "bomba_" + Math.random().toString(36).substring(2, 15);

    const { data, error } = await supabase
      .from("bomba_keys")
      .insert([
        {
          key_code,
          email,
          videos_allowed: 20,
          videos_used: 0,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("BOMBA API KEY ERROR:", error);

      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      key: data.key_code,
      videos_allowed: data.videos_allowed,
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