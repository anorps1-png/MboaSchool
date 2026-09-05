// Extrait le contenu textuel d'un fichier joint au Cerveau IA pour analyse.
// Volontairement limité à des formats texte/tableur/PDF : pas d'image/vision
// dans cette première version (tous les fournisseurs ne le supportent pas
// de façon fiable, notamment DeepSeek).
const MAX_CHARS = 30000;

function truncate(text: string): string {
  if (text.length <= MAX_CHARS) return text;
  return text.slice(0, MAX_CHARS) + `\n\n[...tronqué, ${text.length - MAX_CHARS} caractères supplémentaires non affichés...]`;
}

export async function extractFileText(file: File): Promise<{ text: string } | { error: string }> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    if (name.endsWith('.pdf')) {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        return { text: truncate(result.text || '') };
      } finally {
        await parser.destroy();
      }
    }

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(buffer, { type: 'buffer' });
      let text = '';
      for (const sheetName of wb.SheetNames) {
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
        text += `--- Feuille: ${sheetName} ---\n${csv}\n\n`;
      }
      return { text: truncate(text) };
    }

    if (name.endsWith('.csv') || name.endsWith('.txt') || name.endsWith('.json')) {
      return { text: truncate(buffer.toString('utf-8')) };
    }

    return { error: `Format non pris en charge (${name.split('.').pop() || '?'}). Formats acceptés : PDF, Excel (.xlsx/.xls), CSV, TXT, JSON.` };
  } catch (err: any) {
    return { error: `Impossible de lire le fichier : ${err.message}` };
  }
}
