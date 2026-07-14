const fs = require('fs');
const os = require('os');
const path = require('path');

const dbPath = path.join(os.homedir(), '.mboaschool', 'local_db.json');

if (fs.existsSync(dbPath)) {
  console.log('DB found at:', dbPath);
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  console.log('comptes_ohada exists?', !!db.comptes_ohada);
  if (db.comptes_ohada) {
    const add = (n, l, c) => {
      if (!db.comptes_ohada.find(x => x.numero === n)) {
        db.comptes_ohada.push({ numero: n, libelle: l, classe: c });
        console.log('Added:', n);
      } else {
        console.log('Already exists:', n);
      }
    };
    add('4472', 'État, IRPP retenu à la source', 4);
    add('6611', 'Appointements et salaires', 6);
    add('6641', 'Charges sociales patronales', 6);
    
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
    console.log('Done writing DB.');
  }
} else {
  console.log('DB not found.');
}
