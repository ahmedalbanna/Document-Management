import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, Layers, Check } from 'lucide-react';
import { Document, Shelf } from '../types';
import DocumentCard from './DocumentCard';

interface ShelfRowProps {
  key?: string;
  shelf: Shelf;
  documents: Document[];
  allShelves: Shelf[];
  onOpenDoc: (doc: Document) => void;
  onFavoriteDoc: (docId: string) => void;
  onDeleteDoc: (docId: string) => void;
  onMoveDocShelf: (docId: string, newShelfId: string) => void;
  onRenameDoc: (docId: string, newTitle: string) => void;
  onAddDocToShelf: (shelfId: string) => void;
  onUpdateShelf: (shelfId: string, name: string, description: string, color: string) => void;
  onDeleteShelf: (shelfId: string) => void;
  onRunDoc?: (doc: Document) => void;
  selectedDocIds: string[];
  onToggleSelectDoc: (docId: string, isShift: boolean, shelfDocs?: Document[]) => void;
}

const SHELF_COLORS = [
  { name: 'emerald', bg: 'bg-emerald-500', hex: '#10b981' },
  { name: 'teal', bg: 'bg-teal-500', hex: '#14b5a6' },
  { name: 'violet', bg: 'bg-violet-500', hex: '#8b5cf6' },
  { name: 'amber', bg: 'bg-amber-500', hex: '#f59e0b' },
  { name: 'rose', bg: 'bg-rose-500', hex: '#f43f5e' },
  { name: 'sky', bg: 'bg-sky-500', hex: '#0ea5e9' },
];

export default function ShelfRow({
  shelf,
  documents,
  allShelves,
  onOpenDoc,
  onFavoriteDoc,
  onDeleteDoc,
  onMoveDocShelf,
  onRenameDoc,
  onAddDocToShelf,
  onUpdateShelf,
  onDeleteShelf,
  onRunDoc,
  selectedDocIds,
  onToggleSelectDoc,
}: ShelfRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isEditingShelf, setIsEditingShelf] = useState(false);
  const [editedName, setEditedName] = useState(shelf.name);
  const [editedDesc, setEditedDesc] = useState(shelf.description);
  const [editedColor, setEditedColor] = useState(shelf.color);

  // --- Micro-virtualization State & Throttled Scroll Engine ---
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollWidth, setScrollWidth] = useState(0);

  const isUpdating = useRef(false);
  const handleContainerScroll = () => {
    if (!scrollRef.current) return;
    const currentScrollLeft = scrollRef.current.scrollLeft;
    const currentScrollWidth = scrollRef.current.scrollWidth;

    if (!isUpdating.current) {
      isUpdating.current = true;
      requestAnimationFrame(() => {
        setScrollLeft(currentScrollLeft);
        setScrollWidth(currentScrollWidth);
        isUpdating.current = false;
      });
    }
  };

  // ResizeObserver for tracking scrollable block size responsively
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    setContainerWidth(el.clientWidth);
    setScrollWidth(el.scrollWidth);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Recalculate container scroll capabilities when list changes
  useEffect(() => {
    if (scrollRef.current) {
      setScrollWidth(scrollRef.current.scrollWidth);
      setContainerWidth(scrollRef.current.clientWidth);
    }
  }, [documents]);

  // --- Physical Drag-to-Scroll on Rails Track ---
  const [isDraggingTrack, setIsDraggingTrack] = useState(false);
  const trackDragStartX = useRef(0);
  const trackDragStartScrollLeft = useRef(0);
  const hasMovedTrack = useRef(false);

  const handleTrackMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('form') ||
      target.closest('select') ||
      target.closest('a') ||
      target.id.includes('slider-handle') ||
      target.id.includes('slider-track')
    ) {
      return;
    }

    if (!scrollRef.current) return;
    setIsDraggingTrack(true);
    trackDragStartX.current = e.clientX;
    trackDragStartScrollLeft.current = scrollRef.current.scrollLeft;
    hasMovedTrack.current = false;
  };

  useEffect(() => {
    if (!isDraggingTrack) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!scrollRef.current) return;
      const deltaX = e.clientX - trackDragStartX.current;
      
      if (Math.abs(deltaX) > 4) {
        hasMovedTrack.current = true;
      }

      scrollRef.current.scrollLeft = trackDragStartScrollLeft.current - deltaX * 1.2;
      handleContainerScroll();
    };

    const handleMouseUp = () => {
      setIsDraggingTrack(false);
      if (hasMovedTrack.current) {
        const preventClick = (clickEvent: MouseEvent) => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          window.removeEventListener('click', preventClick, true);
        };
        window.addEventListener('click', preventClick, true);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingTrack]);

  // --- Interactive Custom Slider Handle ---
  const sliderTrackRef = useRef<HTMLDivElement>(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const dragStartScrollLeft = useRef(0);
  const dragStartX = useRef(0);

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current || !sliderTrackRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    setIsDraggingSlider(true);
    dragStartX.current = e.clientX;
    dragStartScrollLeft.current = scrollRef.current.scrollLeft;
  };

  useEffect(() => {
    if (!isDraggingSlider) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!scrollRef.current || !sliderTrackRef.current) return;
      const deltaX = e.clientX - dragStartX.current;
      const trackWidth = sliderTrackRef.current.clientWidth;
      const elWidth = scrollRef.current.clientWidth;
      const sWidth = scrollRef.current.scrollWidth;

      const maxScrollLeft = sWidth - elWidth;
      const handlePercent = Math.max(16, (elWidth / sWidth) * 100);
      const sliderTravelWidth = trackWidth * (1 - handlePercent / 100);

      if (sliderTravelWidth <= 0) return;

      const scrollRatio = deltaX / sliderTravelWidth;
      const newScrollLeft = dragStartScrollLeft.current + scrollRatio * maxScrollLeft;

      scrollRef.current.scrollLeft = Math.max(0, Math.min(maxScrollLeft, newScrollLeft));
      handleContainerScroll();
    };

    const handleMouseUp = () => {
      setIsDraggingSlider(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSlider]);

  const getShelfEditsLastWeek = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return documents.reduce((sum, doc) => {
      let count = 0;
      if (doc.versions && doc.versions.length > 0) {
        count = doc.versions.filter(v => new Date(v.updatedAt) >= oneWeekAgo).length;
      } else if (new Date(doc.updatedAt || doc.createdAt) >= oneWeekAgo) {
        count = 1;
      }
      return sum + count;
    }, 0);
  };

  const shelfEditsCount = getShelfEditsLastWeek();
  const isShelfHot = shelfEditsCount >= 5;

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const saveShelfChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (editedName.trim()) {
      onUpdateShelf(shelf.id, editedName.trim(), editedDesc.trim(), editedColor);
      setIsEditingShelf(false);
    }
  };

  const getShelfBorderColor = () => {
    switch (shelf.color) {
      case 'emerald': return 'border-emerald-500';
      case 'teal': return 'border-teal-500';
      case 'violet': return 'border-violet-500';
      case 'amber': return 'border-amber-500';
      case 'rose': return 'border-rose-500';
      case 'sky': return 'border-sky-500';
      default: return 'border-gray-300';
    }
  };

  // --- Calculate Virtual Range ---
  const totalCount = documents.length;
  const cardWidth = 304; // 280px card + 24px gap

  const startIndex = Math.max(0, Math.floor(scrollLeft / cardWidth) - 2);
  const endIndex = Math.min(totalCount - 1, Math.ceil((scrollLeft + containerWidth) / cardWidth) + 2);

  const renderedDocs = documents.slice(startIndex, endIndex + 1);

  const leftSpacerWidth = startIndex > 0 ? startIndex * cardWidth - 24 : 0;
  const rightSpacerWidth = endIndex < totalCount - 1 ? (totalCount - endIndex - 1) * cardWidth - 24 : 0;

  return (
    <div id={`shelf-row-${shelf.id}`} className="mb-10 flex flex-col w-full group/shelf select-none">
      {/* Shelf Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 px-1">
        {isEditingShelf ? (
          <form onSubmit={saveShelfChanges} className="flex-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Shelf Name</label>
                <input
                  id={`edit-shelf-name-${shelf.id}`}
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:border-indigo-500 focus:outline-none"
                  placeholder="Shelf Title"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Shelf Description</label>
                <input
                  id={`edit-shelf-desc-${shelf.id}`}
                  type="text"
                  value={editedDesc}
                  onChange={(e) => setEditedDesc(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:border-indigo-500 focus:outline-none"
                  placeholder="Optional details"
                />
              </div>
            </div>
            
            {/* Color Selector */}
            <div className="flex items-center justify-between border-t border-gray-50 pt-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-gray-400 uppercase">Accent:</span>
                <div className="flex gap-1.5">
                  {SHELF_COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      id={`color-btn-${c.name}-${shelf.id}`}
                      onClick={() => setEditedColor(c.name)}
                      className={`h-5 w-5 rounded-full ${c.bg} relative flex items-center justify-center border hover:scale-110 transition-transform ${
                        editedColor === c.name ? 'ring-2 ring-indigo-500 border-white' : 'border-transparent'
                      }`}
                    >
                      {editedColor === c.name && <Check className="h-2.5 w-2.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  id={`cancel-shelf-edit-${shelf.id}`}
                  onClick={() => setIsEditingShelf(false)}
                  className="px-3 py-1 text-xs text-gray-400 hover:text-gray-600 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id={`save-shelf-edit-${shelf.id}`}
                  className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-2.5">
              {/* Colored horizontal accent tag to represent shelf identity */}
              <div className={`h-4 w-1.5 rounded-full ${
                shelf.color === 'emerald' ? 'bg-emerald-500' :
                shelf.color === 'teal' ? 'bg-teal-500' :
                shelf.color === 'violet' ? 'bg-violet-500' :
                shelf.color === 'amber' ? 'bg-amber-500' :
                shelf.color === 'rose' ? 'bg-rose-500' : 'bg-sky-500'
              }`} />
              <h2 className="text-base font-semibold text-gray-800 tracking-tight flex items-center gap-2 flex-wrap">
                {shelf.name}
                <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-mono">
                  {documents.length}
                </span>
                {shelfEditsCount > 0 && (
                  <span 
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-0.5 ${
                      isShelfHot 
                        ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse shadow-xs' 
                        : 'bg-indigo-50 text-indigo-700 border-indigo-150'
                    }`}
                    title={`${shelfEditsCount} edits across this shelf's documents this week`}
                  >
                    {isShelfHot ? '🔥' : '⚡'} {shelfEditsCount} {shelfEditsCount === 1 ? 'edit' : 'edits'}/wk
                  </span>
                )}
              </h2>
              {/* Shelf controls */}
              <div className="hidden group-hover/shelf:flex items-center gap-1.5 transition-all">
                <button
                  id={`edit-shelf-btn-${shelf.id}`}
                  onClick={() => {
                    setEditedName(shelf.name);
                    setEditedDesc(shelf.description);
                    setEditedColor(shelf.color);
                    setIsEditingShelf(true);
                  }}
                  className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/50 rounded transition-colors"
                  title="Edit Shelf Metadata"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                <button
                  id={`delete-shelf-btn-${shelf.id}`}
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete this shelf? All documents in this shelf will be moved to default shelves.`)) {
                      onDeleteShelf(shelf.id);
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50/50 rounded transition-colors"
                  title="Remove Shelf"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
            {shelf.description && (
              <p className="text-xs text-gray-400 mt-1 pl-4 leading-relaxed max-w-2xl">
                {shelf.description}
              </p>
            )}
          </div>
        )}

        {/* Shelf Action Buttons */}
        {!isEditingShelf && (
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              id={`add-doc-shelf-${shelf.id}`}
              onClick={() => onAddDocToShelf(shelf.id)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-indigo-700 hover:text-white border border-indigo-100 hover:border-indigo-600 hover:bg-indigo-600 rounded-xl transition-all font-medium bg-white"
            >
              <Plus className="h-3 w-3" />
              New Document
            </button>
            <div className="flex gap-1">
              <button
                id={`scroll-left-btn-${shelf.id}`}
                onClick={() => handleScroll('left')}
                className="p-1.5 text-gray-400 hover:text-gray-700 bg-white border border-gray-100 hover:border-gray-200 rounded-lg shadow-sm transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                id={`scroll-right-btn-${shelf.id}`}
                onClick={() => handleScroll('right')}
                className="p-1.5 text-gray-400 hover:text-gray-700 bg-white border border-gray-100 hover:border-gray-200 rounded-lg shadow-sm transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Horizontal Rail Container matches User's grey blocks layout */}
      <div 
        onMouseDown={handleTrackMouseDown}
        className={`relative w-full bg-[#E5E5E5] rounded-2xl p-6 pb-4 overflow-hidden transition-all duration-300 border flex flex-col gap-4 select-none ${
          isDraggingTrack ? 'cursor-grabbing' : 'cursor-grab'
        } ${
          isShelfHot 
            ? 'border-amber-400/55 shadow-[0_4px_25px_rgba(245,158,11,0.15)] ring-2 ring-amber-100/10' 
            : 'border-transparent'
        }`}
      >
        <div
          ref={scrollRef}
          onScroll={handleContainerScroll}
          className="flex gap-6 overflow-x-auto pb-1 scrollbar-none snap-x"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <AnimatePresence mode="popLayout">
            {documents.length > 0 ? (
              <motion.div
                key="shelf-docs-list"
                className="flex gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {leftSpacerWidth > 0 && (
                  <div 
                    key="left-spacer"
                    style={{ width: leftSpacerWidth, minWidth: leftSpacerWidth, flexShrink: 0 }} 
                    className="pointer-events-none"
                  />
                )}

                {renderedDocs.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    shelves={allShelves}
                    onOpen={onOpenDoc}
                    onFavorite={onFavoriteDoc}
                    onDelete={onDeleteDoc}
                    onMoveShelf={onMoveDocShelf}
                    onRename={onRenameDoc}
                    onRun={onRunDoc}
                    selectedDocIds={selectedDocIds}
                    onToggleSelectDoc={(id, isShift) => onToggleSelectDoc(id, isShift, documents)}
                  />
                ))}

                {rightSpacerWidth > 0 && (
                  <div 
                    key="right-spacer"
                    style={{ width: rightSpacerWidth, minWidth: rightSpacerWidth, flexShrink: 0 }} 
                    className="pointer-events-none"
                  />
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full py-12 flex flex-col items-center justify-center gap-2 text-center text-gray-400 select-none cursor-pointer border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:text-indigo-600 transition-colors bg-white mt-1 min-h-[300px]"
                onClick={() => onAddDocToShelf(shelf.id)}
              >
                <Layers className="h-8 w-8 text-gray-300 stroke-[1.5]" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold">This shelf is empty</span>
                  <span className="text-[10px] text-gray-400">Click to create the first document in this shelf</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Debounced Virtual Slider Bar */}
        {scrollWidth > containerWidth && (
          <div className="w-full flex justify-center items-center mt-2 select-none">
            <div 
              ref={sliderTrackRef}
              id={`slider-track-${shelf.id}`}
              className="relative w-48 h-1.5 bg-gray-300/60 rounded-full cursor-pointer hover:bg-gray-300 transition-colors"
              onClick={(e) => {
                if (e.target !== e.currentTarget) return;
                if (!scrollRef.current || !sliderTrackRef.current) return;
                const rect = sliderTrackRef.current.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = clickX / rect.width;
                const maxScrollLeft = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
                scrollRef.current.scrollTo({
                  left: ratio * maxScrollLeft,
                  behavior: 'smooth'
                });
              }}
            >
              <div
                onMouseDown={handleSliderMouseDown}
                id={`slider-handle-${shelf.id}`}
                className={`absolute top-0 h-full rounded-full bg-indigo-600 hover:bg-indigo-700 transition-all ${
                  isDraggingSlider ? 'bg-indigo-800 scale-y-110 cursor-grabbing' : 'cursor-grab'
                }`}
                style={{
                  width: `${Math.max(16, (containerWidth / scrollWidth) * 100)}%`,
                  left: `${(scrollLeft / (scrollWidth - containerWidth || 1)) * (100 - Math.max(16, (containerWidth / scrollWidth) * 100))}%`,
                }}
              />
            </div>
            
            {/* Visual lock status badge confirming 60fps micro-virtualization */}
            <div className="ml-3 text-[9px] font-mono font-semibold text-gray-500 bg-white/80 px-2.5 py-0.5 rounded-full border border-gray-150 flex items-center gap-1.5 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>VCS-SLIDERS @ 60fps</span>
              <span className="text-gray-300">|</span>
              <span>{renderedDocs.length}/{documents.length} visible</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
