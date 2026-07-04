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
  onSave: (docId: string, updates: Partial<Document>, changeSummary?: string, parentId?: string | null) => void;
  onClose: () => void;
  initialShowSimulator?: boolean;
  documents: Document[];
  onOpenDoc: (doc: Document) => void;
  onCreateDocFromLink: (title: string) => void;
}

export default function DocumentEditor({
  document,
  shelves,
  onSave,
  onClose,
  initialShowSimulator = false,
  documents,
  onOpenDoc,
  onCreateDocFromLink,
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

  const [autocompleteState, setAutocompleteState] = useState<{
    show: boolean;
    query: string;
    startIndex: number;
    endIndex: number;
    focusedIndex: number;
  }>({
    show: false,
    query: '',
    startIndex: -1,
    endIndex: -1,
    focusedIndex: 0,
  });

  const handleSelectDocumentLink = (docTitle: string) => {
    const textarea = window.document.getElementById('editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = autocompleteState.startIndex;
    const end = textarea.selectionStart;
    
    const before = content.slice(0, start);
    const after = content.slice(end);
    const insertText = `[[${docTitle}]]`;
    
    const newContent = before + insertText + after;
    setContent(newContent);
    setIsSaved(false);
    setAutocompleteState({ show: false, query: '', startIndex: -1, endIndex: -1, focusedIndex: 0 });
    
    // Refocus and place cursor after the inserted link
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + insertText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    setIsSaved(false);

    const selectionStart = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, selectionStart);
    const lastOpenDoubleBrace = textBeforeCursor.lastIndexOf('[[');
    const lastCloseDoubleBrace = textBeforeCursor.lastIndexOf(']]');

    if (lastOpenDoubleBrace !== -1 && lastOpenDoubleBrace > lastCloseDoubleBrace) {
      const query = textBeforeCursor.slice(lastOpenDoubleBrace + 2);
      if (!query.includes('\n')) {
        setAutocompleteState({
          show: true,
          query,
          startIndex: lastOpenDoubleBrace,
          endIndex: selectionStart,
          focusedIndex: 0,
        });
        return;
      }
    }
    setAutocompleteState(prev => ({ ...prev, show: false }));
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!autocompleteState.show) return;

    // Filter suggestions
    const suggestions = documents
      .filter(d => d.id !== document.id && !d.isArchived)
      .filter(d => d.title.toLowerCase().includes(autocompleteState.query.toLowerCase()));

    if (suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAutocompleteState(prev => ({
        ...prev,
        focusedIndex: (prev.focusedIndex + 1) % suggestions.length,
      }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAutocompleteState(prev => ({
        ...prev,
        focusedIndex: (prev.focusedIndex - 1 + suggestions.length) % suggestions.length,
      }));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelectDocumentLink(suggestions[autocompleteState.focusedIndex].title);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setAutocompleteState(prev => ({ ...prev, show: false }));
    }
  };

  useEffect(() => {
    setTitle(document.title);
    setContent(document.content);
    setType(document.type);
    setCategory(document.category);
    setTags(document.tags);
    setAutocompleteState({ show: false, query: '', startIndex: -1, endIndex: -1, focusedIndex: 0 });
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

  const [activeSidebarTab, setActiveSidebarTab] = useState<'metadata' | 'history' | 'backlinks'>('metadata');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [changeDescription, setChangeDescription] = useState('');
  const [selectedVersionForDiff, setSelectedVersionForDiff] = useState<DocumentVersion | null>(null);
  const [showDiffModal, setShowDiffModal] = useState(false);

  const backlinks = documents.filter(doc => {
    if (doc.id === document.id || doc.isArchived) return false;
    
    const searchTitle = `[[${document.title.toLowerCase()}]]`;
    const searchId = `[[${document.id.toLowerCase()}]]`;
    const contentLower = doc.content.toLowerCase();
    
    const hasTitleLink = contentLower.includes(searchTitle);
    const hasIdLink = contentLower.includes(searchId) || contentLower.includes(`[[${document.id.toLowerCase()}|`);
    
    const regexWikiTitle = new RegExp(`\\[\\[${escapeRegExp(document.title)}\\|`, 'i');
    const hasTitleWithLabel = regexWikiTitle.test(doc.content);
    
    return hasTitleLink || hasIdLink || hasTitleWithLabel;
  });

  function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

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
    if (!text.includes('$') && !text.includes('[[')) {
      return <span>{text}</span>;
    }
    
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    
    while (currentIndex < text.length) {
      const nextMathIdx = text.indexOf('$', currentIndex);
      const nextWikiIdx = text.indexOf('[[', currentIndex);
      
      if (nextMathIdx === -1 && nextWikiIdx === -1) {
        parts.push(text.slice(currentIndex));
        break;
      }
      
      // Determine which token comes first
      if (nextMathIdx !== -1 && (nextWikiIdx === -1 || nextMathIdx < nextWikiIdx)) {
        // Math is first
        if (nextMathIdx > currentIndex) {
          parts.push(text.slice(currentIndex, nextMathIdx));
        }
        
        const endMathIdx = text.indexOf('$', nextMathIdx + 1);
        if (endMathIdx === -1) {
          parts.push(text.slice(nextMathIdx));
          break;
        }
        
        const mathExpr = text.slice(nextMathIdx + 1, endMathIdx);
        parts.push(
          <MathRenderer key={`math-${nextMathIdx}`} math={mathExpr} block={false} />
        );
        currentIndex = endMathIdx + 1;
      } else {
        // Wiki link is first
        if (nextWikiIdx > currentIndex) {
          parts.push(text.slice(currentIndex, nextWikiIdx));
        }
        
        const endWikiIdx = text.indexOf(']]', nextWikiIdx + 2);
        if (endWikiIdx === -1) {
          parts.push(text.slice(nextWikiIdx));
          break;
        }
        
        const linkRaw = text.slice(nextWikiIdx + 2, endWikiIdx);
        let targetIdOrTitle = linkRaw;
        let displayLabel = linkRaw;
        
        if (linkRaw.includes('|')) {
          const partsSplit = linkRaw.split('|');
          targetIdOrTitle = partsSplit[0].trim();
          displayLabel = partsSplit[1].trim();
        }
        
        // Find the document
        const linkedDoc = documents.find(d => 
          d.id === targetIdOrTitle || 
          d.title.toLowerCase() === targetIdOrTitle.toLowerCase()
        );
        
        if (linkedDoc) {
          parts.push(
            <button
              key={`wiki-${nextWikiIdx}`}
              type="button"
              onClick={() => {
                onOpenDoc(linkedDoc);
              }}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors cursor-pointer select-text"
              title={`Navigate to ${linkedDoc.title}`}
            >
              <ExternalLink className="h-2.5 w-2.5 inline" />
              {displayLabel}
            </button>
          );
        } else {
          // "Red link" for non-existent page
          parts.push(
            <button
              key={`wiki-missing-${nextWikiIdx}`}
              type="button"
              onClick={() => {
                onCreateDocFromLink(targetIdOrTitle);
              }}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-md bg-red-55/60 border border-dashed border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors cursor-pointer select-text"
              title={`Page "${targetIdOrTitle}" does not exist. Click to create.`}
            >
              <span className="text-red-400 font-bold font-mono">?</span>
              {displayLabel}
            </button>
          );
        }
        currentIndex = endWikiIdx + 2;
      }
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
              <div className="flex-1 flex flex-col bg-white min-w-0 h-full relative">
                <textarea
                  id="editor-textarea"
                  value={content}
                  onChange={handleTextareaChange}
                  onKeyDown={handleTextareaKeyDown}
                  className="flex-grow p-6 resize-none focus:outline-none text-sm text-gray-800 font-mono leading-relaxed bg-white placeholder-gray-300 overflow-y-auto"
                  placeholder="Start writing... Type '[[' to link pages. Supports markdown templates (# headers, - lists, tables, code)"
                />
                
                {/* Wiki Autocomplete popover */}
                <AnimatePresence>
                  {autocompleteState.show && (() => {
                    const suggestions = documents
                      .filter(d => d.id !== document.id && !d.isArchived)
                      .filter(d => d.title.toLowerCase().includes(autocompleteState.query.toLowerCase()));

                    if (suggestions.length === 0) return null;

                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-6 left-6 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 z-30 w-72 max-h-60 flex flex-col overflow-hidden select-none"
                      >
                        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2 flex items-center justify-between border-b border-gray-100 pb-1.5 shrink-0">
                          <span>Autocomplete Wiki-Link</span>
                          <span className="font-mono text-gray-300 font-normal">↑↓ Enter</span>
                        </div>
                        <div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-1 [scrollbar-width:thin]">
                          {suggestions.map((suggestion, idx) => {
                            const isFocused = idx === autocompleteState.focusedIndex;
                            return (
                              <button
                                key={suggestion.id}
                                id={`autocomplete-item-${idx}`}
                                type="button"
                                onClick={() => handleSelectDocumentLink(suggestion.title)}
                                onMouseEnter={() => setAutocompleteState(prev => ({ ...prev, focusedIndex: idx }))}
                                className={`w-full text-left text-xs px-3 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                                  isFocused 
                                    ? 'bg-indigo-50 text-indigo-750 font-semibold' 
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                <span className="truncate pr-2">{suggestion.title}</span>
                                <span className="text-[9px] font-mono opacity-50 bg-gray-100 px-1 py-0.2 rounded border shrink-0">
                                  {suggestion.type}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
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
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeSidebarTab === 'metadata'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-550 hover:text-gray-900 hover:bg-white/40'
                }`}
              >
                <Tag className="h-3.5 w-3.5" />
                Props
              </button>
              <button
                id="sidebar-tab-history"
                onClick={() => setActiveSidebarTab('history')}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
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
              <button
                id="sidebar-tab-backlinks"
                onClick={() => setActiveSidebarTab('backlinks')}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeSidebarTab === 'backlinks'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-550 hover:text-gray-900 hover:bg-white/40'
                }`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Links
                {backlinks.length > 0 && (
                  <span className="bg-indigo-50 text-indigo-750 font-mono text-[9px] px-1.5 py-0.5 rounded-md font-bold leading-none">
                    {backlinks.length}
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
            ) : activeSidebarTab === 'history' ? (
              <div className="flex flex-col gap-3 flex-grow overflow-hidden select-none">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Revision History Graph</span>
                  <p className="text-[10px] text-gray-450 leading-tight mt-1">
                    Track edits and branching regression paths via interactive SVG network.
                  </p>
                </div>

                {(() => {
                  const docVersions = document.versions || [];
                  const versionsForGraph = [...docVersions];
                  
                  // Sort chronologically (oldest first) to assign correct rows & parent links
                  versionsForGraph.sort((a, b) => {
                    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
                  });

                  const coords: { [key: string]: { x: number; y: number; col: number; row: number } } = {};
                  const activeColumnsInRow: number[][] = [];

                  versionsForGraph.forEach((ver, idx) => {
                    let col = 0;
                    if (idx > 0) {
                      const parentId = ver.parentId;
                      const prevVer = versionsForGraph[idx - 1];
                      
                      if (parentId === prevVer.id) {
                        col = coords[prevVer.id]?.col || 0;
                      } else if (!parentId) {
                        col = 0;
                      } else {
                        const parentCoord = coords[parentId];
                        if (parentCoord) {
                          col = parentCoord.col + 1;
                          while (activeColumnsInRow[idx]?.includes(col)) {
                            col++;
                          }
                        }
                      }
                    }

                    if (!activeColumnsInRow[idx]) activeColumnsInRow[idx] = [];
                    activeColumnsInRow[idx].push(col);

                    // Block intermediate columns for crossing lines
                    if (idx > 0 && ver.parentId) {
                      const parentIdx = versionsForGraph.findIndex(v => v.id === ver.parentId);
                      if (parentIdx !== -1 && parentIdx < idx - 1) {
                        for (let r = parentIdx + 1; r < idx; r++) {
                          if (!activeColumnsInRow[r]) activeColumnsInRow[r] = [];
                          activeColumnsInRow[r].push(col);
                        }
                      }
                    }

                    // Card block total spacing height is 132px. centerY is rowY
                    const rowY = (versionsForGraph.length - 1 - idx) * 132 + 66;

                    coords[ver.id || `v-init-${document.id}`] = {
                      col,
                      row: idx,
                      x: 20 + col * 16,
                      y: rowY,
                    };
                  });

                  const maxCol = Math.max(...versionsForGraph.map(v => coords[v.id]?.col || 0), 0);
                  const svgWidth = Math.max(48, 36 + maxCol * 16);
                  const svgHeight = versionsForGraph.length * 132;

                  return (
                    <div className="flex-1 flex flex-row items-stretch overflow-hidden select-none">
                      {/* Left side: SVG Commit Canvas */}
                      <div 
                        className="overflow-y-auto overflow-x-hidden select-none border-r border-gray-200/50 scrollbar-none"
                        style={{ width: `${svgWidth}px`, height: '52vh', scrollbarWidth: 'none' }}
                      >
                        <svg width={svgWidth} height={svgHeight} className="overflow-visible">
                          {/* Grid alignment lines */}
                          {versionsForGraph.map((_, idx) => (
                            <line 
                              key={`guide-${idx}`} 
                              x1={0} 
                              y1={idx * 132 + 66} 
                              x2={svgWidth} 
                              y2={idx * 132 + 66} 
                              stroke="#f3f4f6" 
                              strokeWidth="1" 
                              strokeDasharray="2,4" 
                            />
                          ))}

                          {/* Connective branch edges */}
                          {versionsForGraph.map((ver) => {
                            if (!ver.parentId) return null;
                            const parent = versionsForGraph.find(v => v.id === ver.parentId);
                            if (!parent) return null;
                            
                            const currentCoord = coords[ver.id];
                            const parentCoord = coords[parent.id];
                            if (!currentCoord || !parentCoord) return null;

                            const isReversion = ver.changeSummary?.toLowerCase().includes('restore') || ver.changeSummary?.toLowerCase().includes('revert');
                            const strokeColor = isReversion ? '#10b981' : currentCoord.col === 0 ? '#6366f1' : '#a78bfa';
                            const strokeDash = isReversion ? '3,3' : undefined;

                            // Fluid Bezier layout curve
                            const d = `M ${parentCoord.x} ${parentCoord.y} C ${parentCoord.x} ${(parentCoord.y + currentCoord.y) / 2}, ${currentCoord.x} ${(parentCoord.y + currentCoord.y) / 2}, ${currentCoord.x} ${currentCoord.y}`;
                            
                            return (
                              <path
                                key={`edge-${ver.id}-${parent.id}`}
                                d={d}
                                fill="none"
                                stroke={strokeColor}
                                strokeWidth="2.5"
                                strokeDasharray={strokeDash}
                              />
                            );
                          })}

                          {/* Nodes */}
                          {versionsForGraph.map((ver) => {
                            const coord = coords[ver.id];
                            if (!coord) return null;
                            const isActiveVer = ver.title === title && ver.content === content && ver.type === type && JSON.stringify(ver.tags) === JSON.stringify(tags);
                            const isReversion = ver.changeSummary?.toLowerCase().includes('restore') || ver.changeSummary?.toLowerCase().includes('revert');

                            return (
                              <g key={`node-${ver.id}`}>
                                {isActiveVer && (
                                  <circle
                                    cx={coord.x}
                                    cy={coord.y}
                                    r="8"
                                    className="fill-indigo-100 stroke-indigo-300 animate-ping opacity-75"
                                  />
                                )}
                                <circle
                                  cx={coord.x}
                                  cy={coord.y}
                                  r={isActiveVer ? "5" : "4.5"}
                                  fill={isActiveVer ? "#4f46e5" : isReversion ? "#10b981" : "#ffffff"}
                                  stroke={isActiveVer ? "#4f46e5" : isReversion ? "#10b981" : coord.col === 0 ? "#6366f1" : "#a78bfa"}
                                  strokeWidth="2.5"
                                  title={ver.changeSummary}
                                />
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      {/* Right side: Revision Cards */}
                      <div className="flex-1 overflow-y-auto pl-2 pr-1 py-1 flex flex-col gap-0 max-h-[52vh] [scrollbar-width:thin]">
                        {versionsForGraph.slice().reverse().map((ver) => {
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
                              className="h-[120px] mb-[12px] flex flex-col justify-center"
                            >
                              <div className={`p-3 rounded-2xl border transition-all flex flex-col gap-1 bg-white h-full justify-between ${
                                isActiveVer 
                                  ? 'border-indigo-300 ring-2 ring-indigo-50/50 shadow-xs' 
                                  : 'border-gray-200/80 hover:border-gray-300 hover:shadow-xs'
                              }`}>
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
                                  <p className="text-xs font-semibold text-gray-800 break-words leading-none truncate capitalize" title={ver.changeSummary}>
                                    {ver.changeSummary || `Update ${ver.versionNumber}`}
                                  </p>
                                  <span className="text-[9px] text-gray-400 font-mono font-medium mt-1 inline-flex items-center gap-0.5">
                                    <Clock className="h-2.5 w-2.5" /> {dateFormatted}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 mt-1 pt-1.5 border-t border-dashed border-gray-100">
                                  <button
                                    id={`show-diff-${ver.id || ver.versionNumber}`}
                                    onClick={() => {
                                      setSelectedVersionForDiff(ver);
                                      setShowDiffModal(true);
                                    }}
                                    className="text-[10px] text-indigo-650 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-0.5"
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
                                          }, `Restored to Revision Version ${ver.versionNumber}`, ver.id);

                                          setIsSaved(true);
                                        }
                                      }}
                                      className="text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-0.5 ml-auto"
                                    >
                                      <RotateCcw className="h-2.5 w-2.5" /> Revert
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex flex-col gap-3 flex-grow overflow-hidden select-none">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Incoming References</span>
                  <p className="text-[10px] text-gray-450 leading-tight mt-1">
                    Other documents that link back to this card using wiki-links. Click on any to transition instantly.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 py-1 flex flex-col gap-2.5 max-h-[52vh] [scrollbar-width:thin]">
                  {backlinks.length > 0 ? (
                    backlinks.map((linkedDoc) => {
                      // Generate a neat excerpt showing the context where this wiki link is located
                      const contentLower = linkedDoc.content.toLowerCase();
                      const termIdx = contentLower.indexOf('[[');
                      let excerpt = '';
                      if (termIdx !== -1) {
                        const start = Math.max(0, termIdx - 40);
                        const end = Math.min(linkedDoc.content.length, termIdx + 60);
                        excerpt = '...' + linkedDoc.content.slice(start, end).replace(/\n/g, ' ') + '...';
                      } else {
                        excerpt = linkedDoc.content.slice(0, 80) + '...';
                      }

                      return (
                        <div
                          key={linkedDoc.id}
                          onClick={() => onOpenDoc(linkedDoc)}
                          className="p-3 rounded-2xl border border-gray-200/80 hover:border-indigo-300 hover:ring-2 hover:ring-indigo-50 bg-white transition-all flex flex-col gap-1.5 cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-xs font-bold text-gray-800 hover:text-indigo-650 truncate">
                              {linkedDoc.title}
                            </span>
                            <span className="text-[9px] font-mono text-gray-400">
                              {(linkedDoc.size / 1024).toFixed(2)} KB
                            </span>
                          </div>
                          
                          <p className="text-[10px] text-gray-500 font-mono italic leading-normal line-clamp-2">
                            {excerpt}
                          </p>
                          
                          <div className="flex gap-2 items-center mt-1 pt-1.5 border-t border-dashed border-gray-100 select-none">
                            <span className="text-[9px] bg-indigo-50 text-indigo-750 px-1.5 py-0.5 rounded font-semibold capitalize">
                              {linkedDoc.type}
                            </span>
                            <span className="text-[9px] text-gray-400 font-mono ml-auto">
                              Click to navigate
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center gap-2 select-none border border-dashed border-gray-250 bg-white/50 rounded-2xl p-4">
                      <ExternalLink className="h-6 w-6 text-gray-300 stroke-[1.5]" />
                      <div className="flex flex-col px-4">
                        <span className="text-xs font-semibold text-gray-500">No backlinks found</span>
                        <span className="text-[10px] text-gray-400 mt-1">
                          Type <code className="font-mono bg-gray-100 px-1 py-0.5 rounded font-bold">[[</code> in other documents and select this document to link them.
                        </span>
                      </div>
                    </div>
                  )}
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
