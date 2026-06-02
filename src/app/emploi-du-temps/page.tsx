'use client';

import React, { useState, useMemo } from 'react';
import { mockLessons } from '@/mock/timetable';
import { mockClassFees } from '@/mock/fees';
import { ChevronDownIcon } from '@/components/icons';

export default function EmploiDuTempsPage() {
  const classesList = mockClassFees.map(cf => cf.classe);
  const [selectedClass, setSelectedClass] = useState(classesList[0] || 'Terminale D');
  const [selectedMobileDay, setSelectedMobileDay] = useState(1); // 1 = Lundi for mobile view

  const daysOfWeek = [
    { num: 1, name: 'Lundi' },
    { num: 2, name: 'Mardi' },
    { num: 3, name: 'Mercredi' },
    { num: 4, name: 'Jeudi' },
    { num: 5, name: 'Vendredi' },
    { num: 6, name: 'Samedi' },
  ];

  // Colors mapping for lessons
  const colorMap: { [key: string]: { bg: string; text: string; border: string } } = {
    indigo: { bg: 'bg-indigo-50/80', text: 'text-indigo-700', border: 'border-indigo-100' },
    red: { bg: 'bg-rose-50/80', text: 'text-rose-700', border: 'border-rose-100' },
    emerald: { bg: 'bg-emerald-50/80', text: 'text-emerald-700', border: 'border-emerald-100' },
    amber: { bg: 'bg-amber-50/80', text: 'text-amber-700', border: 'border-amber-100' },
    sky: { bg: 'bg-sky-50/80', text: 'text-sky-700', border: 'border-sky-100' },
    purple: { bg: 'bg-purple-50/80', text: 'text-purple-700', border: 'border-purple-100' },
    pink: { bg: 'bg-pink-50/80', text: 'text-pink-700', border: 'border-pink-100' },
    orange: { bg: 'bg-orange-50/80', text: 'text-orange-700', border: 'border-orange-100' },
    teal: { bg: 'bg-teal-50/80', text: 'text-teal-700', border: 'border-teal-100' },
  };

  // Filter lessons for selected class
  const classLessons = useMemo(() => {
    return mockLessons.filter(l => l.classe === selectedClass);
  }, [selectedClass]);

  // Timetable slots
  const timeSlots = [
    { start: '08:00', end: '10:00', label: '08:00 - 10:00', isBreak: false },
    { start: '10:00', end: '10:15', label: 'Récréation', isBreak: true },
    { start: '10:15', end: '12:15', label: '10:15 - 12:15', isBreak: false },
    { start: '12:15', end: '13:00', label: 'Pause Midi', isBreak: true },
    { start: '13:00', end: '15:00', label: '13:00 - 15:00', isBreak: false },
  ];

  // Helper to find a lesson for a day and time slot
  const findLesson = (dayNum: number, startHour: string) => {
    // Exact or overlap match
    return classLessons.find(l => {
      if (l.jourSemaine !== dayNum) return false;
      // Normal slot matching
      return l.heureDebut === startHour || (startHour === '13:00' && l.heureDebut === '13:00');
    });
  };

  // Special Saturday or custom time handling (e.g. Samedi 08:00-11:00)
  const getSaturdayLesson = () => {
    return classLessons.find(l => l.jourSemaine === 6);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight text-black font-black">Emploi du Temps</h1>
          <p className="text-sm text-slate-500 mt-1">
            Visualisez et éditez la planification hebdomadaire des enseignements par classe.
          </p>
        </div>
        
        {/* Class selector */}
        <div className="relative w-full sm:w-56">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">
            Classe:
          </span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full appearance-none bg-white border border-slate-200 pl-16 pr-8 py-2.5 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm text-black"
          >
            {classesList.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDownIcon size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
        </div>
      </div>

      {/* Desktop Timetable Calendar view */}
      <div className="hidden lg:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Grid Header of Days */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
          <div className="px-4 py-4 border-r border-slate-100 text-left pl-6">Créneaux</div>
          {daysOfWeek.map(day => (
            <div key={day.num} className="px-4 py-4 border-r border-slate-100 last:border-r-0">
              {day.name}
            </div>
          ))}
        </div>

        {/* Timetable Slots Rows */}
        <div className="divide-y divide-slate-100">
          {timeSlots.map((slot) => (
            <div key={slot.start} className="grid grid-cols-7 min-h-[96px] items-stretch">
              
              {/* Left Column: Time label */}
              <div className="px-6 py-4 border-r border-slate-100 bg-slate-55 flex flex-col justify-center text-xs font-bold text-slate-500">
                <span className={slot.isBreak ? 'text-slate-400' : 'text-slate-700 text-black'}>{slot.label}</span>
                {!slot.isBreak && <span className="text-[10px] text-slate-400 font-normal mt-0.5">2 heures</span>}
              </div>

              {/* Recess Slot: spanning the whole row */}
              {slot.isBreak ? (
                <div className="col-span-6 bg-slate-50 border-r border-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 tracking-widest uppercase">
                  ⚡ {slot.label} ⚡
                </div>
              ) : (
                daysOfWeek.map(day => {
                  // Saturday has special handling since it might have a longer block e.g., Club/TPE
                  if (day.num === 6) {
                    const satLesson = getSaturdayLesson();
                    // We only display the Saturday lesson in the first slot (08:00 - 10:00) to represent it simply
                    if (slot.start === '08:00' && satLesson) {
                      const colors = colorMap[satLesson.couleur] || colorMap.indigo;
                      return (
                        <div key={day.num} className="p-2.5 border-r border-slate-100 flex items-stretch">
                          <div className={`w-full p-3 rounded-xl border flex flex-col justify-between transition-all hover:shadow-sm ${colors.bg} ${colors.text} ${colors.border}`}>
                            <div>
                              <span className="font-extrabold text-xs block leading-tight">{satLesson.matiere}</span>
                              <span className="text-[10px] opacity-80 mt-1 block">Prof: {satLesson.enseignantNom}</span>
                            </div>
                            <div className="flex justify-between items-center mt-3 text-[9px] font-bold opacity-75">
                              <span>{satLesson.salle}</span>
                              <span>08h00 - 11h00</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={day.num} className="p-2 border-r border-slate-100 bg-slate-50/20"></div>
                    );
                  }

                  const lesson = findLesson(day.num, slot.start);
                  if (lesson) {
                    const colors = colorMap[lesson.couleur] || colorMap.indigo;
                    return (
                      <div key={day.num} className="p-2.5 border-r border-slate-100 flex items-stretch">
                        <div className={`w-full p-3 rounded-xl border flex flex-col justify-between transition-all hover:shadow-sm ${colors.bg} ${colors.text} ${colors.border}`}>
                          <div>
                            <span className="font-extrabold text-xs block leading-tight">{lesson.matiere}</span>
                            <span className="text-[10px] opacity-80 mt-1 block">Prof: {lesson.enseignantNom}</span>
                          </div>
                          <div className="flex justify-between items-center mt-3 text-[9px] font-bold opacity-75">
                            <span>{lesson.salle}</span>
                            <span>{lesson.heureDebut} - {lesson.heureFin}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Empty slot
                  return (
                    <div key={day.num} className="p-2 border-r border-slate-100 bg-slate-50/10"></div>
                  );
                })
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile view: Day Selector Tab + List */}
      <div className="lg:hidden bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-4">
        {/* Day Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-2">
          {daysOfWeek.map(day => (
            <button
              key={day.num}
              onClick={() => setSelectedMobileDay(day.num)}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${
                selectedMobileDay === day.num
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              {day.name}
            </button>
          ))}
        </div>

        {/* Lessons List for chosen day */}
        <div className="space-y-3.5">
          {selectedMobileDay === 6 ? (
            // Saturday listing
            (() => {
              const satLesson = getSaturdayLesson();
              if (satLesson) {
                const colors = colorMap[satLesson.couleur] || colorMap.indigo;
                return (
                  <div className={`p-4 rounded-xl border flex flex-col gap-2 ${colors.bg} ${colors.text} ${colors.border}`}>
                    <div className="flex justify-between items-start">
                      <span className="font-extrabold text-sm">{satLesson.matiere}</span>
                      <span className="text-xs font-bold opacity-80">{satLesson.heureDebut} - {satLesson.heureFin}</span>
                    </div>
                    <p className="text-xs opacity-90">Enseignant : {satLesson.enseignantNom}</p>
                    <p className="text-xs font-bold opacity-75 mt-1 flex items-center gap-1">
                      <span>📍 Salle :</span> <span>{satLesson.salle}</span>
                    </p>
                  </div>
                );
              }
              return (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Aucun cours programmé ce samedi.
                </div>
              );
            })()
          ) : (
            // Weekday listing
            (() => {
              const dayLessons = classLessons.filter(l => l.jourSemaine === selectedMobileDay);
              if (dayLessons.length > 0) {
                return dayLessons.map(lesson => {
                  const colors = colorMap[lesson.couleur] || colorMap.indigo;
                  return (
                    <div key={lesson.id} className={`p-4 rounded-xl border flex flex-col gap-2 ${colors.bg} ${colors.text} ${colors.border}`}>
                      <div className="flex justify-between items-start">
                        <span className="font-extrabold text-sm">{lesson.matiere}</span>
                        <span className="text-xs font-bold opacity-80">{lesson.heureDebut} - {lesson.heureFin}</span>
                      </div>
                      <p className="text-xs opacity-90">Enseignant : {lesson.enseignantNom}</p>
                      <p className="text-xs font-bold opacity-75 mt-1 flex items-center gap-1">
                        <span>📍 Salle :</span> <span>{lesson.salle}</span>
                      </p>
                    </div>
                  );
                });
              }
              return (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Aucun cours programmé ce jour.
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}
