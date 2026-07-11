import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Workflow, 
  Database, 
  ChevronRight, 
  Code, 
  Play, 
  Copy, 
  Check, 
  FolderPlus, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Lock,
  ArrowRight,
  Info
} from 'lucide-react';
import { Shelf, Document, DocumentType } from '../types';

interface DiagramGeneratorProps {
  documents: Document[];
  shelves: Shelf[];
  onSaveDoc: (docId: string, updates: Partial<Document>, changeSummary?: string) => void;
  onAddDocToShelf: (shelfId: string) => void;
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  logAction: (title: string, action: 'create' | 'edit' | 'delete' | 'upload' | 'download' | 'share' | 'favorite' | 'restore', id?: string) => void;
  currentUserEmail: string;
}

interface DiagramResult {
  explanation: string;
  rawCode: string;
  visualData: {
    nodes?: Array<{ id: string; label: string; type: 'start' | 'process' | 'decision' | 'end' | 'actor' }>;
    links?: Array<{ source: string; target: string; label?: string }>;
    tables?: Array<{
      name: string;
      columns: Array<{
        name: string;
        type: string;
        isPrimaryKey: boolean;
        isForeignKey: boolean;
        referencesTable?: string;
      }>;
    }>;
  };
}

export default function DiagramGenerator({
  documents,
  shelves,
  setDocuments,
  logAction,
  currentUserEmail
}: DiagramGeneratorProps) {
  const [description, setDescription] = useState('');
  const [diagramType, setDiagramType] = useState<'flowchart' | 'sql'>('flowchart');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<DiagramResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [copied, setCopied] = useState(false);
  const [savedDocId, setSavedDocId] = useState<string | null>(null);
  const [selectedShelfId, setSelectedShelfId] = useState('');

  // Canvas zoom/pan controls
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const presets = [
    {
      label: 'User 2FA Auth Flow',
      type: 'flowchart' as const,
      text: 'A user login flowchart with credentials input, password checking, 2FA prompt if enabled, OTP verification, and final successful dashboard session redirect.'
    },
    {
      label: 'E-Commerce Schema',
      type: 'sql' as const,
      text: 'Relational database schema for an online shop. It needs a users table, orders table, products table with inventory tracking, and an order_items junction table.'
    },
    {
      label: 'File Ingestion Pipeline',
      type: 'flowchart' as const,
      text: 'A file upload sequence showing client upload, conflict check, 3-way merge resolver if collision is found, local SQLite and Cloud Run backup sync, and a success notification.'
    }
  ];

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setGenerating(true);
    setError(null);
    setSavedDocId(null);

    try {
      const response = await fetch('/api/gemini/generate-diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, diagramType })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to generate diagram');
      }

      const data = await response.json();
      setResult(data);
      // Automatically pre-select first shelf if none selected
      if (shelves.length > 0 && !selectedShelfId) {
        setSelectedShelfId(shelves[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during generation.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.rawCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToWorkspace = () => {
    if (!result || !selectedShelfId) return;

    const targetShelf = shelves.find(s => s.id === selectedShelfId);
    const docId = `doc-diagram-${Date.now()}`;
    const cleanTitle = `AI Diagram: ${description.substring(0, 24).trim()}...`;
    
    const formattedContent = `# ${cleanTitle}
    
## Architectural Summary
${result.explanation}

## Generated Diagram Code (${diagramType.toUpperCase()})
\`\`\`${diagramType === 'sql' ? 'sql' : 'mermaid'}
${result.rawCode}
\`\`\`

---
*Created dynamically using AI Auto-Diagramming Engine.*`;

    const newDoc: Document = {
      id: docId,
      title: cleanTitle,
      content: formattedContent,
      type: diagramType === 'sql' ? 'code' : 'markdown',
      size: new Blob([formattedContent]).size,
      category: selectedShelfId,
      tags: ['AI-Generated', 'Diagram', diagramType.toUpperCase()],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: false,
      isArchived: false,
      customPreviewColor: targetShelf?.color === 'emerald' ? '#10b981' : targetShelf?.color === 'teal' ? '#14b5a6' : targetShelf?.color === 'violet' ? '#8b5cf6' : '#3b82f6',
    };

    setDocuments(prev => [...prev, newDoc]);
    logAction(cleanTitle, 'create', docId);
    setSavedDocId(docId);
  };

  // Canvas Mouse events for pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetCanvas = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Pre-calculate visual placements for flowchart nodes
  // Let's lay them out sequentially in a structured vertical/horizontal flow grid
  const renderFlowchart = () => {
    if (!result?.visualData?.nodes) return null;
    const nodes = result.visualData.nodes;
    const links = result.visualData.links || [];

    // Layout configuration
    const nodeWidth = 140;
    const nodeHeight = 60;
    const horizontalSpacing = 220;
    const verticalSpacing = 110;

    // Arrange nodes in a tree/sequential layout
    // Assign columns & rows to nodes dynamically to create a clean auto-layout
    const nodeLayouts: Record<string, { x: number; y: number }> = {};
    const columnCount: Record<number, number> = {};

    nodes.forEach((node, index) => {
      // Basic heuristic: flowchart goes mostly down, branching on decisions
      const row = Math.floor(index / 2);
      const col = index % 2;

      columnCount[row] = (columnCount[row] || 0) + 1;
      
      // Center the node row
      const x = 300 + (col - 0.5) * horizontalSpacing;
      const y = 80 + row * verticalSpacing;

      nodeLayouts[node.id] = { x, y };
    });

    return (
      <svg className="w-full h-full select-none">
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#4f46e5" />
          </marker>
        </defs>

        {/* Links / Edges */}
        {links.map((link, idx) => {
          const from = nodeLayouts[link.source];
          const to = nodeLayouts[link.target];
          if (!from || !to) return null;

          // Draw bezier paths between nodes
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const controlY = from.y + dy / 2;
          
          const pathD = `M ${from.x + nodeWidth/2} ${from.y + nodeHeight} 
                         C ${from.x + nodeWidth/2} ${controlY}, 
                           ${to.x + nodeWidth/2} ${controlY}, 
                           ${to.x + nodeWidth/2} ${to.y}`;

          return (
            <g key={`edge-${idx}`}>
              <path
                d={pathD}
                fill="none"
                stroke="#818cf8"
                strokeWidth="2"
                strokeDasharray={link.label ? "4 4" : "none"}
                markerEnd="url(#arrow)"
                className="transition-all duration-300"
              />
              {link.label && (
                <foreignObject
                  x={(from.x + to.x) / 2 + 10}
                  y={(from.y + to.y) / 2 - 10}
                  width="120"
                  height="24"
                >
                  <div className="bg-white/90 border border-indigo-100 rounded px-1.5 py-0.5 text-[9px] font-mono text-indigo-700 font-semibold w-max shadow-2xs truncate">
                    {link.label}
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const coords = nodeLayouts[node.id];
          if (!coords) return null;

          let colorClass = "bg-indigo-50 border-indigo-200 text-indigo-900";
          let shapeClass = "rounded-lg";

          if (node.type === 'start') {
            colorClass = "bg-emerald-50 border-emerald-300 text-emerald-900";
            shapeClass = "rounded-full";
          } else if (node.type === 'end') {
            colorClass = "bg-rose-50 border-rose-300 text-rose-900";
            shapeClass = "rounded-full";
          } else if (node.type === 'decision') {
            colorClass = "bg-amber-50 border-amber-300 text-amber-900";
            shapeClass = "rounded-xl transform rotate-0"; // Diamond representation inside box
          } else if (node.type === 'actor') {
            colorClass = "bg-violet-50 border-violet-300 text-violet-900";
            shapeClass = "rounded-md";
          }

          return (
            <foreignObject
              key={node.id}
              x={coords.x}
              y={coords.y}
              width={nodeWidth}
              height={nodeHeight}
              className="overflow-visible"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className={`w-full h-full border-2 ${colorClass} ${shapeClass} p-2 flex flex-col items-center justify-center text-center shadow-md bg-white select-none relative`}
              >
                {node.type === 'decision' && (
                  <div className="absolute inset-0 border border-amber-400/40 transform rotate-45 pointer-events-none scale-90 rounded-md" />
                )}
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 font-mono scale-90 mb-0.5">
                  {node.type}
                </span>
                <p className="text-[11px] font-semibold tracking-tight leading-snug line-clamp-2 px-1">
                  {node.label}
                </p>
              </motion.div>
            </foreignObject>
          );
        })}
      </svg>
    );
  };

  // Render ER diagram for databases
  const renderERDiagram = () => {
    if (!result?.visualData?.tables) return null;
    const tables = result.visualData.tables;

    // Compute layout for tables
    const tableWidth = 200;
    const tableSpacingX = 260;
    const tableSpacingY = 220;

    const tableLayouts: Record<string, { x: number; y: number }> = {};

    tables.forEach((table, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      tableLayouts[table.name] = {
        x: 100 + col * tableSpacingX,
        y: 80 + row * tableSpacingY
      };
    });

    return (
      <svg className="w-full h-full select-none">
        <defs>
          <marker
            id="crowfoot"
            viewBox="0 0 10 10"
            refX="1"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M 10 0 L 0 5 L 10 10 M 0 5 L 10 5" fill="none" stroke="#6366f1" strokeWidth="2" />
          </marker>
        </defs>

        {/* Relational pipelines (foreign keys) */}
        {tables.map((table) => {
          return table.columns.map((col, cIdx) => {
            if (col.isForeignKey && col.referencesTable) {
              const fromPos = tableLayouts[table.name];
              const toPos = tableLayouts[col.referencesTable];
              if (fromPos && toPos) {
                // Calculate anchor points
                const x1 = fromPos.x + tableWidth / 2;
                const y1 = fromPos.y + 40; // Approx middle of table
                const x2 = toPos.x + tableWidth / 2;
                const y2 = toPos.y + 40;

                const dx = x2 - x1;
                const dy = y2 - y1;
                const pathD = `M ${x1} ${y1} C ${x1 + dx/3} ${y1}, ${x1 + 2*dx/3} ${y2}, ${x2} ${y2}`;

                return (
                  <g key={`fk-${table.name}-${col.name}`}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#818cf8"
                      strokeWidth="2"
                      markerEnd="url(#crowfoot)"
                      className="transition-all duration-300 stroke-[1.5]"
                    />
                    <foreignObject x={(x1+x2)/2 - 30} y={(y1+y2)/2 - 10} width="80" height="20">
                      <span className="bg-indigo-100 text-indigo-800 text-[8px] font-mono font-bold px-1 py-0.5 rounded shadow-2xs">
                        FK REF
                      </span>
                    </foreignObject>
                  </g>
                );
              }
            }
            return null;
          });
        })}

        {/* Database relational cards */}
        {tables.map((table) => {
          const coords = tableLayouts[table.name];
          if (!coords) return null;

          return (
            <foreignObject
              key={table.name}
              x={coords.x}
              y={coords.y}
              width={tableWidth}
              height={200}
              className="overflow-visible"
            >
              <div className="w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden flex flex-col font-sans text-xs">
                {/* Header card with cylinder */}
                <div className="bg-indigo-650 text-white px-3 py-1.8 flex items-center justify-between font-semibold tracking-tight">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Database className="h-3.5 w-3.5" />
                    {table.name}
                  </span>
                  <span className="text-[8px] font-mono bg-white/20 px-1 py-0.2 rounded uppercase">
                    Table
                  </span>
                </div>

                {/* Columns row listings */}
                <div className="divide-y divide-gray-100 max-h-[160px] overflow-y-auto bg-gray-50/20">
                  {table.columns.map((col, idx) => (
                    <div 
                      key={idx} 
                      className={`px-3 py-1.5 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                        col.isPrimaryKey ? 'bg-amber-50/30' : col.isForeignKey ? 'bg-indigo-50/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1 truncate max-w-[120px]">
                        {col.isPrimaryKey ? (
                          <span className="text-amber-500 font-bold scale-90" title="Primary Key">🔑</span>
                        ) : col.isForeignKey ? (
                          <span className="text-indigo-400 font-semibold" title="Foreign Key">🔗</span>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                        )}
                        <span className={`font-mono text-[10px] truncate ${col.isPrimaryKey ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                          {col.name}
                        </span>
                      </div>
                      <span className="font-mono text-[9px] text-gray-400 font-medium tracking-wide">
                        {col.type.toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </foreignObject>
          );
        })}
      </svg>
    );
  };

  return (
    <div id="ai-diagram-generator-panel" className="flex-1 flex flex-col gap-6 font-sans">
      
      {/* Intro prompt presets and input form row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 shrink-0">
        
        {/* Left column - console controls */}
        <div className="xl:col-span-5 bg-white border border-gray-150 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Workflow className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-950 flex items-center gap-1.5">
                AI Diagram Engine <Sparkles className="h-3.5 w-3.5 text-indigo-500 fill-current" />
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Define your structure or architecture and let Gemini build the diagrams instantly</p>
            </div>
          </div>

          {/* Quick Preset trigger chips */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-0.5">Preset Architectures</span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDescription(preset.text);
                    setDiagramType(preset.type);
                  }}
                  className="bg-gray-50 hover:bg-indigo-50/40 border border-gray-150 hover:border-indigo-200 text-gray-600 hover:text-indigo-700 text-[10px] font-medium px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                >
                  {preset.type === 'sql' ? <Database className="h-2.5 w-2.5" /> : <Workflow className="h-2.5 w-2.5" />}
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Form */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-0.5">System Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the database tables, sequential user flow, or server architecture..."
              className="w-full h-24 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors shadow-inner resize-none text-gray-850"
            />
          </div>

          {/* Toggle Type Selector */}
          <div className="grid grid-cols-2 gap-2 bg-gray-50 border border-gray-200 p-1 rounded-xl">
            <button
              onClick={() => setDiagramType('flowchart')}
              className={`py-1.8 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                diagramType === 'flowchart'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Workflow className="h-3.5 w-3.5" /> Flowchart & Mermaid
            </button>
            <button
              onClick={() => setDiagramType('sql')}
              className={`py-1.8 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                diagramType === 'sql'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Database className="h-3.5 w-3.5" /> SQL Relational Schema
            </button>
          </div>

          {/* Action Trigger */}
          <button
            onClick={handleGenerate}
            disabled={generating || !description.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl py-2.5 text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            {generating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Compiling Architectures...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" /> Generate Diagram
              </>
            )}
          </button>

          {/* Error displays */}
          {error && (
            <div className="border border-red-150 bg-red-50 text-red-700 rounded-xl p-3 text-xs leading-relaxed">
              <strong>Generation failed:</strong> {error}
            </div>
          )}
        </div>

        {/* Architectural summary and save panel */}
        <div className="xl:col-span-7 bg-white border border-gray-150 rounded-2xl p-6 shadow-xs flex flex-col justify-between min-h-[300px]">
          {result ? (
            <div className="flex flex-col gap-4 h-full">
              <div className="flex items-center gap-1.5">
                <Info className="h-4 w-4 text-indigo-600 shrink-0" />
                <h4 className="text-xs font-bold text-gray-950 uppercase tracking-wide">Architectural Explanations</h4>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed max-h-[140px] overflow-y-auto pr-1">
                {result.explanation}
              </p>

              <div className="border-t border-gray-100 pt-4 mt-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Target Shelf Category</span>
                  <div className="relative">
                    <select
                      value={selectedShelfId}
                      onChange={(e) => setSelectedShelfId(e.target.value)}
                      className="text-xs bg-gray-50 border border-gray-200 text-gray-750 px-3 py-1.8 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-semibold"
                    >
                      {shelves.map(shelf => (
                        <option key={shelf.id} value={shelf.id}>
                          {shelf.name} ({shelf.color})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1 sm:text-right">
                  <button
                    onClick={handleSaveToWorkspace}
                    disabled={savedDocId !== null}
                    className="bg-indigo-50 border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-100/50 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.8 cursor-pointer disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 transition-all"
                  >
                    <FolderPlus className="h-4 w-4" /> 
                    {savedDocId ? "Saved successfully!" : "Save as Shelf Document"}
                  </button>
                  {savedDocId && (
                    <span className="text-[10px] text-emerald-600 font-semibold animate-pulse mt-1">
                      ✓ Saved! File is active on your categorical tracks.
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12 gap-3 h-full">
              <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                <Sparkles className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-gray-950">Diagram Awaiting Specifications</h4>
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                Describe your data schema or flow, pick your format on the left, and watch Gemini generate clean, interactive structural diagram representations.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Diagramming canvas and code space */}
      <div className="flex-1 bg-white border border-gray-150 rounded-2xl overflow-hidden flex flex-col shadow-xs min-h-[500px]">
        
        {/* Canvas Header */}
        <div className="bg-gray-50 border-b border-gray-150 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-gray-950 uppercase tracking-wide flex items-center gap-1.5">
              <Workflow className="h-4 w-4 text-indigo-650" />
              Interactive Layout Stage
            </span>

            {result && (
              <div className="flex items-center gap-1 bg-gray-200/50 p-0.5 rounded-lg border border-gray-200">
                <button
                  onClick={() => setActiveTab('visual')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    activeTab === 'visual'
                      ? 'bg-white text-indigo-700 shadow-3xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Visual Canvas
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    activeTab === 'code'
                      ? 'bg-white text-indigo-700 shadow-3xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Raw Code Block
                </button>
              </div>
            )}
          </div>

          {result && activeTab === 'visual' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))}
                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}
                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={resetCanvas}
                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                title="Reset Camera"
              >
                <Maximize2 className="h-3.8 w-3.8" />
              </button>
              <div className="h-4 w-[1px] bg-gray-200 mx-1" />
              <div className="text-[9px] font-mono font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                VCS-DIAGRAMS @ {(zoom * 100).toFixed(0)}%
              </div>
            </div>
          )}

          {result && activeTab === 'code' && (
            <button
              onClick={handleCopyCode}
              className="bg-gray-100 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 text-gray-600 hover:text-indigo-700 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all flex items-center gap-1"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied!" : "Copy Code"}
            </button>
          )}
        </div>

        {/* Canvas Body */}
        <div className="flex-1 relative overflow-hidden bg-slate-50/50">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 gap-2 bg-slate-50/40 select-none"
              >
                <div className="text-gray-300">
                  <Workflow className="h-10 w-10 animate-pulse stroke-[1.5]" />
                </div>
                <span className="text-[11px] font-semibold text-gray-400 font-mono tracking-wider">AWAITING SYSTEM DATA MODEL</span>
              </motion.div>
            ) : activeTab === 'code' ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 overflow-auto p-6 font-mono text-xs text-gray-800 bg-slate-900"
              >
                <pre className="text-emerald-400 whitespace-pre leading-relaxed select-all">
                  {result.rawCode}
                </pre>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 cursor-grab active:cursor-grabbing bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Dotted indicator/status bar */}
                <div className="absolute top-4 left-4 z-10 bg-white/80 border border-gray-150 rounded-lg px-2.5 py-1.5 text-[9px] text-gray-500 flex items-center gap-1.5 shadow-2xs font-mono select-none">
                  <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
                  DRAG CANVAS TO PAN | SCROLL OR CLICK CONTROLS TO ZOOM
                </div>

                <div 
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: '0 0',
                    transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                    width: '100%',
                    height: '100%'
                  }}
                  className="absolute inset-0"
                >
                  {diagramType === 'flowchart' ? renderFlowchart() : renderERDiagram()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
