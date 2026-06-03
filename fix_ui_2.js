const fs = require('fs');

const files = [
  'src/app/dashboard/page.tsx',
  'src/app/eleves/[id]/page.tsx',
  'src/app/eleves/page.tsx',
  'src/app/emploi-du-temps/page.tsx',
  'src/app/enseignants/page.tsx',
  'src/app/frais/page.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Fix double Id
  content = content.replace(/niveauIdId/g, 'niveauId');
  content = content.replace(/classeIdId/g, 'classeId');
  content = content.replace(/matiereIdId/g, 'matiereId');

  // Fix TransactionPaiement and ConfigurationFrais
  content = content.replace(/tx\.classeId/g, 'tx.classeNom');
  content = content.replace(/t\.classeId/g, 't.classeNom');
  content = content.replace(/transaction\.classeId/g, 'transaction.classeNom');
  content = content.replace(/payment\.classeId/g, 'payment.classeNom');
  
  content = content.replace(/frais\.classeId/g, 'frais.niveauId');
  content = content.replace(/f\.classeId/g, 'f.niveauId');
  content = content.replace(/item\.classeId/g, 'item.niveauId');

  // Fix Enseignant genre
  if (file.includes('enseignants/page.tsx')) {
    content = content.replace(/\.sexe/g, '.genre');
    content = content.replace(/sexe:/g, 'genre:');
  }

  // Fix Note import/type in eleves/[id]/page.tsx
  if (file.includes('eleves/[id]/page.tsx')) {
    content = content.replace(/<Note>/g, '<NoteMatiere>');
    content = content.replace(/ Note /g, ' NoteMatiere ');
    content = content.replace(/\(Note\)/g, '(NoteMatiere)');
    content = content.replace(/student\.paiements\.length/g, '(student.paiements?.length || 0)');
    content = content.replace(/\.\.\.student\.paiements\]/g, '...(student.paiements || [])]');
    content = content.replace(/classe:/g, 'classeNom:'); // Inside TransactionPaiement literal
  }

  // Fix eleves/page.tsx
  if (file.includes('eleves/page.tsx')) {
    content = content.replace(/classe:/g, 'classeId:'); // Inside Eleve literal
  }

  // Handle remaining .paiements or .notes missing optional chaining
  content = content.replace(/student\.paiements\./g, '(student.paiements || []).');
  content = content.replace(/student\.notes\./g, '(student.notes || []).');
  content = content.replace(/s\.paiements\./g, '(s.paiements || []).');
  content = content.replace(/s\.notes\./g, '(s.notes || []).');
  content = content.replace(/eleve\.paiements\./g, '(eleve.paiements || []).');
  content = content.replace(/eleve\.notes\./g, '(eleve.notes || []).');

  fs.writeFileSync(file, content, 'utf8');
});
console.log('Script 2 terminé.');
