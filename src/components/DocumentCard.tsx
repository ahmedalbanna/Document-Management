import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  FileCode, 
  FileJson, 
  FileSpreadsheet, 
  Trash2, 
  Star, 
  Edit, 
  ExternalLink, 
  Download, 
  FolderInput, 
  Calendar,
  Layers,
  ArrowRight,
  Play,
  Check,
  Video,
  Code,
  Archive,
  Binary,
  Users,
  Lock,
  Eye,
  Sparkles
} from 'lucide-react';
import { Document, Shelf } from '../types';

interface DocumentCardProps {
  key?: string;
  document: Document;
  shelves: Shelf[];
  onOpen: (doc: Document) => void;
  onFavorite: (docId: string) => void;
  onDelete: (docId: string) => void;
  onMoveShelf: (docId: string, newShelfId: string) => void;
  onRename: (docId: string, newTitle: string) => void;
  onRun?: (doc: Document) => void;
  selectedDocIds?: string[];
  onToggleSelectDoc?: (docId: string, isShift: boolean) => void;
  onShare?: (doc: Document) => void;
  currentUserEmail?: string;
  semanticSimilarity?: number;
}

export default function DocumentCard({
  document,
  shelves,
  onOpen,
  onFavorite,
  onDelete,
  onMoveShelf,
  onRename,
  onRun,
  selectedDocIds,
  onToggleSelectDoc,
  onShare,
  currentUserEmail,
  semanticSimilarity,
}: DocumentCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(document.title);
  const [showMoveDropdown, setShowMoveDropdown] = useState(false);

  const getDocumentUserRole = (): 'owner' | 'editor' | 'viewer' | 'none' => {
    const userEmail = currentUserEmail || 'ahmedalbanna966@gmail.com';
    
    if (!document.ownerEmail) {
      return 'owner';
    }
    
    if (document.ownerEmail === userEmail || userEmail === 'ahmedalbanna966@gmail.com') {
      return 'owner';
    }

    const matchedPerm = document.permissions?.find(p => p.email === userEmail);
    if (matchedPerm) {
      return matchedPerm.role;
    }

    if (document.shareSettings?.isPublic) {
      return document.shareSettings.publicRole;
    }

    return 'none';
  };

  const userRole = getDocumentUserRole();
  const isReadOnly = userRole === 'viewer';
  const isBlocked = userRole === 'none';

  const getDocIcon = () => {
    switch (document.type) {
      case 'markdown':
        return <FileCode className="h-5 w-5 text-indigo-500" />;
      case 'html':
        return <FileCode className="h-5 w-5 text-sky-500" />;
      case 'image':
        return <Layers className="h-5 w-5 text-purple-500" />;
      case 'json':
        return <FileJson className="h-5 w-5 text-amber-500" />;
      case 'pdf':
        return <FileText className="h-5 w-5 text-rose-550" />;
      case 'docs':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'spreadsheet':
        return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
      case 'video':
        return <Video className="h-5 w-5 text-rose-550" />;
      case 'code':
        return <Code className="h-5 w-5 text-teal-600" />;
      case 'zip':
        return <Archive className="h-5 w-5 text-amber-600" />;
      case 'other':
        return <Binary className="h-5 w-5 text-slate-500" />;
      default:
        return <FileText className="h-5 w-5 text-teal-500" />;
    }
  };

  const getBadgeColor = () => {
    switch (document.type) {
      case 'markdown': return 'bg-indigo-50/70 text-indigo-700 border-indigo-100';
      case 'html': return 'bg-sky-50/70 text-sky-700 border-sky-100';
      case 'image': return 'bg-purple-50/70 text-purple-700 border-purple-100';
      case 'json': return 'bg-amber-50/70 text-amber-700 border-amber-100';
      case 'pdf': return 'bg-rose-50/70 text-rose-700 border-rose-100';
      case 'docs': return 'bg-blue-50/70 text-blue-700 border-blue-100';
      case 'spreadsheet': return 'bg-emerald-50/70 text-emerald-700 border-emerald-100';
      case 'video': return 'bg-pink-50/70 text-pink-700 border-pink-100';
      case 'code': return 'bg-teal-50/70 text-teal-700 border-teal-100';
      case 'zip': return 'bg-amber-50/70 text-amber-700 border-amber-100';
      case 'other': return 'bg-slate-150/70 text-slate-700 border-slate-200';
      default: return 'bg-teal-50/70 text-teal-700 border-teal-100';
    }
  };

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempTitle.trim() && tempTitle !== document.title) {
      onRename(document.id, tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const formattedSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formattedDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Truncate content for micro preview
  const getMicroLines = () => {
    const lines = document.content.slice(0, 150).split('\n').filter(l => l.trim() !== '');
    if (lines.length === 0) return ['Empty document'];
    return lines.slice(0, 5);
  };

  const isSelected = selectedDocIds?.includes(document.id) || false;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('input') || 
      target.closest('form') || 
      target.closest('select') ||
      target.id.includes('move-dropdown')
    ) {
      return;
    }

    if (e.shiftKey && onToggleSelectDoc) {
      e.preventDefault();
      onToggleSelectDoc(document.id, true);
    } else {
      onOpen(document);
    }
  };

  const currentShelf = shelves.find(s => s.id === document.category);
  const isRunnable = document.category === 'shelf-repetitive-bounce' || document.category === 'shelf-deep-parity' || document.category === 'shelf-even-product';

  const getRevisionsLastWeek = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    let count = 0;
    if (document.versions && document.versions.length > 0) {
      count = document.versions.filter(v => new Date(v.updatedAt) >= oneWeekAgo).length;
    } else if (new Date(document.updatedAt || document.createdAt) >= oneWeekAgo) {
      count = 1;
    }
    return count;
  };

  const recentEditsCount = getRevisionsLastWeek();
  const isDocHot = recentEditsCount >= 3;

  return (
    <motion.div
      id={`document-card-${document.id}`}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowMoveDropdown(false);
      }}
      onClick={handleCardClick}
      className={`relative flex flex-col min-w-[280px] w-[280px] h-[370px] bg-white rounded-2xl border transition-all overflow-hidden group select-none cursor-pointer ${
        isSelected 
          ? 'border-indigo-500 ring-4 ring-indigo-100/50 shadow-md' 
          : isDocHot
            ? 'border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)] ring-2 ring-amber-100/30'
            : 'border-gray-150 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Dynamic Content Micro-Preview (Visual top card) */}
      <div 
        className="relative h-[160px] bg-gray-50/80 p-4 border-b border-gray-100 overflow-hidden transition-colors group-hover:bg-gray-50/40"
      >
        {/* Selection Checkbox */}
        {onToggleSelectDoc && (
          <button
            type="button"
            id={`select-checkbox-${document.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelectDoc(document.id, false);
            }}
            className={`absolute top-3 left-3 h-5 w-5 rounded-full border z-30 flex items-center justify-center transition-all ${
              isSelected 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                : 'bg-white/95 backdrop-blur-xs border-gray-300 text-transparent hover:border-indigo-500 hover:text-indigo-500 opacity-0 group-hover:opacity-100'
            }`}
          >
            <Check className="h-3 w-3 stroke-[3]" />
          </button>
        )}

        {/* Subtle geometric grid background */}
        <div className="absolute inset-0 opacity-1 bg-[linear-gradient(to_right,#f3f4f6_1px,transparent_1px),linear-gradient(to_bottom,#f3f4f6_1px,transparent_1px)] bg-[size:14px_14px]" />
        
        {/* Color accent bar matching document owner shelf's category */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-200 to-gray-300" style={{ backgroundImage: document.customPreviewColor ? `linear-gradient(to right, ${document.customPreviewColor}, ${document.customPreviewColor}aa)` : undefined }} />

        {/* Micro Page Preview Layout */}
        <div className="relative h-full bg-white rounded-lg border border-gray-200/60 p-3 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col gap-1.5 leading-none">
          {document.type === 'json' ? (
            <div className="font-mono text-[8px] text-gray-400 leading-normal select-all">
              {getMicroLines().map((line, idx) => (
                <div key={idx} className="whitespace-pre overflow-hidden text-ellipsis">
                  {line}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 border-b border-gray-100 pb-1.5">
                <div className="p-1 rounded bg-gray-50">{getDocIcon()}</div>
                <div className="text-[10px] font-medium text-gray-600 truncate max-w-[170px]">{document.title}</div>
              </div>
              <div className="flex flex-col gap-1.5">
                {getMicroLines().map((line, idx) => {
                  const cleaned = line.replace(/[#*`_]/g, '');
                  const isHeading = line.startsWith('#');
                  return (
                    <div 
                      key={idx} 
                      className={`text-[9px] truncate ${
                        isHeading ? 'font-bold text-gray-800 text-[10px]' : 'text-gray-400'
                      }`}
                    >
                      {cleaned}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Cover gradient to fade content down */}
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        </div>

        {/* Floating Quick Action Overlay */}
        <div className="absolute right-4 top-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {isRunnable && (
            <button
              id={`run-btn-${document.id}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onRun) onRun(document);
                else onOpen(document);
              }}
              className="p-1.5 rounded-full bg-indigo-600 border border-indigo-650 text-white hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer flex items-center justify-center"
              title="Run Simulation Playground"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
            </button>
          )}

          <button
            id={`fav-btn-${document.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onFavorite(document.id);
            }}
            className={`p-1.5 rounded-full backdrop-blur-md border shadow-sm transition-colors ${
              document.isFavorite 
                ? 'bg-amber-500/90 border-amber-500 text-white' 
                : 'bg-white/95 border-gray-200 text-gray-500 hover:text-amber-500'
            }`}
            title={document.isFavorite ? 'Removed from favorites' : 'Add to favorites'}
          >
            <Star className={`h-3.5 w-3.5 ${document.isFavorite ? 'fill-current' : ''}`} />
          </button>
          
          <button
            id={`open-btn-${document.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpen(document);
            }}
            className="p-1.5 rounded-full bg-white/95 backdrop-blur-md border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-100 shadow-sm transition-colors"
            title="Open Document"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Title & Stats */}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div className="flex flex-col gap-1.5">
          {/* Header Title Editor */}
          {isEditingTitle ? (
            <form onSubmit={handleTitleSubmit} className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
              <input
                id={`rename-input-${document.id}`}
                autoFocus
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                className="w-full text-sm font-medium border-b border-indigo-500 px-1 py-0.5 focus:outline-none focus:ring-0 text-gray-800"
              />
            </form>
          ) : (
            <div className="flex items-start justify-between gap-1 group/title">
              <h3 
                className="text-sm font-medium text-gray-800 truncate flex-1 hover:underline decoration-indigo-400 decoration-2 underline-offset-2"
                title={document.title}
              >
                {document.title}
              </h3>
              <button
                id={`edit-title-${document.id}`}
                onClick={() => {
                  setTempTitle(document.title);
                  setIsEditingTitle(true);
                }}
                className="opacity-0 group-hover/title:opacity-100 text-gray-400 hover:text-indigo-600 p-0.5 rounded transition-all"
                title="Rename Document"
              >
                <Edit className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Indicators */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {semanticSimilarity !== undefined && (
              <span 
                className="text-[10px] uppercase tracking-wider font-bold border px-1.5 py-0.5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-500 flex items-center gap-0.5 shadow-sm shadow-violet-100 animate-pulse"
                title={`Semantic similarity match score: ${Math.round(semanticSimilarity * 100)}%`}
              >
                <Sparkles className="h-2.5 w-2.5 fill-current" /> {Math.round(semanticSimilarity * 100)}% Match
              </span>
            )}
            <span className={`text-[10px] uppercase tracking-wider font-semibold border px-1.5 py-0.5 rounded-md ${getBadgeColor()}`}>
              {document.type}
            </span>
            {isBlocked && (
              <span className="text-[10px] uppercase tracking-wider font-semibold border px-1.5 py-0.5 rounded-md bg-red-50 text-red-650 border-red-150 flex items-center gap-0.5" title="You have no permission to view/edit this document">
                <Lock className="h-2.5 w-2.5" /> Blocked
              </span>
            )}
            {isReadOnly && !isBlocked && (
              <span className="text-[10px] uppercase tracking-wider font-semibold border px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-750 border-amber-150 flex items-center gap-0.5" title="You have read-only access to this document">
                <Eye className="h-2.5 w-2.5" /> Read-Only
              </span>
            )}
            {currentShelf && (
              <span className="text-[10px] text-gray-400 flex items-center gap-1 font-mono">
                <Layers className="h-3 w-3 inline text-gray-300" />
                {currentShelf.name.split(' ').slice(0, 3).join(' ')}...
              </span>
            )}
            {recentEditsCount > 0 && (
              <span 
                className={`text-[10px] font-semibold border px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                  isDocHot 
                    ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' 
                    : 'bg-indigo-50 text-indigo-750 border-indigo-150'
                }`}
                title={`${recentEditsCount} edits in the last 7 days`}
              >
                {isDocHot ? '🔥' : '⚡'} {recentEditsCount} {recentEditsCount === 1 ? 'edit' : 'edits'}/wk
              </span>
            )}
          </div>
        </div>

        {/* Footer details & core shelf operations */}
        <div className="pt-3 border-t border-gray-50 flex items-center justify-between mt-auto">
          <div className="flex flex-col text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5 text-gray-300" />
              {formattedDate(document.updatedAt)}
            </span>
            <span>{formattedSize(document.size)}</span>
          </div>

          {/* Quick operations */}
          <div className="flex items-center gap-1 relative" onClick={e => e.stopPropagation()}>
            <button
              id={`move-dropdown-trigger-${document.id}`}
              onClick={() => setShowMoveDropdown(!showMoveDropdown)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Move to another shelf"
            >
              <FolderInput className="h-4 w-4" />
            </button>

            {/* Shelf mover dropdown */}
            {showMoveDropdown && (
              <div 
                id={`move-dropdown-${document.id}`}
                className="absolute bottom-10 right-0 w-56 bg-white rounded-xl border border-gray-100 shadow-xl p-1 z-20 py-1.5"
              >
                <div className="px-2.5 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-1">
                  Move to Shelf:
                </div>
                {shelves.map((sh) => (
                  <button
                    key={sh.id}
                    id={`move-to-${sh.id}-${document.id}`}
                    disabled={sh.id === document.category}
                    onClick={() => {
                      onMoveShelf(document.id, sh.id);
                      setShowMoveDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-1 text-xs rounded-lg transition-colors flex items-center justify-between ${
                      sh.id === document.category
                        ? 'text-indigo-600 bg-indigo-50/50 font-medium cursor-default'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span>{sh.name}</span>
                    {sh.id !== document.category && <ArrowRight className="h-3 w-3 text-gray-300 opacity-0 group-hover:opacity-100" />}
                  </button>
                ))}
              </div>
            )}

            <button
              id={`download-btn-${document.id}`}
              onClick={() => {
                let url = '';
                let ext = 'txt';
                if (document.type === 'image') {
                  const match = document.content.match(/!\[.*?\]\((.*?)\)/);
                  const imgData = match ? match[1] : document.content;
                  if (imgData.startsWith('data:image')) {
                    url = imgData;
                    // extract ext like png, jpeg
                    ext = imgData.split(';')[0].split('/')[1] || 'png';
                  } else {
                    const blob = new Blob([document.content], { type: 'text/plain;charset=utf-8' });
                    url = URL.createObjectURL(blob);
                  }
                } else if (document.type === 'video' && document.content.startsWith('data:video')) {
                  url = document.content;
                  ext = document.content.split(';')[0].split('/')[1] || 'mp4';
                } else {
                  const blob = new Blob([document.content], { type: 'text/plain;charset=utf-8' });
                  url = URL.createObjectURL(blob);
                  ext = document.type === 'json' ? 'json' : document.type === 'markdown' ? 'md' : document.type === 'html' ? 'html' : document.type === 'spreadsheet' ? 'csv' : document.type === 'video' ? 'mp4' : document.type === 'code' ? 'ts' : document.type === 'zip' ? 'zip' : document.type === 'docs' ? 'docx' : document.type === 'pdf' ? 'pdf' : document.type === 'other' ? 'bin' : 'txt';
                }
                const link = window.document.createElement('a');
                link.href = url;
                link.download = `${document.title.replace(/\s+/g, '_')}.${ext}`;
                link.click();
                if (!url.startsWith('data:image') && !url.startsWith('data:video')) {
                  URL.revokeObjectURL(url);
                }
              }}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50/80 rounded-lg transition-colors"
              title="Download File"
            >
              <Download className="h-4 w-4" />
            </button>

            {onShare && (
              <button
                id={`share-btn-${document.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(document);
                }}
                className={`p-1.5 rounded-lg transition-colors relative ${
                  document.shareSettings?.isPublic || (document.permissions && document.permissions.length > 0)
                    ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                    : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/80'
                }`}
                title="Share & Permissions Settings"
              >
                <Users className="h-4 w-4" />
                {(document.shareSettings?.isPublic || (document.permissions && document.permissions.length > 0)) && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                )}
              </button>
            )}

            <button
              id={`delete-btn-${document.id}`}
              onClick={() => onDelete(document.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50/80 rounded-lg transition-colors"
              title="Delete Document"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
