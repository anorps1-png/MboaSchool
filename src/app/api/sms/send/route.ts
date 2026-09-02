import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { sendSms } from '@/lib/sms/nexah';
import { captureError } from '@/lib/observability/logger';

const bodySchema = z.object({
  mobiles: z.array(z.string().min(6)).min(1).max(500),
  message: z.string().min(1).max(918),
});

// Vérifie le jeton Supabase transmis par le client — la route ne doit jamais
// être appelable anonymement, car elle déclenche des SMS facturés via Nexah.
async function getAuthenticatedUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Requête invalide.', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await sendSms(parsed.data.mobiles, parsed.data.message);
    return NextResponse.json({ data: result });
  } catch (err) {
    captureError(err, { context: "Échec de l'envoi SMS via Nexah" });
    const message = err instanceof Error ? err.message : "Échec de l'envoi du SMS.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
