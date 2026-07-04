import React, { useState, useEffect, useRef } from 'react';
import { 
  Type, 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  List, 
  ListOrdered, 
  Printer, 
  Download, 
  Settings, 
  FileText, 
  FileCode, 
  RotateCcw, 
  Sparkles,
  Search,
  Check,
  Undo,
  BookOpen,
  Maximize2
} from 'lucide-react';

interface DocsEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  title: string;
}

interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  align: 'left' | 'center' | 'right' | 'justify';
  fontFamily: string;
  fontSize: string;
}

const DEFAULT_DOCS_CONTENT = `<h1>${new Date().getFullYear()} Symmetrical Launch Strategy</h1>
<p>This report documents the parity specifications and balancing indicators for the upcoming platform iteration. Below are the key milestones and requirements designed to ensure physical elastomer durability.</p>

<h2>1. Core Mechanical Elasticity Metrics</h2>
<p>All active elastomers must achieve a minimum coefficient of restitution (e) of <b>0.85</b> under nominal environmental conditions. Test iterations will utilize a standardized gravity coefficient of <i>9.81 m/s²</i>.</p>

<ul>
  <li>Symmetric platform parity targets</li>
  <li>Multi-axis bounce equilibrium benchmarks</li>
  <li>Hardware load redistribution indexers</li>
</ul>

<h2>2. Balance Table Allocation</h2>
<p>The system is designed to automatically balance raw database payloads across all partition clusters. Load indicators are monitored at 60Hz and dynamically routed using an automatic prefix search matrix.</p>

<blockquote>"Achieving deep parity across hardware and cloud nodes requires continuous structural evaluation and sub-millisecond telemetry sync." - Terminal Architecture Board</blockquote>
`;

export default function DocsEditor({ content, onChange, title }: DocsEditorProps) {
  const [editorHtml, setEditorHtml] = useState<string>('');
  const [margins, setMargins] = useState<'normal' | 'narrow' | 'wide'>('normal');
  const [zoom, setZoom] = useState<number>(100);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [paperColor, setPaperColor] = useState<'white' | 'cream' | 'gray'>('white');
  const [showWordCount, setShowWordCount] = useState<boolean>(true);

  const editorRef = useRef<HTMLDivElement>(null);

  // Formatting state (for UI toolbar highlight)
  const [activeFormat, setActiveFormat] = useState<FormatState>({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    align: 'left',
    fontFamily: 'serif',
    fontSize: '16px'
  });

  // Initialize content
  useEffect(() => {
    if (!content.trim()) {
      setEditorHtml(DEFAULT_DOCS_CONTENT);
    } else {
      setEditorHtml(content);
    }
  }, [content]);

  // Handle WYSIWYG Content edits
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const html = e.currentTarget.innerHTML;
    setEditorHtml(html);
    onChange(html);
  };

  // Safe formatting wrappers utilizing document.execCommand
  const applyStyle = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    // Refresh selection states
    checkSelectionState();
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const checkSelectionState = () => {
    const bold = document.queryCommandState('bold');
    const italic = document.queryCommandState('italic');
    const underline = document.queryCommandState('underline');
    const strike = document.queryCommandState('strikeThrough');
    
    // Check font alignment
    let align: 'left' | 'center' | 'right' | 'justify' = 'left';
    if (document.queryCommandState('justifyCenter')) align = 'center';
    else if (document.queryCommandState('justifyRight')) align = 'right';
    else if (document.queryCommandState('justifyFull')) align = 'justify';

    setActiveFormat({
      bold,
      italic,
      underline,
      strike,
      align,
      fontFamily: activeFormat.fontFamily,
      fontSize: activeFormat.fontSize
    });
  };

  const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const font = e.target.value;
    applyStyle('fontName', font);
    setActiveFormat(prev => ({ ...prev, fontFamily: font }));
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const size = e.target.value;
    applyStyle('fontSize', size); // accepts 1-7 in execCommand
    setActiveFormat(prev => ({ ...prev, fontSize: size }));
  };

  // Auto clean copy pasted formatting to keep it clean
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  // Basic word count calculators
  const getStats = () => {
    const cleanText = editorHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const chars = cleanText.length;
    const words = cleanText ? cleanText.split(' ').length : 0;
    const paras = editorHtml.split(/<\/p>|<\/h[1-6]>/).filter(p => p.trim() !== '').length;
    return { words, chars, paras };
  };

  const stats = getStats();

  // Highlight search matches within paper body
  const handleSearchHighlight = () => {
    if (!searchQuery) return;
    const bodyText = editorRef.current?.innerHTML || '';
    // Strip old highlights
    const stripped = bodyText.replace(/<span class="bg-yellow-250 font-bold">([^<]*)<\/span>/gi, '$1');
    
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const highlighted = stripped.replace(regex, '<span class="bg-yellow-250 font-bold">$1</span>');
    
    if (editorRef.current) {
      editorRef.current.innerHTML = highlighted;
      setEditorHtml(highlighted);
      onChange(highlighted);
    }
  };

  const handleClearHighlights = () => {
    setSearchQuery('');
    if (editorRef.current) {
      const stripped = editorRef.current.innerHTML.replace(/<span class="bg-yellow-250 font-bold">([^<]*)<\/span>/gi, '$1');
      editorRef.current.innerHTML = stripped;
      setEditorHtml(stripped);
      onChange(stripped);
    }
  };

  // Margins styling maps
  const marginStyles = {
    normal: 'p-12 md:p-16',
    narrow: 'p-6 md:p-8',
    wide: 'p-16 md:p-24'
  };

  // Paper background colors styling
  const paperColors = {
    white: 'bg-white text-gray-900 border-gray-200/80 shadow-md',
    cream: 'bg-[#faf6eb] text-amber-950 border-amber-200/50 shadow-md',
    gray: 'bg-gray-50 text-gray-900 border-gray-200 shadow-md'
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full select-none">
      
      {/* LEFT: Complete Document canvas workspace */}
      <div className="flex-grow flex flex-col bg-gray-100 rounded-3xl border border-gray-150 p-4 overflow-hidden relative min-h-[400px]">
        
        {/* WYSIWYG Document Editor Ribbon */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200 p-2.5 mb-4 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-sm">
          
          <div className="flex flex-wrap items-center gap-1">
            {/* Inline Font selector */}
            <select
              value={activeFormat.fontFamily}
              onChange={handleFontFamilyChange}
              className="px-2 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="sans-serif">System Sans</option>
              <option value="serif">Georgia Serif</option>
              <option value="monospace">Mono Space</option>
            </select>

            {/* Font size */}
            <select
              value={activeFormat.fontSize}
              onChange={handleFontSizeChange}
              className="px-2 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="3">Normal (12pt)</option>
              <option value="4">Subtitle (14pt)</option>
              <option value="5">Heading 2 (18pt)</option>
              <option value="6">Heading 1 (24pt)</option>
            </select>

            <div className="h-4 w-px bg-gray-200 mx-1" />

            {/* Inline styling flags */}
            <button
              type="button"
              onClick={() => applyStyle('bold')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${activeFormat.bold ? 'bg-indigo-50 text-indigo-600 font-bold border border-indigo-100' : 'hover:bg-gray-50 text-gray-600'}`}
              title="Bold text"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyStyle('italic')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${activeFormat.italic ? 'bg-indigo-50 text-indigo-600 font-bold border border-indigo-100' : 'hover:bg-gray-50 text-gray-600'}`}
              title="Italic text"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyStyle('underline')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${activeFormat.underline ? 'bg-indigo-50 text-indigo-600 font-bold border border-indigo-100' : 'hover:bg-gray-50 text-gray-600'}`}
              title="Underline text"
            >
              <Underline className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyStyle('strikeThrough')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${activeFormat.strike ? 'bg-indigo-50 text-indigo-600 font-bold border border-indigo-100' : 'hover:bg-gray-50 text-gray-600'}`}
              title="Strikethrough"
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </button>

            <div className="h-4 w-px bg-gray-200 mx-1" />

            {/* Text Alignments */}
            <button
              type="button"
              onClick={() => applyStyle('justifyLeft')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${activeFormat.align === 'left' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'hover:bg-gray-50 text-gray-600'}`}
              title="Align left"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyStyle('justifyCenter')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${activeFormat.align === 'center' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'hover:bg-gray-50 text-gray-600'}`}
              title="Align center"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyStyle('justifyRight')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${activeFormat.align === 'right' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'hover:bg-gray-50 text-gray-600'}`}
              title="Align right"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyStyle('justifyFull')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${activeFormat.align === 'justify' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'hover:bg-gray-50 text-gray-600'}`}
              title="Justify text"
            >
              <AlignJustify className="h-3.5 w-3.5" />
            </button>

            <div className="h-4 w-px bg-gray-200 mx-1" />

            {/* List generators */}
            <button
              type="button"
              onClick={() => applyStyle('insertUnorderedList')}
              className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-600 cursor-pointer"
              title="Bullet list"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyStyle('insertOrderedList')}
              className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-600 cursor-pointer"
              title="Numbered list"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Scale zoom sliders and settings */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setZoom(prev => Math.max(50, prev - 10))}
              className="p-1 hover:bg-gray-550 rounded text-xs text-gray-500 font-bold cursor-pointer"
            >
              A-
            </button>
            <span className="text-[10px] font-mono text-gray-400 font-bold shrink-0">{zoom}%</span>
            <button
              type="button"
              onClick={() => setZoom(prev => Math.min(150, prev + 10))}
              className="p-1 hover:bg-gray-550 rounded text-xs text-gray-500 font-bold cursor-pointer"
            >
              A+
            </button>
          </div>
        </div>

        {/* Physical standard document page canvas */}
        <div className="flex-grow flex justify-center overflow-y-auto p-6 bg-gray-150/70 border border-dashed border-gray-200 rounded-2xl h-[45vh] xl:h-[55vh] [scrollbar-width:thin]">
          <div 
            style={{ 
              transform: `scale(${zoom / 100})`, 
              transformOrigin: 'top center',
              width: '100%',
              maxWidth: '800px',
              height: 'fit-content'
            }}
            className="transition-transform duration-200"
          >
            {/* White Paper Mock Sheet */}
            <div 
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              onPaste={handlePaste}
              onMouseUp={checkSelectionState}
              onKeyUp={checkSelectionState}
              dangerouslySetInnerHTML={{ __html: editorHtml }}
              className={`min-h-[842px] border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-100 text-left relative leading-relaxed whitespace-normal break-words prose max-w-none ${marginStyles[margins]} ${paperColors[paperColor]}`}
              style={{
                fontFamily: activeFormat.fontFamily === 'serif' ? 'Georgia, serif' : activeFormat.fontFamily === 'monospace' ? 'Courier, monospace' : 'Inter, sans-serif'
              }}
            />
          </div>
        </div>

        {/* Real-time word telemetry indicator */}
        {showWordCount && (
          <div className="mt-3 bg-white/70 backdrop-blur border border-gray-200 rounded-xl py-1.5 px-3 text-[10px] text-gray-500 font-mono flex justify-between items-center select-none shrink-0">
            <div className="flex items-center gap-4">
              <span>WORDS: <strong className="text-gray-800">{stats.words}</strong></span>
              <span>CHARACTERS: <strong className="text-gray-800">{stats.chars}</strong></span>
              <span>PARAGRAPHS: <strong className="text-gray-800">{stats.paras}</strong></span>
            </div>
            <div className="flex items-center gap-1 text-indigo-650 bg-indigo-50 border border-indigo-100 px-2 py-0.2 rounded font-bold">
              <BookOpen className="h-3 w-3" />
              <span>READ TIME: {Math.max(1, Math.ceil(stats.words / 225))} MIN</span>
            </div>
          </div>
        )}

      </div>

      {/* RIGHT: Document processing controls and print utility */}
      <div className="w-full xl:w-72 bg-gray-50 border border-gray-150 rounded-2xl p-4.5 flex flex-col justify-between shrink-0 h-full">
        
        {/* Document setup settings */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1">
            <Settings className="h-3.5 w-3.5 text-indigo-550" /> Page Configuration
          </span>

          <div className="flex flex-col gap-3.5 bg-white border border-gray-150 p-3.5 rounded-2xl mt-1">
            
            {/* Paper Margin configuration */}
            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase font-mono block mb-1.5">Page Margins</label>
              <div className="grid grid-cols-3 bg-gray-50 p-0.5 rounded-lg border border-gray-200">
                {(['normal', 'narrow', 'wide'] as const).map(margin => (
                  <button
                    key={margin}
                    type="button"
                    onClick={() => setMargins(margin)}
                    className={`py-1 text-[9px] font-bold rounded uppercase cursor-pointer ${
                      margins === margin 
                        ? 'bg-white text-indigo-650 shadow border border-gray-150 font-extrabold' 
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {margin}
                  </button>
                ))}
              </div>
            </div>

            {/* Paper Shade/Color template */}
            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase font-mono block mb-1.5">Sheet Palette</label>
              <div className="grid grid-cols-3 gap-2">
                {(['white', 'cream', 'gray'] as const).map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setPaperColor(color)}
                    className={`px-2 py-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-gray-300 transition-colors ${
                      paperColor === color 
                        ? 'border-indigo-550 ring-1 ring-indigo-50 bg-indigo-50/10' 
                        : 'border-gray-200'
                    }`}
                  >
                    <span className={`h-4 w-4 rounded-full border border-gray-250 ${
                      color === 'white' ? 'bg-white' : color === 'cream' ? 'bg-[#faf6eb]' : 'bg-gray-100'
                    }`} />
                    <span className="text-[9px] uppercase font-mono font-bold text-gray-500">{color}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Inline Search and highlight */}
            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase font-mono block mb-1.5">Find & Highlight Words</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Find document text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearchHighlight();
                  }}
                  className="w-full bg-gray-50 pl-7 pr-7 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:bg-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearHighlights}
                    className="absolute right-2 top-2 text-[10px] font-bold text-gray-400 hover:text-red-500 cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Administrative commands */}
        <div className="mt-4 flex flex-col gap-2">
          {/* Mock formatting help */}
          <button
            type="button"
            onClick={() => {
              setEditorHtml(prev => prev + `<h3>3. Symmetrical Synthesis Balance</h3>\n<p>Telemetry nodes generated a parity score of <b>98.4%</b> during standard offline evaluation sweeps.</p>`);
              if (editorRef.current) {
                onChange(editorRef.current.innerHTML + `<h3>3. Symmetrical Synthesis Balance</h3>\n<p>Telemetry nodes generated a parity score of <b>98.4%</b> during standard offline evaluation sweeps.</p>`);
              }
            }}
            className="w-full bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 font-bold text-xs py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Inject Parity Milestone
          </button>

          <button
            type="button"
            onClick={() => {
              // Print doc layout simulation
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>${title}</title>
                      <style>
                        body { font-family: 'Georgia', serif; padding: 40px; line-height: 1.6; color: #111; }
                        h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
                        blockquote { font-style: italic; color: #555; border-left: 4px solid #ccc; padding-left: 15px; margin-left: 0; }
                      </style>
                    </head>
                    <body>
                      ${editorHtml}
                    </body>
                  </html>
                `);
                printWindow.document.close();
                printWindow.print();
              }
            }}
            className="w-full bg-gray-900 hover:bg-gray-850 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:-translate-y-0.5"
          >
            <Printer className="h-3.5 w-3.5" /> Print Layout Sheet
          </button>
        </div>

      </div>
    </div>
  );
}
