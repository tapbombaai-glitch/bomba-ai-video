import { supabase } from "../../../../lib/supabase"

export async function POST(req) {
  const { email } = await req.json()
  const key_code = 'bomba_' + Math.random().toString(36).substring(2, 15)
  
  const { data, error } = await supabase
    .from('bomba_keys')
    .insert([{ key_code, email, videos_allowed: 20, videos_used: 0 }])
    .select()
  
  if (error) return Response.json({ error: error.message }, { status: 500 })
  
  return Response.json({ key: key_code, message: "Key saved!" })
}