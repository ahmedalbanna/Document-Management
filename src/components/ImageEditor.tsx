import React, { useState, useEffect, useRef } from 'react';
import { 
  Paintbrush, 
  Sliders, 
  RotateCw, 
  FlipHorizontal, 
  FlipVertical, 
  Undo2, 
  Trash2, 
  Download, 
  Save, 
  Sparkles, 
  Image as ImageIcon,
  Check,
  Type,
  Crop as CropIcon
} from 'lucide-react';

interface ImageEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  title: string;
}

const PRESET_IMAGES = [
  {
    name: "Elastomer Blueprint",
    color: "#e2e8f0",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%230f172a'/><g stroke='%23334155' stroke-width='1'><line x1='0' y1='150' x2='400' y2='150'/><line x1='200' y1='0' x2='200' y2='300'/><circle cx='200' cy='150' r='100' fill='none' stroke='%231e293b' stroke-width='2'/><circle cx='200' cy='150' r='60' fill='none' stroke='%236366f1' stroke-dasharray='5,5'/><path d='M 100 150 Q 200 50 300 150' fill='none' stroke='%2310b981' stroke-width='3'/></g><text x='20' y='40' fill='%2394a3b8' font-family='monospace' font-size='12'>MODEL AXIS: 0-X-44</text><text x='20' y='270' fill='%236366f1' font-family='monospace' font-size='10'>REPETITIVE BOUNCE ELASTOMER</text></svg>"
  },
  {
    name: "Symmetric Parity Chart",
    color: "#f1f5f9",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%230f172a'/><path d='M 50 250 L 150 150 L 250 150 L 350 50' fill='none' stroke='%2314b8a6' stroke-width='4'/><circle cx='150' cy='150' r='8' fill='%2314b8a6'/><circle cx='250' cy='150' r='8' fill='%2314b8a6'/><line x1='50' y1='50' x2='350' y2='250' stroke='%23ef4444' stroke-dasharray='4,4'/><text x='20' y='30' fill='%2314b8a6' font-family='monospace' font-size='12'>PARITY EQUILIBRIUM: OK</text></svg>"
  },
  {
    name: "Empty Technical Grid",
    color: "#fafafa",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23f8fafc'/><defs><pattern id='grid' width='20' height='20' patternUnits='userSpaceOnUse'><path d='M 20 0 L 0 0 0 20' fill='none' stroke='%23e2e8f0' stroke-width='1'/></pattern></defs><rect width='400' height='300' fill='url(%23grid)'/><text x='150' y='160' fill='%2394a3b8' font-family='sans-serif' font-size='16'>SKETCHPAD ACTIVE</text></svg>"
  }
];

export default function ImageEditor({ content, onChange, title }: ImageEditorProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [tool, setTool] = useState<'draw' | 'crop' | 'filters' | 'presets' | 'ocr'>('draw');
  
  // Crop states
  const [cropX, setCropX] = useState<number>(10);
  const [cropY, setCropY] = useState<number>(10);
  const [cropWidth, setCropWidth] = useState<number>(80);
  const [cropHeight, setCropHeight] = useState<number>(80);

  const handleExecuteCrop = () => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = img.naturalWidth || img.width || 400;
    const height = img.naturalHeight || img.height || 300;

    const cx = (cropX / 100) * width;
    const cy = (cropY / 100) * height;
    const cw = (cropWidth / 100) * width;
    const ch = (cropHeight / 100) * height;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cw;
    tempCanvas.height = ch;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    const rawStateCanvas = document.createElement('canvas');
    rawStateCanvas.width = width;
    rawStateCanvas.height = height;
    const rawCtx = rawStateCanvas.getContext('2d');
    if (rawCtx) {
      rawCtx.save();
      rawCtx.translate(width / 2, height / 2);
      rawCtx.rotate((rotation * Math.PI) / 180);
      rawCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      rawCtx.translate(-width / 2, -height / 2);
      rawCtx.filter = `
        brightness(${brightness}%)
        contrast(${contrast}%)
        grayscale(${grayscale}%)
        sepia(${sepia}%)
        hue-rotate(${hueRotate}deg)
        blur(${blur}px)
      `;
      rawCtx.drawImage(img, 0, 0, width, height);
      rawCtx.restore();

      if (drawingHistory.length > 0) {
        rawCtx.putImageData(drawingHistory[drawingHistory.length - 1], 0, 0);
      }
      
      tempCtx.drawImage(rawStateCanvas, cx, cy, cw, ch, 0, 0, cw, ch);
    }

    const croppedDataUrl = tempCanvas.toDataURL('image/png');
    setImageSrc(croppedDataUrl);
    setCropX(10);
    setCropY(10);
    setCropWidth(80);
    setCropHeight(80);
    setTool('draw');
  };
  
  // OCR states
  const [isOcrLoading, setIsOcrLoading] = useState<boolean>(false);
  const [ocrText, setOcrText] = useState<string>('');
  const [ocrError, setOcrError] = useState<string>('');

  const handleRunOcr = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsOcrLoading(true);
    setOcrError('');
    setOcrText('');
    
    try {
      const dataUrl = canvas.toDataURL('image/png');
      
      const response = await fetch('/api/gemini/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: dataUrl,
          mimeType: 'image/png'
        }),
      });
      
      if (!response.ok) {
        throw new Error('OCR text extraction failed.');
      }
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      
      setOcrText(data.text || 'No text detected in the image.');
    } catch (err: any) {
      console.error(err);
      setOcrError(err.message || 'An error occurred during OCR extraction.');
    } finally {
      setIsOcrLoading(false);
    }
  };

  // Brush/Drawing configuration
  const [brushColor, setBrushColor] = useState<string>('#6366f1');
  const [brushSize, setBrushSize] = useState<number>(5);
  const [drawingHistory, setDrawingHistory] = useState<ImageData[]>([]);
  
  // Filter variables
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [grayscale, setGrayscale] = useState<number>(0);
  const [sepia, setSepia] = useState<number>(0);
  const [hueRotate, setHueRotate] = useState<number>(0);
  const [blur, setBlur] = useState<number>(0);

  // Orientation state
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastX = useRef<number>(0);
  const lastY = useRef<number>(0);
  const imageObjRef = useRef<HTMLImageElement | null>(null);

  // Extract raw Base64 / URL from document content
  useEffect(() => {
    let src = '';
    // Look for markdown image notation like ![name](data:...) or ![name](http...)
    const mdMatch = content.match(/!\[.*?\]\((.*?)\)/);
    if (mdMatch && mdMatch[1]) {
      src = mdMatch[1];
    } else if (content.startsWith('data:image')) {
      src = content;
    } else {
      // Use standard default preset
      src = PRESET_IMAGES[0].url;
    }
    setImageSrc(src);
  }, [content]);

  // Load and draw image to Canvas
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageObjRef.current = img;
      setDrawingHistory([]); // Reset history when loading a new base image
      redrawCanvas();
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Redraw when layout modifiers change
  useEffect(() => {
    redrawCanvas();
  }, [brightness, contrast, grayscale, sepia, hueRotate, blur, rotation, flipH, flipV, tool, cropX, cropY, cropWidth, cropHeight]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Standard scale configuration
    const width = img.naturalWidth || img.width || 400;
    const height = img.naturalHeight || img.height || 300;
    
    // Set viewport dimensions
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    // Move origin to center for rotation/flips
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.translate(-width / 2, -height / 2);

    // Apply canvas-level CSS filters
    ctx.filter = `
      brightness(${brightness}%)
      contrast(${contrast}%)
      grayscale(${grayscale}%)
      sepia(${sepia}%)
      hue-rotate(${hueRotate}deg)
      blur(${blur}px)
    `;

    // Render underlying image
    ctx.drawImage(img, 0, 0, width, height);
    ctx.restore();

    // If there is drawing history, composite last stroke state
    if (drawingHistory.length > 0) {
      const lastStroke = drawingHistory[drawingHistory.length - 1];
      ctx.putImageData(lastStroke, 0, 0);
    }

    // Draw crop overlays if crop tool is active
    if (tool === 'crop') {
      const cx = (cropX / 100) * width;
      const cy = (cropY / 100) * height;
      const cw = (cropWidth / 100) * width;
      const ch = (cropHeight / 100) * height;

      ctx.save();
      
      // Draw semi-transparent overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      
      // Top overlay
      ctx.fillRect(0, 0, width, cy);
      // Bottom overlay
      ctx.fillRect(0, cy + ch, width, height - (cy + ch));
      // Left overlay
      ctx.fillRect(0, cy, cx, ch);
      // Right overlay
      ctx.fillRect(cx + cw, cy, width - (cx + cw), ch);

      // Crop box border
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = Math.max(2, width / 200);
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(cx, cy, cw, ch);

      // Corner handles
      ctx.fillStyle = '#6366f1';
      const handleSize = Math.max(8, width / 50);
      ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(cx + cw - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(cx - handleSize / 2, cy + ch - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(cx + cw - handleSize / 2, cy + ch - handleSize / 2, handleSize, handleSize);

      ctx.restore();
    }
  };

  // Drag-and-paint core mechanisms
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    isDrawingRef.current = true;
    
    // Calculate exact pixel position accounting for scale mismatch
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    lastX.current = (e.clientX - rect.left) * scaleX;
    lastY.current = (e.clientY - rect.top) * scaleY;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || tool !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(lastX.current, lastY.current);
    ctx.lineTo(currentX, currentY);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();

    lastX.current = currentX;
    lastY.current = currentY;
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    // Push canvas state to undo stack
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setDrawingHistory(prev => [...prev, snapshot]);
  };

  const handleUndo = () => {
    if (drawingHistory.length <= 1) {
      setDrawingHistory([]);
      redrawCanvas();
    } else {
      const nextHistory = drawingHistory.slice(0, -1);
      setDrawingHistory(nextHistory);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(nextHistory[nextHistory.length - 1], 0, 0);
    }
  };

  const handleClearDrawings = () => {
    setDrawingHistory([]);
    redrawCanvas();
  };

  const handleSaveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    // Wrap back in markdown format
    const markdownContent = `![${title}](${dataUrl})`;
    onChange(markdownContent);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${title.replace(/\s+/g, '_')}_edited.png`;
    link.click();
  };

  const loadPreset = (presetUrl: string) => {
    setImageSrc(presetUrl);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full select-none">
      {/* LEFT: Live Interactive Canvas Workspace */}
      <div className="flex-1 bg-gray-950 rounded-2xl flex flex-col items-center justify-center p-6 border border-gray-900 shadow-inner relative overflow-hidden group min-h-[350px]">
        
        {/* Helper layout indicators */}
        <div className="absolute top-4 left-4 flex gap-1.5 z-10 font-mono text-[9px] text-gray-500 leading-none">
          <span className="bg-gray-900 px-2 py-1 rounded border border-gray-800">PNG CANVAS RESOLUTION: AUTO</span>
          {tool === 'draw' && <span className="bg-indigo-950/80 border border-indigo-900 px-2 py-1 rounded text-indigo-400 font-bold animate-pulse">🖌️ PAINT BRUSH ACTIVE</span>}
        </div>

        {/* Quick Orientation tools on canvas container */}
        <div className="absolute top-4 right-4 flex gap-1 z-10">
          <button 
            type="button"
            onClick={() => setRotation(r => (r + 90) % 360)}
            className="p-1.5 bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
            title="Rotate 90°"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
          <button 
            type="button"
            onClick={() => setFlipH(f => !f)}
            className={`p-1.5 border rounded-lg transition-colors cursor-pointer ${flipH ? 'bg-indigo-950 border-indigo-800 text-indigo-400' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800'}`}
            title="Flip Horizontally"
          >
            <FlipHorizontal className="h-3.5 w-3.5" />
          </button>
          <button 
            type="button"
            onClick={() => setFlipV(f => !f)}
            className={`p-1.5 border rounded-lg transition-colors cursor-pointer ${flipV ? 'bg-indigo-950 border-indigo-800 text-indigo-400' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800'}`}
            title="Flip Vertically"
          >
            <FlipVertical className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Main interactive viewport */}
        <div className="relative border border-gray-800 rounded-lg overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-[size:16px_16px] shadow-2xl flex items-center justify-center max-w-full max-h-[50vh]">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className={`max-w-full max-h-[45vh] h-auto object-contain block ${
              tool === 'draw' ? 'cursor-crosshair' : 'cursor-default'
            }`}
          />
        </div>

        {/* Controls Overlay Footer */}
        <div className="mt-4 flex gap-2">
          {tool === 'draw' && (
            <>
              <button
                type="button"
                onClick={handleUndo}
                disabled={drawingHistory.length === 0}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  drawingHistory.length === 0
                    ? 'bg-gray-900/40 border-gray-850 text-gray-600 cursor-default'
                    : 'bg-gray-900 border-gray-800 text-gray-300 hover:text-white hover:bg-gray-850'
                }`}
              >
                <Undo2 className="h-3.5 w-3.5" /> Undo Stroke
              </button>
              <button
                type="button"
                onClick={handleClearDrawings}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-950/40 bg-red-950/20 text-red-400 hover:bg-red-950/40 text-xs font-semibold cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear Drawings
              </button>
            </>
          )}
          
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-800 bg-gray-900 text-gray-300 hover:text-white hover:bg-gray-850 text-xs font-semibold cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> Download PNG
          </button>
        </div>
      </div>

      {/* RIGHT: High-Fidelity Settings Drawer */}
      <div className="w-full xl:w-72 bg-gray-50 border border-gray-150/80 rounded-2xl p-4.5 flex flex-col shrink-0">
        
        {/* Navigation Tabs */}
        <div className="flex bg-gray-200/55 p-1 rounded-xl gap-0.5 mb-4 border border-gray-200/20 text-center shrink-0">
          <button
            type="button"
            onClick={() => setTool('draw')}
            className={`flex-1 py-1 px-0.5 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-0.5 cursor-pointer ${
              tool === 'draw' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-850'
            }`}
          >
            <Paintbrush className="h-3 w-3" /> Draw
          </button>
          <button
            type="button"
            onClick={() => setTool('crop')}
            className={`flex-1 py-1 px-0.5 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-0.5 cursor-pointer ${
              tool === 'crop' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-850'
            }`}
          >
            <CropIcon className="h-3 w-3" /> Crop
          </button>
          <button
            type="button"
            onClick={() => setTool('filters')}
            className={`flex-1 py-1 px-0.5 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-0.5 cursor-pointer ${
              tool === 'filters' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-850'
            }`}
          >
            <Sliders className="h-3 w-3" /> Filters
          </button>
          <button
            type="button"
            onClick={() => setTool('presets')}
            className={`flex-1 py-1 px-0.5 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-0.5 cursor-pointer ${
              tool === 'presets' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-850'
            }`}
          >
            <ImageIcon className="h-3 w-3" /> Presets
          </button>
          <button
            type="button"
            onClick={() => setTool('ocr')}
            className={`flex-1 py-1 px-0.5 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-0.5 cursor-pointer ${
              tool === 'ocr' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-850'
            }`}
          >
            <Sparkles className="h-3 w-3 text-indigo-650" /> OCR
          </button>
        </div>

        {/* Dynamic Panels */}
        <div className="flex-grow overflow-y-auto pr-0.5 max-h-[48vh] xl:max-h-none flex flex-col justify-start">
          
          {tool === 'crop' && (
            <div className="flex flex-col gap-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Crop Region Settings</span>
              
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                    <span>X Position</span>
                    <span className="font-mono">{cropX}%</span>
                  </div>
                  <input
                    type="range" min="0" max="90" value={cropX}
                    onChange={(e) => setCropX(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 bg-gray-200 rounded-lg h-1"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                    <span>Y Position</span>
                    <span className="font-mono">{cropY}%</span>
                  </div>
                  <input
                    type="range" min="0" max="90" value={cropY}
                    onChange={(e) => setCropY(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 bg-gray-200 rounded-lg h-1"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                    <span>Width</span>
                    <span className="font-mono">{cropWidth}%</span>
                  </div>
                  <input
                    type="range" min="10" max="100" value={cropWidth}
                    onChange={(e) => setCropWidth(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 bg-gray-200 rounded-lg h-1"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                    <span>Height</span>
                    <span className="font-mono">{cropHeight}%</span>
                  </div>
                  <input
                    type="range" min="10" max="100" value={cropHeight}
                    onChange={(e) => setCropHeight(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 bg-gray-200 rounded-lg h-1"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleExecuteCrop}
                className="w-full mt-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer transition-all"
              >
                <CropIcon className="h-3.5 w-3.5" /> Execute Crop
              </button>

              <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl mt-2 flex flex-col gap-1 text-[11px] text-indigo-750">
                <span className="font-semibold flex items-center gap-1">
                  <CropIcon className="h-3 w-3" /> Area Selection
                </span>
                <p className="leading-relaxed">Use the sliders above to position and size the crop box overlay shown in the viewport. Click 'Execute Crop' to crop the image.</p>
              </div>
            </div>
          )}

          {tool === 'draw' && (
            <div className="flex flex-col gap-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Paint Brush Configurations</span>
              
              {/* Brush Color Picker */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-gray-500 font-medium">Stroke Color</span>
                <div className="grid grid-cols-6 gap-2">
                  {['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#000000', '#ffffff'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setBrushColor(color)}
                      className="h-7 w-7 rounded-lg relative hover:scale-110 transition-transform cursor-pointer border border-gray-200"
                      style={{ backgroundColor: color }}
                    >
                      {brushColor === color && (
                        <span className={`absolute inset-0 flex items-center justify-center text-[10px] ${color === '#ffffff' ? 'text-black' : 'text-white'}`}>
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brush Thickness Slider */}
              <div className="flex flex-col gap-1.5 mt-2">
                <div className="flex items-center justify-between text-xs text-gray-550">
                  <span>Brush Diameter</span>
                  <span className="font-mono font-semibold">{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="40"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 bg-gray-200 rounded-lg cursor-pointer h-1.5"
                />
              </div>

              {/* Guidelines for Drawing */}
              <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl mt-3 flex flex-col gap-1 text-[11px] text-indigo-750">
                <span className="font-semibold flex items-center gap-1">
                  <Sparkles className="h-3 w-3 animate-spin" /> Isomorphic Drawing
                </span>
                <p className="leading-relaxed">Click and drag cursor inside the black visual viewport on the left to paint annotations directly over your elastomer blueprints or system charts.</p>
              </div>
            </div>
          )}

          {tool === 'filters' && (
            <div className="flex flex-col gap-3.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Image Filter Adjustments</span>
              
              {/* Brightness */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                  <span>Brightness</span>
                  <span className="font-mono">{brightness}%</span>
                </div>
                <input
                  type="range" min="30" max="200" value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 bg-gray-200 rounded-lg h-1"
                />
              </div>

              {/* Contrast */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                  <span>Contrast</span>
                  <span className="font-mono">{contrast}%</span>
                </div>
                <input
                  type="range" min="30" max="200" value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 bg-gray-200 rounded-lg h-1"
                />
              </div>

              {/* Grayscale */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                  <span>Grayscale (Desaturate)</span>
                  <span className="font-mono">{grayscale}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={grayscale}
                  onChange={(e) => setGrayscale(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 bg-gray-200 rounded-lg h-1"
                />
              </div>

              {/* Sepia */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                  <span>Sepia (Vintage)</span>
                  <span className="font-mono">{sepia}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={sepia}
                  onChange={(e) => setSepia(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 bg-gray-200 rounded-lg h-1"
                />
              </div>

              {/* Hue Rotate */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                  <span>Hue Shift</span>
                  <span className="font-mono">{hueRotate}°</span>
                </div>
                <input
                  type="range" min="0" max="360" value={hueRotate}
                  onChange={(e) => setHueRotate(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 bg-gray-200 rounded-lg h-1"
                />
              </div>

              {/* Blur */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                  <span>Focus Blur</span>
                  <span className="font-mono">{blur}px</span>
                </div>
                <input
                  type="range" min="0" max="10" step="0.5" value={blur}
                  onChange={(e) => setBlur(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 bg-gray-200 rounded-lg h-1"
                />
              </div>

              {/* Reset Filters */}
              <button
                type="button"
                onClick={() => {
                  setBrightness(100);
                  setContrast(100);
                  setGrayscale(0);
                  setSepia(0);
                  setHueRotate(0);
                  setBlur(0);
                  setRotation(0);
                  setFlipH(false);
                  setFlipV(false);
                }}
                className="w-full mt-2 text-center text-xs py-2 border border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/20 rounded-xl font-bold cursor-pointer transition-colors"
              >
                Reset All Parameters
              </button>
            </div>
          )}

          {tool === 'presets' && (
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Default Structural Blueprints</span>
              
              <div className="flex flex-col gap-2.5">
                {PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => loadPreset(preset.url)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-white hover:bg-gray-50/50 hover:border-indigo-300 transition-all flex items-center gap-2.5 text-left cursor-pointer group"
                  >
                    <div className="h-9 w-12 rounded border border-gray-150 overflow-hidden flex items-center justify-center shrink-0">
                      <img src={preset.url} alt={preset.name} className="h-full w-full object-cover select-none" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-gray-700 group-hover:text-indigo-650 truncate">{preset.name}</span>
                      <span className="text-[9px] text-gray-400 font-mono">VECTOR SHIELD</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tool === 'ocr' && (
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-indigo-550" /> Image OCR (Gemini)
              </span>
              <p className="text-[10px] text-gray-400 leading-normal">
                Extract all handwritten, printed, or schematic text from the canvas instantly using Gemini.
              </p>
              
              <button
                type="button"
                onClick={handleRunOcr}
                disabled={isOcrLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-xs py-2 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
              >
                {isOcrLoading ? (
                  <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 fill-current" />
                )}
                <span>{isOcrLoading ? 'Extracting text...' : 'Extract Image Text'}</span>
              </button>

              {ocrError && (
                <p className="text-[10px] text-red-500 font-medium leading-normal mt-1">{ocrError}</p>
              )}

              {ocrText && (
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase">
                    <span>Extracted Text</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(ocrText);
                        alert('Text copied to clipboard!');
                      }}
                      className="text-indigo-600 hover:text-indigo-700 font-semibold lowercase cursor-pointer text-[10px]"
                    >
                      copy
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={ocrText}
                    className="w-full h-40 bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-mono text-gray-700 leading-normal focus:outline-none resize-none select-text [scrollbar-width:thin]"
                  />
                </div>
              )}
            </div>
          )}

        </div>

        {/* Bottom Save Action */}
        <button
          type="button"
          onClick={handleSaveImage}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md shadow-indigo-100 flex items-center justify-center gap-2 mt-4 cursor-pointer hover:-translate-y-0.5 transition-all"
        >
          <Check className="h-3.5 w-3.5 stroke-[2.5]" /> Commit Canvas Edits
        </button>
      </div>
    </div>
  );
}
