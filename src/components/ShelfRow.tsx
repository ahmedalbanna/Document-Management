import React, { useRef } from 'react';
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
}: ShelfRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isEditingShelf, setIsEditingShelf] = React.useState(false);
  const [editedName, setEditedName] = React.useState(shelf.name);
  const [editedDesc, setEditedDesc] = React.useState(shelf.description);
  const [editedColor, setEditedColor] = React.useState(shelf.color);

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
              <h2 className="text-base font-semibold text-gray-800 tracking-tight flex items-center gap-2">
                {shelf.name}
                <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-mono">
                  {documents.length}
                </span>
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
      <div className="relative w-full bg-[#E5E5E5] rounded-2xl p-6 overflow-hidden">
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-1 scrollbar-none snap-x"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <AnimatePresence mode="popLayout">
            {documents.length > 0 ? (
              documents.map((doc) => (
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
                />
              ))
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
      </div>
    </div>
  );
}
