import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Presentation, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Edit, 
  Download, 
  Save, 
  Settings, 
  FileText, 
  Plus, 
  Check, 
  X, 
  Sliders, 
  List, 
  Columns, 
  Quote, 
  Binary, 
  Code2, 
  Loader2, 
  Play, 
  Pause, 
  Eye, 
  CheckSquare 
} from 'lucide-react';
import { Document, Shelf } from '../types';
import MathRenderer from './MathRenderer';

interface PresentationSlide {
  slideNumber: number;
  layout: 'title' | 'bullet' | 'two-column' | 'quote' | 'formula' | 'code';
  header: string;
  subtitle?: string;
  bullets?: string[];
  code?: string;
  quote?: string;
  citation?: string;
  leftColumn?: string;
  rightColumn?: string;
  speakerNotes: string;
  visualDescription: string;
}

interface GeneratedPresentation {
  title: string;
  subtitle: string;
  narrative: string;
  slides: PresentationSlide[];
}

interface PresentationWorkspaceProps {
  documents: Document[];
  shelves: Shelf[];
  preselectedDocIds?: string[];
  onSaveDoc?: (docId: string, updates: Partial<Document>, changeSummary?: string) => void;
  onAddDocToShelf?: (shelfId: string) => void;
  currentUserEmail?: string;
  onClose?: () => void;
}

type PresentationTheme = ' midnight' | 'swiss' | 'forest' | 'editorial';

export default function PresentationWorkspace({
  documents,
  shelves,
  preselectedDocIds = [],
  onSaveDoc,
  currentUserEmail = ''
}: PresentationWorkspaceProps) {
  // --- Setup Configuration States ---
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(preselectedDocIds);
  const [focusPrompt, setFocusPrompt] = useState<string>('');
  const [slideCount, setSlideCount] = useState<number>(6);
  const [theme, setTheme] = useState<PresentationTheme>('midnight');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');

  // --- Generated Presentation Data ---
  const [presentation, setPresentation] = useState<GeneratedPresentation | null>(null);
  
  // --- Presentation Stage States ---
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showNotes, setShowNotes] = useState<boolean>(true);
  
  // --- Auto-Play Slides ---
  const [isAutoplay, setIsAutoplay] = useState<boolean>(false);
  const [autoplayInterval, setAutoplayInterval] = useState<number>(5); // seconds
  const [autoplayTimer, setAutoplayTimer] = useState<any>(null);

  // --- Search inside Setup list ---
  const [setupSearch, setSetupSearch] = useState<string>('');

  // Sync preselected documents
  useEffect(() => {
    if (preselectedDocIds.length > 0) {
      setSelectedDocIds(preselectedDocIds);
    }
  }, [preselectedDocIds]);

  // Autoplay Effect
  useEffect(() => {
    if (isAutoplay && presentation) {
      const timer = setInterval(() => {
        setCurrentSlideIndex(prev => {
          if (prev === presentation.slides.length - 1) {
            setIsAutoplay(false);
            return prev;
          }
          return prev + 1;
        });
      }, autoplayInterval * 1000);
      setAutoplayTimer(timer);
      return () => clearInterval(timer);
    } else if (!isAutoplay && autoplayTimer) {
      clearInterval(autoplayTimer);
    }
  }, [isAutoplay, autoplayInterval, presentation]);

  // Keypress navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!presentation || isEditing) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (currentSlideIndex < presentation.slides.length - 1) {
          setCurrentSlideIndex(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentSlideIndex > 0) {
          setCurrentSlideIndex(prev => prev - 1);
        }
      } else if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [presentation, currentSlideIndex, isFullScreen, isEditing]);

  // --- API Slide Generation Trigger ---
  const handleGeneratePresentation = async () => {
    if (selectedDocIds.length === 0) return;
    
    setIsGenerating(true);
    setGenerationStep('Assembling workspace document nodes...');
    
    // Step animations
    const steps = [
      'Assembling workspace document nodes...',
      'Mapping semantic content narrative...',
      'Drafting slide storyboard structure...',
      'Structuring layout and visual hierarchies...',
      'Compiling LaTeX formulas & code blocks...',
      'Selecting optimal presentation theme...'
    ];
    
    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        setGenerationStep(steps[stepIndex]);
      }
    }, 1800);

    try {
      // Find selected files complete content
      const selectedDocs = documents.filter(d => selectedDocIds.includes(d.id));
      
      const response = await fetch('/api/gemini/presentation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documents: selectedDocs,
          focusPrompt,
          slideCount
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to generate presentation.');
      }

      const deckData: GeneratedPresentation = await response.json();
      setPresentation(deckData);
      setCurrentSlideIndex(0);
    } catch (err: any) {
      console.error('Presentation error:', err);
      alert(`Presentation generation failed: ${err.message}`);
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  // --- Editable slides sync handlers ---
  const handleUpdateSlideField = (field: keyof PresentationSlide, value: any) => {
    if (!presentation) return;
    const updatedSlides = [...presentation.slides];
    updatedSlides[currentSlideIndex] = {
      ...updatedSlides[currentSlideIndex],
      [field]: value
    };
    setPresentation({
      ...presentation,
      slides: updatedSlides
    });
  };

  const handleUpdateSlideBullet = (bulletIndex: number, text: string) => {
    if (!presentation) return;
    const currentSlide = presentation.slides[currentSlideIndex];
    if (!currentSlide.bullets) return;
    
    const updatedBullets = [...currentSlide.bullets];
    updatedBullets[bulletIndex] = text;
    
    handleUpdateSlideField('bullets', updatedBullets);
  };

  const handleAddSlideBullet = () => {
    if (!presentation) return;
    const currentSlide = presentation.slides[currentSlideIndex];
    const updatedBullets = currentSlide.bullets ? [...currentSlide.bullets, 'New key metric or takeaway'] : ['New key metric or takeaway'];
    handleUpdateSlideField('bullets', updatedBullets);
  };

  const handleRemoveSlideBullet = (bulletIndex: number) => {
    if (!presentation) return;
    const currentSlide = presentation.slides[currentSlideIndex];
    if (!currentSlide.bullets) return;
    
    const updatedBullets = currentSlide.bullets.filter((_, idx) => idx !== bulletIndex);
    handleUpdateSlideField('bullets', updatedBullets);
  };

  // --- Theme Preset Classes ---
  const getThemeClasses = () => {
    switch (theme) {
      case 'swiss':
        return {
          card: 'bg-white text-gray-900 border border-gray-200',
          accentText: 'text-indigo-600',
          accentBg: 'bg-indigo-50 border-indigo-200',
          secondaryText: 'text-gray-500 font-sans',
          tag: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          container: 'bg-gray-100',
          sidebar: 'bg-white border-l border-gray-200',
          notesBg: 'bg-gray-50 border-gray-200 text-gray-700',
          navBtn: 'hover:bg-gray-100 text-gray-700'
        };
      case 'forest':
        return {
          card: 'bg-[#FAFDF9] text-emerald-950 border border-emerald-100/70',
          accentText: 'text-emerald-700',
          accentBg: 'bg-emerald-50 border-emerald-100',
          secondaryText: 'text-emerald-800/70 font-sans',
          tag: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          container: 'bg-[#F2F6F1]',
          sidebar: 'bg-[#FAFDF9] border-l border-emerald-100/70',
          notesBg: 'bg-[#F3F7F2] border-emerald-100 text-emerald-900/85',
          navBtn: 'hover:bg-emerald-50 text-emerald-800'
        };
      case 'editorial':
        return {
          card: 'bg-[#FAF6EE] text-amber-950 border border-amber-200/50 font-serif',
          accentText: 'text-amber-800',
          accentBg: 'bg-amber-50/50 border-amber-100',
          secondaryText: 'text-amber-900/65 font-sans',
          tag: 'bg-amber-100/80 text-amber-900 border-amber-200',
          container: 'bg-[#F4EFE6]',
          sidebar: 'bg-[#FAF6EE] border-l border-amber-200/50',
          notesBg: 'bg-[#F4EEE2] border-amber-200/40 text-amber-950/80',
          navBtn: 'hover:bg-amber-50 text-amber-900'
        };
      case 'midnight':
      default:
        return {
          card: 'bg-gray-950 text-white border border-gray-800',
          accentText: 'text-indigo-400',
          accentBg: 'bg-indigo-950/40 border-indigo-900/50',
          secondaryText: 'text-gray-400 font-sans',
          tag: 'bg-indigo-950/80 text-indigo-300 border-indigo-900',
          container: 'bg-gray-900',
          sidebar: 'bg-gray-950 border-l border-gray-800',
          notesBg: 'bg-gray-900 border-gray-800 text-gray-300',
          navBtn: 'hover:bg-gray-800 text-gray-300'
        };
    }
  };

  const currentTheme = getThemeClasses();

  // --- Export stand-alone Slide Deck as Interactive Single HTML file ---
  const handleExportHTMLDeck = () => {
    if (!presentation) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${presentation.title} - Presentation</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap');
    
    body {
      font-family: 'Inter', sans-serif;
      overflow: hidden;
    }
    .font-serif-preset {
      font-family: 'Playfair Display', serif;
    }
    .font-mono-preset {
      font-family: 'JetBrains Mono', monospace;
    }
  </style>
</head>
<body class="bg-slate-900 text-white min-h-screen flex flex-col justify-between">
  
  <div class="px-8 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-950 select-none">
    <div class="flex items-center gap-2">
      <div class="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white">P</div>
      <div>
        <h1 class="text-sm font-bold tracking-tight">${presentation.title}</h1>
        <p class="text-[10px] text-slate-400 tracking-wider uppercase font-mono">${presentation.subtitle}</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <button onclick="toggleFullScreen()" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1">
        <i data-lucide="maximize"></i> Present Fullscreen
      </button>
    </div>
  </div>

  <main class="flex-1 flex flex-col justify-center items-center px-4 md:px-12 py-6 max-h-[calc(100vh-140px)]">
    <div id="slides-container" class="w-full max-w-5xl aspect-video rounded-2xl border border-slate-800 flex flex-col justify-center items-center p-8 md:p-12 shadow-2xl relative transition-all duration-300">
      <!-- Slides will be injected dynamically -->
    </div>
  </main>

  <div class="px-8 py-5 border-t border-slate-800 flex justify-between items-center bg-slate-950 select-none">
    <div class="text-xs text-slate-400 font-semibold font-mono">
      SLIDE <span id="slide-num">1</span> OF ${presentation.slides.length}
    </div>
    <div class="flex items-center gap-2">
      <button onclick="prevSlide()" class="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer">
        <i data-lucide="chevron-left"></i>
      </button>
      <button onclick="nextSlide()" class="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer">
        <i data-lucide="chevron-right"></i>
      </button>
    </div>
  </div>

  <script>
    const presentation = ${JSON.stringify(presentation)};
    let currentIndex = 0;

    const theme = "${theme}";
    const themeConfigs = {
      midnight: {
        bg: 'bg-gray-950', border: 'border-gray-800', text: 'text-white', subtitle: 'text-gray-400', accent: 'text-indigo-400', tag: 'bg-indigo-950/80 text-indigo-300 border-indigo-900', font: ''
      },
      swiss: {
        bg: 'bg-white', border: 'border-gray-200', text: 'text-gray-900', subtitle: 'text-gray-500', accent: 'text-indigo-600', tag: 'bg-indigo-100 text-indigo-800 border-indigo-200', font: ''
      },
      forest: {
        bg: 'bg-[#FAFDF9]', border: 'border-emerald-100/70', text: 'text-emerald-950', subtitle: 'text-emerald-800/70', accent: 'text-emerald-700', tag: 'bg-emerald-100 text-emerald-800 border-emerald-200', font: ''
      },
      editorial: {
        bg: 'bg-[#FAF6EE]', border: 'border-amber-200/50', text: 'text-amber-950', subtitle: 'text-amber-900/65', accent: 'text-amber-800', tag: 'bg-amber-100/80 text-amber-900 border-amber-200', font: 'font-serif-preset'
      }
    };

    const currentTheme = themeConfigs[theme] || themeConfigs.midnight;

    function renderSlide() {
      const slide = presentation.slides[currentIndex];
      const container = document.getElementById('slides-container');
      const numSpan = document.getElementById('slide-num');
      
      numSpan.innerText = currentIndex + 1;
      
      // Reset theme classes on slide body
      container.className = "w-full max-w-5xl aspect-video rounded-2xl flex flex-col justify-center items-start p-8 md:p-12 shadow-2xl relative transition-all duration-300 " + currentTheme.bg + " " + currentTheme.border + " " + currentTheme.text + " " + currentTheme.font;
      
      let innerHTML = '';

      if (slide.layout === 'title') {
        innerHTML = \`
          <div class="w-full text-center flex flex-col justify-center items-center flex-1">
            <span class="text-xs uppercase tracking-widest font-bold font-mono px-3 py-1 rounded-full \${currentTheme.tag} mb-4">Presentation Title</span>
            <h2 class="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">\${slide.header}</h2>
            \${slide.subtitle ? \`<p class="text-base md:text-lg \${currentTheme.subtitle}">\${slide.subtitle}</p>\` : ''}
          </div>
        \`;
      } else if (slide.layout === 'bullet') {
        innerHTML = \`
          <div class="w-full flex flex-col h-full justify-between flex-1">
            <div class="mb-4">
              \${slide.subtitle ? \`<span class="text-xs uppercase tracking-wider font-bold \${currentTheme.accent} mb-1 block">\${slide.subtitle}</span>\` : ''}
              <h2 class="text-2xl md:text-3xl font-bold tracking-tight">\${slide.header}</h2>
            </div>
            <ul class="space-y-4 flex-1 flex flex-col justify-center">
              \${(slide.bullets || []).map(b => \`
                <li class="flex items-start gap-3">
                  <span class="h-2 w-2 rounded-full bg-indigo-500 mt-2 shrink-0"></span>
                  <span class="text-base md:text-lg font-medium leading-relaxed">\${b}</span>
                </li>
              \`).join('')}
            </ul>
          </div>
        \`;
      } else if (slide.layout === 'two-column') {
        innerHTML = \`
          <div class="w-full flex flex-col h-full justify-between flex-1">
            <div class="mb-4">
              \${slide.subtitle ? \`<span class="text-xs uppercase tracking-wider font-bold \${currentTheme.accent} mb-1 block">\${slide.subtitle}</span>\` : ''}
              <h2 class="text-2xl md:text-3xl font-bold tracking-tight mb-4">\${slide.header}</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 items-center">
              <div class="bg-black/10 p-5 rounded-xl border border-white/5 h-full flex flex-col justify-center">
                <h4 class="text-xs font-bold uppercase tracking-wider mb-2 \${currentTheme.accent}">Comparative Focus A</h4>
                <p class="text-sm md:text-base leading-relaxed whitespace-pre-wrap">\${slide.leftColumn || ''}</p>
              </div>
              <div class="bg-black/10 p-5 rounded-xl border border-white/5 h-full flex flex-col justify-center">
                <h4 class="text-xs font-bold uppercase tracking-wider mb-2 \${currentTheme.accent}">Comparative Focus B</h4>
                <p class="text-sm md:text-base leading-relaxed whitespace-pre-wrap">\${slide.rightColumn || ''}</p>
              </div>
            </div>
          </div>
        \`;
      } else if (slide.layout === 'quote') {
        innerHTML = \`
          <div class="w-full flex flex-col h-full justify-center items-center text-center flex-1">
            <div class="text-5xl text-indigo-500/40 mb-3 select-none">“</div>
            <blockquote class="text-xl md:text-2xl font-serif italic max-w-3xl leading-relaxed mb-4">
              \${slide.quote || ''}
            </blockquote>
            \${slide.citation ? \`<cite class="text-xs font-mono tracking-widest uppercase \${currentTheme.accent} not-italic">— \${slide.citation}</cite>\` : ''}
          </div>
        \`;
      } else if (slide.layout === 'formula' || slide.layout === 'code') {
        innerHTML = \`
          <div class="w-full flex flex-col h-full justify-between flex-1">
            <div class="mb-4">
              \${slide.subtitle ? \`<span class="text-xs uppercase tracking-wider font-bold \${currentTheme.accent} mb-1 block">\${slide.subtitle}</span>\` : ''}
              <h2 class="text-2xl md:text-3xl font-bold tracking-tight mb-4">\${slide.header}</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-center">
              <div class="md:col-span-2 bg-slate-900/80 p-5 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto max-h-[220px]">
                <pre class="text-indigo-300">\${escapeHtml(slide.code || '')}</pre>
              </div>
              <div class="space-y-3">
                <h4 class="text-xs font-bold uppercase tracking-wider \${currentTheme.accent}">Technical Metrics</h4>
                <ul class="space-y-2">
                  \${(slide.bullets || []).map(b => \`
                    <li class="flex items-start gap-2 text-xs">
                      <span class="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></span>
                      <span>\${b}</span>
                    </li>
                  \`).join('')}
                </ul>
              </div>
            </div>
          </div>
        \`;
      }

      container.innerHTML = innerHTML;
    }

    function escapeHtml(string) {
      return String(string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function prevSlide() {
      if (currentIndex > 0) {
        currentIndex--;
        renderSlide();
      }
    }

    function nextSlide() {
      if (currentIndex < presentation.slides.length - 1) {
        currentIndex++;
        renderSlide();
      }
    }

    function toggleFullScreen() {
      const container = document.getElementById('slides-container');
      if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => {
          alert('Error enabling fullscreen: ' + err.message);
        });
      } else {
        document.exitFullscreen();
      }
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      }
    });

    renderSlide();
    lucide.createIcons();
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${presentation.title.toLowerCase().replace(/\s+/g, '_')}_deck.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Save Presentation back to Workspace (local database as JSON) ---
  const handleSaveToWorkspace = () => {
    if (!presentation || !onSaveDoc) return;
    
    // We can compile the presentation data as a clean JSON document type
    const uid = `presentation-doc-${Date.now()}`;
    const targetShelfId = shelves[0]?.id || 'shelf-default-backup';
    const presentationDoc: Document = {
      id: uid,
      title: `📊 Presentation: ${presentation.title}`,
      content: JSON.stringify(presentation, null, 2),
      type: 'json',
      size: new Blob([JSON.stringify(presentation)]).size,
      category: targetShelfId,
      tags: ['Presentation', 'AI Generated'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: false,
      isArchived: false,
      customPreviewColor: '#8b5cf6' // Purple theme color
    };

    // Save directly inside localStorage and update state
    const savedDocs = localStorage.getItem('doc_manager_documents');
    const existingDocs: Document[] = savedDocs ? JSON.parse(savedDocs) : [];
    const nextDocs = [...existingDocs, presentationDoc];
    localStorage.setItem('doc_manager_documents', JSON.stringify(nextDocs));
    
    // Alert the parent
    alert(`Successfully saved presentation "${presentation.title}" to your first workstation shelf!`);
  };

  // Filter list of docs for setup view
  const setupFilteredDocs = documents.filter(d => {
    if (d.isArchived) return false;
    const searchLower = setupSearch.toLowerCase();
    return d.title.toLowerCase().includes(searchLower) || d.tags.some(t => t.toLowerCase().includes(searchLower));
  });

  return (
    <div id="presentation-workspace-root" className="w-full flex-1 flex flex-col gap-6 select-none bg-gray-50/10 rounded-2xl">
      
      {!presentation ? (
        // ================= SETUP SCREEN =================
        <div className="bg-white rounded-2xl border border-gray-150 p-6 md:p-8 flex flex-col gap-8 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-5 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Presentation className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-gray-900 tracking-tight uppercase flex items-center gap-1.5">
                  AI Auto-Presentation Designer <Sparkles className="h-4 w-4 text-indigo-500 fill-current animate-pulse" />
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Select a cluster of workspace technical documents to synthesize into a professional presentation</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
              {['midnight', 'swiss', 'forest', 'editorial'].map((t) => (
                <button
                  key={t}
                  id={`theme-select-${t}`}
                  onClick={() => setTheme(t as PresentationTheme)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider transition-colors cursor-pointer ${
                    theme === t 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left/Middle Column - Document selectors */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-700">Cluster Selection</span>
                  <span className="text-[10px] text-gray-400">{selectedDocIds.length} cards checked for presentation</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDocIds(documents.filter(d => !d.isArchived).map(d => d.id))}
                    className="text-[10px] bg-white border border-gray-250 text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 font-bold transition-all cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDocIds([])}
                    className="text-[10px] bg-white border border-gray-250 text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 font-bold transition-all cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Search documents */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search and narrow down cluster files..."
                  value={setupSearch}
                  onChange={(e) => setSetupSearch(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl py-2.5 pl-4 pr-10 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <X className="absolute right-3 top-3 h-4 w-4 text-gray-400 cursor-pointer" onClick={() => setSetupSearch('')} />
              </div>

              {/* Grid lists of files */}
              <div className="max-h-[340px] overflow-y-auto border border-gray-150 rounded-xl p-3 bg-gray-50/20 space-y-2">
                {setupFilteredDocs.length > 0 ? (
                  setupFilteredDocs.map(doc => {
                    const isSelected = selectedDocIds.includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedDocIds(prev => prev.filter(id => id !== doc.id));
                          } else {
                            setSelectedDocIds(prev => [...prev, doc.id]);
                          }
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all ${
                          isSelected 
                            ? 'bg-indigo-50/40 border-indigo-200 hover:bg-indigo-50/60' 
                            : 'bg-white border-gray-150 hover:bg-gray-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {doc.type.slice(0, 3).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-800">{doc.title}</span>
                            <span className="text-[10px] text-gray-400 truncate max-w-[280px]">
                              Category: {shelves.find(s => s.id === doc.category)?.name || 'Default'} • size: {doc.size} bytes
                            </span>
                          </div>
                        </div>

                        <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                          isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-gray-400 text-xs font-semibold">No documents found matching search metrics</div>
                )}
              </div>
            </div>

            {/* Right Column - Presentation Controls / Details */}
            <div className="bg-gray-50/40 p-6 rounded-2xl border border-gray-150 flex flex-col gap-6 h-full justify-between">
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider pb-3 border-b border-gray-150">
                  <Sliders className="h-4 w-4 text-indigo-500" /> Designer parameters
                </div>

                {/* Focus / prompt focus */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aesthetic Focus or Goal</label>
                  <textarea
                    value={focusPrompt}
                    onChange={(e) => setFocusPrompt(e.target.value)}
                    placeholder="e.g. Focus on elasticity parameters, keep it incredibly technical, prepare for product audit..."
                    className="w-full text-xs border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white h-24 resize-none"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['Extremely Technical', 'Simple Overview', 'Executive pitch', 'Formulas focused'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFocusPrompt(preset)}
                        className="text-[9px] bg-white hover:bg-gray-100 border border-gray-200 rounded px-2 py-0.8 text-gray-600 transition-colors cursor-pointer font-medium"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Number of slides */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Requested slides count</label>
                    <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded">{slideCount} Slides</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="10"
                    value={slideCount}
                    onChange={(e) => setSlideCount(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1 bg-gray-200 rounded-lg appearance-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-150">
                <button
                  type="button"
                  id="generate-deck-btn"
                  onClick={handleGeneratePresentation}
                  disabled={selectedDocIds.length === 0 || isGenerating}
                  className={`w-full text-white py-3 px-4 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    selectedDocIds.length === 0 || isGenerating
                      ? 'bg-gray-300 cursor-not-allowed shadow-none'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 animate-pulse fill-current text-yellow-300" />
                      <span>Synthesize Auto-Presentation</span>
                    </>
                  )}
                </button>
                {selectedDocIds.length === 0 && (
                  <p className="text-[9px] text-red-500 font-medium text-center mt-2 animate-pulse">Check at least 1 file to generate slide deck</p>
                )}
              </div>
            </div>
          </div>

          {/* Generative Loading Screen Overlay */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-gray-900/70 backdrop-blur-md z-[100] flex flex-col justify-center items-center p-6 text-center select-none"
              >
                <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-gray-100 shadow-2xl flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                      <Presentation className="h-8 w-8 text-indigo-600 animate-bounce" />
                    </div>
                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-violet-600 flex items-center justify-center text-white text-[9px] font-bold animate-pulse">
                      AI
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Gemini Presenter drafting...</h3>
                    <p className="text-xs text-gray-400 font-medium">Auto-Presentation mode is compiling layout models, structuring speaker notes, and mapping story narratives.</p>
                  </div>

                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden relative">
                    <motion.div 
                      className="bg-indigo-600 h-full rounded-full"
                      animate={{ width: ['10%', '40%', '70%', '98%'] }}
                      transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
                    />
                  </div>

                  <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg animate-pulse">
                    {generationStep}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        // ================= PRESENTATION ACTIVE STAGE VIEW =================
        <div className={`flex flex-col h-full rounded-2xl overflow-hidden shadow-xl border border-gray-200/50`}>
          
          {/* Deck Top controller HUD */}
          <div className="bg-gray-900 text-white px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none border-b border-gray-800">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPresentation(null)}
                className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Reset presentation and open setup panel"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="h-8 w-px bg-gray-800" />
              
              <div>
                <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2 uppercase">
                  {presentation.title}
                  <span className="text-[9px] font-bold font-mono tracking-wider bg-indigo-900 text-indigo-200 px-1.5 py-0.2 rounded border border-indigo-800 uppercase">
                    {theme} Presets
                  </span>
                </h3>
                <p className="text-[10px] text-gray-400 tracking-wide mt-0.5">{presentation.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Autoplay controllers */}
              <div className="flex items-center gap-1 bg-gray-950 p-1 rounded-xl border border-gray-850">
                <button
                  onClick={() => setIsAutoplay(!isAutoplay)}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isAutoplay 
                      ? 'bg-emerald-600 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                  title={isAutoplay ? 'Stop auto-slides scroll' : 'Enable auto-play slideshow'}
                >
                  {isAutoplay ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  <span className="hidden lg:inline">{isAutoplay ? 'Autoplay' : 'Autoplay'}</span>
                </button>
                {isAutoplay && (
                  <select
                    value={autoplayInterval}
                    onChange={(e) => setAutoplayInterval(parseInt(e.target.value))}
                    className="bg-transparent text-[10px] font-mono text-gray-300 focus:outline-none px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    <option value="3" className="bg-gray-900 text-white">3s</option>
                    <option value="5" className="bg-gray-900 text-white">5s</option>
                    <option value="10" className="bg-gray-900 text-white">10s</option>
                    <option value="15" className="bg-gray-900 text-white">15s</option>
                  </select>
                )}
              </div>

              {/* View options */}
              <button
                type="button"
                onClick={() => setShowNotes(!showNotes)}
                className={`p-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  showNotes 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
                title="Toggle Speaker notes side panel"
              >
                <Eye className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsFullScreen(true)}
                className="p-2 bg-gray-800 text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                title="Full-screen mode (Escape to leave)"
              >
                <Maximize2 className="h-4 w-4" />
              </button>

              <div className="h-6 w-px bg-gray-800" />

              {/* Save or export button */}
              <button
                type="button"
                onClick={handleSaveToWorkspace}
                className="p-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                title="Save this Generated slide deck directly to your shelves"
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">Save</span>
              </button>

              <button
                type="button"
                onClick={handleExportHTMLDeck}
                className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                title="Export entire deck to stand-alone interactive offline HTML document"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Presenter Split Stage Grid */}
          <div className="flex-1 grid grid-cols-1 xl:grid-cols-4 min-h-[500px]">
            
            {/* Left/Middle Column - Slide Stage Canvas (Occupies 3 cols out of 4) */}
            <div className={`xl:col-span-3 ${currentTheme.container} p-6 flex flex-col justify-between max-h-[calc(100vh-220px)] overflow-y-auto`}>
              
              {/* IMMERSIVE COMPONENT SLIDE VIEW */}
              <div className="flex-1 flex flex-col justify-center items-center py-4">
                <div 
                  id="slideshow-stage-element"
                  className={`w-full max-w-4xl aspect-video rounded-3xl p-8 md:p-12 shadow-xl flex flex-col justify-between items-start transition-all relative select-text overflow-y-auto ${currentTheme.card}`}
                >
                  
                  {/* Floating slide format category badge */}
                  <div className="absolute top-6 right-6 flex items-center gap-2">
                    <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full border shadow-2xs font-mono select-none ${currentTheme.tag}`}>
                      {presentation.slides[currentSlideIndex].layout} slide
                    </span>
                    
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      title="Edit active slide content"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* ACTIVE SLIDE CONTENT DEPENDING ON LAYOUT */}
                  {isEditing ? (
                    // --- ACTIVE SLIDE EDIT PANEL ---
                    <div className="w-full flex-1 flex flex-col gap-4 font-sans text-xs">
                      <div className="pb-3 border-b border-gray-100/10 flex justify-between items-center w-full select-none">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-400">Edit active slide canvas</span>
                        <button onClick={() => setIsEditing(false)} className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold">Done</button>
                      </div>
                      
                      <div className="flex flex-col gap-3 overflow-y-auto max-h-[300px] pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="font-bold text-[9px] uppercase text-gray-400">Slide Title</label>
                            <input
                              type="text"
                              value={presentation.slides[currentSlideIndex].header}
                              onChange={(e) => handleUpdateSlideField('header', e.target.value)}
                              className="bg-black/20 border border-white/10 rounded p-2 text-white text-xs"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="font-bold text-[9px] uppercase text-gray-400">Slide Subtitle / Theme</label>
                            <input
                              type="text"
                              value={presentation.slides[currentSlideIndex].subtitle || ''}
                              onChange={(e) => handleUpdateSlideField('subtitle', e.target.value)}
                              className="bg-black/20 border border-white/10 rounded p-2 text-white text-xs"
                            />
                          </div>
                        </div>

                        {presentation.slides[currentSlideIndex].layout === 'bullet' && (
                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <label className="font-bold text-[9px] uppercase text-gray-400">Bullet takeaways</label>
                              <button onClick={handleAddSlideBullet} className="text-[9px] text-indigo-400 hover:underline flex items-center gap-0.5"><Plus className="h-3 w-3" /> Add bullet</button>
                            </div>
                            <div className="space-y-1.5">
                              {presentation.slides[currentSlideIndex].bullets?.map((bullet, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                  <input
                                    type="text"
                                    value={bullet}
                                    onChange={(e) => handleUpdateSlideBullet(idx, e.target.value)}
                                    className="bg-black/20 border border-white/10 rounded p-2 text-white text-xs flex-1"
                                  />
                                  <button onClick={() => handleRemoveSlideBullet(idx)} className="p-1.5 hover:bg-red-550/20 text-red-400 rounded"><X className="h-3 w-3" /></button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {presentation.slides[currentSlideIndex].layout === 'two-column' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="font-bold text-[9px] uppercase text-gray-400">Left column body</label>
                              <textarea
                                value={presentation.slides[currentSlideIndex].leftColumn || ''}
                                onChange={(e) => handleUpdateSlideField('leftColumn', e.target.value)}
                                className="bg-black/20 border border-white/10 rounded p-2 text-white text-xs h-24 resize-none"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="font-bold text-[9px] uppercase text-gray-400">Right column body</label>
                              <textarea
                                value={presentation.slides[currentSlideIndex].rightColumn || ''}
                                onChange={(e) => handleUpdateSlideField('rightColumn', e.target.value)}
                                className="bg-black/20 border border-white/10 rounded p-2 text-white text-xs h-24 resize-none"
                              />
                            </div>
                          </div>
                        )}

                        {presentation.slides[currentSlideIndex].layout === 'quote' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="font-bold text-[9px] uppercase text-gray-400">Quote statement</label>
                              <textarea
                                value={presentation.slides[currentSlideIndex].quote || ''}
                                onChange={(e) => handleUpdateSlideField('quote', e.target.value)}
                                className="bg-black/20 border border-white/10 rounded p-2 text-white text-xs h-20 resize-none"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="font-bold text-[9px] uppercase text-gray-400">Citation source</label>
                              <input
                                type="text"
                                value={presentation.slides[currentSlideIndex].citation || ''}
                                onChange={(e) => handleUpdateSlideField('citation', e.target.value)}
                                className="bg-black/20 border border-white/10 rounded p-2 text-white text-xs"
                              />
                            </div>
                          </div>
                        )}

                        {(presentation.slides[currentSlideIndex].layout === 'formula' || presentation.slides[currentSlideIndex].layout === 'code') && (
                          <div className="flex flex-col gap-1">
                            <label className="font-bold text-[9px] uppercase text-gray-400">Code payload / LaTeX Equation block</label>
                            <textarea
                              value={presentation.slides[currentSlideIndex].code || ''}
                              onChange={(e) => handleUpdateSlideField('code', e.target.value)}
                              className="bg-black/20 border border-white/10 rounded p-2 text-white text-xs h-32 resize-none font-mono"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // --- IMMERSIVE THEMATIC RENDER PATHS ---
                    <div className="w-full h-full flex flex-col justify-between flex-1">
                      
                      {presentation.slides[currentSlideIndex].layout === 'title' && (
                        <div className="w-full text-center flex flex-col justify-center items-center flex-1 py-8">
                          <span className={`text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full ${currentTheme.tag} mb-4 select-none`}>
                            {presentation.slides[currentSlideIndex].subtitle || 'Executive Overview'}
                          </span>
                          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-4 select-text">
                            {presentation.slides[currentSlideIndex].header}
                          </h2>
                          <div className="h-1 w-16 bg-indigo-600 rounded-full mb-6" />
                          <p className={`text-sm max-w-xl leading-relaxed ${currentTheme.secondaryText}`}>
                            {presentation.narrative}
                          </p>
                        </div>
                      )}

                      {presentation.slides[currentSlideIndex].layout === 'bullet' && (
                        <div className="w-full flex flex-col h-full justify-between flex-1">
                          <div className="mb-4">
                            {presentation.slides[currentSlideIndex].subtitle && (
                              <span className={`text-[10px] uppercase font-bold tracking-widest font-mono mb-1.5 block ${currentTheme.accentText}`}>
                                {presentation.slides[currentSlideIndex].subtitle}
                              </span>
                            )}
                            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-snug">
                              {presentation.slides[currentSlideIndex].header}
                            </h2>
                          </div>
                          <ul className="space-y-4 flex-1 flex flex-col justify-center">
                            {presentation.slides[currentSlideIndex].bullets?.map((b, idx) => (
                              <li key={idx} className="flex items-start gap-3.5">
                                <span className="h-2 w-2 rounded-full bg-indigo-500 mt-2 shrink-0 animate-ping" />
                                <span className="text-sm md:text-base font-semibold leading-relaxed text-gray-700 dark:text-gray-200">
                                  {b}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {presentation.slides[currentSlideIndex].layout === 'two-column' && (
                        <div className="w-full flex flex-col h-full justify-between flex-1">
                          <div className="mb-4">
                            {presentation.slides[currentSlideIndex].subtitle && (
                              <span className={`text-[10px] uppercase font-bold tracking-widest font-mono mb-1.5 block ${currentTheme.accentText}`}>
                                {presentation.slides[currentSlideIndex].subtitle}
                              </span>
                            )}
                            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-snug">
                              {presentation.slides[currentSlideIndex].header}
                            </h2>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 items-center">
                            <div className={`p-5 rounded-2xl border flex flex-col justify-center h-full ${currentTheme.notesBg}`}>
                              <h4 className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${currentTheme.accentText}`}>Comparative Perspective A</h4>
                              <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                {presentation.slides[currentSlideIndex].leftColumn}
                              </p>
                            </div>
                            <div className={`p-5 rounded-2xl border flex flex-col justify-center h-full ${currentTheme.notesBg}`}>
                              <h4 className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${currentTheme.accentText}`}>Comparative Perspective B</h4>
                              <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                {presentation.slides[currentSlideIndex].rightColumn}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {presentation.slides[currentSlideIndex].layout === 'quote' && (
                        <div className="w-full flex flex-col h-full justify-center items-center text-center flex-1 py-8">
                          <div className="text-5xl text-indigo-500/30 mb-3 select-none font-serif font-black">“</div>
                          <blockquote className="text-lg md:text-xl italic max-w-2xl leading-relaxed mb-4 font-semibold select-text">
                            {presentation.slides[currentSlideIndex].quote}
                          </blockquote>
                          {presentation.slides[currentSlideIndex].citation && (
                            <cite className={`text-[10px] font-mono tracking-widest uppercase font-bold not-italic ${currentTheme.accentText}`}>
                              — {presentation.slides[currentSlideIndex].citation}
                            </cite>
                          )}
                        </div>
                      )}

                      {(presentation.slides[currentSlideIndex].layout === 'formula' || presentation.slides[currentSlideIndex].layout === 'code') && (
                        <div className="w-full flex flex-col h-full justify-between flex-1">
                          <div className="mb-4">
                            {presentation.slides[currentSlideIndex].subtitle && (
                              <span className={`text-[10px] uppercase font-bold tracking-widest font-mono mb-1.5 block ${currentTheme.accentText}`}>
                                {presentation.slides[currentSlideIndex].subtitle}
                              </span>
                            )}
                            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-snug">
                              {presentation.slides[currentSlideIndex].header}
                            </h2>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-center">
                            <div className="md:col-span-2 bg-gray-900/90 text-indigo-300 p-5 rounded-2xl border border-gray-800 font-mono text-xs overflow-x-auto max-h-[220px] shadow-inner select-text">
                              {presentation.slides[currentSlideIndex].layout === 'formula' && presentation.slides[currentSlideIndex].code?.includes('$') ? (
                                <div className="p-4 bg-gray-950/40 rounded flex items-center justify-center text-lg">
                                  <MathRenderer math={presentation.slides[currentSlideIndex].code.replace(/\$/g, '')} block={true} />
                                </div>
                              ) : (
                                <pre className="leading-relaxed whitespace-pre-wrap">{presentation.slides[currentSlideIndex].code}</pre>
                              )}
                            </div>
                            <div className="space-y-3 bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-white/5 h-full flex flex-col justify-center">
                              <h4 className={`text-[10px] font-bold uppercase tracking-wider ${currentTheme.accentText}`}>Technical Highlights</h4>
                              <ul className="space-y-2">
                                {presentation.slides[currentSlideIndex].bullets?.map((b, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-[11px] font-semibold">
                                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                    <span>{b}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* Aesthetic slide indicator stamp */}
                  <div className="absolute bottom-6 right-6 text-[10px] font-mono font-extrabold tracking-widest select-none opacity-40">
                    SLIDE {currentSlideIndex + 1} / {presentation.slides.length}
                  </div>
                </div>
              </div>

              {/* Bottom slide selection navigator track */}
              <div className="flex justify-between items-center bg-white dark:bg-gray-950 px-5 py-3 rounded-2xl border border-gray-200/65 select-none shadow-xs">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (currentSlideIndex > 0) {
                        setCurrentSlideIndex(prev => prev - 1);
                      }
                    }}
                    disabled={currentSlideIndex === 0}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-500 disabled:text-gray-300 disabled:pointer-events-none cursor-pointer"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-xs font-mono font-bold text-gray-700">
                    {currentSlideIndex + 1} / {presentation.slides.length}
                  </span>
                  <button
                    onClick={() => {
                      if (currentSlideIndex < presentation.slides.length - 1) {
                        setCurrentSlideIndex(prev => prev + 1);
                      }
                    }}
                    disabled={currentSlideIndex === presentation.slides.length - 1}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-500 disabled:text-gray-300 disabled:pointer-events-none cursor-pointer"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                {/* Bubble bullet indicators */}
                <div className="flex items-center gap-1.5">
                  {presentation.slides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`h-2.5 rounded-full transition-all cursor-pointer ${
                        currentSlideIndex === idx 
                          ? 'w-6 bg-indigo-600' 
                          : 'w-2.5 bg-gray-200 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>

                <div className="text-[10px] font-mono text-gray-400 font-bold">
                  USE KEYBOARD ◄ / ► OR SPACE BAR TO NAVIGATE
                </div>
              </div>

            </div>

            {/* Right Column - Presenter Console & Speaker Notes (Occupies 1 col out of 4) */}
            <AnimatePresence>
              {showNotes && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ opacity: 0, width: 0 }}
                  className={`border-l border-gray-200 h-full flex flex-col justify-between max-h-[calc(100vh-220px)] overflow-hidden bg-white ${currentTheme.sidebar}`}
                >
                  <div className="flex-1 flex flex-col overflow-y-auto p-5 gap-5">
                    
                    {/* Speaker script section */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-2 border-b border-gray-100">
                        <FileText className="h-3.5 w-3.5 text-indigo-500" /> Speaker Notes Script
                      </div>
                      <div className={`p-4 rounded-xl border leading-relaxed text-xs font-semibold whitespace-pre-wrap select-text max-h-[220px] overflow-y-auto ${currentTheme.notesBg}`}>
                        {presentation.slides[currentSlideIndex].speakerNotes}
                      </div>
                    </div>

                    {/* Stage visual recommendation */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-2 border-b border-gray-100">
                        <Maximize2 className="h-3.5 w-3.5 text-indigo-500" /> Suggested Stage Visuals
                      </div>
                      <div className="bg-gray-50/50 p-4 border border-gray-200/50 text-gray-500 rounded-xl leading-relaxed text-[11px] font-medium whitespace-pre-wrap">
                        {presentation.slides[currentSlideIndex].visualDescription}
                      </div>
                    </div>

                    {/* Quick navigation slides track */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-2 border-b border-gray-100">
                        <List className="h-3.5 w-3.5 text-indigo-500" /> Slides Index Map
                      </div>
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {presentation.slides.map((slide, idx) => (
                          <div
                            key={slide.slideNumber}
                            onClick={() => setCurrentSlideIndex(idx)}
                            className={`flex gap-2.5 items-center p-2 rounded-lg cursor-pointer transition-colors text-xs font-bold ${
                              currentSlideIndex === idx 
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' 
                                : 'hover:bg-gray-50 text-gray-500 border border-transparent'
                            }`}
                          >
                            <span className="font-mono text-[10px] text-indigo-400">#{slide.slideNumber}</span>
                            <span className="truncate">{slide.header}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Full Screen Interactive Presentation Stage portal */}
          <AnimatePresence>
            {isFullScreen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black z-[120] flex flex-col justify-between p-8 select-text"
              >
                <div className="flex justify-between items-center text-white/50 text-xs select-none">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold tracking-wider uppercase">{presentation.title}</span>
                    <span className="h-1 w-1 bg-white/20 rounded-full" />
                    <span>Slide {currentSlideIndex + 1} of {presentation.slides.length}</span>
                  </div>
                  <button
                    onClick={() => setIsFullScreen(false)}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 hover:text-white rounded text-[10px] tracking-wider uppercase font-bold"
                  >
                    Exit Presentation (ESC)
                  </button>
                </div>

                <div className="flex-1 flex justify-center items-center py-6">
                  <div className="w-full max-w-5xl aspect-video bg-gray-950 rounded-3xl border border-white/5 shadow-2xl flex flex-col justify-between p-12 relative overflow-y-auto text-white">
                    
                    {/* Render active slide in full-screen */}
                    {presentation.slides[currentSlideIndex].layout === 'title' ? (
                      <div className="w-full text-center flex flex-col justify-center items-center flex-1 py-12">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/10 text-indigo-300 border border-white/5 mb-4">
                          {presentation.slides[currentSlideIndex].subtitle || 'Executive Overview'}
                        </span>
                        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 select-text leading-tight text-white">
                          {presentation.slides[currentSlideIndex].header}
                        </h2>
                        <div className="h-1 w-20 bg-indigo-600 rounded-full mb-6" />
                        <p className="text-sm md:text-base max-w-2xl text-gray-400 leading-relaxed">
                          {presentation.narrative}
                        </p>
                      </div>
                    ) : presentation.slides[currentSlideIndex].layout === 'bullet' ? (
                      <div className="w-full flex flex-col h-full justify-between flex-1">
                        <div className="mb-4">
                          {presentation.slides[currentSlideIndex].subtitle && (
                            <span className="text-[10px] uppercase font-bold tracking-widest font-mono mb-1.5 block text-indigo-400">
                              {presentation.slides[currentSlideIndex].subtitle}
                            </span>
                          )}
                          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                            {presentation.slides[currentSlideIndex].header}
                          </h2>
                        </div>
                        <ul className="space-y-5 flex-1 flex flex-col justify-center">
                          {presentation.slides[currentSlideIndex].bullets?.map((b, idx) => (
                            <li key={idx} className="flex items-start gap-4">
                              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 mt-2 shrink-0 animate-pulse" />
                              <span className="text-lg md:text-xl font-semibold leading-relaxed text-gray-200">
                                {b}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : presentation.slides[currentSlideIndex].layout === 'two-column' ? (
                      <div className="w-full flex flex-col h-full justify-between flex-1">
                        <div className="mb-4">
                          {presentation.slides[currentSlideIndex].subtitle && (
                            <span className="text-[10px] uppercase font-bold tracking-widest font-mono mb-1.5 block text-indigo-400">
                              {presentation.slides[currentSlideIndex].subtitle}
                            </span>
                          )}
                          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-6">
                            {presentation.slides[currentSlideIndex].header}
                          </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 items-center">
                          <div className="bg-white/5 p-6 rounded-2xl border border-white/5 h-full flex flex-col justify-center">
                            <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-indigo-400">Comparative Perspective A</h4>
                            <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium text-gray-300">
                              {presentation.slides[currentSlideIndex].leftColumn}
                            </p>
                          </div>
                          <div className="bg-white/5 p-6 rounded-2xl border border-white/5 h-full flex flex-col justify-center">
                            <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-indigo-400">Comparative Perspective B</h4>
                            <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium text-gray-300">
                              {presentation.slides[currentSlideIndex].rightColumn}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : presentation.slides[currentSlideIndex].layout === 'quote' ? (
                      <div className="w-full flex flex-col h-full justify-center items-center text-center flex-1 py-12">
                        <div className="text-6xl text-indigo-500/30 mb-4 font-serif font-black">“</div>
                        <blockquote className="text-xl md:text-3xl italic max-w-3xl leading-relaxed mb-6 font-semibold text-gray-200">
                          {presentation.slides[currentSlideIndex].quote}
                        </blockquote>
                        {presentation.slides[currentSlideIndex].citation && (
                          <cite className="text-xs font-mono tracking-widest uppercase font-bold not-italic text-indigo-400">
                            — {presentation.slides[currentSlideIndex].citation}
                          </cite>
                        )}
                      </div>
                    ) : (
                      <div className="w-full flex flex-col h-full justify-between flex-1">
                        <div className="mb-4">
                          {presentation.slides[currentSlideIndex].subtitle && (
                            <span className="text-[10px] uppercase font-bold tracking-widest font-mono mb-1.5 block text-indigo-400">
                              {presentation.slides[currentSlideIndex].subtitle}
                            </span>
                          )}
                          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-6">
                            {presentation.slides[currentSlideIndex].header}
                          </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1 items-center">
                          <div className="md:col-span-2 bg-slate-900/90 text-indigo-300 p-6 rounded-2xl border border-white/5 font-mono text-xs overflow-x-auto max-h-[260px] shadow-inner">
                            {presentation.slides[currentSlideIndex].layout === 'formula' && presentation.slides[currentSlideIndex].code?.includes('$') ? (
                              <div className="p-4 bg-gray-950/40 rounded flex items-center justify-center text-xl">
                                <MathRenderer math={presentation.slides[currentSlideIndex].code.replace(/\$/g, '')} block={true} />
                              </div>
                            ) : (
                              <pre className="leading-relaxed whitespace-pre-wrap">{presentation.slides[currentSlideIndex].code}</pre>
                            )}
                          </div>
                          <div className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/5 h-full flex flex-col justify-center">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Technical Highlights</h4>
                            <ul className="space-y-2.5">
                              {presentation.slides[currentSlideIndex].bullets?.map((b, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-xs md:text-sm font-semibold text-gray-300">
                                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                <div className="flex justify-between items-center text-white/50 text-xs select-none">
                  <span>Press ◄ / ► arrow keys to navigate slides</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (currentSlideIndex > 0) setCurrentSlideIndex(prev => prev - 1);
                      }}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span>{currentSlideIndex + 1} / {presentation.slides.length}</span>
                    <button
                      onClick={() => {
                        if (currentSlideIndex < presentation.slides.length - 1) setCurrentSlideIndex(prev => prev + 1);
                      }}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}

    </div>
  );
}
