const fs = require('fs');
const path = require('path');

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
  
  // Eleve
  content = content.replace(/\.classe(?![A-Za-z])/g, '.classeId');
  content = content.replace(/\.genre/g, '.sexe');
  content = content.replace(/genre:/g, 'sexe:');
  
  // Optional chaining
  content = content.replace(/\.paiements\./g, '.paiements?.');
  content = content.replace(/\.paiements\[/g, '.paiements?.[');
  content = content.replace(/paiements\.map/g, '(paiements || []).map');
  content = content.replace(/notes\.map/g, '(notes || []).map');
  content = content.replace(/student\.paiements\.reduce/g, '(student.paiements || []).reduce');
  content = content.replace(/student\.notes\.reduce/g, '(student.notes || []).reduce');
  content = content.replace(/student\.paiements\.filter/g, '(student.paiements || []).filter');
  content = content.replace(/s\.paiements\.filter/g, '(s.paiements || []).filter');
  content = content.replace(/student\.notes\.filter/g, '(student.notes || []).filter');

  // Specific transaction
  content = content.replace(/tx\.classe(?![A-Za-z])/g, 'tx.classeNom');
  content = content.replace(/t\.classe(?![A-Za-z])/g, 't.classeNom');
  content = content.replace(/transaction\.classe(?![A-Za-z])/g, 'transaction.classeNom');
  content = content.replace(/payment\.classe(?![A-Za-z])/g, 'payment.classeNom');

  // ConfigurationFrais
  content = content.replace(/frais\.classe/g, 'frais.niveauId');
  content = content.replace(/f\.classe/g, 'f.niveauId');
  content = content.replace(/item\.classe/g, 'item.niveauId');
  
  // Cours
  content = content.replace(/cours\.matiere(?![A-Za-z])/g, 'cours.matiereId');
  content = content.replace(/cours\.enseignantNom/g, 'cours.enseignantId');
  content = content.replace(/lesson\.matiere(?![A-Za-z])/g, 'lesson.matiereId');
  content = content.replace(/lesson\.enseignantNom/g, 'lesson.enseignantId');

  // NoteMatiere
  content = content.replace(/note\.matiere(?![A-Za-z])/g, 'note.matiereId');
  content = content.replace(/note\.enseignantNom/g, 'note.enseignantId');
  content = content.replace(/note\.coefficient/g, '1');
  content = content.replace(/n\.matiere(?![A-Za-z])/g, 'n.matiereId');
  content = content.replace(/n\.enseignantNom/g, 'n.enseignantId');
  content = content.replace(/n\.coefficient/g, '1');
  content = content.replace(/g\.matiere(?![A-Za-z])/g, 'g.matiereId');
  content = content.replace(/g\.enseignantNom/g, 'g.enseignantId');
  content = content.replace(/g\.coefficient/g, '1');
  content = content.replace(/g\.note/g, '(g.note || 0)');

  // Enseignant
  content = content.replace(/enseignant\.matieres(?![A-Za-z])/g, 'enseignant.matieresId');
  content = content.replace(/enseignant\.classes(?![A-Za-z])/g, 'enseignant.classesId');
  content = content.replace(/teacher\.matieres(?![A-Za-z])/g, 'teacher.matieresId');
  content = content.replace(/teacher\.classes(?![A-Za-z])/g, 'teacher.classesId');
  content = content.replace(/matieres:/g, 'matieresId:');
  
  // Imports Note -> NoteMatiere
  content = content.replace(/import \{([^}]*)Note([^}]*)\} from/g, 'import {$1NoteMatiere$2} from');
  
  fs.writeFileSync(file, content, 'utf8');
});
console.log('Script terminé.');
