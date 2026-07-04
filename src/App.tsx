import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Search, 
  Plus, 
  Trash2, 
  Star, 
  FolderPlus, 
  HardDrive, 
  Heart, 
  Filter, 
  Database, 
  CloudUpload,
  User,
  ExternalLink,
  ChevronRight,
  Sparkles,
  BarChart4,
  RefreshCw,
  FolderOpen,
  RotateCcw,
  Tag,
  Download
} from 'lucide-react';

import JSZip from 'jszip';
import { Document, Shelf, ActivityLog, DocumentType } from './types';
import { INITIAL_SHELVES, INITIAL_DOCUMENTS } from './data/defaultData';
import ShelfRow from './components/ShelfRow';
import DocumentCard from './components/DocumentCard';
import DocumentEditor from './components/DocumentEditor';
import DashboardStats from './components/DashboardStats';
import UploadModal from './components/UploadModal';
import MergeModal from './components/MergeModal';
import { DocumentSearchIndex } from './utils/searchIndex';

export default function App() {
  // --- Persistent Storage State ---
  const [documents, setDocuments] = useState<Document[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  // --- Workspace Filters & Navigation ---
  const [activeTab, setActiveTab] = useState<'shelves' | 'all' | 'favorites' | 'trash'>('shelves');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // --- Modals Toggle state ---
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);
  const [autoRunSimulator, setAutoRunSimulator] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showStats, setShowStats] = useState(true);

  // --- VCS & Selection states ---
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [mergeState, setMergeState] = useState<{
    existingDoc: Document;
    incomingContent: string;
    incomingTitle: string;
    incomingType: DocumentType;
    incomingShelfId: string;
    incomingSize: number;
  } | null>(null);

  // --- Creation forms toggle ---
  const [showNewShelfForm, setShowNewShelfForm] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');
  const [newShelfDesc, setNewShelfDesc] = useState('');
  const [newShelfColor, setNewShelfColor] = useState('emerald');

  // Load state on startup
  useEffect(() => {
    const savedDocs = localStorage.getItem('doc_manager_documents');
    const savedShelves = localStorage.getItem('doc_manager_shelves');
    const savedLogs = localStorage.getItem('doc_manager_activities');

    if (savedDocs) setDocuments(JSON.parse(savedDocs));
    else setDocuments(INITIAL_DOCUMENTS);

    if (savedShelves) setShelves(JSON.parse(savedShelves));
    else setShelves(INITIAL_SHELVES);

    if (savedLogs) {
      setActivities(JSON.parse(savedLogs));
    } else {
      setActivities([
        {
          id: 'log-initial',
          documentId: '',
          documentTitle: 'Workspace initialization',
          action: 'create',
          timestamp: new Date().toISOString(),
        }
      ]);
    }
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    if (documents.length > 0) {
      localStorage.setItem('doc_manager_documents', JSON.stringify(documents));
    }
  }, [documents]);

  useEffect(() => {
    if (shelves.length > 0) {
      localStorage.setItem('doc_manager_shelves', JSON.stringify(shelves));
    }
  }, [shelves]);

  useEffect(() => {
    if (activities.length > 0) {
      localStorage.setItem('doc_manager_activities', JSON.stringify(activities));
    }
  }, [activities]);

  // Log action helper
  const logAction = (docTitle: string, action: ActivityLog['action'], docId = '') => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      documentId: docId,
      documentTitle: docTitle,
      action,
      timestamp: new Date().toISOString(),
    };
    setActivities(prev => [newLog, ...prev]);
  };

  // --- Multi-Selection & Selective Export Bundle handlers ---
  const handleToggleSelectDoc = (docId: string, isShift: boolean, shelfDocs?: Document[]) => {
    setSelectedDocIds(prev => {
      const isSelected = prev.includes(docId);
      
      if (isShift && shelfDocs && prev.length > 0) {
        const lastSelectedId = prev[prev.length - 1];
        const lastIdx = shelfDocs.findIndex(d => d.id === lastSelectedId);
        const currentIdx = shelfDocs.findIndex(d => d.id === docId);
        
        if (lastIdx !== -1 && currentIdx !== -1) {
          const start = Math.min(lastIdx, currentIdx);
          const end = Math.max(lastIdx, currentIdx);
          const rangeIds = shelfDocs.slice(start, end + 1).map(d => d.id);
          
          const next = [...prev];
          rangeIds.forEach(id => {
            if (!next.includes(id)) {
              next.push(id);
            }
          });
          return next;
        }
      }
      
      if (isSelected) {
        return prev.filter(id => id !== docId);
      } else {
        return [...prev, docId];
      }
    });
  };

  const handleExportZIP = async () => {
    const zip = new JSZip();
    
    selectedDocIds.forEach(id => {
      const doc = documents.find(d => d.id === id);
      if (doc) {
        const frontmatter = `---
title: "${doc.title.replace(/"/g, '\\"')}"
type: ${doc.type}
category: ${doc.category}
tags: [${doc.tags.map(t => `"${t}"`).join(', ')}]
createdAt: ${doc.createdAt}
updatedAt: ${doc.updatedAt}
size: ${doc.size} bytes
---

${doc.content}`;
        
        const fileName = `${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
        zip.file(fileName, frontmatter);
        logAction(`Exported "${doc.title}" to ZIP`, 'download', doc.id);
      }
    });
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `DocWorkspace_Bundle_${Date.now()}.zip`;
    link.click();
    URL.revokeObjectURL(url);
    setSelectedDocIds([]);
  };

  const handleCompileReport = () => {
    const selectedDocs = documents.filter(d => selectedDocIds.includes(d.id));
    if (selectedDocs.length === 0) return;
    
    const cssStyles = `
      body {
        font-family: 'Inter', system-ui, sans-serif;
        line-height: 1.6;
        color: #1f2937;
        max-width: 800px;
        margin: 0 auto;
        padding: 40px 20px;
        background: #f9fafb;
      }
      .report-container {
        background: white;
        padding: 50px;
        border-radius: 20px;
        box-shadow: 0 4px 30px rgba(0,0,0,0.03);
        border: 1px solid #f3f4f6;
      }
      h1, h2, h3 {
        color: #111827;
        font-weight: 700;
        letter-spacing: -0.025em;
      }
      .cover-page {
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 40px;
        margin-bottom: 40px;
        text-align: center;
      }
      .cover-title {
        font-size: 36px;
        margin-bottom: 10px;
        color: #4f46e5;
        font-weight: 800;
      }
      .cover-meta {
        font-size: 13px;
        color: #6b7280;
        margin-top: 20px;
        font-family: monospace;
        line-height: 2;
      }
      .toc {
        background: #f8fafc;
        padding: 24px;
        border-radius: 16px;
        margin-bottom: 40px;
        border: 1px solid #e2e8f0;
      }
      .toc h2 {
        margin-top: 0;
        font-size: 18px;
        color: #0f172a;
      }
      .toc-list {
        list-style-type: none;
        padding-left: 0;
      }
      .toc-item {
        margin: 10px 0;
        border-bottom: 1px dashed #e2e8f0;
        padding-bottom: 6px;
        display: flex;
        justify-content: space-between;
      }
      .toc-link {
        color: #4f46e5;
        text-decoration: none;
        font-size: 14px;
        font-weight: 600;
      }
      .toc-link:hover {
        text-decoration: underline;
      }
      .section-break {
        page-break-before: always;
        border-top: 1px solid #e2e8f0;
        margin-top: 60px;
        padding-top: 40px;
      }
      .doc-header {
        margin-bottom: 24px;
      }
      .doc-title {
        font-size: 24px;
        color: #1e293b;
        margin-bottom: 8px;
      }
      .doc-meta {
        display: flex;
        gap: 16px;
        font-size: 11px;
        color: #64748b;
        font-family: monospace;
      }
      .doc-tags {
        display: flex;
        gap: 6px;
        margin-top: 8px;
      }
      .doc-tag {
        background: #f1f5f9;
        color: #475569;
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 10px;
        font-weight: 600;
      }
      pre {
        background: #0f172a;
        color: #f8fafc;
        padding: 16px;
        border-radius: 12px;
        overflow-x: auto;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 12px;
        line-height: 1.5;
        margin: 20px 0;
      }
      code {
        font-family: 'JetBrains Mono', monospace;
        background: #f1f5f9;
        padding: 2px 5px;
        border-radius: 4px;
        font-size: 13px;
        color: #0f172a;
      }
      pre code {
        background: transparent;
        padding: 0;
        color: inherit;
        font-size: inherit;
      }
      blockquote {
        border-left: 4px solid #6366f1;
        padding-left: 18px;
        margin: 20px 0;
        color: #475569;
        font-style: italic;
        background: #f8fafc;
        padding-top: 10px;
        padding-bottom: 10px;
        border-top-right-radius: 8px;
        border-bottom-right-radius: 8px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 24px 0;
      }
      th, td {
        border: 1px solid #e2e8f0;
        padding: 12px;
        text-align: left;
        font-size: 13px;
      }
      th {
        background: #f8fafc;
        font-weight: 700;
        color: #334155;
      }
    `;

    let tocHtml = '';
    let contentHtml = '';
    
    selectedDocs.forEach((doc, idx) => {
      const anchorId = `doc-${doc.id}`;
      tocHtml += `
        <li class="toc-item">
          <a class="toc-link" href="#${anchorId}">${idx + 1}. ${doc.title}</a>
          <span style="font-size: 11px; color: #94a3b8; font-family: monospace;">${doc.type.toUpperCase()}</span>
        </li>
      `;
      
      let parsedContent = doc.content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      parsedContent = parsedContent.replace(/^# (.*$)/gim, '<h1>$1</h1>');
      parsedContent = parsedContent.replace(/^## (.*$)/gim, '<h2>$1</h2>');
      parsedContent = parsedContent.replace(/^### (.*$)/gim, '<h3>$1</h3>');
      parsedContent = parsedContent.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
      parsedContent = parsedContent.replace(/\*\*(.*?)\*\"/g, '<strong>$1</strong>');
      parsedContent = parsedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
      parsedContent = parsedContent.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
      parsedContent = parsedContent.replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>');
      parsedContent = parsedContent.replace(/<\/ul>\s*<ul>/g, '');
      
      contentHtml += `
        <div id="${anchorId}" class="section-break">
          <div class="doc-header">
            <h2 class="doc-title">${doc.title}</h2>
            <div class="doc-meta">
              <span>Type: ${doc.type.toUpperCase()}</span>
              <span>Category/Shelf: ${doc.category}</span>
              <span>Compiled: ${new Date().toLocaleDateString()}</span>
            </div>
            <div class="doc-tags">
              ${doc.tags.map(t => `<span class="doc-tag">${t}</span>`).join('')}
            </div>
          </div>
          <div class="doc-body" style="font-size: 14px; color: #334155; line-height: 1.7;">
            ${parsedContent}
          </div>
        </div>
      `;
    });

    const fullHtml = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Unified Technical Report - DocWorkspace</title>
    <style>${cssStyles}</style>
  </head>
  <body>
    <div class="report-container">
      <div class="cover-page">
        <h1 class="cover-title">Unified Technical Report</h1>
        <p style="color: #64748b; font-size: 15px; font-weight: 500;">Compiled Workspace Document Bundle</p>
        <div class="cover-meta">
          <p>DATE: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
          <p>COMPILED DOCUMENTS: ${selectedDocs.length}</p>
          <p>ORGANIZATION: ahmedalbanna966 Workspace</p>
        </div>
      </div>
      
      <div class="toc">
        <h2>Table of Contents</h2>
        <ul class="toc-list">
          ${tocHtml}
        </ul>
      </div>
      
      <div class="content">
        ${contentHtml}
      </div>
    </div>
  </body>
  </html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `Unified_Technical_Report_${Date.now()}.html`;
    link.click();
    URL.revokeObjectURL(url);
    
    logAction(`Compiled technical report with ${selectedDocs.length} files`, 'download');
    setSelectedDocIds([]);
  };

  // --- Document core actions ---
  const handleOpenDoc = (doc: Document) => {
    setAutoRunSimulator(false);
    setActiveDoc(doc);
  };

  const handleRunDocSimulator = (doc: Document) => {
    setAutoRunSimulator(true);
    setActiveDoc(doc);
  };

  const handleFavoriteDoc = (docId: string) => {
    setDocuments(prev => prev.map(d => {
      if (d.id === docId) {
        const nextState = !d.isFavorite;
        logAction(d.title, nextState ? 'favorite' : 'edit', docId);
        return { ...d, isFavorite: nextState };
      }
      return d;
    }));
  };

  const handleDeleteDoc = (docId: string) => {
    setDocuments(prev => prev.map(d => {
      if (d.id === docId) {
        logAction(d.title, 'delete', docId);
        return { ...d, isArchived: true };
      }
      return d;
    }));
  };

  const handleRestoreDoc = (docId: string) => {
    setDocuments(prev => prev.map(d => {
      if (d.id === docId) {
        logAction(d.title, 'restore', docId);
        return { ...d, isArchived: false };
      }
      return d;
    }));
  };

  const handlePurgeDoc = (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (doc) {
      setDocuments(prev => prev.filter(d => d.id !== docId));
      logAction(doc.title, 'delete', docId);
    }
  };

  const handleMoveDocShelf = (docId: string, newShelfId: string) => {
    setDocuments(prev => prev.map(d => {
      if (d.id === docId) {
        logAction(d.title, 'edit', docId);
        return { ...d, category: newShelfId };
      }
      return d;
    }));
  };

  const handleRenameDoc = (docId: string, newTitle: string) => {
    setDocuments(prev => prev.map(d => {
      if (d.id === docId) {
        logAction(newTitle, 'edit', docId);
        return { ...d, title: newTitle, updatedAt: new Date().toISOString() };
      }
      return d;
    }));
  };

  const handleSaveDocEdits = (docId: string, updates: Partial<Document>, changeSummary?: string, parentId?: string | null) => {
    let updatedDoc: Document | null = null;
    setDocuments(prev => {
      const next = prev.map(d => {
        if (d.id === docId) {
          const versions = d.versions ? [...d.versions] : [];
          
          // If no versions exist yet, record the existing document state as V1
          if (versions.length === 0) {
            versions.push({
              id: `v-init-${d.id}`,
              versionNumber: 1,
              title: d.title,
              content: d.content,
              type: d.type,
              tags: [...d.tags],
              updatedAt: d.updatedAt || d.createdAt || new Date().toISOString(),
              changeSummary: 'Original document state',
              size: d.size,
              parentId: null,
            });
          }
          
          const nextVerNum = versions.length + 1;
          const newSize = updates.content !== undefined ? new Blob([updates.content]).size : d.size;
          
          // Determine parent id
          const resolvedParentId = parentId !== undefined ? parentId : (versions.length > 0 ? versions[versions.length - 1].id : null);

          // Append the new state as the next version
          versions.push({
            id: `v-${Date.now()}-${nextVerNum}`,
            versionNumber: nextVerNum,
            title: updates.title !== undefined ? updates.title : d.title,
            content: updates.content !== undefined ? updates.content : d.content,
            type: updates.type !== undefined ? updates.type : d.type,
            tags: updates.tags !== undefined ? [...updates.tags] : [...d.tags],
            updatedAt: new Date().toISOString(),
            changeSummary: changeSummary || `Revision ${nextVerNum}`,
            size: newSize,
            parentId: resolvedParentId,
          });

          updatedDoc = {
            ...d,
            ...updates,
            updatedAt: new Date().toISOString(),
            size: newSize,
            versions,
          };

          logAction(updates.title || d.title, 'edit', docId);
          return updatedDoc;
        }
        return d;
      });
      return next;
    });

    // Keep editor open and synced with the latest version history and content modifications
    if (updatedDoc) {
      setActiveDoc(updatedDoc);
    }
  };

  // Add dummy blank document directly to shelf
  const handleAddDocToShelf = (shelfId: string) => {
    const uid = `doc-${Date.now()}`;
    const targetShelf = shelves.find(s => s.id === shelfId);
    const newDoc: Document = {
      id: uid,
      title: `Untitled Template-${documents.filter(d => d.category === shelfId).length + 1}`,
      content: `# New Document
Enter standard paragraphs or lists...`,
      type: 'markdown',
      size: 44,
      category: shelfId,
      tags: ['Draft'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: false,
      isArchived: false,
      customPreviewColor: targetShelf?.color === 'emerald' ? '#10b981' : targetShelf?.color === 'teal' ? '#14b5a6' : targetShelf?.color === 'violet' ? '#8b5cf6' : '#3b82f6',
    };

    setDocuments(prev => [...prev, newDoc]);
    logAction(newDoc.title, 'create', uid);
    setActiveDoc(newDoc); // Open editor immediately
  };

  // Custom File Uploader callback
  const handleUploadDoc = (title: string, content: string, type: DocumentType, shelfId: string, size: number) => {
    // Check if document with same title already exists
    const existing = documents.find(d => d.title.toLowerCase() === title.toLowerCase() && !d.isArchived);
    if (existing) {
      setMergeState({
        existingDoc: existing,
        incomingContent: content,
        incomingTitle: title,
        incomingType: type,
        incomingShelfId: shelfId,
        incomingSize: size,
      });
      setShowUploadModal(false); // Close upload modal since we are resolving the conflict
      return;
    }

    const uid = `doc-${Date.now()}`;
    const targetShelf = shelves.find(s => s.id === shelfId);
    const newDoc: Document = {
      id: uid,
      title,
      content,
      type,
      size,
      category: shelfId,
      tags: ['Uploaded'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: false,
      isArchived: false,
      customPreviewColor: targetShelf?.color === 'emerald' ? '#10b981' : targetShelf?.color === 'teal' ? '#14b5a6' : targetShelf?.color === 'violet' ? '#8b5cf6' : '#3b82f6',
    };

    setDocuments(prev => [...prev, newDoc]);
    logAction(title, 'upload', uid);
  };

  // Dynamically provision document from clicked Wiki link ("red links")
  const handleCreateDocFromLink = (title: string) => {
    const uid = `doc-${Date.now()}`;
    const targetShelf = shelves[0] || { id: 'shelf-repetitive-bounce', color: 'indigo' };
    const newDoc: Document = {
      id: uid,
      title,
      content: `# ${title}\nThis document was created dynamically via a wiki-link.\n\nEdit here to configure elastomer bounce, deeper parity systems, or platform release plans.`,
      type: 'markdown',
      size: 140,
      category: targetShelf.id,
      tags: ['Wiki', 'Draft'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: false,
      isArchived: false,
      customPreviewColor: targetShelf.color === 'emerald' ? '#10b981' : targetShelf.color === 'teal' ? '#14b5a6' : targetShelf.color === 'violet' ? '#8b5cf6' : '#3b82f6',
    };

    setDocuments(prev => {
      const next = [...prev, newDoc];
      // Save directly to localStorage immediately so that it is available to the wiki link resolver
      localStorage.setItem('doc_manager_documents', JSON.stringify(next));
      return next;
    });
    logAction(title, 'create', uid);
    setActiveDoc(newDoc); // Automatically transition to editor of newly spawned wiki doc
  };

  // --- Shelf row operations ---
  const handleCreateShelf = (e: React.FormEvent) => {
    e.preventDefault();
    if (newShelfName.trim()) {
      const newId = `shelf-${Date.now()}`;
      const newShelf: Shelf = {
        id: newId,
        name: newShelfName.trim(),
        description: newShelfDesc.trim(),
        color: newShelfColor,
        createdAt: new Date().toISOString(),
      };
      setShelves(prev => [...prev, newShelf]);
      logAction(`Created shelf: ${newShelfName}`, 'create');
      
      // Clear state
      setNewShelfName('');
      setNewShelfDesc('');
      setShowNewShelfForm(false);
    }
  };

  const handleUpdateShelf = (shelfId: string, name: string, description: string, color: string) => {
    setShelves(prev => prev.map(s => {
      if (s.id === shelfId) {
        logAction(`Updated shelf: ${name}`, 'edit');
        return { ...s, name, description, color };
      }
      return s;
    }));
  };

  const handleDeleteShelf = (shelfId: string) => {
    setShelves(prev => prev.filter(s => s.id !== shelfId));
    // Re-organize doc orphans safely to another valid shelf or pre-destate
    const remaining = shelves.filter(s => s.id !== shelfId);
    const targetShelfId = remaining[0]?.id || 'shelf-default-backup';
    
    setDocuments(prev => prev.map(d => {
      if (d.category === shelfId) {
        return { ...d, category: targetShelfId };
      }
      return d;
    }));
    logAction('Removed shelf storage row', 'delete');
  };

  // --- Tag filter operations ---
  const allTags = Array.from(
    new Set(documents.filter(d => !d.isArchived).flatMap(d => d.tags))
  );

  // --- Filtering & Ranked Search Indexing calculations ---
  const filteredDocs = (() => {
    let baseDocs = documents;
    
    // 1. Filter by category/trash tab
    if (activeTab === 'trash') {
      baseDocs = documents.filter(d => d.isArchived);
    } else {
      baseDocs = documents.filter(d => !d.isArchived);
      
      // 2. Filter by favorites tab
      if (activeTab === 'favorites') {
        baseDocs = baseDocs.filter(d => d.isFavorite);
      }
    }

    // 3. Filter by selected label tag
    if (selectedTag) {
      baseDocs = baseDocs.filter(d => d.tags.includes(selectedTag));
    }

    // 4. Ranked prefix-matching Full-Text Search (FTS)
    if (searchQuery.trim()) {
      const ftsIndex = new DocumentSearchIndex(baseDocs);
      return ftsIndex.search(searchQuery).map(res => res.document);
    }

    return baseDocs;
  })();

  return (
    <div id="document-manager-root" className="min-h-screen bg-[#FDFDFD] text-gray-800 flex flex-col md:flex-row font-sans selection:bg-indigo-100 antialiased">
      
      {/* 1. LEFT SIDEBAR PANEL */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-gray-150 flex flex-col p-6 gap-7 shrink-0 select-none">
        {/* Branding header */}
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-[0_4px_12px_rgba(79,70,229,0.3)]">
            D
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-1">
              DocWorkspace <Sparkles className="h-3 w-3 text-indigo-500 fill-current" />
            </h1>
            <span className="text-[10px] text-gray-400 font-mono tracking-wider">WORKSPACE v2.4</span>
          </div>
        </div>

        {/* Dynamic actions drawer */}
        <div className="flex flex-col gap-2">
          <button
            id="sidebar-new-doc-btn"
            onClick={() => {
              // Add doc automatically to first shelf
              if (shelves.length > 0) {
                handleAddDocToShelf(shelves[0].id);
              }
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 px-4 text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" /> Create Document
          </button>
          
          <button
            id="sidebar-upload-btn"
            onClick={() => setShowUploadModal(true)}
            className="w-full border border-gray-200 hover:border-indigo-650 hover:bg-indigo-50/20 text-gray-700 hover:text-indigo-600 rounded-xl py-2 px-4 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <CloudUpload className="h-4 w-4" /> Import Storage File
          </button>
        </div>

        {/* Sidebar tabs */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Navigation</span>
          
          <button
            id="tab-shelves"
            onClick={() => { setActiveTab('shelves'); setSelectedTag(null); }}
            className={`w-full text-left font-medium text-xs px-3 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 'shelves' 
                ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <Database className="h-4 w-4 text-gray-400" /> Categorical Shelves
            </span>
            <span className="font-mono text-[10px] bg-white border border-gray-100 rounded px-1.5 py-0.2">{shelves.length}</span>
          </button>

          <button
            id="tab-all"
            onClick={() => { setActiveTab('all'); setSelectedTag(null); }}
            className={`w-full text-left font-medium text-xs px-3 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 'all' 
                ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" /> All Documents
            </span>
            <span className="font-mono text-[10px] bg-white border border-gray-100 rounded px-1.5 py-0.2">
              {documents.filter(d => !d.isArchived).length}
            </span>
          </button>

          <button
            id="tab-favorites"
            onClick={() => { setActiveTab('favorites'); setSelectedTag(null); }}
            className={`w-full text-left font-medium text-xs px-3 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 'favorites' 
                ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-gray-400" /> Favorites
            </span>
            <span className="font-mono text-[10px] bg-white border border-gray-100 rounded px-1.5 py-0.2 text-rose-500 font-bold">
              {documents.filter(d => !d.isArchived && d.isFavorite).length}
            </span>
          </button>

          <button
            id="tab-trash"
            onClick={() => { setActiveTab('trash'); setSelectedTag(null); }}
            className={`w-full text-left font-medium text-xs px-3 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 'trash' 
                ? 'bg-red-50 text-red-700 font-semibold' 
                : 'text-gray-500 hover:bg-red-50/20 hover:text-red-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-300" /> Trash Bin
            </span>
            <span className="font-mono text-[10px] bg-white border border-gray-100 rounded px-1.5 py-0.2">
              {documents.filter(d => d.isArchived).length}
            </span>
          </button>
        </div>

        {/* Labels tag cloud inside sidebar */}
        {allTags.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Filter Labels</span>
            <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pr-1">
              {allTags.map(tag => (
                <button
                  key={tag}
                  id={`tag-filter-${tag}`}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`text-[10px] font-medium px-2 py-1 rounded-md border transition-all flex items-center gap-1 cursor-pointer ${
                    selectedTag === tag 
                      ? 'bg-indigo-600 border-indigo-600 text-white' 
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Micro profile card */}
        <div className="mt-auto border-t border-gray-100 pt-4 flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600">
              <User className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-gray-800 truncate">ahmedalbanna966</span>
              <span className="text-[9px] text-gray-400 truncate">ahmedalbanna966@gmail.com</span>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CORE CONTENT WRAPPER */}
      <main className="flex-1 flex flex-col min-w-0 p-6 md:p-8 overflow-y-auto bg-gray-50/45">
        
        {/* Navigation Core Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-white border border-gray-200/60 shadow-sm flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2 uppercase">
                {activeTab === 'shelves' ? 'Categorical Shelves' : 
                 activeTab === 'all' ? 'All Workspace Logs' : 
                 activeTab === 'favorites' ? 'Starred Log entries' : 'Trash Collection'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {activeTab === 'shelves' ? 'Categorized rows according to physics equations and balance release cycles' : 
                 `Secure file lists holding ${filteredDocs.length} elements.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search tool block */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                id="workspace-search-input"
                type="text"
                placeholder="Search file names, contents or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none w-64 shadow-sm"
              />
            </div>

            {/* General metrics tracker panel show toggle */}
            <button
              id="toggle-stats-btn"
              onClick={() => setShowStats(!showStats)}
              className={`p-2 rounded-xl border flex items-center justify-center transition-colors shadow-sm cursor-pointer ${
                showStats 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                  : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700'
              }`}
              title="Toggle statistics metric panel"
            >
              <BarChart4 className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* 3. COLLAPSIBLE STATISTICS METRICS PANEL */}
        <AnimatePresence>
          {showStats && (
            <motion.div
              id="stats-panel-wrapper"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden shrink-0"
            >
              <DashboardStats
                documents={documents}
                shelves={shelves}
                activities={activities}
                onClearActivities={() => setActivities([])}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active filtering breadcrumbs banner */}
        {(selectedTag || searchQuery) && (
          <div className="mb-4 flex items-center justify-between bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 select-none">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-indigo-600" />
              <span className="text-xs text-indigo-800">
                Active filtration elements: 
                {searchQuery && <span className="font-semibold">{` Query: "${searchQuery}"`}</span>}
                {selectedTag && <span className="font-semibold">{` Label: "${selectedTag}"`}</span>}
              </span>
            </div>
            <button
              id="clear-all-filters"
              onClick={() => { setSelectedTag(null); setSearchQuery(''); }}
              className="text-[10px] text-indigo-700 hover:underline font-bold cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* 4. MAIN ACTION SPACE */}
        <div id="workspace-action-space" className="flex-1 flex flex-col">
          {activeTab === 'shelves' && !selectedTag && searchQuery === '' ? (
            // GRID SHELVES LIST (Default View)
            <div className="flex flex-col">
              {shelves.map((shelf) => {
                const shelfDocs = documents.filter(d => !d.isArchived && d.category === shelf.id);
                return (
                  <ShelfRow
                    key={shelf.id}
                    shelf={shelf}
                    documents={shelfDocs}
                    allShelves={shelves}
                    onOpenDoc={handleOpenDoc}
                    onFavoriteDoc={handleFavoriteDoc}
                    onDeleteDoc={handleDeleteDoc}
                    onMoveDocShelf={handleMoveDocShelf}
                    onRenameDoc={handleRenameDoc}
                    onAddDocToShelf={handleAddDocToShelf}
                    onUpdateShelf={handleUpdateShelf}
                    onDeleteShelf={handleDeleteShelf}
                    onRunDoc={handleRunDocSimulator}
                    selectedDocIds={selectedDocIds}
                    onToggleSelectDoc={handleToggleSelectDoc}
                  />
                );
              })}

              {/* Form trigger to create custom Shelf storage raw */}
              {showNewShelfForm ? (
                <motion.form 
                  onSubmit={handleCreateShelf}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm mt-4 max-w-lg mb-8"
                >
                  <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <FolderPlus className="h-4 w-4 text-indigo-600" /> Provision Custom Shelf row
                  </h3>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Shelf Name</label>
                      <input
                        id="new-shelf-name-input"
                        type="text"
                        value={newShelfName}
                        onChange={(e) => setNewShelfName(e.target.value)}
                        placeholder="e.g. The Property of Repetitive Bounce"
                        className="w-full text-xs border border-gray-200 rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none bg-gray-50/50 focus:bg-white"
                        required
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Description / Formula target</label>
                      <input
                        id="new-shelf-desc-input"
                        type="text"
                        value={newShelfDesc}
                        onChange={(e) => setNewShelfDesc(e.target.value)}
                        placeholder="Elasticity research modeling specifications..."
                        className="w-full text-xs border border-gray-200 rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none bg-gray-50/50 focus:bg-white"
                      />
                    </div>
                    
                    {/* Color selects */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Color Accent Bar</label>
                      <div className="flex gap-2">
                        {['emerald', 'teal', 'violet', 'amber', 'rose', 'sky'].map((color) => (
                          <button
                            key={color}
                            type="button"
                            id={`accent-choice-${color}`}
                            onClick={() => setNewShelfColor(color)}
                            className={`h-6 w-6 rounded-full flex items-center justify-center hover:scale-110 transition-transform ${
                              color === 'emerald' ? 'bg-emerald-500' :
                              color === 'teal' ? 'bg-teal-500' :
                              color === 'violet' ? 'bg-violet-500' :
                              color === 'amber' ? 'bg-amber-500' :
                              color === 'rose' ? 'bg-rose-500' : 'bg-sky-500'
                            }`}
                          >
                            {newShelfColor === color && <span className="h-2 w-2 rounded-full bg-white" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2 border-t border-gray-50 mt-1">
                      <button
                        type="button"
                        id="cancel-new-shelf"
                        onClick={() => setShowNewShelfForm(false)}
                        className="px-3.5 py-2 text-xs text-gray-450 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        id="submit-new-shelf"
                        className="px-3.5 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
                      >
                        Create Shelf Row
                      </button>
                    </div>
                  </div>
                </motion.form>
              ) : (
                <button
                  id="add-custom-shelf-trigger"
                  onClick={() => setShowNewShelfForm(true)}
                  className="mx-auto flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:text-indigo-650 bg-white hover:bg-indigo-50/10 text-gray-400 py-6 px-12 rounded-2xl w-full max-w-lg mb-12 select-none text-center cursor-pointer transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-xs font-semibold">Provision addition shelf storage row</span>
                </button>
              )}
            </div>
          ) : (
            // FLUID FLEX SEARCH ROWS (Shown when searching, filtered, or inside list indices)
            <div className="bg-white rounded-2xl border border-gray-100 p-6 flex-1 shadow-sm flex flex-col justify-start">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-3 mb-5">
                Matches / Files list ({filteredDocs.length})
              </h3>
              
              {filteredDocs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredDocs.map((doc) => (
                    <div key={doc.id} className="relative group">
                      {activeTab === 'trash' ? (
                        // Special Card Layout inside Trash Bin with restore operations
                        <div className="bg-gray-50 rounded-2xl border border-gray-250 p-4 shrink-0 hover:border-red-300 hover:bg-red-50/10 transition-all select-none">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-red-100 text-red-500 rounded-xl mt-0.5">
                              <FileText className="h-5 w-5 animate-pulse" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-gray-800 truncate" title={doc.title}>{doc.title}</h4>
                              <p className="text-[10px] text-gray-400 mt-1 truncate max-w-[200px]">{doc.content.slice(0, 100)}</p>
                              <div className="flex gap-2 items-center mt-3 pt-3 border-t border-gray-200/50">
                                <button
                                  id={`restore-doc-${doc.id}`}
                                  onClick={() => handleRestoreDoc(doc.id)}
                                  className="text-[10px] text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer"
                                  title="Restore back to regular shelves"
                                >
                                  <RotateCcw className="h-3 w-3" /> Restore
                                </button>
                                <button
                                  id={`purge-doc-${doc.id}`}
                                  onClick={() => {
                                    if (confirm('Verify: Purge document permanently? This actions is irreversible.')) {
                                      handlePurgeDoc(doc.id);
                                    }
                                  }}
                                  className="text-[10px] text-red-600 hover:bg-red-150 px-2 py-1 rounded-md font-semibold cursor-pointer"
                                  title="Purge instantly"
                                >
                                  Permanent delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <DocumentCard
                            document={doc}
                            shelves={shelves}
                            onOpen={handleOpenDoc}
                            onFavorite={handleFavoriteDoc}
                            onDelete={handleDeleteDoc}
                            onMoveShelf={handleMoveDocShelf}
                            onRename={handleRenameDoc}
                            onRun={handleRunDocSimulator}
                            selectedDocIds={selectedDocIds}
                            onToggleSelectDoc={(id, isShift) => handleToggleSelectDoc(id, isShift, filteredDocs)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-24 flex flex-col items-center justify-center text-center gap-3">
                  <Database className="h-10 w-10 text-gray-200 stroke-[1.5]" />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-500">No matching items found</span>
                    <span className="text-xs text-gray-400">Clear search or choose filter tabs in the sidebar</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </main>

      {/* 5. FLOATING WORKSPACE EDITOR MODAL */}
      <AnimatePresence>
        {activeDoc && (
          <DocumentEditor
            document={activeDoc}
            shelves={shelves}
            onSave={handleSaveDocEdits}
            onClose={() => {
              setActiveDoc(null);
              setAutoRunSimulator(false);
            }}
            initialShowSimulator={autoRunSimulator}
            documents={documents}
            onOpenDoc={handleOpenDoc}
            onCreateDocFromLink={handleCreateDocFromLink}
          />
        )}
      </AnimatePresence>

      {/* 6. EXTENDED LOCAL FILE UPLOADER DRAWER OVERLAY */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadModal
            shelves={shelves}
            onUpload={handleUploadDoc}
            onClose={() => setShowUploadModal(false)}
          />
        )}
      </AnimatePresence>

      {/* 7. FLOATING EXPORT BUNDLE TOOLBAR */}
      <AnimatePresence>
        {selectedDocIds.length > 0 && (
          <motion.div
            id="floating-export-toolbar"
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-800 text-white rounded-2xl px-6 py-4 shadow-2xl z-[80] flex items-center gap-6 select-none"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">Export Bundles</span>
              <span className="text-xs font-semibold">{selectedDocIds.length} cards selected</span>
            </div>
            
            <div className="h-6 w-px bg-gray-800" />
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="export-zip-btn"
                onClick={handleExportZIP}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" /> Export .ZIP
              </button>
              
              <button
                type="button"
                id="compile-report-btn"
                onClick={handleCompileReport}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white border border-gray-750 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-400 fill-current animate-pulse" /> Compile Report
              </button>
              
              <button
                type="button"
                id="clear-selection-btn"
                onClick={() => setSelectedDocIds([])}
                className="px-3 py-2 hover:bg-gray-800 text-gray-400 hover:text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 8. TITLE COLLISION SMART 3-WAY MERGE RESOLUTION */}
      <AnimatePresence>
        {mergeState && (
          <MergeModal
            localTitle={mergeState.existingDoc.title}
            localContent={mergeState.existingDoc.content}
            ancestorContent={
              mergeState.existingDoc.versions && mergeState.existingDoc.versions.length > 0
                ? mergeState.existingDoc.versions[mergeState.existingDoc.versions.length - 1].content
                : mergeState.existingDoc.content
            }
            incomingContent={mergeState.incomingContent}
            onResolve={(mergedContent) => {
              // Create a brand new commit version containing the resolved merge
              handleSaveDocEdits(
                mergeState.existingDoc.id,
                { content: mergedContent, size: new Blob([mergedContent]).size },
                `Merged changes from external file upload of "${mergeState.incomingTitle}"`,
                mergeState.existingDoc.versions && mergeState.existingDoc.versions.length > 0
                  ? mergeState.existingDoc.versions[mergeState.existingDoc.versions.length - 1].id
                  : null
              );
              setMergeState(null);
            }}
            onCancel={() => setMergeState(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
