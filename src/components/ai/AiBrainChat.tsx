'use client';

import React, { useState, useRef } from 'react';
import { captureError } from '@/lib/observability/logger';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Proposal {
  table: string;
  action: 'insert' | 'update' | 'delete' | 'upsert';
  payload?: any;
  filters?: { field: string; op: string; value: any }[];
  reason: string;
}

const ACTION_LABEL: Record<string, string> = {
  insert: 'Créer',
  update: 'Modifier',
  delete: 'Supprimer',
  upsert: 'Créer/Mettre à jour',
};

export default function AiBrainChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [pendingProposal, setPendingProposal] = useState<Proposal | null>(null);
  const [proposalStatus, setProposalStatus] = useState<'idle' | 'applying' | 'done' | 'error'>('idle');
  const [attachedFile, setAttachedFile] = useState<{ name: string; text: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/ai/extract-file', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'analyse du fichier.");
      setAttachedFile({ name: data.filename, text: data.text });
    } catch (err: any) {
      captureError(err, { context: 'AI brain file attach error' });
      alert(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || isSending) return;

    const userMsg: ChatMessage = { role: 'user', content: attachedFile ? `${prompt}\n\n📎 ${attachedFile.name}` : prompt };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsSending(true);
    setPendingProposal(null);
    setProposalStatus('idle');

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          history: messages,
          fileContext: attachedFile?.text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur du Cerveau IA.');

      setMessages([...newHistory, { role: 'assistant', content: data.text }]);
      if (data.proposal) setPendingProposal(data.proposal);
      setAttachedFile(null);
    } catch (err: any) {
      captureError(err, { context: 'AI brain chat send error' });
      setMessages([...newHistory, { role: 'assistant', content: `⚠️ ${err.message}` }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleApprove = async () => {
    if (!pendingProposal) return;
    setProposalStatus('applying');
    try {
      const res = await fetch('/api/ai/apply-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingProposal),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'exécution.");
      setProposalStatus('done');
      setMessages(prev => [...prev, { role: 'assistant', content: '✅ Action exécutée avec succès.' }]);
    } catch (err: any) {
      captureError(err, { context: 'AI brain apply-proposal error' });
      setProposalStatus('error');
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Échec de l'exécution : ${err.message}` }]);
    }
  };

  const handleReject = () => {
    setPendingProposal(null);
    setProposalStatus('idle');
    setMessages(prev => [...prev, { role: 'assistant', content: 'Proposition rejetée, aucune modification effectuée.' }]);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-accent hover:bg-accent-hover text-cream shadow-cta flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
        title="Cerveau IA"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a4 4 0 0 0-4 4v1a4 4 0 0 0-2 3.5V13a4 4 0 0 0 2 3.46V18a4 4 0 0 0 8 0v-1.54A4 4 0 0 0 18 13v-2.5A4 4 0 0 0 16 7V6a4 4 0 0 0-4-4z"/></svg>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-5 z-40 w-[380px] max-w-[calc(100vw-2.5rem)] h-[520px] max-h-[70vh] bg-surface border border-border rounded-card shadow-login flex flex-col overflow-hidden animate-fade-up">
          <div className="p-4 border-b border-border bg-bg flex items-center justify-between shrink-0">
            <div>
              <div className="text-sm font-extrabold text-ink">Cerveau IA</div>
              <div className="text-[10px] text-ink-faint">Scopé à cette école · écritures soumises à approbation</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-xs text-ink-faint text-center py-8">
                Posez une question sur les élèves, finances, personnel... ou joignez un fichier à analyser.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`text-xs whitespace-pre-wrap p-3 rounded-control max-w-[90%] ${m.role === 'user' ? 'bg-accent text-cream ml-auto' : 'bg-chip text-ink'}`}>
                {m.content}
              </div>
            ))}

            {pendingProposal && (
              <div className="border border-accent/40 bg-accent/5 rounded-control p-3 space-y-2">
                <div className="text-[10px] font-bold text-accent uppercase tracking-wider">Proposition en attente d'approbation</div>
                <div className="text-xs text-ink">
                  <strong>{ACTION_LABEL[pendingProposal.action]}</strong> sur <code className="font-mono">{pendingProposal.table}</code>
                </div>
                <div className="text-xs text-ink-soft">{pendingProposal.reason}</div>
                {pendingProposal.payload && (
                  <pre className="text-[10px] bg-bg border border-border rounded-control p-2 overflow-x-auto font-mono">{JSON.stringify(pendingProposal.payload, null, 1)}</pre>
                )}
                {proposalStatus === 'idle' && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleApprove} className="flex-1 py-1.5 bg-accent hover:bg-accent-hover text-cream rounded-control text-[11px] font-bold cursor-pointer">Approuver</button>
                    <button onClick={handleReject} className="flex-1 py-1.5 bg-chip hover:bg-chip-hover text-ink-soft rounded-control text-[11px] font-bold cursor-pointer">Rejeter</button>
                  </div>
                )}
                {proposalStatus === 'applying' && <div className="text-[11px] text-ink-faint animate-pulse pt-1">Exécution...</div>}
              </div>
            )}

            {isSending && <div className="text-xs text-ink-faint animate-pulse">Réflexion...</div>}
          </div>

          <div className="p-3 border-t border-border shrink-0 space-y-2">
            {attachedFile && (
              <div className="flex items-center justify-between bg-chip px-2.5 py-1.5 rounded-control text-[11px] text-ink-soft">
                <span className="truncate">📎 {attachedFile.name}</span>
                <button onClick={() => setAttachedFile(null)} className="text-ink-faint hover:text-ink font-bold ml-2 cursor-pointer">✕</button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".pdf,.xlsx,.xls,.csv,.txt,.json" onChange={handleAttachFile} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title="Joindre un fichier à analyser"
                className="w-9 h-9 shrink-0 flex items-center justify-center bg-chip hover:bg-chip-hover text-ink-soft rounded-control disabled:opacity-50 cursor-pointer"
              >
                {isUploading ? '…' : '📎'}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Votre question..."
                className="flex-1 px-3 py-2 bg-bg border border-border rounded-control text-xs text-ink outline-none focus:border-accent"
              />
              <button
                onClick={handleSend}
                disabled={isSending || !input.trim()}
                className="w-9 h-9 shrink-0 flex items-center justify-center bg-accent hover:bg-accent-hover text-cream rounded-control disabled:opacity-50 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
