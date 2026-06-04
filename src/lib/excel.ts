import * as XLSX from 'xlsx';

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
  
  // Convertir le JSON en feuille Excel
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Ajouter la feuille au classeur
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Générer et télécharger le fichier
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};
