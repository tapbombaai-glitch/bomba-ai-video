import { randomBytes } from 'crypto';

export async function POST() {
  const newKey = `bomba_live_${randomBytes(16).toString('hex')}`;
  
  // For now we go just return the key, later we save am for Supabase
  return Response.json({ 
    apiKey: newKey,
    message: "Copy this key! Na your Bomba API key be this!" 
  });
}
