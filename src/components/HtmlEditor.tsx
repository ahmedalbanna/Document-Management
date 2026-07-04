import React, { useState, useEffect, useRef } from 'react';
import { 
  Code, 
  Eye, 
  Smartphone, 
  Tablet, 
  Monitor, 
  FileCode, 
  Sparkles, 
  Maximize2, 
  Plus, 
  HelpCircle,
  RefreshCw,
  Sliders,
  Check
} from 'lucide-react';

interface HtmlEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  title: string;
}

const VIEWPORT_PRESETS = [
  { id: 'mobile', name: 'Mobile Port', width: '375px', icon: Smartphone },
  { id: 'tablet', name: 'Tablet Port', width: '768px', icon: Tablet },
  { id: 'desktop', name: 'Desktop Port', width: '100%', icon: Monitor }
];

const SNIPPET_TEMPLATES = [
  {
    name: 'Tailwind Hero Alert',
    code: `<div class="p-6 max-w-sm mx-auto bg-white rounded-2xl shadow-lg flex items-center space-x-4 border border-indigo-50">
  <div class="shrink-0 bg-indigo-500 p-3 rounded-xl text-white">
    🚀
  </div>
  <div>
    <div class="text-sm font-semibold text-gray-900">System Parity Active</div>
    <p class="text-xs text-gray-500">All mechanical clusters are locked at complete equilibrium.</p>
  </div>
</div>`
  },
  {
    name: 'Symmetric Layout Card',
    code: `<div class="max-w-md mx-auto bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl p-6 text-slate-200">
  <div class="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
    <span class="text-[10px] tracking-widest font-bold text-indigo-400 uppercase font-mono">PARITY ENGINE V4</span>
    <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
  </div>
  <h3 class="text-lg font-bold text-white mb-2">Deep Parity Matrix Symmetrical Target</h3>
  <p class="text-xs text-slate-400 leading-relaxed mb-4">
    This responsive card represents the atomic master database syncing primary writes to passive clusters.
  </p>
  <button class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-indigo-900/30">
    Trigger Symmetrical Test
  </button>
</div>`
  },
  {
    name: 'Data Table',
    code: `<div class="overflow-x-auto rounded-xl border border-gray-150 shadow-xs max-w-lg mx-auto bg-white">
  <table class="min-w-full divide-y divide-gray-150">
    <thead class="bg-gray-50">
      <tr>
        <th class="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Metrics ID</th>
        <th class="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
        <th class="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Parity</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-100 text-xs text-gray-600">
      <tr>
        <td class="px-4 py-2.5 font-mono">cluster-node-01</td>
        <td class="px-4 py-2.5"><span class="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-semibold">Active</span></td>
        <td class="px-4 py-2.5 font-semibold">100%</td>
      </tr>
      <tr>
        <td class="px-4 py-2.5 font-mono">cluster-node-02</td>
        <td class="px-4 py-2.5"><span class="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-semibold">Syncing</span></td>
        <td class="px-4 py-2.5 font-semibold">89%</td>
      </tr>
    </tbody>
  </table>
</div>`
  },
  {
    name: 'Modern Button Row',
    code: `<div class="flex flex-wrap gap-2.5 justify-center py-4">
  <button class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all">
    Primary Command
  </button>
  <button class="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold rounded-xl transition-all bg-white">
    Secondary Action
  </button>
</div>`
  }
];

export default function HtmlEditor({ content, onChange, title }: HtmlEditorProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [viewport, setViewport] = useState<string>('desktop');
  const [iframeKey, setIframeKey] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Fill with default HTML structure if blank
    if (!content.trim()) {
      setHtmlContent(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Applet</title>
</head>
<body class="bg-slate-50 p-8">
  <div class="text-center">
    <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Hello, HTML World!</h1>
    <p class="text-slate-500 mb-6">Start building. Tailwind CSS is pre-integrated into this playground.</p>
  </div>
</body>
</html>`);
    } else {
      setHtmlContent(content);
    }
  }, [content]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setHtmlContent(val);
    onChange(val);
  };

  const insertSnippet = (snippetCode: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const before = htmlContent.slice(0, start);
    const after = htmlContent.slice(end);

    const newCode = before + snippetCode + after;
    setHtmlContent(newCode);
    onChange(newCode);

    // Refocus and reposition cursor
    setTimeout(() => {
      textarea.focus();
      const nextPos = start + snippetCode.length;
      textarea.setSelectionRange(nextPos, nextPos);
    }, 50);
  };

  const handleRefreshIframe = () => {
    setIframeKey(k => k + 1);
  };

  // Build the sandboxed iframe target content incorporating Tailwind CSS
  const getIframeSrcDoc = () => {
    // Check if the HTML content already has <head>, if not inject Tailwind play script
    if (htmlContent.includes('<head>')) {
      return htmlContent.replace('<head>', '<head><script src="https://cdn.tailwindcss.com"></script>');
    } else {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `;
    }
  };

  const activePreset = VIEWPORT_PRESETS.find(v => v.id === viewport) || VIEWPORT_PRESETS[2];

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full select-none">
      {/* LEFT: Code Editor Pane */}
      <div className="flex-1 flex flex-col bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-5 overflow-hidden min-h-[300px]">
        {/* Editor Toolbar Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-800 rounded-lg text-indigo-400">
              <Code className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">HTML Source Code</span>
          </div>
          
          <span className="text-[9px] bg-slate-800 text-indigo-400 font-mono px-2 py-0.5 rounded border border-indigo-950">
            TAILWIND PRE-INTEGRATED
          </span>
        </div>

        {/* Text Area Code block */}
        <textarea
          ref={textareaRef}
          value={htmlContent}
          onChange={handleTextareaChange}
          className="flex-grow bg-slate-950 text-slate-200 font-mono text-xs p-4 rounded-2xl border border-slate-800 focus:border-indigo-500 focus:outline-none resize-none leading-relaxed overflow-y-auto"
          placeholder="Type standard HTML syntax here... Pre-equipped with standard Tailwind styling tags."
        />

        {/* Templates Helper Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 shrink-0">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-2 font-mono">Inject UI Snippets</span>
          <div className="flex flex-wrap gap-1.5">
            {SNIPPET_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.name}
                type="button"
                onClick={() => insertSnippet(tmpl.code)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-750 text-[10px] font-bold text-slate-300 rounded-lg cursor-pointer transition-all flex items-center gap-1"
              >
                <Plus className="h-3 w-3 text-indigo-400" />
                {tmpl.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: Live Responsive Sandbox iFrame */}
      <div className="w-full xl:w-[480px] bg-slate-50 border border-slate-200 rounded-3xl p-5 flex flex-col shrink-0">
        
        {/* Nav Toolbar */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-emerald-600 shadow-sm">
              <Eye className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-widest font-mono">Interactive Viewport</span>
          </div>

          <div className="flex gap-1 bg-slate-200/50 p-0.5 rounded-lg border border-slate-200/20">
            {VIEWPORT_PRESETS.map((vp) => {
              const Icon = vp.icon;
              return (
                <button
                  key={vp.id}
                  type="button"
                  onClick={() => setViewport(vp.id)}
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    viewport === vp.id 
                      ? 'bg-white text-slate-800 shadow-xs' 
                      : 'text-slate-400 hover:text-slate-650'
                  }`}
                  title={vp.name}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Frame wrapper */}
        <div className="flex-grow flex items-center justify-center bg-slate-100 rounded-2xl border border-slate-200 p-2 overflow-hidden shadow-inner h-[38vh] xl:h-[45vh]">
          <div 
            className="h-full bg-white rounded-lg border border-slate-200/80 shadow-md transition-all overflow-hidden relative"
            style={{ width: activePreset.width }}
          >
            {/* Address bar simulation */}
            <div className="bg-slate-50 border-b border-slate-150 px-3 py-1 flex items-center justify-between text-[9px] font-mono text-slate-400 shrink-0 select-none">
              <span className="truncate">https://sandbox.equilibrium.node/applet.html</span>
              <button 
                type="button" 
                onClick={handleRefreshIframe}
                className="p-0.5 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                title="Reload Frame"
              >
                <RefreshCw className="h-2.5 w-2.5" />
              </button>
            </div>

            {/* Sandbox Live iFrame */}
            <iframe
              key={iframeKey}
              srcDoc={getIframeSrcDoc()}
              sandbox="allow-scripts"
              className="w-full h-[calc(100%-20px)] border-none bg-white"
              title="HTML Frame Sandbox"
            />
          </div>
        </div>

        {/* Guidelines panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 mt-4 text-[10px] text-slate-500 leading-normal font-sans">
          <span className="font-semibold text-slate-700 block mb-0.5">🔥 Live Viewport Features:</span>
          Tailwind CSS script is dynamically loaded, compiling active classes dynamically as you type. Real-time changes render instantaneously inside the sandbox.
        </div>
      </div>
    </div>
  );
}
