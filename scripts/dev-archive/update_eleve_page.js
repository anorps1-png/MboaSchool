const fs = require('fs');

let content = fs.readFileSync('src/app/eleves/[id]/page.tsx', 'utf8');

const rankLogic = `
  const avgTrim1 = calculateWeightedAverage(firstTermGrades);
  const avgTrim2 = calculateWeightedAverage(secondTermGrades);

  // NOUVEAUX CALCULS (Rang, Points, Mention)
  const classmates = students.filter(s => s.classeId === student.classeId);
  const getStudentAvg = (s) => calculateWeightedAverage((s.notes || []).filter(g => g.trimestre === 'Trimestre 1'));
  const allAvgs = classmates.map(getStudentAvg).sort((a,b) => b - a);
  const myRank = avgTrim1 > 0 ? allAvgs.indexOf(avgTrim1) + 1 : '--';
  const totalPointsTrim1 = firstTermGrades.filter(g => g.note !== undefined).reduce((sum, g) => sum + ((g.note || 0) * 1), 0);
  const mentionTrim1 = avgTrim1 >= 16 ? 'Très Bien' : avgTrim1 >= 14 ? 'Bien' : avgTrim1 >= 12 ? 'Assez Bien' : avgTrim1 >= 10 ? 'Passable' : 'Insuffisant';
`;

content = content.replace(
  `  const avgTrim1 = calculateWeightedAverage(firstTermGrades);\n  const avgTrim2 = calculateWeightedAverage(secondTermGrades);`,
  rankLogic
);

const renderLogic = `
              <div className="flex flex-wrap gap-8 w-full">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Moyenne Trimestre 1</span>
                  <span className={\`text-3xl font-extrabold block \${avgTrim1 >= 10 ? 'text-indigo-600' : 'text-rose-600'}\`}>
                    {avgTrim1 > 0 ? avgTrim1.toFixed(2) : '--'} <span className="text-sm text-slate-500 font-semibold">/ 20</span>
                  </span>
                  {avgTrim1 > 0 && <span className="text-xs font-bold text-slate-500 mt-1 block">Mention: {mentionTrim1}</span>}
                </div>
                
                <div className="border-l border-slate-100 pl-8">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rang / Effectif</span>
                  <span className="text-3xl font-extrabold block text-slate-800 text-black">
                    {myRank} <span className="text-sm text-slate-500 font-semibold">/ {classmates.length}</span>
                  </span>
                  <span className="text-xs font-bold text-slate-500 mt-1 block">Dans la classe {student.classeId}</span>
                </div>

                <div className="border-l border-slate-100 pl-8">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total des points</span>
                  <span className="text-3xl font-extrabold block text-slate-800 text-black">
                    {totalPointsTrim1}
                  </span>
                </div>
`;

content = content.replace(
  /<div className="flex flex-wrap gap-6">\s*<div>\s*<span className="text-\[10px\] font-bold text-slate-400 uppercase tracking-wider block">Moyenne Trimestre 1<\/span>[\s\S]*?<\/div>\s*(?:\{avgTrim2 > 0 && \([\s\S]*?\}\s*)?<\/div>/m,
  renderLogic
);

fs.writeFileSync('src/app/eleves/[id]/page.tsx', content, 'utf8');
console.log('Eleve page updated with Ranking');
