import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
  ExternalLink
} from 'lucide-react';
import { Document, Shelf } from '../types';

interface DocumentEditorProps {
  document: Document;
  shelves: Shelf[];
  onSave: (docId: string, updates: Partial<Document>) => void;
  onClose: () => void;
}

export default function DocumentEditor({
  document,
  shelves,
  onSave,
  onClose,
}: DocumentEditorProps) {
  const [title, setTitle] = useState(document.title);
  const [content, setContent] = useState(document.content);
  const [type, setType] = useState(document.type);
  const [category, setCategory] = useState(document.category);
  const [tags, setTags] = useState<string[]>(document.tags);
  const [tagInput, setTagInput] = useState('');
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(true);

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

  const handleSave = () => {
    onSave(document.id, {
      title,
      content,
      type,
      category,
      tags,
      size: new Blob([content]).size,
      updatedAt: new Date().toISOString(),
    });
    setIsSaved(true);
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

  // A ultra-responsive, beautiful custom text & markdown renderer
  const renderMarkdown = (text: string) => {
    if (!text.trim()) return <p className="text-gray-400 italic">No content available. Type in the editor to populate.</p>;

    const lines = text.split('\n');
    let inTable = false;
    let tableHeaders: string[] = [];

    return (
      <div className="prose prose-slate max-w-none text-sm text-gray-700 leading-relaxed font-sans space-y-3">
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          // Code block
          if (trimmed.startsWith('```')) {
            return (
              <pre key={idx} className="bg-gray-900 text-gray-100 font-mono text-[11px] p-4 rounded-xl my-2 overflow-x-auto whitespace-pre">
                <code>{lines.slice(idx + 1, idx + 4).join('\n')}</code>
              </pre>
            );
          }
          if (trimmed.startsWith('TIMESTAMP,') || trimmed.startsWith('{"simulation":')) {
            // Treat as raw format data blocks
            return (
              <span key={idx} className="block bg-gray-50 text-gray-600 font-mono text-[10px] p-3 rounded-lg border border-gray-100 overflow-x-auto whitespace-pre">
                {trimmed}
              </span>
            );
          }

          // Headers
          if (trimmed.startsWith('# ')) {
            return <h1 key={idx} className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-2 pt-4">{trimmed.replace('# ', '')}</h1>;
          }
          if (trimmed.startsWith('## ')) {
            return <h2 key={idx} className="text-lg font-semibold text-gray-800 pt-3">{trimmed.replace('## ', '')}</h2>;
          }
          if (trimmed.startsWith('### ')) {
            return <h3 key={idx} className="text-md font-semibold text-gray-800 pt-2">{trimmed.replace('### ', '')}</h3>;
          }

          // Lists
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-4">
                <span className="text-indigo-500 font-bold mt-1.5">•</span>
                <span>{trimmed.slice(2)}</span>
              </div>
            );
          }
          
          if (/^\d+\.\s/.test(trimmed)) {
            const listNum = trimmed.match(/^\d+\./)?.[0];
            const content = trimmed.replace(/^\d+\.\s/, '');
            return (
              <div key={idx} className="flex items-start gap-2 pl-4">
                <span className="text-indigo-600 font-mono font-medium text-xs mt-1">{listNum}</span>
                <span>{content}</span>
              </div>
            );
          }

          // Tables (Render simply as structured key-value lines if basic)
          if (trimmed.startsWith('|')) {
            const cells = trimmed.split('|').map(c => c.trim()).filter(c => c !== '');
            if (trimmed.includes('---')) return null; // skip dividers
            return (
              <div key={idx} className="grid grid-cols-4 gap-3 bg-gray-50/70 py-1.5 px-3 border border-gray-100 rounded text-xs font-mono">
                {cells.map((cell, cidx) => (
                  <span key={cidx} className={idx === 1 ? "font-bold text-gray-700" : "text-gray-600"}>
                    {cell}
                  </span>
                ))}
              </div>
            );
          }

          // Math mock or blocks
          if (trimmed.startsWith('$$\\text{CoR}')) {
            return (
              <div key={idx} className="bg-indigo-50/50 text-indigo-800 rounded-xl p-4 text-center border border-indigo-100 font-mono text-xs my-2">
                CoR (e) = vf / vi = √ ( h_bounce / h_drop )
              </div>
            );
          }
          if (trimmed.startsWith('$$h_n =')) {
            return (
              <div key={idx} className="bg-emerald-50/50 text-emerald-800 rounded-xl p-3 text-center border border-emerald-100 font-mono text-xs my-1">
                h_n = h_0 * e^(2n)
              </div>
            );
          }
          if (trimmed.startsWith('$$P_{\\text{balance}}')) {
            return (
              <div key={idx} className="bg-violet-50/50 text-violet-800 rounded-xl p-3 text-center border border-violet-100 font-mono text-xs my-1">
                P_balance = Σ |A_i - B_i| = 0
              </div>
            );
          }

          // Normal paragraphs
          if (trimmed === '') return <div key={idx} className="h-2" />;
          return <p key={idx} className="text-gray-600">{trimmed}</p>;
        })}
      </div>
    );
  };

  return (
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
                  <div className="border-t border-gray-100 pt-6">
                    {renderMarkdown(content)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR: Document Meta Parameters */}
          <div className="w-72 bg-gray-50 border-1 border-gray-100 flex flex-col p-5 overflow-y-auto gap-5 shrink-0 hidden lg:flex">
            
            {/* Shelf & Type Category */}
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
            <div className="flex flex-col gap-1.5 border-t border-gray-200/50 pt-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Tag className="h-3 w-3" /> Document Labels
              </span>
              
              {/* Quick Tags List */}
              <div className="flex flex-wrap gap-1 mt-1 max-h-24 overflow-y-auto pb-1">
                {tags.length > 0 ? (
                  tags.map(t => (
                    <span 
                      key={t} 
                      className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-600 text-[10px] pl-2 pr-1 py-0.5 rounded-md hover:bg-red-50 hover:border-red-100 hover:text-red-600 transition-colors cursor-pointer group"
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
            <div className="flex flex-col gap-2.5 border-t border-gray-200/50 pt-4 mt-auto bg-white/50 p-3 rounded-2xl border border-gray-200/40 font-mono">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Info className="h-3 w-3 text-indigo-500" /> Document Metrics
              </span>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 leading-none">
                <div className="flex flex-col bg-white p-1.5 border border-gray-100 rounded-lg">
                  <span className="text-gray-400 mb-1">Words</span>
                  <span className="font-semibold text-gray-750">{wordCount}</span>
                </div>
                <div className="flex flex-col bg-white p-1.5 border border-gray-100 rounded-lg">
                  <span className="text-gray-400 mb-1">Characters</span>
                  <span className="font-semibold text-gray-750">{charCount}</span>
                </div>
                <div className="flex flex-col bg-white p-1.5 border border-gray-100 rounded-lg">
                  <span className="text-gray-400 mb-1">Total Lines</span>
                  <span className="font-semibold text-gray-750">{lineCount}</span>
                </div>
                <div className="flex flex-col bg-white p-1.5 border border-gray-100 rounded-lg">
                  <span className="text-gray-400 mb-1">Reading Time</span>
                  <span className="font-semibold text-gray-750 flex items-center gap-0.5"><Clock className="h-2.5 w-2.5 text-gray-400" /> {readingTime} min</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </motion.div>
  );
}
