import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Save, 
  BookOpen, 
  Maximize2, 
  Minimize2, 
  Tag, 
  Trash2, 
  Folder, 
  Sparkles,
  Info,
  Clock,
  Check,
  Type,
  ExternalLink,
  History,
  RotateCcw,
  Play,
  Zap
} from 'lucide-react';
import { Document, Shelf, DocumentVersion } from '../types';
import { computeLineDiff } from '../utils/diff';
import MathRenderer from './MathRenderer';
import MicroSimulator from './MicroSimulator';

interface DocumentEditorProps {
  document: Document;
  shelves: Shelf[];
  onSave: (docId: string, updates: Partial<Document>, changeSummary?: string) => void;
  onClose: () => void;
  initialShowSimulator?: boolean;
}

export default function DocumentEditor({
  document,
  shelves,
  onSave,
  onClose,
  initialShowSimulator = false,
}: DocumentEditorProps) {
  const [title, setTitle] = useState(document.title);
  const [content, setContent] = useState(document.content);
  const [type, setType] = useState(document.type);
  const [category, setCategory] = useState(document.category);
  const [tags, setTags] = useState<string[]>(document.tags);
  const [tagInput, setTagInput] = useState('');
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [showSimulator, setShowSimulator] = useState<boolean>(initialShowSimulator);

  useEffect(() => {
    setTitle(document.title);
    setContent(document.content);
    setType(document.type);
    setCategory(document.category);
    setTags(document.tags);
  }, [document]);

  // Track changes to trigger Save warning
  useEffect(() => {
    const isUnchanged = 
      title === document.title &&
      content === document.content &&
      type === document.type &&
      category === document.category &&
      JSON.stringify(tags) === JSON.stringify(document.tags);
    setIsSaved(isUnchanged);
  }, [title, content, type, category, tags, document]);

  const [activeSidebarTab, setActiveSidebarTab] = useState<'metadata' | 'history'>('metadata');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [changeDescription, setChangeDescription] = useState('');
  const [selectedVersionForDiff, setSelectedVersionForDiff] = useState<DocumentVersion | null>(null);
  const [showDiffModal, setShowDiffModal] = useState(false);

  const handleSave = () => {
    setShowSaveConfirm(true);
  };

  const handleConfirmSave = (commitMsg: string) => {
    onSave(document.id, {
      title,
      content,
      type,
      category,
      tags,
      size: new Blob([content]).size,
      updatedAt: new Date().toISOString(),
    }, commitMsg.trim() || undefined);
    setIsSaved(true);
    setShowSaveConfirm(false);
    setChangeDescription('');
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = tagInput.trim().replace(/[^a-zA-Z0-9-]/g, '');
    if (cleanTag && !tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Word Counters, etc.
  const wordCount = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;
  const charCount = content.length;
  const lineCount = content.split('\n').length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Setup versions fallback for backwards-compatible loading
  const docVersions = document.versions && document.versions.length > 0
    ? document.versions
    : [{
        id: `v-init-${document.id}`,
        versionNumber: 1,
        title: document.title,
        content: document.content,
        type: document.type,
        tags: [...document.tags],
        updatedAt: document.updatedAt || document.createdAt,
        changeSummary: 'Original document state',
        size: document.size,
      }];

  const renderTextWithInlineMath = (text: string) => {
    if (!text.includes('$')) return <span>{text}</span>;
    
    const parts = [];
    let currentIndex = 0;
    
    while (currentIndex < text.length) {
      const startIdx = text.indexOf('$', currentIndex);
      if (startIdx === -1) {
        parts.push(text.slice(currentIndex));
        break;
      }
      
      // Preceding text
      if (startIdx > currentIndex) {
        parts.push(text.slice(currentIndex, startIdx));
      }
      
      // Find end delimiter
      const endIdx = text.indexOf('$', startIdx + 1);
      if (endIdx === -1) {
        parts.push(text.slice(startIdx));
        break;
      }
      
      const mathExpr = text.slice(startIdx + 1, endIdx);
      parts.push(
        <MathRenderer key={startIdx} math={mathExpr} block={false} />
      );
      
      currentIndex = endIdx + 1;
    }
    
    return (
      <span>
        {parts.map((p, i) => (
          <React.Fragment key={i}>
            {p}
          </React.Fragment>
        ))}
      </span>
    );
  };

  // A ultra-responsive, beautiful custom text & markdown renderer with live LaTeX Math rendering
  const renderMarkdown = (text: string) => {
    if (!text.trim()) return <p className="text-gray-400 italic">No content available. Type in the editor to populate.</p>;

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    
    let idx = 0;
    while (idx < lines.length) {
      const line = lines[idx];
      const trimmed = line.trim();

      // Multiline Block math: starting with $$
      if (trimmed.startsWith('$$') && !trimmed.endsWith('$$', 2)) {
        let mathContent = trimmed.slice(2);
        let j = idx + 1;
        while (j < lines.length) {
          const nextTrimmed = lines[j].trim();
          if (nextTrimmed.endsWith('$$')) {
            mathContent += '\n' + nextTrimmed.slice(0, -2);
            break;
          } else {
            mathContent += '\n' + lines[j];
            j++;
          }
        }
        elements.push(
          <div key={idx} className="my-4 py-3 px-4 overflow-x-auto text-center bg-gray-50 rounded-2xl border border-gray-150/80">
            <MathRenderer math={mathContent.trim()} block={true} />
          </div>
        );
        idx = j + 1;
        continue;
      }

      // Single-line Block math
      if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
        const math = trimmed.slice(2, -2).trim();
        elements.push(
          <div key={idx} className="my-4 py-3 px-4 overflow-x-auto text-center bg-gray-50 rounded-2xl border border-gray-150/80">
            <MathRenderer math={math} block={true} />
          </div>
        );
        idx++;
        continue;
      }

      // Code blocks
      if (trimmed.startsWith('```')) {
        let codeContent = '';
        let j = idx + 1;
        while (j < lines.length) {
          if (lines[j].trim().startsWith('```')) {
            break;
          }
          codeContent += lines[j] + '\n';
          j++;
        }
        elements.push(
          <pre key={idx} className="bg-gray-950 text-gray-150 font-mono text-[11px] p-4.5 rounded-2xl my-3 overflow-x-auto whitespace-pre leading-relaxed shadow-inner border border-gray-900">
            <code>{codeContent}</code>
          </pre>
        );
        idx = j + 1;
        continue;
      }

      // Raw format data blocks
      if (trimmed.startsWith('TIMESTAMP,') || trimmed.startsWith('{"simulation":')) {
        elements.push(
          <span key={idx} className="block bg-gray-55/80 text-gray-600 font-mono text-[10px] p-3 rounded-xl border border-gray-150 overflow-x-auto whitespace-pre my-2 select-text">
            {trimmed}
          </span>
        );
        idx++;
        continue;
      }

      // Headers
      if (trimmed.startsWith('# ')) {
        elements.push(
          <h1 key={idx} className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-2 pt-4">
            {renderTextWithInlineMath(trimmed.replace('# ', ''))}
          </h1>
        );
        idx++;
        continue;
      }
      if (trimmed.startsWith('## ')) {
        elements.push(
          <h2 key={idx} className="text-lg font-semibold text-gray-800 pt-3">
            {renderTextWithInlineMath(trimmed.replace('## ', ''))}
          </h2>
        );
        idx++;
        continue;
      }
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h3 key={idx} className="text-md font-semibold text-gray-850 pt-2">
            {renderTextWithInlineMath(trimmed.replace('### ', ''))}
          </h3>
        );
        idx++;
        continue;
      }

      // Lists
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        elements.push(
          <div key={idx} className="flex items-start gap-2 pl-4">
            <span className="text-indigo-500 font-bold mt-1.5">•</span>
            <span className="text-gray-650">{renderTextWithInlineMath(trimmed.slice(2))}</span>
          </div>
        );
        idx++;
        continue;
      }
      
      if (/^\d+\.\s/.test(trimmed)) {
        const listNum = trimmed.match(/^\d+\./)?.[0];
        const content = trimmed.replace(/^\d+\.\s/, '');
        elements.push(
          <div key={idx} className="flex items-start gap-2 pl-4">
            <span className="text-indigo-600 font-mono font-medium text-xs mt-1">{listNum}</span>
            <span className="text-gray-650">{renderTextWithInlineMath(content)}</span>
          </div>
        );
        idx++;
        continue;
      }

      // Tables (Render simply as structured key-value lines if basic)
      if (trimmed.startsWith('|')) {
        const cells = trimmed.split('|').map(c => c.trim()).filter(c => c !== '');
        if (trimmed.includes('---')) {
          idx++;
          continue; // skip separator
        }
        elements.push(
          <div key={idx} className="grid grid-cols-4 gap-3 bg-gray-50/70 py-1.5 px-3 border border-gray-100 rounded-xl text-xs font-mono">
            {cells.map((cell, cidx) => (
              <span key={cidx} className={idx === 1 ? "font-bold text-gray-700" : "text-gray-600"}>
                {renderTextWithInlineMath(cell)}
              </span>
            ))}
          </div>
        );
        idx++;
        continue;
      }

      // Normal paragraphs
      if (trimmed === '') {
        elements.push(<div key={idx} className="h-2" />);
      } else {
        elements.push(
          <p key={idx} className="text-gray-600 leading-relaxed">
            {renderTextWithInlineMath(trimmed)}
          </p>
        );
      }
      idx++;
    }

    return (
      <div className="prose prose-slate max-w-none text-sm text-gray-700 leading-relaxed font-sans space-y-3">
        {elements}
      </div>
    );
  };

  return (
    <>
      <motion.div
        id="document-editor"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 rounded-2xl select-none"
      >
        <div 
          id="editor-container"
        className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Editor navbar heading */}
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white border border-gray-200/80 shadow-sm flex items-center justify-center">
              <Type className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Editing Document</span>
                {!isSaved && (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" title="Unsaved changes" />
                )}
              </div>
              <input
                id="editor-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-base font-semibold text-gray-850 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-indigo-500 focus:outline-none transition-colors"
                placeholder="Untited Document"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="editor-toggle-preview"
              onClick={() => setPreviewMode(!previewMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                previewMode
                  ? 'bg-indigo-550 border-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              {previewMode ? 'Edit Mode' : 'Preview Live'}
            </button>

            <button
              id="editor-save-btn"
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition-all ${
                isSaved
                  ? 'bg-gray-100 text-gray-400 cursor-default'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
              disabled={isSaved}
            >
              {isSaved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              {isSaved ? 'Saved' : 'Save Changes'}
            </button>

            <button
              id="editor-close-btn"
              onClick={() => {
                if (!isSaved) {
                  if (confirm('You have unsaved changes. Are you sure you want to discard them?')) {
                    onClose();
                  }
                } else {
                  onClose();
                }
              }}
              className="p-1.5 hover:bg-gray-200/60 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Workspace core wrapper */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          
          {/* Main workspace (Editor and Preview Pane) */}
          <div className="flex-1 flex overflow-hidden split-pane divide-x divide-gray-100">
            {/* LEFT: Plain Text Area (hidden in total previewMode) */}
            {!previewMode && (
              <div className="flex-1 flex flex-col bg-white min-w-0 h-full">
                <textarea
                  id="editor-textarea"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="flex-1 p-6 resize-none focus:outline-none text-sm text-gray-800 font-mono leading-relaxed bg-white placeholder-gray-300 overflow-y-auto"
                  placeholder="Start writing... Supports markdown templates (# headers, - lists, tables, code)"
                />
              </div>
            )}

            {/* RIGHT: High-fidelity Live Rendering (shown in previewMode, or alongside if wide screen and split mode mimics active) */}
            {(previewMode || true) && (
              <div className={`flex-1 bg-gray-50/50 p-6 overflow-y-auto ${!previewMode ? 'hidden md:block' : 'block'}`}>
                <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] p-8 min-h-full">
                  <div className="mb-4 text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Live Render Preview
                  </div>
                  <h1 className="text-2xl font-bold text-gray-850 mb-6 font-sans drop-shadow-sm">{title || 'Untitled'}</h1>
                  {/* Interactive Playground Banner */}
                  {(category === 'shelf-repetitive-bounce' || category === 'shelf-deep-parity' || category === 'shelf-even-product') && (
                    <div className="bg-gradient-to-br from-indigo-50/60 to-purple-50/60 border border-indigo-100/40 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-xs select-none">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-600 flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5 fill-indigo-100 text-indigo-500 animate-pulse" /> Live Interactive Sandbox
                        </span>
                        <p className="text-xs text-indigo-950 font-bold mt-1">This document contains executable configurations.</p>
                        <p className="text-[10px] text-indigo-600 font-medium">Run the mini client-side simulation playground.</p>
                      </div>
                      <button
                        id="editor-launch-simulator"
                        onClick={() => setShowSimulator(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-150 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <Play className="h-3 w-3 fill-current" /> Run Simulator
                      </button>
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-6">
                    {renderMarkdown(content)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR: Document Meta Parameters & Revision History Tab controls */}
          <div className="w-80 bg-gray-50 border-1 border-gray-100 flex flex-col p-5 overflow-y-auto shrink-0 hidden lg:flex border-l">
            
            {/* TAB SELECTOR */}
            <div className="flex bg-gray-200/55 p-1 rounded-xl gap-1 mb-4 select-none shrink-0 border border-gray-200/20">
              <button
                id="sidebar-tab-metadata"
                onClick={() => setActiveSidebarTab('metadata')}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeSidebarTab === 'metadata'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-550 hover:text-gray-900 hover:bg-white/40'
                }`}
              >
                <Tag className="h-3.5 w-3.5" />
                Properties
              </button>
              <button
                id="sidebar-tab-history"
                onClick={() => setActiveSidebarTab('history')}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeSidebarTab === 'history'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-550 hover:text-gray-900 hover:bg-white/40'
                }`}
              >
                <History className="h-3.5 w-3.5" />
                History
                {docVersions.length > 0 && (
                  <span className="bg-indigo-50 text-indigo-750 font-mono text-[9px] px-1.5 py-0.5 rounded-md font-bold leading-none">
                    {docVersions.length}
                  </span>
                )}
              </button>
            </div>

            {activeSidebarTab === 'metadata' ? (
              <div className="flex flex-col gap-5 flex-grow select-none">
                {/* Classification (Shelf & Type Category) */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Classification</span>
                  
                  {/* Shelf Selection */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Folder className="h-3 w-3" /> Shelf row
                    </label>
                    <select
                      id="editor-shelf-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full text-xs bg-white border border-gray-200 rounded-lg p-2 focus:border-indigo-500 focus:outline-none"
                    >
                      {shelves.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Type Selection */}
                  <div className="flex flex-col gap-1 mt-2">
                    <label className="text-[10px] text-gray-400">File Signature</label>
                    <select
                      id="editor-type-select"
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="w-full text-xs bg-white border border-gray-200 rounded-lg p-2 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="markdown">Markdown (.md)</option>
                      <option value="text">Plain Text (.txt)</option>
                      <option value="json">Structured JSON (.json)</option>
                      <option value="pdf">Secured Doc (.pdf)</option>
                      <option value="spreadsheet">Parity Sheet (.csv)</option>
                    </select>
                  </div>
                </div>

                {/* Tag system */}
                <div className="flex flex-col gap-1.5 border-t border-gray-250/30 pt-4">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Document Labels
                  </span>
                  
                  {/* Quick Tags List */}
                  <div className="flex flex-wrap gap-1 mt-1 max-h-24 overflow-y-auto pb-1">
                    {tags.length > 0 ? (
                      tags.map(t => (
                        <span 
                          key={t} 
                          className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-600 text-[10px] pl-2 pr-1 py-0.5 rounded-md hover:bg-red-50 hover:border-red-100 hover:text-red-700 transition-colors cursor-pointer group"
                          onClick={() => handleRemoveTag(t)}
                          title="Click to remove"
                        >
                          {t}
                          <X className="h-2.5 w-2.5 text-gray-400 group-hover:text-red-500" />
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">No labels assigned yet.</span>
                    )}
                  </div>

                  {/* Add tag form */}
                  <form onSubmit={handleAddTag} className="flex gap-1.5 mt-1.5">
                    <input
                      id="editor-tag-input"
                      type="text"
                      placeholder="Add custom label..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      className="flex-grow text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      id="editor-add-tag-btn"
                      type="submit"
                      className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                  </form>
                </div>

                {/* Telemetry info */}
                <div className="flex flex-col gap-2.5 border-t border-gray-250/30 pt-4 mt-auto bg-white/50 p-3 rounded-2xl border border-gray-200/40 font-mono">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Info className="h-3 w-3 text-indigo-550" /> Document Metrics
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 leading-none">
                    <div className="flex flex-col bg-white p-1.5 border border-gray-100 rounded-lg">
                      <span className="text-gray-405 mb-1">Words</span>
                      <span className="font-semibold text-gray-750">{wordCount}</span>
                    </div>
                    <div className="flex flex-col bg-white p-1.5 border border-gray-100 rounded-lg">
                      <span className="text-gray-405 mb-1">Characters</span>
                      <span className="font-semibold text-gray-750">{charCount}</span>
                    </div>
                    <div className="flex flex-col bg-white p-1.5 border border-gray-100 rounded-lg">
                      <span className="text-gray-405 mb-1">Total Lines</span>
                      <span className="font-semibold text-gray-750">{lineCount}</span>
                    </div>
                    <div className="flex flex-col bg-white p-1.5 border border-gray-100 rounded-lg">
                      <span className="text-gray-405 mb-1">Reading Time</span>
                      <span className="font-semibold text-gray-750 flex items-center gap-0.5"><Clock className="h-2.5 w-2.5 text-gray-400" /> {readingTime} min</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 flex-grow overflow-hidden select-none">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Revision History</span>
                  <p className="text-[10px] text-gray-450 leading-tight mt-1">
                    Every save adds an immutable state snapshot. Open comparison logs to view changes line-by-line.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 py-1 flex flex-col gap-2.5 max-h-[52vh] [scrollbar-width:thin]">
                  {docVersions.slice().reverse().map((ver) => {
                    const isActiveVer = ver.title === title && ver.content === content && ver.type === type && JSON.stringify(ver.tags) === JSON.stringify(tags);
                    const dateFormatted = new Date(ver.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div 
                        key={ver.id || ver.versionNumber}
                        className={`p-3 rounded-2xl border transition-all flex flex-col gap-1.5 bg-white ${
                          isActiveVer 
                            ? 'border-indigo-300 ring-2 ring-indigo-50/50 shadow-xs' 
                            : 'border-gray-200/80 hover:border-gray-300 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md font-mono ${
                            isActiveVer 
                              ? 'bg-indigo-50 text-indigo-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            Revision v{ver.versionNumber}
                          </span>
                          <span className="text-[9px] text-gray-400 font-mono">
                            {(ver.size / 1024).toFixed(2)} KB
                          </span>
                        </div>

                        <div className="flex flex-col select-text">
                          <p className="text-xs font-semibold text-gray-800 break-words leading-tight capitalize">
                            {ver.changeSummary || `Update ${ver.versionNumber}`}
                          </p>
                          <span className="text-[9px] text-gray-400 font-mono font-medium mt-1 inline-flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" /> {dateFormatted}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1.5 pt-2 border-t border-dashed border-gray-100">
                          <button
                            id={`show-diff-${ver.id || ver.versionNumber}`}
                            onClick={() => {
                              setSelectedVersionForDiff(ver);
                              setShowDiffModal(true);
                            }}
                            className="text-[10px] text-indigo-650 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-0.5"
                          >
                            Compare
                          </button>

                          {!isActiveVer && (
                            <button
                              id={`restore-ver-${ver.id || ver.versionNumber}`}
                              onClick={() => {
                                if (confirm(`Revert document contents back to Revision Version ${ver.versionNumber}? Any unsaved changes on your editor will be replaced.`)) {
                                  setTitle(ver.title);
                                  setContent(ver.content);
                                  setType(ver.type);
                                  setTags(ver.tags);

                                  // Instantly save/commit the reverted values directly
                                  onSave(document.id, {
                                    title: ver.title,
                                    content: ver.content,
                                    type: ver.type,
                                    tags: ver.tags,
                                    size: ver.size,
                                    updatedAt: new Date().toISOString()
                                  }, `Restored to Revision Version ${ver.versionNumber}`);

                                  setIsSaved(true);
                                }
                              }}
                              className="text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-0.5 ml-auto"
                            >
                              <RotateCcw className="h-2.5 w-2.5" /> Revert
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
      </motion.div>

      {/* MODAL 1: REVISION SUMMARY CHRONOLOGY COMMIT CONFIRM POPUP */}
      <AnimatePresence>
        {showSaveConfirm && (
          <div className="fixed inset-0 bg-gray-950/65 backdrop-blur-sm flex items-center justify-center p-4 z-[75] select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-2xl p-6 w-full max-w-sm flex flex-col gap-4 select-none"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-50 rounded-2xl text-indigo-600">
                  <History className="h-5 w-5 animate-spin" style={{ animationDuration: '4s' }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">Commit Revision Log</h3>
                  <p className="text-xs text-gray-400">Describe what has been modified</p>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Revision Summary / Note</label>
                <input
                  id="commit-message-input"
                  type="text"
                  value={changeDescription}
                  onChange={(e) => setChangeDescription(e.target.value)}
                  placeholder="e.g. Updated polymer elasticity formula"
                  className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 hover:border-gray-250 focus:bg-white focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2.5 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleConfirmSave(changeDescription);
                    }
                  }}
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2 mt-1">
                <button
                  id="commit-cancel-btn"
                  onClick={() => setShowSaveConfirm(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  id="commit-confirm-btn"
                  onClick={() => handleConfirmSave(changeDescription)}
                  className="flex-grow py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-150 transition-all cursor-pointer text-center"
                >
                  {changeDescription.trim() ? 'Commit & Save' : 'Instant Save'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: DIFF COMPARATOR */}
      <AnimatePresence>
        {showDiffModal && selectedVersionForDiff && (
          <div className="fixed inset-0 bg-gray-950/65 backdrop-blur-sm flex items-center justify-center p-6 z-[70] select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 15 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gray-50 border-b border-gray-150 px-6 py-4 flex items-center justify-between select-none">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <History className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest leading-none">VCS Change Diff Tool</span>
                    <h2 className="text-sm font-bold text-gray-800 leading-none mt-1">
                      Revision Version {selectedVersionForDiff.versionNumber} Comparisons
                    </h2>
                  </div>
                </div>
                <button
                  id="close-diff-viewer"
                  onClick={() => {
                    setShowDiffModal(false);
                    setSelectedVersionForDiff(null);
                  }}
                  className="p-1.5 hover:bg-gray-200/60 rounded-xl text-gray-400 hover:text-gray-650 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Revision commit meta specs banner */}
              <div className="bg-amber-500/[0.04] border-b border-amber-500/10 px-6 py-3.5 flex items-center justify-between text-xs select-none">
                <div className="flex flex-col gap-0.5 max-w-md">
                  <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Comment/Summary Description</span>
                  <span className="font-bold text-gray-800 break-words text-sm line-clamp-1">
                    "{selectedVersionForDiff.changeSummary || `Update ${selectedVersionForDiff.versionNumber}`}"
                  </span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Modified Time</span>
                  <span className="font-mono text-[11px] font-semibold text-gray-700">
                    {new Date(selectedVersionForDiff.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              {/* Diff Code Scroll Core container */}
              <div className="flex-1 overflow-hidden p-6 bg-gray-50 flex flex-col gap-4">
                <div className="bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden flex-1 shadow-xs">
                  
                  {/* Diff label details */}
                  <div className="bg-gray-55/65 px-4 py-2.5 border-b border-gray-150 flex items-center justify-between select-none shrink-0">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Line-by-Line Changes</span>
                    <div className="flex gap-3 text-[10px] font-bold">
                      <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md"><span className="h-2 w-2 rounded bg-rose-500" /> Deleted</span>
                      <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md"><span className="h-2 w-2 rounded bg-emerald-500" /> Added</span>
                    </div>
                  </div>

                  {/* Lines render container */}
                  <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed divide-y divide-gray-100 bg-gray-950 text-gray-100 selection:bg-gray-800 selection:text-white [scrollbar-width:thin]">
                    {(() => {
                      const prevVerNumber = selectedVersionForDiff.versionNumber - 1;
                      const baseCode = docVersions.find(v => v.versionNumber === prevVerNumber)?.content || '';
                      const diffList = computeLineDiff(baseCode, selectedVersionForDiff.content);

                      return diffList.map((chunk, chunkIdx) => {
                        const isAdded = chunk.type === 'added';
                        const isDeleted = chunk.type === 'removed';

                        return (
                          <div 
                            key={chunkIdx}
                            className={`flex items-start px-3 py-1 font-mono hover:bg-gray-900 border-l-4 transition-all ${
                              isAdded 
                                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500' 
                                : isDeleted 
                                ? 'bg-rose-950/40 text-rose-400 border-rose-500 line-through decoration-rose-500/50' 
                                : 'text-gray-300 border-transparent'
                            }`}
                          >
                            <span className="w-6 shrink-0 opacity-40 font-bold select-none text-right pr-2">
                              {isAdded ? '+' : isDeleted ? '-' : ' '}
                            </span>
                            <span className="break-all whitespace-pre-wrap flex-1">{chunk.value || ' '}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>

                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSimulator && (
          <MicroSimulator
            document={document}
            onClose={() => setShowSimulator(false)}
            onUpdateContent={(newContent) => {
              setContent(newContent);
              setIsSaved(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
