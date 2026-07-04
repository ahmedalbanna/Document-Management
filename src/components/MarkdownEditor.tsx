import React, { useState, useEffect, useRef } from 'react';
import { 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  List, 
  Quote, 
  Code, 
  Sparkles, 
  BookOpen, 
  Eye, 
  ListTodo,
  Columns,
  Calculator,
  Compass,
  FileCode,
  Link,
  Tag
} from 'lucide-react';

interface MarkdownEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  renderMarkdown: (text: string) => React.ReactNode;
  title: string;
}

export default function MarkdownEditor({ content, onChange, renderMarkdown, title }: MarkdownEditorProps) {
  const [mdContent, setMdContent] = useState<string>('');
  const [layout, setLayout] = useState<'split' | 'edit-only' | 'preview-only'>('split');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMdContent(content);
  }, [content]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMdContent(val);
    onChange(val);
  };

  // Helper to wrap selected text in markdown markers
  const insertMarker = (markerBefore: string, markerAfter: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const selectedText = mdContent.slice(start, end);
    const before = mdContent.slice(0, start);
    const after = mdContent.slice(end);

    const replacement = markerBefore + (selectedText || 'text') + markerAfter;
    const newContent = before + replacement + after;

    setMdContent(newContent);
    onChange(newContent);

    // Refocus and select
    setTimeout(() => {
      textarea.focus();
      const newCursorStart = start + markerBefore.length;
      const newCursorEnd = newCursorStart + (selectedText || 'text').length;
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 50);
  };

  // Scan headers to build Table of Contents
  const getTableOfContents = () => {
    const lines = mdContent.split('\n');
    const headersList: { text: string; level: number; lineIdx: number }[] = [];
    
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        headersList.push({ text: trimmed.replace('# ', ''), level: 1, lineIdx: idx });
      } else if (trimmed.startsWith('## ')) {
        headersList.push({ text: trimmed.replace('## ', ''), level: 2, lineIdx: idx });
      } else if (trimmed.startsWith('### ')) {
        headersList.push({ text: trimmed.replace('### ', ''), level: 3, lineIdx: idx });
      }
    });

    return headersList;
  };

  const headers = getTableOfContents();

  // Word & Character count HUD
  const wordCount = mdContent.trim() === '' ? 0 : mdContent.trim().split(/\s+/).length;
  const charCount = mdContent.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="flex flex-col h-full select-none">
      {/* Markdown Rich Formatting Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-150 p-3 rounded-2xl shadow-xs shrink-0 mb-4">
        {/* Formatting actions */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => insertMarker('**', '**')}
            className="p-2 hover:bg-gray-150 text-gray-600 rounded-lg transition-colors cursor-pointer"
            title="Bold (**text**)"
          >
            <Bold className="h-4 w-4" />
          </button>
          
          <button
            type="button"
            onClick={() => insertMarker('*', '*')}
            className="p-2 hover:bg-gray-150 text-gray-600 rounded-lg transition-colors cursor-pointer"
            title="Italic (*text*)"
          >
            <Italic className="h-4 w-4" />
          </button>
          
          <button
            type="button"
            onClick={() => insertMarker('# ', '')}
            className="p-2 hover:bg-gray-150 text-gray-600 rounded-lg transition-colors cursor-pointer"
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => insertMarker('## ', '')}
            className="p-2 hover:bg-gray-150 text-gray-600 rounded-lg transition-colors cursor-pointer"
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-gray-200 mx-1" />

          <button
            type="button"
            onClick={() => insertMarker('- ', '')}
            className="p-2 hover:bg-gray-150 text-gray-600 rounded-lg transition-colors cursor-pointer"
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => insertMarker('> ', '')}
            className="p-2 hover:bg-gray-150 text-gray-600 rounded-lg transition-colors cursor-pointer"
            title="Blockquote"
          >
            <Quote className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => insertMarker('```\n', '\n```')}
            className="p-2 hover:bg-gray-150 text-gray-600 rounded-lg transition-colors cursor-pointer"
            title="Code Block"
          >
            <Code className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-gray-200 mx-1" />

          <button
            type="button"
            onClick={() => insertMarker('[[', ']]')}
            className="p-2 hover:bg-indigo-50 hover:text-indigo-650 text-gray-600 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
            title="Wiki Page Link"
          >
            <Link className="h-3.5 w-3.5 text-indigo-500" /> [[Wiki]]
          </button>

          <button
            type="button"
            onClick={() => insertMarker('$$', '$$')}
            className="p-2 hover:bg-emerald-50 hover:text-emerald-700 text-gray-600 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
            title="LaTeX Mathematics"
          >
            <Calculator className="h-3.5 w-3.5 text-emerald-500" /> $$Math$$
          </button>
        </div>

        {/* Layout toggle tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200/20">
          <button
            type="button"
            onClick={() => setLayout('split')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
              layout === 'split' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <Columns className="h-3.5 w-3.5" /> Split Pane
          </button>
          
          <button
            type="button"
            onClick={() => setLayout('edit-only')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
              layout === 'edit-only' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <FileCode className="h-3.5 w-3.5" /> Edit Only
          </button>

          <button
            type="button"
            onClick={() => setLayout('preview-only')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
              layout === 'preview-only' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <Eye className="h-3.5 w-3.5" /> Preview Only
          </button>
        </div>
      </div>

      {/* Main split working area */}
      <div className="flex-1 flex overflow-hidden split-pane divide-x divide-gray-150 border border-gray-150 rounded-3xl bg-white shadow-sm min-h-[350px]">
        
        {/* 1. Editor Panel */}
        {layout !== 'preview-only' && (
          <div className="flex-1 flex flex-col min-w-0 h-full bg-white relative">
            {/* Outline list in editor side if headers exist */}
            {headers.length > 0 && layout === 'edit-only' && (
              <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center gap-2 overflow-x-auto select-none shrink-0 [scrollbar-width:none]">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Compass className="h-3.5 w-3.5" /> Document Outline:
                </span>
                {headers.map((hdr, hIdx) => (
                  <span 
                    key={hIdx} 
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-md shrink-0 border border-gray-200 cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 transition-colors ${
                      hdr.level === 1 ? 'bg-indigo-50/50 text-indigo-700' : 'bg-white text-gray-500'
                    }`}
                  >
                    {hdr.text}
                  </span>
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={mdContent}
              onChange={handleTextareaChange}
              id="editor-textarea"
              className="flex-grow p-6 resize-none focus:outline-none text-sm text-gray-800 font-mono leading-relaxed placeholder-gray-300 overflow-y-auto"
              placeholder="Start drafting standard markdown templates (# headers, - lists, tables, code blocks)... Type '[[' to link and reference wiki sheets."
            />
          </div>
        )}

        {/* 2. Live Rendering Panel */}
        {layout !== 'edit-only' && (
          <div className="flex-1 bg-gray-50/40 p-6 overflow-y-auto h-full [scrollbar-width:thin]">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] p-6 min-h-full">
              <div className="mb-4 text-[9px] font-extrabold text-indigo-500 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 animate-spin" /> Uncompromised Markdown Preview
              </div>
              <h1 className="text-xl font-black text-gray-900 mb-5">{title}</h1>
              <div className="border-t border-gray-100 pt-5">
                {renderMarkdown(mdContent)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Writing Metrics pill HUD */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-[10px] text-gray-400 font-mono mt-4 flex flex-wrap items-center justify-between select-none">
        <span className="flex items-center gap-1 font-bold">
          <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
          MARKDOWN WRITING STUDIO
        </span>
        <div className="flex items-center gap-4">
          <span>WORDS: <strong className="text-gray-600 font-bold">{wordCount}</strong></span>
          <span>CHARS: <strong className="text-gray-600 font-bold">{charCount}</strong></span>
          <span>EST. READING TIME: <strong className="text-gray-600 font-bold">{readingTime} min</strong></span>
        </div>
      </div>
    </div>
  );
}
