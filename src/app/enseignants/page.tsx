'use client';

import React, { useState, useEffect } from 'react';
import { mockTeachers } from '@/mock/teachers';
import { PhoneIcon, MailIcon, PlusIcon } from '@/components/icons';
import { Enseignant } from '@/types/domain';

export default function EnseignantsPage() {
  const [teachers, setTeachers] = useState<Enseignant[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mboaschool_teachers');
      if (stored) {
        try {
          setTeachers(JSON.parse(stored));
        } catch (e) {
          setTeachers(mockTeachers);
        }
      } else {
        localStorage.setItem('mboaschool_teachers', JSON.stringify(mockTeachers));
        setTeachers(mockTeachers);
      }
      setIsLoaded(true);
    }
  }, []);

  // Form fields states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subjectsStr, setSubjectsStr] = useState('');
  const [classesStr, setClassesStr] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !phone) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const newTeacher: Enseignant = {
      id: `teach-${Date.now()}`,
      prenom: firstName,
      nom: lastName,
      email,
      telephone: phone,
      genre: gender,
      matieres: subjectsStr ? subjectsStr.split(',').map(s => s.trim()) : [],
      classes: classesStr ? classesStr.split(',').map(c => c.trim()) : [],
      statut: status,
      dateRecrutement: new Date().toISOString().split('T')[0]
    };

    const updatedList = [newTeacher, ...teachers];
    setTeachers(updatedList);
    localStorage.setItem('mboaschool_teachers', JSON.stringify(updatedList));

    // Reset fields
    setFirstName('');
    setLastName('');
    setGender('M');
    setEmail('');
    setPhone('');
    setSubjectsStr('');
    setClassesStr('');
    setStatus('active');
    
    setShowAddModal(false);
    triggerToast(`L'enseignant ${lastName} ${firstName} a été ajouté avec succès.`);
  };

  if (!isLoaded) {
    return (
      <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl shadow-sm">
        <p className="text-slate-500">Chargement de la liste des enseignants...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative animate-in fade-in duration-300">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-white px-5 py-3.5 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-in slide-in-from-bottom-6 duration-300">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">✓</div>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight text-black font-black">Corps Enseignant</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gérez la liste des enseignants et affectez-les aux différentes classes de l&apos;établissement.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-md shadow-indigo-600/10 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <PlusIcon size={16} />
          Ajouter un enseignant
        </button>
      </div>

      {/* Quick stats banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Enseignants</span>
          <span className="text-xl font-extrabold text-slate-800 mt-1 block text-black">{teachers.length}</span>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Actifs en classe</span>
          <span className="text-xl font-extrabold text-emerald-600 mt-1 block">
            {teachers.filter(t => t.statut === 'active').length}
          </span>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">En congé/Inactifs</span>
          <span className="text-xl font-extrabold text-slate-400 mt-1 block">
            {teachers.filter(t => t.statut === 'inactive').length}
          </span>
        </div>
      </div>

      {/* Grid of Teachers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teachers.map((teacher) => (
          <div key={teacher.id} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative">
            
            {/* Top Row with Status and Avatar */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full font-extrabold text-base flex items-center justify-center border shadow-inner ${
                  teacher.genre === 'F' 
                    ? 'bg-rose-50 text-rose-600 border-rose-100'
                    : 'bg-blue-50 text-blue-600 border-blue-100'
                }`}>
                  {teacher.prenom[0]}{teacher.nom[0]}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base leading-tight text-black">
                    {teacher.nom} {teacher.prenom}
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">Recruté le {teacher.dateRecrutement}</span>
                </div>
              </div>

              {/* Status Badge */}
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                teacher.statut === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  teacher.statut === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                }`}></span>
                {teacher.statut === 'active' ? 'Actif' : 'Inactif'}
              </span>
            </div>

            {/* Center Section: Subjects and Classes */}
            <div className="my-5 space-y-3.5 border-t border-b border-slate-100 py-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Matières</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {teacher.matieres.map((sub) => (
                    <span key={sub} className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Classes Affectées</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {teacher.classes.map((cls) => (
                    <span key={cls} className="bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                      {cls}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Section: Contacts */}
            <div className="flex flex-col gap-2.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <PhoneIcon size={12} className="text-slate-400" />
                <a href={`tel:${teacher.telephone}`} className="hover:text-indigo-600 transition-colors font-medium">
                  {teacher.telephone}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MailIcon size={12} className="text-slate-400" />
                <a href={`mailto:${teacher.email}`} className="hover:text-indigo-600 transition-colors font-medium truncate">
                  {teacher.email}
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Teacher Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-100 shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 text-black">
              Ajouter un Enseignant
            </h3>

            <form onSubmit={handleAddTeacher} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                    placeholder="ex: Atangana"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                    placeholder="ex: Dieudonné"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Genre
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'M' | 'F')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Statut
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif (Congé)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                  placeholder="ex: d.atangana@ecole.cm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Téléphone *
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                  placeholder="ex: +237 677 12 34 56"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Matières (séparées par une virgule)
                </label>
                <input
                  type="text"
                  value={subjectsStr}
                  onChange={(e) => setSubjectsStr(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                  placeholder="ex: Mathématiques, Algèbre, Géométrie"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Classes affectées (séparées par une virgule)
                </label>
                <input
                  type="text"
                  value={classesStr}
                  onChange={(e) => setClassesStr(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-black"
                  placeholder="ex: Terminale D, Seconde C"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/10 transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
