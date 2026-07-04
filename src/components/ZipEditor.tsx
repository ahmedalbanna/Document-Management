import React, { useState, useEffect } from 'react';
import { 
  File, 
  Trash2, 
  Plus, 
  Download, 
  FolderPlus, 
  FileText, 
  FileJson, 
  Layers, 
  Code as CodeIcon,
  Info,
  Archive,
  ArrowRight,
  TrendingDown
} from 'lucide-react';

interface ZipEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  title: string;
}

interface ZipEntry {
  path: string;
  type: 'file' | 'dir';
  size: number; // in bytes
  ratio: number; // compression ratio like 0.75
  content: string;
}

const DEFAULT_ZIP_ENTRIES: ZipEntry[] = [
  { path: "index.html", type: "file", size: 4560, ratio: 0.32, content: "<!-- Landing page structure -->\n<html><body><h1>App Launch</h1></body></html>" },
  { path: "package.json", type: "file", size: 1200, ratio: 0.45, content: "{\n  \"name\": \"parity-parity\",\n  \"version\": \"1.0.0\"\n}" },
  { path: "src/main.ts", type: "file", size: 850, ratio: 0.50, content: "console.log('App initialization');" },
  { path: "src/elastomer_engine.ts", type: "file", size: 12400, ratio: 0.28, content: "// Elastomer analysis suite\nexport function calcElasticity() {}" },
  { path: "assets/diagram.png", type: "file", size: 85200, ratio: 0.95, content: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" },
  { path: "docs/architecture.md", type: "file", size: 18200, ratio: 0.35, content: "# Symmetrical Parity Architecture\nDetailed hardware specifications." }
];

export default function ZipEditor({ content, onChange, title }: ZipEditorProps) {
  const [entries, setEntries] = useState<ZipEntry[]>([]);
  const [newFilePath, setNewFilePath] = useState<string>('');
  const [newFileContent, setNewFileContent] = useState<string>('');
  const [selectedEntry, setSelectedEntry] = useState<ZipEntry | null>(null);

  // Initialize ZIP state from content or defaults
  useEffect(() => {
    try {
      if (content.startsWith('[') || content.startsWith('{')) {
        const parsed = JSON.parse(content);
        const list = Array.isArray(parsed) ? parsed : (parsed.entries || []);
        if (list.length > 0) {
          setEntries(list);
          setSelectedEntry(list[0]);
          return;
        }
      }
    } catch (e) {
      // Parse failed, use defaults
    }
    setEntries(DEFAULT_ZIP_ENTRIES);
    setSelectedEntry(DEFAULT_ZIP_ENTRIES[0]);
  }, [content]);

  const saveZipState = (updatedEntries = entries) => {
    setEntries(updatedEntries);
    onChange(JSON.stringify(updatedEntries, null, 2));
  };

  const handleAddFile = () => {
    if (!newFilePath.trim()) return;
    
    const formattedPath = newFilePath.trim().replace(/^\/+/, ''); // clean leading slashes
    const size = newFileContent.length || Math.floor(Math.random() * 8000) + 200;
    const ratio = parseFloat((0.25 + Math.random() * 0.6).toFixed(2)); // Random logical ratio

    const newEntry: ZipEntry = {
      path: formattedPath,
      type: 'file',
      size,
      ratio,
      content: newFileContent || `// Virtual file content: ${formattedPath}`
    };

    const updated = [...entries.filter(e => e.path !== formattedPath), newEntry];
    saveZipState(updated);
    setNewFilePath('');
    setNewFileContent('');
    setSelectedEntry(newEntry);
  };

  const handleDeleteEntry = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = entries.filter(item => item.path !== path);
    saveZipState(updated);
    if (selectedEntry?.path === path) {
      setSelectedEntry(updated[0] || null);
    }
  };

  const getIconForPath = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'json': return <FileJson className="h-4 w-4 text-amber-500" />;
      case 'html': return <FileText className="h-4 w-4 text-sky-500" />;
      case 'png': 
      case 'jpg': return <Layers className="h-4 w-4 text-purple-500" />;
      case 'ts': 
      case 'js': 
      case 'rs': return <CodeIcon className="h-4 w-4 text-indigo-500" />;
      default: return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  // Stats Calculations
  const rawTotalSize = entries.reduce((acc, curr) => acc + curr.size, 0);
  const compressedTotalSize = entries.reduce((acc, curr) => acc + Math.round(curr.size * curr.ratio), 0);
  const averageRatio = entries.length ? (compressedTotalSize / rawTotalSize) : 0;
  const savedBytes = rawTotalSize - compressedTotalSize;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Individual entry downloader
  const handleDownloadEntry = (entry: ZipEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = new Blob([entry.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = entry.path.split('/').pop() || 'unnamed';
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Package bundle downloader
  const handleDownloadFullZip = () => {
    // Pack manifest index
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}_repackaged.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full select-none">
      
      {/* LEFT: Compressed Archive Explorer */}
      <div className="flex-grow bg-white rounded-3xl border border-gray-150 p-5 flex flex-col justify-between shadow-sm min-h-[350px]">
        
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
              <Archive className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">ZIP ARCHIVE EXPLORER</span>
          </div>

          {/* Quick global packaging */}
          <button
            type="button"
            onClick={handleDownloadFullZip}
            className="px-3 py-1 bg-gray-900 hover:bg-gray-850 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Download className="h-3 w-3" /> Repackage Archive
          </button>
        </div>

        {/* Tree List vs Selected Entry Detail */}
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 h-[35vh] xl:h-[45vh] overflow-hidden">
          {/* File Entries Panel */}
          <div className="border border-gray-150 rounded-2xl p-3 bg-gray-50/50 flex flex-col gap-1.5 overflow-y-auto [scrollbar-width:thin]">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider px-1 block mb-1">ARCHIVE PATHS</span>
            {entries.map((item) => (
              <div
                key={item.path}
                onClick={() => setSelectedEntry(item)}
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  selectedEntry?.path === item.path
                    ? 'bg-white border-indigo-200 shadow-sm text-indigo-950 font-semibold'
                    : 'bg-transparent border-transparent text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {getIconForPath(item.path)}
                  <span className="text-xs font-mono truncate text-left">{item.path}</span>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] font-mono text-gray-400 bg-gray-100/80 px-1.5 py-0.5 rounded border border-gray-150">
                    {Math.round((1 - item.ratio) * 100)}% comp.
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleDownloadEntry(item, e)}
                    className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                    title="Extract file"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteEntry(item.path, e)}
                    className="p-1 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Erase from zip"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Active File Preview / Editor Content */}
          <div className="border border-gray-150 rounded-2xl p-4 bg-white flex flex-col justify-between overflow-hidden relative">
            {selectedEntry ? (
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                    <span className="text-xs font-bold font-mono text-indigo-950 truncate max-w-[70%]">
                      {selectedEntry.path}
                    </span>
                    <span className="text-[9px] font-mono text-gray-400">
                      RAW SIZE: {formatBytes(selectedEntry.size)}
                    </span>
                  </div>
                  
                  {/* File Mock render content body */}
                  <div className="bg-gray-50 border border-gray-150 rounded-xl p-3 font-mono text-[10px] text-gray-700 h-[180px] overflow-y-auto whitespace-pre-wrap [scrollbar-width:thin] text-left">
                    {selectedEntry.content}
                  </div>
                </div>

                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-2.5 mt-2 flex items-center justify-between text-[10px] text-indigo-850 font-mono">
                  <span className="flex items-center gap-1 font-bold">
                    <Info className="h-3.5 w-3.5 text-indigo-550" /> Compression Analysis
                  </span>
                  <span>Comp Ratio: {Math.round(selectedEntry.ratio * 100)}%</span>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-400 gap-1.5 py-8">
                <Archive className="h-8 w-8 text-gray-300" />
                <span className="text-xs italic">No entry selected inside archive</span>
              </div>
            )}
          </div>
        </div>

        {/* Compression Statistics pill banner */}
        <div className="mt-3.5 border border-gray-100 bg-gray-50/70 rounded-xl p-2.5 flex flex-wrap justify-between items-center text-[10px] text-gray-500 font-mono select-none shrink-0">
          <div className="flex items-center gap-4">
            <span>PACKED FILES: <strong className="text-gray-800">{entries.length}</strong></span>
            <span>RAW CAPACITY: <strong className="text-gray-800">{formatBytes(rawTotalSize)}</strong></span>
            <span>ZIP ARCHIVE: <strong className="text-gray-800">{formatBytes(compressedTotalSize)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-50 border border-emerald-100/80 px-2 py-0.5 rounded">
            <TrendingDown className="h-3 w-3" />
            <span>AVG RATIO: {Math.round(averageRatio * 100)}% (Saved {formatBytes(savedBytes)})</span>
          </div>
        </div>

      </div>

      {/* RIGHT: Add File injection workstation */}
      <div className="w-full xl:w-72 bg-gray-50 border border-gray-150 rounded-2xl p-4.5 flex flex-col justify-between shrink-0 h-full">
        
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1">
            <FolderPlus className="h-3.5 w-3.5 text-indigo-550" /> Inject File to ZIP
          </span>

          <div className="flex flex-col gap-2.5 mt-1.5">
            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase font-mono block mb-1">Archive Relative Path</label>
              <input
                type="text"
                placeholder="e.g. docs/manual.txt"
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-550 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase font-mono block mb-1">Payload Content</label>
              <textarea
                placeholder="Insert code or plain content..."
                value={newFileContent}
                onChange={(e) => setNewFileContent(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-550 focus:outline-none font-mono h-28 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleAddFile}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm hover:shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:-translate-y-0.5"
          >
            <Plus className="h-3.5 w-3.5" /> Package and Inject
          </button>
        </div>

      </div>
    </div>
  );
}
