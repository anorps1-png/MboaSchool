const fs = require('fs');

function replaceInFile(file, search, replace) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.split(search).join(replace);
  fs.writeFileSync(file, content, 'utf8');
}

// dashboard
replaceInFile('src/app/dashboard/page.tsx', 'student.paiements.reduce', '(student.paiements || []).reduce');
replaceInFile('src/app/dashboard/page.tsx', 'student.classeNom', 'student.classeId');
replaceInFile('src/app/dashboard/page.tsx', 's.paiements.reduce', '(s.paiements || []).reduce');

// eleves/[id]/page.tsx
replaceInFile('src/app/eleves/[id]/page.tsx', 'student.classeNom', 'student.classeId');
replaceInFile('src/app/eleves/[id]/page.tsx', 'student.paiements.filter', '(student.paiements || []).filter');
replaceInFile('src/app/eleves/[id]/page.tsx', '<Note>', '<NoteMatiere>');
replaceInFile('src/app/eleves/[id]/page.tsx', ' Note ', ' NoteMatiere ');
replaceInFile('src/app/eleves/[id]/page.tsx', 'Note[]', 'NoteMatiere[]');
replaceInFile('src/app/eleves/[id]/page.tsx', 'student.paiements.length', '(student.paiements?.length || 0)');

// eleves/page.tsx
replaceInFile('src/app/eleves/page.tsx', 'student.classeNom', 'student.classeId');
replaceInFile('src/app/eleves/page.tsx', 'student.paiements.filter', '(student.paiements || []).filter');
replaceInFile('src/app/eleves/page.tsx', 'f.classeId', 'f.niveauId');
replaceInFile('src/app/eleves/page.tsx', 'frais.classeId', 'frais.niveauId');
replaceInFile('src/app/eleves/page.tsx', "dateInscription: new Date().toISOString().split('T')[0],", "dateInscription: new Date().toISOString().split('T')[0],\n      anneeScolaireId: 'as-2025',");

// enseignants/page.tsx
replaceInFile('src/app/enseignants/page.tsx', 'classes: []', 'classesId: []');

// frais/page.tsx
replaceInFile('src/app/frais/page.tsx', 'f.classeId', 'f.niveauId');
replaceInFile('src/app/frais/page.tsx', 'frais.classeId', 'frais.niveauId');

console.log('Script 3 terminé.');
