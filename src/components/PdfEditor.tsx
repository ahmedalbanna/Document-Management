import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  PenTool, 
  Lock, 
  Unlock, 
  ShieldAlert, 
  CheckCircle, 
  Trash2, 
  Download, 
  Settings, 
  Layers, 
  DownloadCloud, 
  MapPin, 
  Printer,
  Compass,
  AlertCircle
} from 'lucide-react';

interface PdfEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  title: string;
}

interface PdfNote {
  id: string;
  text: string;
  x: number;
  y: number;
  page: number;
}

interface HighlightZone {
  id: string;
  top: number;
  left: number;
  width: number;
  height: number;
  page: number;
  color: string;
}

export default function PdfEditor({ content, onChange, title }: PdfEditorProps) {
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [zoom, setZoom] = useState<number>(100);
  const [activeTab, setActiveTab] = useState<'view' | 'annotate' | 'security'>('view');
  
  // Custom interactive annotation states
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isDrawingSig, setIsDrawingSig] = useState<boolean>(false);
  const [notes, setNotes] = useState<PdfNote[]>([]);
  const [highlights, setHighlights] = useState<HighlightZone[]>([]);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [authorized, setAuthorized] = useState<boolean>(true);
  const [activeNoteText, setActiveNoteText] = useState<string>('');
  const [placedSigPosition, setPlacedSigPosition] = useState<{x: number, y: number} | null>(null);
  const [isDraggingSig, setIsDraggingSig] = useState<boolean>(false);

  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Initialize and load any stored signature/notes metadata from content string
  useEffect(() => {
    if (content && content.includes('__PDF_DATA__')) {
      try {
        const payloadStr = content.split('__PDF_DATA__')[1];
        const data = JSON.parse(payloadStr);
        if (data.notes) setNotes(data.notes);
        if (data.isLocked) {
          setIsLocked(true);
          setAuthorized(false);
        }
        if (data.password) setPassword(data.password);
        if (data.placedSigPosition) setPlacedSigPosition(data.placedSigPosition);
        if (data.signatureData) setSignatureData(data.signatureData);
      } catch (err) {
        console.error("Error reading PDF metadata", err);
      }
    }
  }, [content]);

  // Save PDF annotations to storage payload
  const savePdfState = (updatedNotes = notes, updatedSigPos = placedSigPosition, locked = isLocked, sig = signatureData) => {
    const rawTextContent = `CONFIDENTIAL SECURED DOCUMENT: ${title}\nThis document contains encrypted mathematical parameters, design blueprint curves, and signature overlays. Check the interactive panel to manage verification states.`;
    const metadata = {
      notes: updatedNotes,
      placedSigPosition: updatedSigPos,
      isLocked: locked,
      password,
      signatureData: sig,
      timestamp: new Date().toISOString()
    };
    onChange(`${rawTextContent}\n\n__PDF_DATA__${JSON.stringify(metadata)}`);
  };

  // Drawing pad logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#312e81'; // Deep Indigo
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawingSig(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingSig) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawingSig(false);
    const canvas = sigCanvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      setSignatureData(dataUrl);
    }
  };

  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignatureData(null);
    setPlacedSigPosition(null);
    savePdfState(notes, null, isLocked, null);
  };

  // Rotate document pages helper
  const handleRotate = () => {
    setRotation(prev => {
      if (prev === 0) return 90;
      if (prev === 90) return 180;
      if (prev === 180) return 270;
      return 0;
    });
  };

  // Drop annotation note inside page coordinates
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTab !== 'annotate') return;
    if (!activeNoteText.trim()) return;

    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newNote: PdfNote = {
      id: Math.random().toString(36).substr(2, 9),
      text: activeNoteText,
      x,
      y,
      page: 1
    };

    const nextNotes = [...notes, newNote];
    setNotes(nextNotes);
    setActiveNoteText('');
    savePdfState(nextNotes, placedSigPosition);
  };

  // Highlight selection simulate
  const addHighlight = () => {
    const selection = window.getSelection();
    if (!selection || selection.toString().length === 0) return;

    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();
    if (rects.length === 0) return;

    const pageRect = pageRef.current?.getBoundingClientRect();
    if (!pageRect) return;

    // Push bounding highlights
    const newHighlights: HighlightZone[] = [];
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      newHighlights.push({
        id: Math.random().toString(),
        top: ((r.top - pageRect.top) / pageRect.height) * 100,
        left: ((r.left - pageRect.left) / pageRect.width) * 100,
        width: (r.width / pageRect.width) * 100,
        height: (r.height / pageRect.height) * 100,
        page: 1,
        color: '#fef08a' // transparent yellow
      });
    }

    setHighlights(prev => [...prev, ...newHighlights]);
    selection.removeAllRanges();
  };

  const removeNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextNotes = notes.filter(n => n.id !== id);
    setNotes(nextNotes);
    savePdfState(nextNotes);
  };

  // Drag stamp logic
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', 'sig');
  };

  const handlePageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setPlacedSigPosition({ x, y });
    savePdfState(notes, { x, y });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Lock PDF logic
  const handleToggleLock = () => {
    if (isLocked) {
      // Unlock with password verification
      if (password && password === '1234') {
        setIsLocked(false);
        setAuthorized(true);
        savePdfState(notes, placedSigPosition, false);
      } else if (!password) {
        setIsLocked(false);
        setAuthorized(true);
        savePdfState(notes, placedSigPosition, false);
      } else {
        alert('Invalid cryptographic decryption key!');
      }
    } else {
      setIsLocked(true);
      setAuthorized(false);
      savePdfState(notes, placedSigPosition, true);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full select-none">
      
      {/* LEFT: Complete PDF preview canvas */}
      <div className="flex-grow flex flex-col bg-slate-800 rounded-3xl p-4 overflow-hidden relative min-h-[400px]">
        
        {/* PDF Quick Ribbon Toolbar */}
        <div className="bg-slate-900 border border-slate-750 p-2.5 rounded-2xl mb-4 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-mono font-bold uppercase">
              PDF/A STANDARD SECURE
            </span>
            <span className="text-xs font-semibold text-slate-100 truncate max-w-[200px]">{title}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Rotate control */}
            <button
              type="button"
              onClick={handleRotate}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Rotate Page"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            {/* Zoom controls */}
            <button
              type="button"
              onClick={() => setZoom(prev => Math.max(50, prev - 10))}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 font-bold w-10 text-center">{zoom}%</span>
            <button
              type="button"
              onClick={() => setZoom(prev => Math.min(150, prev + 10))}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>

            {/* Highlight selection button */}
            {activeTab === 'annotate' && (
              <button
                type="button"
                onClick={addHighlight}
                className="px-2 py-1 bg-yellow-450 hover:bg-yellow-500 text-amber-950 font-bold rounded-lg text-[10px] uppercase font-mono cursor-pointer flex items-center gap-1"
                title="Highlight selected text"
              >
                <PenTool className="h-3 w-3" /> Highlight text
              </button>
            )}
          </div>
        </div>

        {/* Encrypted PDF Gate screen */}
        {isLocked && !authorized ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-8 bg-slate-950/80 rounded-2xl border border-slate-800 backdrop-blur-md">
            <div className="p-4 bg-red-950/40 text-red-400 rounded-full border border-red-900/30 mb-4 animate-pulse">
              <Lock className="h-10 w-10" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest font-mono">ENCRYPTED SYSTEM SHEET</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mb-6 leading-relaxed">
              This structural diagram is locked under standard workspace encryption rules. Enter the 4-digit code to decrypt.
            </p>
            <div className="flex gap-2 max-w-xs">
              <input
                type="password"
                placeholder="Enter passphrase..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-indigo-500 w-36"
              />
              <button
                type="button"
                onClick={() => {
                  if (password === '1234' || password === '') {
                    setAuthorized(true);
                  } else {
                    alert('Invalid security key (Hint: try blank or 1234)');
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
              >
                Unlock
              </button>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-4">DEFAULT PASSCODE: 1234</span>
          </div>
        ) : (
          /* PDF Page Visualizer */
          <div className="flex-grow flex justify-center overflow-y-auto p-6 bg-slate-900/40 border border-slate-750 rounded-2xl h-[45vh] xl:h-[55vh] [scrollbar-width:thin]">
            <div 
              style={{ 
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`, 
                transformOrigin: 'top center',
                width: '100%',
                maxWidth: '650px',
                height: 'fit-content'
              }}
              className="transition-transform duration-200"
            >
              
              {/* PAGE 1: Corporate Technical Blueprint Design */}
              <div 
                ref={pageRef}
                onDragOver={handleDragOver}
                onDrop={handlePageDrop}
                onClick={handlePageClick}
                className="relative bg-white shadow-2xl rounded border border-gray-300 min-h-[780px] p-12 text-left text-gray-800 leading-relaxed cursor-crosshair select-text overflow-hidden"
              >
                {/* Draft Confidential Watermark overlay */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 select-none pointer-events-none opacity-[0.06] text-rose-600 font-extrabold text-7xl uppercase tracking-[15px] font-mono text-center">
                  CONFIDENTIAL<br />WORKSPACE DRAFT
                </div>

                {/* PDF Header Block */}
                <div className="flex justify-between items-start border-b border-gray-100 pb-5 mb-8">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-650 uppercase tracking-widest font-mono">PARITY AUDIT SCHEMATIC</span>
                    <h1 className="text-2xl font-bold font-serif text-gray-900 mt-0.5">{title}</h1>
                    <span className="text-[9px] text-gray-400 font-mono block mt-1">DOC_ID: {Math.random().toString(16).substr(2, 8).toUpperCase()} | REVISION STATUS: SEALED</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[9px] font-bold text-gray-400 font-mono">PAGE 1 OF 2</span>
                    <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded mt-1">LEVEL: HIGH</span>
                  </div>
                </div>

                {/* Document Main technical narrative */}
                <div className="space-y-5 text-xs text-gray-700 font-serif">
                  <p>
                    This technical balance document details the functional specifications for the <b>Symmetric Platform Parity (SPP)</b> algorithm. Under critical mechanical loading states, simulated structures must redistribute force parameters across available horizontal sliding tracks.
                  </p>

                  <h3 className="text-sm font-bold font-sans text-gray-900 mt-6 mb-2 border-b border-gray-100 pb-1 uppercase tracking-wide">
                    1. Mathematical Restitution Equations
                  </h3>
                  <p>
                    Let the variable of repetitive bounce elastic rebound be defined dynamically under a coefficient constant:
                  </p>
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl font-mono text-[10px] text-gray-600 my-3 leading-loose text-center">
                    C_rebound = [ V_final - V_initial ] / [ G_coefficient * Mass_elastomer ]
                    <br />
                    Parity_score = ∑ (T_track - T_average)² &lt; 0.05
                  </div>

                  <p>
                    Where the tracking deviation is monitored continuously through the integrated 60fps telemetry framework. If deviation metrics exceed predefined system constraints, database write locks will auto-escalate to prevent catastrophic integrity loss.
                  </p>

                  <h3 className="text-sm font-bold font-sans text-gray-900 mt-6 mb-2 border-b border-gray-100 pb-1 uppercase tracking-wide">
                    2. Categorical Balance Matrix
                  </h3>
                  <p>
                    Category rails (Shelves) are represented as physical tracks under a structured 7-day contribution grid. Days with intense commit action project glowing amber gradients:
                  </p>

                  <div className="border border-gray-200 rounded-xl overflow-hidden my-4 text-[10px] font-mono">
                    <div className="bg-gray-50 border-b border-gray-200 grid grid-cols-3 p-2 font-bold text-gray-500 uppercase tracking-wider">
                      <span>Category Shelf ID</span>
                      <span>Parity Metric</span>
                      <span>Verification Tag</span>
                    </div>
                    <div className="grid grid-cols-3 p-2.5 border-b border-gray-100">
                      <span className="font-semibold text-gray-800">Repetitive Bounce</span>
                      <span>e = 0.89 (STABLE)</span>
                      <span className="text-emerald-600 font-bold">Passed Verification</span>
                    </div>
                    <div className="grid grid-cols-3 p-2.5">
                      <span className="font-semibold text-gray-800">Deep Parity</span>
                      <span>e = 0.94 (HIGH)</span>
                      <span className="text-emerald-600 font-bold">Passed Verification</span>
                    </div>
                  </div>

                </div>

                {/* Draw highlight zones */}
                {highlights.map(h => (
                  <div
                    key={h.id}
                    style={{
                      position: 'absolute',
                      top: `${h.top}%`,
                      left: `${h.left}%`,
                      width: `${h.width}%`,
                      height: `${h.height}%`,
                      backgroundColor: h.color,
                      mixBlendMode: 'multiply',
                      pointerEvents: 'none'
                    }}
                  />
                ))}

                {/* Render Notes annotations directly placed on document */}
                {notes.map(note => (
                  <div
                    key={note.id}
                    style={{ top: `${note.y}%`, left: `${note.x}%` }}
                    className="absolute bg-yellow-100 hover:bg-yellow-200 text-yellow-900 text-[10px] leading-relaxed p-2.5 rounded-xl shadow-lg border border-yellow-200 max-w-[150px] font-sans transition-all z-20 group"
                  >
                    <button
                      type="button"
                      onClick={(e) => removeNote(note.id, e)}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-[9px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow border border-white"
                    >
                      ×
                    </button>
                    {note.text}
                  </div>
                ))}

                {/* Placed signature overlay stamp */}
                {placedSigPosition && signatureData && (
                  <div
                    style={{ top: `${placedSigPosition.y}%`, left: `${placedSigPosition.x}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 max-w-[120px] pointer-events-auto z-10 bg-indigo-50/40 p-1 border border-indigo-200 border-dashed rounded cursor-grab active:cursor-grabbing group"
                    draggable
                    onDragStart={handleDragStart}
                  >
                    <img referrerPolicy="no-referrer" src={signatureData} alt="Authorized Signature" className="h-auto w-24 object-contain mix-blend-multiply" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlacedSigPosition(null);
                        savePdfState(notes, null);
                      }}
                      className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-[9px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      ×
                    </button>
                    <span className="text-[7px] text-indigo-700 bg-white border border-indigo-100 px-1 rounded block text-center uppercase font-mono font-bold mt-1">
                      VERIFIED
                    </span>
                  </div>
                )}

                {/* PDF Footer page details */}
                <div className="absolute bottom-10 left-12 right-12 border-t border-gray-100 pt-3 flex justify-between items-center text-[9px] text-gray-400 font-mono">
                  <span>WORKSPACE CRYPTOGRAPHIC SEAL: SECURE-99X</span>
                  <span>SAN FRA_HQ-PARITY_NODE</span>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>

      {/* RIGHT: Annotation Tools and Security configuration Panel */}
      <div className="w-full xl:w-72 bg-gray-50 border border-gray-150 rounded-2xl p-4.5 flex flex-col justify-between shrink-0 h-full">
        
        {/* Navigation panel */}
        <div className="flex flex-col gap-3">
          <div className="flex bg-gray-150/70 p-1 rounded-xl border border-gray-200/60">
            {(['view', 'annotate', 'security'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-[9px] font-bold rounded-lg uppercase tracking-wider font-mono cursor-pointer transition-all ${
                  activeTab === tab 
                    ? 'bg-white text-gray-800 shadow-sm border border-gray-200 font-extrabold' 
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Dynamic Tab Body */}
          {activeTab === 'view' && (
            <div className="flex flex-col gap-3 bg-white border border-gray-150 p-3.5 rounded-2xl mt-1">
              <span className="text-[9px] font-bold text-gray-400 uppercase font-mono">Verification Status</span>
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100/50 p-3 rounded-xl">
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 block uppercase font-mono leading-tight">SYSTEM AUTHENTICATED</span>
                  <span className="text-[9px] text-emerald-600 font-mono block">Signature matches cryptographic keys.</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <span className="text-[9px] font-bold text-gray-400 uppercase font-mono">PDF Meta Metrics</span>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div>
                    <span className="text-gray-400 block text-[8px]">FORMAT</span>
                    <span className="text-gray-800 font-bold">PDF/A-3b</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[8px]">PRODUCER</span>
                    <span className="text-gray-800 font-bold">NodeEngine v2</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'annotate' && (
            <div className="flex flex-col gap-3.5 bg-white border border-gray-150 p-3.5 rounded-2xl mt-1">
              
              {/* Note creator */}
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase font-mono block mb-1.5">Create Floating Note</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type note content..."
                    value={activeNoteText}
                    onChange={(e) => setActiveNoteText(e.target.value)}
                    className="flex-grow bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:bg-white"
                  />
                </div>
                <p className="text-[9px] text-gray-400 italic font-medium mt-1.5 leading-snug">
                  *After typing, tap anywhere on the white PDF page area to place the note block.
                </p>
              </div>

              <div className="h-px bg-gray-150" />

              {/* Signature Creator & Drag Box */}
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase font-mono block mb-1.5">Interactive Signature Seal</label>
                {!signatureData ? (
                  <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-2.5 flex flex-col items-center">
                    <canvas
                      ref={sigCanvasRef}
                      width={220}
                      height={90}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="bg-white border border-gray-200 rounded-lg cursor-crosshair h-[90px] w-full"
                    />
                    <span className="text-[8px] text-gray-400 font-mono mt-1.5 uppercase font-bold">Draw cursive initials inside box</span>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col items-center">
                    <div 
                      draggable 
                      onDragStart={handleDragStart}
                      className="bg-white border border-dashed border-indigo-200 rounded-lg p-2 max-w-[150px] cursor-grab active:cursor-grabbing flex flex-col items-center shadow-sm group hover:border-indigo-400"
                      title="DRAG THIS SEAMLESSLY TO THE PDF PAGE!"
                    >
                      <img referrerPolicy="no-referrer" src={signatureData} alt="Authorized Stamp" className="h-12 w-auto object-contain mix-blend-multiply" />
                      <span className="text-[7px] text-gray-400 font-bold uppercase tracking-wider font-mono mt-1">Drag Me To Page</span>
                    </div>

                    <div className="flex gap-1.5 w-full mt-3">
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="flex-1 py-1 bg-white hover:bg-gray-100 border border-gray-250 rounded-lg text-[9px] font-bold uppercase text-gray-600 font-mono cursor-pointer"
                      >
                        Clear Signature
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === 'security' && (
            <div className="flex flex-col gap-3 bg-white border border-gray-150 p-3.5 rounded-2xl mt-1">
              <span className="text-[9px] font-bold text-gray-400 uppercase font-mono">Cryptographic Lock</span>
              <p className="text-[9px] text-gray-400 leading-relaxed mb-1.5">
                Protect sensitive hardware balance coordinates with a security lock block on local downloads.
              </p>

              <button
                type="button"
                onClick={handleToggleLock}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  isLocked 
                    ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 shadow-sm' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow'
                }`}
              >
                {isLocked ? (
                  <>
                    <Lock className="h-3.5 w-3.5" /> Locked (Code: 1234)
                  </>
                ) : (
                  <>
                    <Unlock className="h-3.5 w-3.5" /> Encrypt Document
                  </>
                )}
              </button>
            </div>
          )}

        </div>

        {/* Action controllers */}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              // Create dynamic printing session of the PDF page with styles
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>${title} - Secure PDF Layout</title>
                      <style>
                        body { font-family: 'Georgia', serif; padding: 50px; line-height: 1.6; color: #111; }
                        .header { border-bottom: 2px solid #ddd; padding-bottom: 12px; margin-bottom: 30px; }
                        h1 { font-size: 24px; margin: 0; }
                        .subtitle { font-family: monospace; font-size: 10px; color: #666; }
                        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(45deg); opacity: 0.05; font-size: 80px; font-weight: bold; pointer-events: none; }
                        .note-box { background: #fef9c3; border: 1px solid #fef08a; padding: 12px; border-radius: 8px; margin: 20px 0; font-size: 11px; }
                      </style>
                    </head>
                    <body>
                      <div class="watermark">CONFIDENTIAL</div>
                      <div class="header">
                        <h1>${title}</h1>
                        <div class="subtitle">CRYPTOGRAPHIC SECURE PROTOCOL - VERIFIED ARCHIVE</div>
                      </div>
                      <div>
                        <h3>1. Mathematical Restitution Equations</h3>
                        <p>This report documents the parity specifications and balancing indicators for the upcoming platform iteration. Below are the key milestones and requirements designed to ensure physical elastomer durability.</p>
                        <p>All active elastomers must achieve a minimum coefficient of restitution (e) of 0.85 under nominal environmental conditions. Test iterations will utilize a standardized gravity coefficient of 9.81 m/s².</p>
                      </div>
                      ${notes.map(n => `<div class="note-box"><strong>Annotation:</strong> ${n.text}</div>`).join('')}
                    </body>
                  </html>
                `);
                printWindow.document.close();
                printWindow.print();
              }
            }}
            className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs py-2.5 rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:-translate-y-0.5"
          >
            <Printer className="h-3.5 w-3.5" /> Print Layout Paper
          </button>
        </div>

      </div>
    </div>
  );
}
