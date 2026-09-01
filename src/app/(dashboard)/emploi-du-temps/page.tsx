'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getClasses } from '@/lib/queries/classes';
import { getLessons, addLesson, updateLesson, deleteLesson } from '@/lib/queries/timetable';
import { ChevronDownIcon, PlusIcon } from '@/components/icons';
import { useEtablissement } from '@/contexts/etablissement-context';
import { captureError, captureMessage } from '@/lib/observability/logger';

export default function EmploiDuTempsPage() {
  const { etablissementId, academicYearId } = useEtablissement();
  const supabase = useMemo(() => createClient(), []);

  // Database lists
  const [classes, setClasses] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [matieres, setMatieres] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  // Selection states
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedMobileDay, setSelectedMobileDay] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any | null>(null);

  // Form states
  const [formJourSemaine, setFormJourSemaine] = useState<number>(1);
  const [formHeureDebut, setFormHeureDebut] = useState<string>('08:00');
  const [formHeureFin, setFormHeureFin] = useState<string>('10:00');
  const [formMatiereId, setFormMatiereId] = useState<string>('');
  const [formEnseignantId, setFormEnseignantId] = useState<string>('');
  const [formSalle, setFormSalle] = useState<string>('');
  const [formCouleur, setFormCouleur] = useState<string>('indigo');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const daysOfWeek = [
    { num: 1, name: 'Lundi' },
    { num: 2, name: 'Mardi' },
    { num: 3, name: 'Mercredi' },
    { num: 4, name: 'Jeudi' },
    { num: 5, name: 'Vendredi' },
    { num: 6, name: 'Samedi' },
  ];

  const timeSlots = [
    { start: '08:00', end: '10:00', label: '08:00 - 10:00', isBreak: false },
    { start: '10:00', end: '10:15', label: 'Récréation', isBreak: true },
    { start: '10:15', end: '12:15', label: '10:15 - 12:15', isBreak: false },
    { start: '12:15', end: '13:00', label: 'Pause Midi', isBreak: true },
    { start: '13:00', end: '15:00', label: '13:00 - 15:00', isBreak: false },
  ];

  const colors = [
    { value: 'indigo', bg: 'bg-chip/80', text: 'text-ink', border: 'border-outline' },
    { value: 'red', bg: 'bg-red-bg/80', text: 'text-accent', border: 'border-transparent' },
    { value: 'emerald', bg: 'bg-green-bg/80', text: 'text-green', border: 'border-transparent' },
    { value: 'amber', bg: 'bg-amber-100/80', text: 'text-amber-800', border: 'border-transparent' },
    { value: 'sky', bg: 'bg-sky-100/80', text: 'text-sky-800', border: 'border-transparent' },
    { value: 'purple', bg: 'bg-purple-100/80', text: 'text-purple-800', border: 'border-transparent' },
  ];

  const colorMap = useMemo(() => {
    const map: Record<string, { bg: string; text: string; border: string }> = {};
    colors.forEach(c => {
      map[c.value] = { bg: c.bg, text: c.text, border: c.border };
    });
    return map;
  }, []);

  // Rôle courant : seuls admin/directeur peuvent modifier l'emploi du temps
  // (l'écriture est réservée côté RLS depuis la migration du 2026-09-02,
  // un enseignant ne doit donc voir que la lecture pour éviter un échec
  // silencieux au clic sur "Enregistrer").
  useEffect(() => {
    const loadRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        const roleLower = (profile?.role || '').toLowerCase();
        setCanEdit(roleLower === 'admin' || roleLower === 'administrateur' || roleLower === 'directeur');
      } catch (err) {
        captureError(err, { context: 'Failed to load user role for emploi du temps:' });
      }
    };
    loadRole();
  }, [supabase]);

  // Fetch initial base data
  useEffect(() => {
    if (!etablissementId) return;

    const loadBaseData = async () => {
      setIsLoading(true);
      try {
        // Load classes for active academic year
        const classesData = await getClasses(etablissementId, academicYearId || null);
        setClasses(classesData);
        if (classesData.length > 0) {
          setSelectedClassId(classesData[0].id);
        } else {
          setSelectedClassId('');
          setLessons([]);
        }

        // Load subjects
        const { data: matData } = await supabase
          .from('matieres')
          .select('*')
          .eq('etablissement_id', etablissementId);
        setMatieres(matData || []);

        // Load teachers
        const { data: ensData } = await supabase
          .from('enseignants')
          .select('*')
          .eq('etablissement_id', etablissementId);
        setTeachers(ensData || []);

      } catch (err) {
        captureError(err, { context: "Failed to load initial data:" });
      } finally {
        setIsLoading(false);
      }
    };

    loadBaseData();
  }, [etablissementId, academicYearId]);

  // Fetch lessons when class changes
  useEffect(() => {
    if (!selectedClassId) return;

    const loadLessons = async () => {
      try {
        const lessonsData = await getLessons(selectedClassId);
        setLessons(lessonsData);
      } catch (err) {
        captureError(err, { context: "Failed to load lessons:" });
      }
    };

    loadLessons();
  }, [selectedClassId]);

  // Maps helpers
  const subjectsMap = useMemo(() => {
    const map: Record<string, string> = {};
    matieres.forEach(m => {
      map[m.id] = m.nom;
    });
    return map;
  }, [matieres]);

  const teachersMap = useMemo(() => {
    const map: Record<string, string> = {};
    teachers.forEach(t => {
      map[t.id] = `${t.prenom} ${t.nom}`;
    });
    return map;
  }, [teachers]);

  // Find lesson
  const findLesson = (dayNum: number, startTime: string) => {
    return lessons.find(l => l.jour_semaine === dayNum && l.heure_debut === startTime);
  };

  const getSaturdayLesson = () => {
    return lessons.find(l => l.jour_semaine === 6);
  };

  // Open modal for add or edit
  const openModal = (dayNum: number, startTime: string, existingLesson?: any) => {
    if (!canEdit) return;
    if (existingLesson) {
      setEditingLesson(existingLesson);
      setFormJourSemaine(existingLesson.jour_semaine);
      setFormHeureDebut(existingLesson.heure_debut);
      setFormHeureFin(existingLesson.heure_fin);
      setFormMatiereId(existingLesson.matiere_id || '');
      setFormEnseignantId(existingLesson.enseignant_id || '');
      setFormSalle(existingLesson.salle || '');
      setFormCouleur(existingLesson.couleur || 'indigo');
    } else {
      setEditingLesson(null);
      setFormJourSemaine(dayNum);
      setFormHeureDebut(startTime);
      // Auto calculate end time
      const slot = timeSlots.find(s => s.start === startTime);
      setFormHeureFin(slot ? slot.end : '10:00');
      setFormMatiereId(matieres[0]?.id || '');
      setFormEnseignantId(teachers[0]?.id || '');
      setFormSalle('');
      setFormCouleur('indigo');
    }
    setShowModal(true);
  };

  // Submit modal form
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !etablissementId) return;
    setIsSubmitting(true);

    const payload = {
      classe_id: selectedClassId,
      jour_semaine: Number(formJourSemaine),
      heure_debut: formHeureDebut,
      heure_fin: formHeureFin,
      matiere_id: formMatiereId || null,
      enseignant_id: formEnseignantId || null,
      salle: formSalle,
      couleur: formCouleur,
    };

    try {
      if (editingLesson) {
        await updateLesson(editingLesson.id, payload);
      } else {
        await addLesson(payload, etablissementId);
      }
      // Reload lessons
      const lessonsData = await getLessons(selectedClassId);
      setLessons(lessonsData);
      setShowModal(false);
    } catch (err) {
      captureError(err, { context: "Failed to save lesson:" });
      alert("Impossible d'enregistrer ce cours. Vérifiez qu'il ne chevauche pas un autre créneau, ou contactez un administrateur.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete lesson
  const handleDeleteLesson = async () => {
    if (!editingLesson || !selectedClassId) return;
    if (!window.confirm("Voulez-vous vraiment supprimer ce cours ?")) return;
    setIsSubmitting(true);

    try {
      await deleteLesson(editingLesson.id);
      // Reload lessons
      const lessonsData = await getLessons(selectedClassId);
      setLessons(lessonsData);
      setShowModal(false);
    } catch (err) {
      captureError(err, { context: "Failed to delete lesson:" });
      alert("Impossible de supprimer ce cours. Contactez un administrateur si le problème persiste.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-20 text-ink-soft font-semibold">Chargement de l'emploi du temps...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[44px] font-extrabold text-ink tracking-[-1.5px] leading-tight">Emploi du Temps</h1>
          <p className="text-sm text-ink-soft mt-1">
            Visualisez et gérez la planification hebdomadaire des enseignements par classe.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Class selector */}
          <div className="relative w-full sm:w-56">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-ink-faint uppercase">
              Classe:
            </span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full appearance-none bg-surface border border-outline pl-16 pr-8 py-2.5 rounded-control text-sm font-semibold text-ink-soft focus:outline-none focus:border-accent cursor-pointer shadow-sm"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
            <ChevronDownIcon size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-faint" />
          </div>

          {canEdit && (
            <button
              onClick={() => openModal(1, '08:00')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-accent hover:bg-accent-hover text-cream rounded-control text-sm font-extrabold shadow-cta transition-colors cursor-pointer shrink-0"
            >
              <PlusIcon size={16} />
              <span className="hidden md:inline">Ajouter un cours</span>
            </button>
          )}
        </div>
      </div>

      {/* Desktop view */}
      <div className="hidden lg:block bg-surface rounded-card border border-border shadow-sm overflow-hidden">
        {/* Grid Header */}
        <div className="grid grid-cols-7 border-b border-border bg-bg/50 text-center text-[12px] font-bold text-ink-faint uppercase tracking-[1px]">
          <div className="px-4 py-4 border-r border-border text-left pl-6">Créneaux</div>
          {daysOfWeek.map(day => (
            <div key={day.num} className="px-4 py-4 border-r border-border last:border-r-0">
              {day.name}
            </div>
          ))}
        </div>

        {/* Grid Body */}
        <div className="divide-y divide-border-row">
          {timeSlots.map((slot) => (
            <div key={slot.start} className="grid grid-cols-7 min-h-[96px] items-stretch">
              {/* Time Label */}
              <div className="px-6 py-4 border-r border-border bg-bg flex flex-col justify-center text-xs font-bold text-ink-soft">
                <span className={slot.isBreak ? 'text-ink-faint' : 'text-ink-soft'}>{slot.label}</span>
                {!slot.isBreak && <span className="text-[10px] text-ink-faint font-normal mt-0.5">2 heures</span>}
              </div>

              {/* Recess Slot */}
              {slot.isBreak ? (
                <div className="col-span-6 bg-bg/60 border-r border-border flex items-center justify-center text-xs font-bold text-ink-faint tracking-widest uppercase">
                  ⚡ {slot.label} ⚡
                </div>
              ) : (
                daysOfWeek.map(day => {
                  if (day.num === 6) {
                    const satLesson = getSaturdayLesson();
                    if (slot.start === '08:00' && satLesson) {
                      const colorsData = colorMap[satLesson.couleur] || colorMap.indigo;
                      return (
                        <div key={day.num} className="p-2.5 border-r border-border flex items-stretch">
                          <button
                            onClick={() => openModal(6, '08:00', satLesson)}
                            className={`w-full text-left p-3 rounded-control border flex flex-col justify-between transition-all hover:shadow-sm cursor-pointer ${colorsData.bg} ${colorsData.text} ${colorsData.border}`}
                          >
                            <div>
                              <span className="font-extrabold text-xs block leading-tight">{subjectsMap[satLesson.matiere_id] || satLesson.matiere_id}</span>
                              <span className="text-[10px] opacity-80 mt-1 block">Prof: {teachersMap[satLesson.enseignant_id] || satLesson.enseignant_id}</span>
                            </div>
                            <div className="flex justify-between items-center mt-3 text-[9px] font-bold opacity-75 w-full">
                              <span>{satLesson.salle}</span>
                              <span>{satLesson.heure_debut} - {satLesson.heure_fin}</span>
                            </div>
                          </button>
                        </div>
                      );
                    }
                    return <div key={day.num} className="p-2 border-r border-border bg-bg/20"></div>;
                  }

                  const lesson = findLesson(day.num, slot.start);
                  if (lesson) {
                    const colorsData = colorMap[lesson.couleur] || colorMap.indigo;
                    return (
                      <div key={day.num} className="p-2.5 border-r border-border flex items-stretch">
                        <button
                          onClick={() => openModal(day.num, slot.start, lesson)}
                          className={`w-full text-left p-3 rounded-control border flex flex-col justify-between transition-all hover:shadow-sm cursor-pointer ${colorsData.bg} ${colorsData.text} ${colorsData.border}`}
                        >
                          <div>
                            <span className="font-extrabold text-xs block leading-tight">{subjectsMap[lesson.matiere_id] || lesson.matiere_id}</span>
                            <span className="text-[10px] opacity-80 mt-1 block">Prof: {teachersMap[lesson.enseignant_id] || lesson.enseignant_id}</span>
                          </div>
                          <div className="flex justify-between items-center mt-3 text-[9px] font-bold opacity-75 w-full">
                            <span>{lesson.salle}</span>
                            <span>{lesson.heure_debut} - {lesson.heure_fin}</span>
                          </div>
                        </button>
                      </div>
                    );
                  }

                  // Empty Slot
                  if (!canEdit) {
                    return <div key={day.num} className="p-2 border-r border-border bg-bg/10"></div>;
                  }
                  return (
                    <div key={day.num} className="p-2 border-r border-border bg-bg/10 relative group">
                      <button
                        onClick={() => openModal(day.num, slot.start)}
                        className="absolute inset-0 w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 bg-ink/5 text-ink-soft text-xs font-bold transition-opacity cursor-pointer"
                      >
                        + Planifier
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile view */}
      <div className="lg:hidden bg-surface rounded-control border border-border shadow-sm p-4 space-y-4">
        {/* Day Selector */}
        <div className="flex overflow-x-auto gap-2 pb-2">
          {daysOfWeek.map(day => (
            <button
              key={day.num}
              onClick={() => setSelectedMobileDay(day.num)}
              className={`px-4 py-2 rounded-control text-xs font-bold whitespace-nowrap border transition-all ${
                selectedMobileDay === day.num
                  ? 'bg-accent border-accent text-cream'
                  : 'bg-bg border-border text-ink-soft'
              }`}
            >
              {day.name}
            </button>
          ))}
        </div>

        {/* List of slot details */}
        <div className="space-y-3.5">
          {selectedMobileDay === 6 ? (
            (() => {
              const satLesson = getSaturdayLesson();
              if (satLesson) {
                const colorsData = colorMap[satLesson.couleur] || colorMap.indigo;
                return (
                  <button
                    onClick={() => openModal(6, '08:00', satLesson)}
                    className={`w-full text-left p-4 rounded-control border flex flex-col gap-2 ${colorsData.bg} ${colorsData.text} ${colorsData.border}`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="font-extrabold text-sm">{subjectsMap[satLesson.matiere_id] || satLesson.matiere_id}</span>
                      <span className="text-xs font-bold opacity-80">{satLesson.heure_debut} - {satLesson.heure_fin}</span>
                    </div>
                    <p className="text-xs opacity-90">Enseignant : {teachersMap[satLesson.enseignant_id] || satLesson.enseignant_id}</p>
                    <p className="text-xs font-bold opacity-75 mt-1 flex items-center gap-1">
                      <span>📍 Salle :</span> <span>{satLesson.salle}</span>
                    </p>
                  </button>
                );
              }
              return <div className="text-center py-8 text-ink-faint text-sm">Aucun cours programmé ce samedi.</div>;
            })()
          ) : (
            (() => {
              const dayLessons = lessons.filter(l => l.jour_semaine === selectedMobileDay);
              if (dayLessons.length > 0) {
                return dayLessons.map(lesson => {
                  const colorsData = colorMap[lesson.couleur] || colorMap.indigo;
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => openModal(selectedMobileDay, lesson.heure_debut, lesson)}
                      className={`w-full text-left p-4 rounded-control border flex flex-col gap-2 ${colorsData.bg} ${colorsData.text} ${colorsData.border}`}
                    >
                      <div className="flex justify-between items-start w-full">
                        <span className="font-extrabold text-sm">{subjectsMap[lesson.matiere_id] || lesson.matiere_id}</span>
                        <span className="text-xs font-bold opacity-80">{lesson.heure_debut} - {lesson.heure_fin}</span>
                      </div>
                      <p className="text-xs opacity-90">Enseignant : {teachersMap[lesson.enseignant_id] || lesson.enseignant_id}</p>
                      <p className="text-xs font-bold opacity-75 mt-1 flex items-center gap-1">
                        <span>📍 Salle :</span> <span>{lesson.salle}</span>
                      </p>
                    </button>
                  );
                });
              }
              return (
                <div className="text-center py-8 text-ink-faint text-sm">
                  Aucun cours programmé ce jour.
                  {canEdit && (
                    <button
                      onClick={() => openModal(selectedMobileDay, '08:00')}
                      className="block mx-auto mt-4 text-xs bg-accent text-cream font-bold px-3 py-1.5 rounded-control"
                    >
                      + Ajouter un cours
                    </button>
                  )}
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* Premium Interactive Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border p-6 rounded-card max-w-md w-full shadow-login animate-fade-up">
            <h3 className="font-extrabold text-lg text-ink tracking-tight">
              {editingLesson ? "Modifier le cours" : "Planifier un cours"}
            </h3>
            <p className="text-xs text-ink-soft mt-1">Saisissez les détails du cours pour le planning hebdomadaire.</p>

            <form onSubmit={handleSaveLesson} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Day of week */}
                <div>
                  <label className="block text-[11px] font-bold text-ink-soft uppercase tracking-wider mb-1">Jour</label>
                  <select
                    value={formJourSemaine}
                    onChange={(e) => setFormJourSemaine(Number(e.target.value))}
                    className="w-full bg-bg border border-outline rounded-control px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
                  >
                    {daysOfWeek.map(d => (
                      <option key={d.num} value={d.num}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Classroom */}
                <div>
                  <label className="block text-[11px] font-bold text-ink-soft uppercase tracking-wider mb-1">Salle</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Salle 12"
                    value={formSalle}
                    onChange={(e) => setFormSalle(e.target.value)}
                    className="w-full bg-bg border border-outline rounded-control px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent placeholder:text-ink-faint"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Start time */}
                <div>
                  <label className="block text-[11px] font-bold text-ink-soft uppercase tracking-wider mb-1">Début</label>
                  <select
                    value={formHeureDebut}
                    onChange={(e) => setFormHeureDebut(e.target.value)}
                    className="w-full bg-bg border border-outline rounded-control px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
                  >
                    <option value="08:00">08h00</option>
                    <option value="10:15">10h15</option>
                    <option value="13:00">13h00</option>
                  </select>
                </div>

                {/* End time */}
                <div>
                  <label className="block text-[11px] font-bold text-ink-soft uppercase tracking-wider mb-1">Fin</label>
                  <select
                    value={formHeureFin}
                    onChange={(e) => setFormHeureFin(e.target.value)}
                    className="w-full bg-bg border border-outline rounded-control px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
                  >
                    <option value="10:00">10h00</option>
                    <option value="12:15">12h15</option>
                    <option value="15:00">15h00</option>
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[11px] font-bold text-ink-soft uppercase tracking-wider mb-1">Matière</label>
                <select
                  value={formMatiereId}
                  onChange={(e) => setFormMatiereId(e.target.value)}
                  className="w-full bg-bg border border-outline rounded-control px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
                >
                  {matieres.length === 0 && <option value="">Aucune matière configurée</option>}
                  {matieres.map(m => (
                    <option key={m.id} value={m.id}>{m.nom}</option>
                  ))}
                </select>
              </div>

              {/* Teacher */}
              <div>
                <label className="block text-[11px] font-bold text-ink-soft uppercase tracking-wider mb-1">Enseignant</label>
                <select
                  value={formEnseignantId}
                  onChange={(e) => setFormEnseignantId(e.target.value)}
                  className="w-full bg-bg border border-outline rounded-control px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
                >
                  {teachers.length === 0 && <option value="">Aucun enseignant configuré</option>}
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>
                  ))}
                </select>
              </div>

              {/* Colors */}
              <div>
                <label className="block text-[11px] font-bold text-ink-soft uppercase tracking-wider mb-1">Couleur</label>
                <div className="flex gap-2">
                  {colors.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormCouleur(c.value)}
                      className={`w-7 h-7 rounded-full transition-all cursor-pointer border-2 ${
                        formCouleur === c.value ? 'border-ink scale-110 shadow-sm' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.value === 'indigo' ? '#ece3cc' : c.value === 'red' ? '#f7e8e1' : c.value === 'emerald' ? '#ecf1ea' : c.value === 'amber' ? '#fdf3e3' : c.value === 'sky' ? '#bae6fd' : '#f5d0fe' }}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-border mt-6">
                <div>
                  {editingLesson && (
                    <button
                      type="button"
                      onClick={handleDeleteLesson}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-red-bg hover:bg-red-200 text-accent font-extrabold text-xs rounded-control transition-colors cursor-pointer"
                    >
                      Supprimer
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-outline hover:bg-chip-hover text-ink-soft font-semibold text-xs rounded-control transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-accent hover:bg-accent-hover text-cream font-extrabold text-xs rounded-control shadow-cta transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
