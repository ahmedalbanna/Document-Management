import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  AlertTriangle, 
  Calendar, 
  RefreshCw, 
  FileText, 
  ArrowRight, 
  Award, 
  TrendingUp, 
  Layers, 
  BookOpen, 
  Download, 
  Check, 
  ChevronRight, 
  Sparkle, 
  History, 
  Trash,
  CheckCircle,
  HelpCircle,
  Info
} from 'lucide-react';
import { Document, ActivityLog } from '../types';

interface ProactiveInsightsProps {
  documents: Document[];
  activities: ActivityLog[];
  onOpenDoc: (doc: Document) => void;
  onSaveDoc: (docId: string, updates: Partial<Document>, changeSummary?: string) => void;
  onAddDocToShelf: (shelfId: string) => void;
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  logAction: (title: string, action: 'create' | 'edit' | 'delete' | 'archive' | 'restore' | 'favorite' | 'download' | 'upload' | 'share', docId?: string) => void;
  currentUserEmail: string;
}

export interface SmartAlert {
  id: string;
  type: 'outdated' | 'contradiction';
  title: string;
  description: string;
  affectedDocIds: string[];
  topic: string;
  suggestedAction: string;
}

export default function ProactiveInsights({
  documents,
  activities,
  onOpenDoc,
  onSaveDoc,
  setDocuments,
  logAction,
  currentUserEmail
}: ProactiveInsightsProps) {
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  const [weeklySummary, setWeeklySummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<'alerts' | 'weekly'>('alerts');

  // Resolution loading states
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionSuccess, setResolutionSuccess] = useState<Record<string, string>>({});

  // Fetch proactive alerts from Gemini
  const fetchAlerts = async (forceRefresh = false) => {
    setIsLoadingAlerts(true);
    setAlertsError(null);
    try {
      // In case we want to skip fetch or handle empty docs
      const activeDocs = documents.filter(d => !d.isArchived);
      if (activeDocs.length === 0) {
        setAlerts([]);
        setIsLoadingAlerts(false);
        return;
      }

      const response = await fetch('/api/gemini/proactive-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: activeDocs }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch proactive intelligence reports');
      }

      const data = await response.json();
      if (data && data.alerts) {
        setAlerts(data.alerts);
        // Save to cache for offline availability
        localStorage.setItem('doc_manager_smart_alerts', JSON.stringify(data.alerts));
      } else {
        setAlerts([]);
      }
    } catch (err: any) {
      console.error(err);
      setAlertsError(err.message || 'An error occurred while fetching insights.');
    } finally {
      setIsLoadingAlerts(false);
    }
  };

  // Generate automated weekly summaries of achievements and output
  const generateWeeklySummary = async () => {
    setIsGeneratingSummary(true);
    setSummaryError(null);
    try {
      const activeDocs = documents.filter(d => !d.isArchived);
      const response = await fetch('/api/gemini/weekly-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          documents: activeDocs, 
          activities: activities 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to compile weekly productivity summary');
      }

      const data = await response.json();
      if (data && data.summary) {
        setWeeklySummary(data.summary);
        localStorage.setItem('doc_manager_weekly_summary', data.summary);
        localStorage.setItem('doc_manager_weekly_summary_date', new Date().toISOString());
      }
    } catch (err: any) {
      console.error(err);
      setSummaryError(err.message || 'Failed to generate summary.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Modernize outdated document
  const handleModernizeDoc = async (alertId: string, docId: string) => {
    setResolvingId(alertId);
    try {
      const doc = documents.find(d => d.id === docId);
      if (!doc) throw new Error('Document not found in active workspace');

      // Call Gemini model to rewrite this outdated document using 2026 standards
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `This document is outdated compared to our modern 2026 requirements. Please modernize it by replacing legacy 2023 parameters (like CoR target: 0.72) with modern 2026 polybutadiene parameters (like CoR target: 0.908, ground friction factor: 0.23, elasticity modifier: 1.05). Rewrite the document beautifully while maintaining its structures but upgrading its numbers and stating it is fully modernized and updated as of July 2026. Provide ONLY the updated markdown/text content. Do not output anything else.`,
          history: [],
          documents: [doc]
        })
      });

      if (!response.ok) throw new Error('Failed to synthesize modernized document');
      const data = await response.json();
      
      const newContent = data.text;
      const originalTitle = doc.title;
      const newTitle = originalTitle.includes('2023') 
        ? originalTitle.replace('2023', '2026 Modernized') 
        : `${originalTitle} (Modernized 2026)`;

      // Save modernized edits as a new revision commit
      onSaveDoc(docId, {
        title: newTitle,
        content: newContent,
        updatedAt: new Date().toISOString()
      }, 'AI Modernization: Upgraded 2023 legacy parameters to stable 2026 polybutadiene metrics.');

      setResolutionSuccess(prev => ({
        ...prev,
        [alertId]: 'Success! Document modernized dynamically. New revision committed to VCS chronological tree.'
      }));

      // Log activity
      logAction(newTitle, 'edit', docId);

      // Filter resolved alert
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== alertId));
      }, 5000);

    } catch (err: any) {
      console.error(err);
      alert(`Modernization Failed: ${err.message}`);
    } finally {
      setResolvingId(null);
    }
  };

  // Harmonize Contradicting Documents
  const handleHarmonizeContradiction = async (alertId: string, docIds: string[]) => {
    setResolvingId(alertId);
    try {
      const docsToHarmonize = documents.filter(d => docIds.includes(d.id));
      if (docsToHarmonize.length < 2) throw new Error('Contradicting files missing from library');

      const doc1 = docsToHarmonize[0];
      const doc2 = docsToHarmonize[1];

      // Call Gemini to synthesize a merged document or aligned report resolving the contradiction
      const prompt = `There is a logical contradiction between "${doc1.title}" and "${doc2.title}" regarding elastomer stability and Coefficient of Restitution.
      Document 1 says: "${doc1.content.slice(0, 1000)}"
      Document 2 says: "${doc2.content.slice(0, 1000)}"
      
      Please synthesize a unified, highly rigorous resolution document that addresses this debate, settles the polybutadiene CoR stability curve (reconciling that polybutadiene compounds offer high-elasticity peaks but require controlled ambient temperature conditions to prevent rapid decay, aligning with both viewpoints), and creates a harmonious physical specifications framework. Produce ONLY the synthesized Markdown content.`;

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          history: [],
          documents: docsToHarmonize
        })
      });

      if (!response.ok) throw new Error('Failed to resolve and harmonize contradiction');
      const data = await response.json();
      const synthesizedContent = data.text;

      // Add as a brand new document in the same category
      const uid = `doc-harmonized-${Date.now()}`;
      const newDoc: Document = {
        id: uid,
        title: `Harmonized Elastomer Friction Consensus`,
        content: synthesizedContent,
        type: 'markdown',
        size: new Blob([synthesizedContent]).size,
        category: doc1.category,
        tags: ['Harmonized', 'Resolution', 'Consensus', 'Physics'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: false,
        isArchived: false,
        customPreviewColor: '#8b5cf6',
        ownerEmail: 'ahmedalbanna966@gmail.com',
        permissions: [],
        shareSettings: { isPublic: true, publicRole: 'viewer' }
      };

      setDocuments(prev => [...prev, newDoc]);
      logAction(newDoc.title, 'create', uid);

      // Update both source documents to append reference links pointing to the harmonized consensus
      onSaveDoc(doc1.id, {
        content: `${doc1.content}\n\n---\n*Note: A contradiction regarding polybutadiene stability was identified and resolved symmetrically in [[Harmonized Elastomer Friction Consensus]].*`
      }, 'AI Harmonization: Appended link to harmonized friction consensus.');

      onSaveDoc(doc2.id, {
        content: `${doc2.content}\n\n---\n*Note: A contradiction regarding polybutadiene stability was identified and resolved symmetrically in [[Harmonized Elastomer Friction Consensus]].*`
      }, 'AI Harmonization: Appended link to harmonized friction consensus.');

      setResolutionSuccess(prev => ({
        ...prev,
        [alertId]: 'Success! Created "Harmonized Elastomer Friction Consensus" page and auto-appended linking references to both documents.'
      }));

      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== alertId));
      }, 6000);

    } catch (err: any) {
      console.error(err);
      alert(`Harmonization Failed: ${err.message}`);
    } finally {
      setResolvingId(null);
    }
  };

  // Save weekly summary to active workspace
  const handleSaveSummaryAsDoc = () => {
    if (!weeklySummary) return;

    const uid = `doc-summary-${Date.now()}`;
    const newDoc: Document = {
      id: uid,
      title: `Weekly Achievements Summary - July 2026`,
      content: weeklySummary,
      type: 'markdown',
      size: new Blob([weeklySummary]).size,
      category: 'shelf-even-product', // Place under product/achievements
      tags: ['Summary', 'Achievements', 'AI-Compiled'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: false,
      isArchived: false,
      customPreviewColor: '#0ea5e9',
      ownerEmail: 'ahmedalbanna966@gmail.com',
      permissions: [],
      shareSettings: { isPublic: true, publicRole: 'viewer' }
    };

    setDocuments(prev => [...prev, newDoc]);
    logAction(newDoc.title, 'create', uid);
    alert(`Success! Saved weekly summary directly to "The Development of Even Product" shelf.`);
  };

  // Load from cache on mount
  useEffect(() => {
    const cachedAlerts = localStorage.getItem('doc_manager_smart_alerts');
    const cachedSummary = localStorage.getItem('doc_manager_weekly_summary');

    if (cachedAlerts) {
      setAlerts(JSON.parse(cachedAlerts));
    } else {
      fetchAlerts();
    }

    if (cachedSummary) {
      setWeeklySummary(cachedSummary);
    }
  }, []);

  return (
    <div id="proactive-insights-workspace" className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm flex flex-col flex-1">
      {/* Tab Selector */}
      <div className="flex border-b border-gray-100 pb-3 mb-6 items-center justify-between select-none">
        <div className="flex gap-4">
          <button
            id="subtab-smart-alerts"
            onClick={() => setActiveSubTab('alerts')}
            className={`text-xs font-bold uppercase tracking-wider pb-1 relative transition-colors cursor-pointer ${
              activeSubTab === 'alerts' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Smart AI Alerts
            {alerts.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded-full text-[9px] font-bold">
                {alerts.length}
              </span>
            )}
            {activeSubTab === 'alerts' && (
              <motion.div layoutId="subtab-bar" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
            )}
          </button>
          
          <button
            id="subtab-weekly-summary"
            onClick={() => {
              setActiveSubTab('weekly');
              if (!weeklySummary && !isGeneratingSummary) {
                generateWeeklySummary();
              }
            }}
            className={`text-xs font-bold uppercase tracking-wider pb-1 relative transition-colors cursor-pointer ${
              activeSubTab === 'weekly' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Weekly Achievements Summary
            {activeSubTab === 'weekly' && (
              <motion.div layoutId="subtab-bar" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
            )}
          </button>
        </div>

        <button
          id="refresh-insights-btn"
          onClick={() => {
            if (activeSubTab === 'alerts') fetchAlerts(true);
            else generateWeeklySummary();
          }}
          disabled={isLoadingAlerts || isGeneratingSummary}
          className="p-1.5 hover:bg-gray-150 text-gray-500 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          title="Refresh Proactive Intelligence analysis"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoadingAlerts || isGeneratingSummary ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'alerts' ? (
          // ================= ALERT VIEWS =================
          <motion.div
            key="alerts-subview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-5 flex-1"
          >
            <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100/50 flex gap-3 select-none">
              <Sparkles className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <h4 className="text-xs font-bold text-indigo-950">AI Audit Engine</h4>
                <p className="text-[11px] text-indigo-700/80 leading-relaxed">
                  Gemini continuously parses document modifications, metadata files, and category constraints. It will actively notify you about logical contradictions, outdated specifications, and metrics drifts across shelves.
                </p>
              </div>
            </div>

            {isLoadingAlerts ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
                <div>
                  <span className="text-xs font-bold text-gray-700">Auditing Workspace Files...</span>
                  <p className="text-[10px] text-gray-400 mt-0.5">Analyzing technical guidelines, timestamps, and thermodynamic parameters.</p>
                </div>
              </div>
            ) : alertsError ? (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-xs select-none">
                <h5 className="font-bold flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> AI Audit Failed</h5>
                <p className="mt-1">{alertsError}</p>
              </div>
            ) : alerts.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {alerts.map((alert) => {
                  const isSuccess = resolutionSuccess[alert.id];
                  const isResolving = resolvingId === alert.id;

                  return (
                    <motion.div
                      key={alert.id}
                      layout
                      className={`border rounded-2xl p-5 flex flex-col gap-4 shadow-2xs transition-all relative overflow-hidden ${
                        alert.type === 'outdated' 
                          ? 'border-amber-150 bg-amber-50/5 hover:bg-amber-50/15' 
                          : 'border-rose-150 bg-rose-50/5 hover:bg-rose-50/15'
                      }`}
                    >
                      {/* Decorative colored badge */}
                      <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                        alert.type === 'outdated' ? 'bg-amber-400' : 'bg-rose-500'
                      }`} />

                      <div className="flex items-start justify-between">
                        <div className="flex gap-2.5">
                          <div className={`p-2 rounded-xl mt-0.5 ${
                            alert.type === 'outdated' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                          }`}>
                            {alert.type === 'outdated' ? <Calendar className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                          </div>
                          <div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${
                              alert.type === 'outdated' ? 'text-amber-700' : 'text-rose-700'
                            }`}>
                              {alert.type.toUpperCase()}: {alert.topic}
                            </span>
                            <h4 className="text-xs font-bold text-gray-900 mt-0.5">{alert.title}</h4>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-gray-600 leading-relaxed pl-1">
                        {alert.description}
                      </p>

                      {/* Display Affected Document titles */}
                      <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Involved Workspace Assets:</span>
                        <div className="flex flex-col gap-1.5">
                          {alert.affectedDocIds.map((id) => {
                            const d = documents.find(doc => doc.id === id);
                            if (!d) return null;
                            return (
                              <button
                                key={id}
                                onClick={() => onOpenDoc(d)}
                                className="flex items-center justify-between text-left text-xs text-indigo-650 hover:text-indigo-800 font-semibold hover:underline bg-white p-2 rounded-lg border border-gray-150 cursor-pointer transition-colors"
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  <FileText className="h-3.5 w-3.5 text-gray-400" />
                                  {d.title}
                                </span>
                                <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {isSuccess ? (
                        <div className="bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-xl p-3 flex gap-2 text-[10px] items-start animate-fade-in select-none">
                          <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{isSuccess}</span>
                        </div>
                      ) : (
                        <div className="mt-2 pt-4 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-[10px] font-medium text-gray-400">
                            Suggested: {alert.suggestedAction}
                          </span>
                          
                          {alert.type === 'outdated' ? (
                            <button
                              disabled={!!resolvingId}
                              onClick={() => handleModernizeDoc(alert.id, alert.affectedDocIds[0])}
                              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                            >
                              {isResolving ? (
                                <>
                                  <RefreshCw className="h-3 w-3 animate-spin" /> Modernizing...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3 w-3 fill-current text-amber-200" /> AI Modernize
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              disabled={!!resolvingId}
                              onClick={() => handleHarmonizeContradiction(alert.id, alert.affectedDocIds)}
                              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                            >
                              {isResolving ? (
                                <>
                                  <RefreshCw className="h-3 w-3 animate-spin" /> Harmonizing...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3 w-3 fill-current text-rose-200" /> Settle Symmetrically
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-500 rounded-full">
                  <Check className="h-6 w-6 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-800">Workspace is Perfectly Symmetrical</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">No outdated parameters or document contradictions identified!</p>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          // ================= WEEKLY SUMMARY VIEWS =================
          <motion.div
            key="weekly-subview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-5 flex-1"
          >
            <div className="bg-sky-50/50 rounded-xl p-4 border border-sky-100/50 flex gap-3 select-none">
              <Award className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <h4 className="text-xs font-bold text-sky-950">Achievements Summarizer</h4>
                <p className="text-[11px] text-sky-700/80 leading-relaxed">
                  Generate comprehensive, professional reports summarizing document revisions, workspace growth, and physical simulations saved over the past week.
                </p>
              </div>
            </div>

            {isGeneratingSummary ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <RefreshCw className="h-8 w-8 text-sky-500 animate-spin" />
                <div>
                  <span className="text-xs font-bold text-gray-700">Compiling Achievements & Logs...</span>
                  <p className="text-[10px] text-gray-400 mt-0.5">Synthesizing file additions, VCS commits, and category expansions.</p>
                </div>
              </div>
            ) : summaryError ? (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-xs select-none">
                <h5 className="font-bold flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> Compilation Failed</h5>
                <p className="mt-1">{summaryError}</p>
              </div>
            ) : weeklySummary ? (
              <div className="flex flex-col gap-4">
                {/* Save summary and utility drawer */}
                <div className="flex gap-2 justify-end select-none">
                  <button
                    onClick={handleSaveSummaryAsDoc}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <FileText className="h-3.5 w-3.5" /> Save to Workspace Shelves
                  </button>
                  <button
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Weekly Document Management Summary</title>
                              <style>
                                body { font-family: system-ui, sans-serif; padding: 40px; color: #1f2937; line-height: 1.6; max-width: 800px; margin: 0 auto; }
                                h1 { border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; font-size: 24px; color: #4f46e5; }
                                h2 { font-size: 18px; margin-top: 24px; color: #111827; }
                                ul { padding-left: 20px; }
                                li { margin: 8px 0; }
                              </style>
                            </head>
                            <body>
                              <h1>Weekly Achievements & Document Workspace Summary</h1>
                              <div style="white-space: pre-wrap;">${weeklySummary}</div>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                        printWindow.print();
                      }
                    }}
                    className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" /> Print/Export Report
                  </button>
                </div>

                {/* Main Summary Paper Render */}
                <div className="bg-gray-50 border border-gray-150 rounded-2xl p-6 shadow-2xs relative">
                  <div className="absolute top-4 right-4 text-[9px] font-mono text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-150 select-none">
                    COMPILED: {localStorage.getItem('doc_manager_weekly_summary_date') ? new Date(localStorage.getItem('doc_manager_weekly_summary_date')!).toLocaleDateString() : 'TODAY'}
                  </div>
                  <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed font-sans whitespace-pre-wrap">
                    {weeklySummary}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                <Award className="h-10 w-10 text-gray-200 stroke-[1.5]" />
                <div>
                  <h4 className="text-xs font-bold text-gray-700">No report generated yet</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Click refresh or the button below to parse your achievements.</p>
                </div>
                <button
                  onClick={generateWeeklySummary}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors shadow-xs"
                >
                  Generate Weekly Achievements Report
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
