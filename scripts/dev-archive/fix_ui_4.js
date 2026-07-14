const fs = require('fs');

function replaceAll(file, search, replace) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.split(search).join(replace);
  fs.writeFileSync(file, content, 'utf8');
}

// undefined issues
replaceAll('src/app/dashboard/page.tsx', 'student.paiements.reduce', '(student.paiements || []).reduce');
replaceAll('src/app/dashboard/page.tsx', 's.paiements.reduce', '(s.paiements || []).reduce');
replaceAll('src/app/dashboard/page.tsx', 'student.paiements.filter', '(student.paiements || []).filter');
replaceAll('src/app/dashboard/page.tsx', 's.paiements.filter', '(s.paiements || []).filter');

replaceAll('src/app/eleves/[id]/page.tsx', 'student.paiements.filter', '(student.paiements || []).filter');
replaceAll('src/app/eleves/[id]/page.tsx', 'student.paiements.length', '(student.paiements || []).length');

replaceAll('src/app/eleves/page.tsx', 'student.paiements.filter', '(student.paiements || []).filter');

// classeId -> niveauId in frais/page.tsx and eleves/page.tsx where it applies to frais
replaceAll('src/app/eleves/page.tsx', 'f.classeId', 'f.niveauId');
replaceAll('src/app/eleves/page.tsx', 'frais.classeId', 'frais.niveauId');
replaceAll('src/app/eleves/page.tsx', 'ConfigurationFrais.classeId', 'ConfigurationFrais.niveauId');

replaceAll('src/app/frais/page.tsx', 'f.classeId', 'f.niveauId');
replaceAll('src/app/frais/page.tsx', 'frais.classeId', 'frais.niveauId');

// enseignants/page.tsx classesId
replaceAll('src/app/enseignants/page.tsx', 'classes: []', 'classesId: []');

// some more undefined safety
let dbPage = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
dbPage = dbPage.replace(/student\.paiements/g, '(student.paiements || [])');
dbPage = dbPage.replace(/s\.paiements/g, '(s.paiements || [])');
fs.writeFileSync('src/app/dashboard/page.tsx', dbPage, 'utf8');

let elevesIdPage = fs.readFileSync('src/app/eleves/[id]/page.tsx', 'utf8');
elevesIdPage = elevesIdPage.replace(/student\.paiements/g, '(student.paiements || [])');
fs.writeFileSync('src/app/eleves/[id]/page.tsx', elevesIdPage, 'utf8');

let elevesPage = fs.readFileSync('src/app/eleves/page.tsx', 'utf8');
elevesPage = elevesPage.replace(/student\.paiements/g, '(student.paiements || [])');
fs.writeFileSync('src/app/eleves/page.tsx', elevesPage, 'utf8');

console.log('Script 4 terminé.');
