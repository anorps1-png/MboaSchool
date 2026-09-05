import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getAuthedProfile } from '@/lib/supabase/server';
import { extractFileText } from '@/lib/ai/extractFile';

const ALLOWED_ROLES = new Set(['admin', 'directeur']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const profile = await getAuthedProfile(supabase);
    if (!profile) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }
    if (!ALLOWED_ROLES.has(profile.role)) {
      return NextResponse.json({ error: "Réservé aux comptes admin/directeur." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (10 Mo maximum).' }, { status: 400 });
    }

    const result = await extractFileText(file);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ text: result.text, filename: file.name });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur lors de l'analyse du fichier." }, { status: 500 });
  }
}
