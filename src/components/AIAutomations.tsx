import React, { useState } from 'react';
import { 
  Sparkles, 
  Trash2, 
  Play, 
  Settings, 
  Activity, 
  Plus, 
  FileText, 
  FolderSync, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ToggleLeft, 
  ToggleRight,
  Info
} from 'lucide-react';
import { Document, Shelf } from '../types';

interface Automation {
  id: string;
  name: string;
  triggerCategory: string; // Shelf ID or 'all'
  triggerEvent: 'create' | 'update';
  targetDocId: string;
  targetDocTitle: string;
  prompt: string;
  enabled: boolean;
  lastRun: string | null;
}

interface AutomationLog {
  id: string;
  automationName: string;
  triggerDocTitle: string;
  status: 'success' | 'failed' | 'running';
  timestamp: string;
  message: string;
}

interface AIAutomationsProps {
  documents: Document[];
  shelves: Shelf[];
  automations: Automation[];
  setAutomations: React.Dispatch<React.SetStateAction<Automation[]>>;
  automationLogs: AutomationLog[];
  setAutomationLogs: React.Dispatch<React.SetStateAction<AutomationLog[]>>;
}

export default function AIAutomations({
  documents,
  shelves,
  automations,
  setAutomations,
  automationLogs,
  setAutomationLogs
}: AIAutomationsProps) {
  // Creation form states
  const [newRuleName, setNewRuleName] = useState('');
  const [triggerCategory, setTriggerCategory] = useState('all');
  const [triggerEvent, setTriggerEvent] = useState<'create' | 'update'>('create');
  const [targetDocId, setTargetDocId] = useState('');
  const [prompt, setPrompt] = useState('Generate a short 1-sentence bullet point summarizing the newly added document content and append it under the correct section in this document.');
  
  // UI states
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const activeDocs = documents.filter(d => !d.isArchived);

  // Handle automation creation
  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!newRuleName.trim()) {
      setFormError('Please provide a unique and descriptive name for this automation.');
      return;
    }
    if (!targetDocId) {
      setFormError('Please select a target master document to automatically update.');
      return;
    }

    const selectedTargetDoc = activeDocs.find(d => d.id === targetDocId);
    if (!selectedTargetDoc) {
      setFormError('Target document is invalid or missing.');
      return;
    }

    const newRule: Automation = {
      id: `auto-${Date.now()}`,
      name: newRuleName,
      triggerCategory,
      triggerEvent,
      targetDocId,
      targetDocTitle: selectedTargetDoc.title,
      prompt,
      enabled: true,
      lastRun: null
    };

    setAutomations(prev => [...prev, newRule]);
    setNewRuleName('');
    setFormSuccess('Automation rule provisioned successfully!');
    setTimeout(() => setFormSuccess(null), 3000);
  };

  const toggleAutomation = (id: string) => {
    setAutomations(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, enabled: !a.enabled };
      }
      return a;
    }));
  };

  const deleteAutomation = (id: string) => {
    setAutomations(prev => prev.filter(a => a.id !== id));
  };

  const clearLogs = () => {
    setAutomationLogs([]);
  };

  const getShelfName = (shelfId: string) => {
    if (shelfId === 'all') return 'All Categories';
    const s = shelves.find(sh => sh.id === shelfId);
    return s ? s.name : shelfId;
  };

  return (
    <div id="ai-automations-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-8 select-none">
      
      {/* LEFT SECTION: Rules Config & Creator */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        
        {/* Rules List Panel */}
        <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="h-4 w-4 text-indigo-600 animate-spin" style={{ animationDuration: '8s' }} /> Active Workflow Triggers
            </h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-750 border border-indigo-100 px-2 py-0.5 rounded font-mono font-bold">
              {automations.length} Active Rules
            </span>
          </div>

          {automations.length === 0 ? (
            <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              <span className="text-3xl">🤖</span>
              <h4 className="text-xs font-bold text-gray-700 mt-2">No Automations Configured</h4>
              <p className="text-[10px] text-gray-400 mt-1 max-w-xs mx-auto">
                Set up triggers below to automatically sync incoming category documents into master tables.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {automations.map((auto) => (
                <div 
                  key={auto.id}
                  id={`automation-card-${auto.id}`}
                  className={`border rounded-xl p-4 transition-all ${
                    auto.enabled 
                      ? 'bg-white border-gray-200 hover:border-indigo-300 shadow-2xs' 
                      : 'bg-gray-50/60 border-gray-150 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-800 truncate">{auto.name}</span>
                        {auto.enabled ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <span className="text-[9px] font-semibold bg-indigo-50 border border-indigo-100/50 text-indigo-700 px-1.5 py-0.5 rounded">
                          IF: Document is {auto.triggerEvent === 'create' ? 'created' : 'edited'} in "{getShelfName(auto.triggerCategory)}"
                        </span>
                        <span className="text-[9px] font-semibold bg-emerald-50 border border-emerald-100/50 text-emerald-700 px-1.5 py-0.5 rounded truncate max-w-xs">
                          THEN: Update "{auto.targetDocTitle}"
                        </span>
                      </div>

                      <div className="mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100/70">
                        <p className="text-[10px] font-mono text-gray-500 leading-normal italic">
                          "{auto.prompt}"
                        </p>
                      </div>

                      {auto.lastRun && (
                        <span className="text-[9px] text-gray-400 mt-2 flex items-center gap-1 font-mono">
                          <Activity className="h-3 w-3 text-indigo-400" />
                          Last Run: {new Date(auto.lastRun).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 select-none shrink-0">
                      <button
                        onClick={() => toggleAutomation(auto.id)}
                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-450 hover:text-indigo-600 transition-colors cursor-pointer"
                        title={auto.enabled ? 'Disable trigger' : 'Enable trigger'}
                      >
                        {auto.enabled ? (
                          <ToggleRight className="h-5 w-5 text-indigo-600" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteAutomation(auto.id)}
                        className="p-1 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Delete automation rule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Creator Panel Form */}
        <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs">
          <div className="pb-3 border-b border-gray-100 mb-4">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-indigo-600" /> Define Intelligent Rule Pathway
            </h3>
          </div>

          <form onSubmit={handleCreateRule} className="flex flex-col gap-4">
            {formError && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs p-3 rounded-xl flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Rule / Automation Name</label>
              <input
                type="text"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder="e.g. Sync Bounce Analytics to task table"
                className="w-full text-xs border border-gray-200 rounded-xl p-2.5 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">IF: Trigger Category</label>
                <select
                  value={triggerCategory}
                  onChange={(e) => setTriggerCategory(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:outline-none focus:border-indigo-500 cursor-pointer font-semibold"
                >
                  <option value="all">📂 All Categories</option>
                  {shelves.map(s => (
                    <option key={s.id} value={s.id}>📁 {s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">When event is</label>
                <select
                  value={triggerEvent}
                  onChange={(e) => setTriggerEvent(e.target.value as 'create' | 'update')}
                  className="w-full text-xs border border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:outline-none focus:border-indigo-500 cursor-pointer font-semibold"
                >
                  <option value="create">🆕 Document Added</option>
                  <option value="update">💾 Document Saved / Updated</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">THEN: Automatically Update Document</label>
              <select
                value={targetDocId}
                onChange={(e) => setTargetDocId(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:outline-none focus:border-indigo-500 cursor-pointer font-semibold"
                required
              >
                <option value="">-- Select Master Document --</option>
                {activeDocs.map(doc => (
                  <option key={doc.id} value={doc.id}>📄 {doc.title} ({doc.category})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Gemini Instruction Command Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="w-full text-xs border border-gray-200 rounded-xl p-2.5 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:outline-none font-sans leading-relaxed"
                placeholder="Give Gemini the exact rules for merging modifications..."
                required
              />
            </div>

            <button
              type="submit"
              className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              <Plus className="h-4 w-4" /> Provision Active Rule Pathway
            </button>
          </form>
        </div>

      </div>

      {/* RIGHT SECTION: Logs Feed & Console */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        
        {/* Terminal Logger Console */}
        <div className="bg-gray-950 text-gray-100 rounded-2xl p-5 shadow-xl border border-gray-800 flex flex-col gap-4 min-h-[500px]">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800 select-none">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" /> AI Automations Audit Log
            </h3>
            <button
              onClick={clearLogs}
              className="text-[10px] text-gray-500 hover:text-indigo-400 transition-colors font-mono cursor-pointer"
            >
              Clear Terminal
            </button>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto max-h-[500px] flex-1 pr-1 font-mono text-[11px] leading-relaxed">
            {automationLogs.length === 0 ? (
              <div className="text-center py-16 text-gray-600 select-none">
                <span className="text-xl">📺</span>
                <p className="mt-2 text-[10px]">Audit terminal idle. Waiting for triggers...</p>
              </div>
            ) : (
              automationLogs.map((log) => (
                <div 
                  key={log.id} 
                  id={`log-item-${log.id}`}
                  className="bg-gray-900/40 border border-gray-800/60 p-3 rounded-lg flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2 select-none">
                    <span className="font-bold text-indigo-400 truncate">{log.automationName}</span>
                    <span className="text-[9px] text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-gray-400">Trigger:</span>
                    <span className="text-gray-300 font-bold max-w-[120px] truncate" title={log.triggerDocTitle}>
                      {log.triggerDocTitle}
                    </span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-400">Status:</span>
                    {log.status === 'success' ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                        <CheckCircle className="h-3 w-3" /> SUCCESS
                      </span>
                    ) : log.status === 'failed' ? (
                      <span className="text-red-400 font-bold flex items-center gap-0.5">
                        <XCircle className="h-3 w-3" /> FAILED
                      </span>
                    ) : (
                      <span className="text-indigo-450 font-bold flex items-center gap-1 animate-pulse">
                        <Loader2 className="h-3 w-3 animate-spin" /> RUNNING
                      </span>
                    )}
                  </div>

                  <p className="text-gray-350 text-[10px] bg-black/30 p-2 rounded border border-gray-900 leading-relaxed font-sans whitespace-pre-wrap">
                    {log.message}
                  </p>
                </div>
              ))
            )}
          </div>
          
          <div className="text-[10px] text-gray-550 border-t border-gray-900 pt-3 flex items-center gap-1.5 select-none font-mono">
            <Info className="h-3.5 w-3.5 text-gray-600" />
            <span>AI Automated triggers coordinate securely via our Node container.</span>
          </div>
        </div>

      </div>

    </div>
  );
}
