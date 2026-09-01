import * as XLSX from 'xlsx';

/**
 * Neutralise l'injection de formule Excel/CSV : une valeur texte commençant
 * par un caractère qu'Excel/Sheets/LibreOffice interprète comme un début de
 * formule (=, +, -, @, tabulation, retour chariot) est préfixée d'une
 * apostrophe pour forcer une interprétation en texte brut. Contre-mesure
 * standard (OWASP) contre le CSV/Excel formula injection, nécessaire ici car
 * les valeurs exportées peuvent provenir d'une saisie utilisateur (import
 * Excel ou formulaire) jamais validée par ailleurs sur son contenu.
 */
export const sanitizeExcelValue = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
};

const sanitizeExcelRow = (row: Record<string, unknown>): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    sanitized[key] = sanitizeExcelValue(row[key]);
  }
  return sanitized;
};

/**
 * Convertit un tableau d'objets JSON en fichier Excel et le télécharge.
 *
 * @param data Données à exporter (tableau d'objets)
 * @param filename Nom du fichier (sans l'extension .xlsx)
 * @param sheetName Nom de l'onglet dans le fichier Excel (optionnel)
 */
export const downloadExcel = (data: any[], filename: string, sheetName: string = 'Feuille 1') => {
  // Créer un classeur Excel
  const workbook = XLSX.utils.book_new();

  // Convertir le JSON en feuille Excel (valeurs texte sanitisées contre
  // l'injection de formule, cf. sanitizeExcelValue ci-dessus)
  const worksheet = XLSX.utils.json_to_sheet(data.map(sanitizeExcelRow));

  // Ajouter la feuille au classeur
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Générer et télécharger le fichier
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};
