import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, FileText, Check, Folder, AlertTriangle, CloudUpload } from 'lucide-react';
import { Shelf, DocumentType } from '../types';

interface UploadModalProps {
  shelves: Shelf[];
  onUpload: (title: string, content: string, type: DocumentType, shelfId: string, size: number) => void;
  onClose: () => void;
}

export default function UploadModal({
  shelves,
  onUpload,
  onClose,
}: UploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedShelf, setSelectedShelf] = useState(shelves[0]?.id || '');
  const [parsedFile, setParsedFile] = useState<{
    name: string;
    content: string;
    size: number;
    type: DocumentType;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setErrorMsg(null);
    setParsedFile(null);

    // Filter by type safely
    const extension = file.name.split('.').pop()?.toLowerCase();
    let type: DocumentType = 'text';
    if (extension === 'md' || extension === 'markdown') {
      type = 'markdown';
    } else if (extension === 'json') {
      type = 'json';
    } else if (extension === 'csv') {
      type = 'spreadsheet';
    } else if (extension === 'pdf') {
      type = 'pdf';
    } else if (['png', 'jpeg', 'jpg', 'webp', 'gif'].includes(extension || '')) {
      type = 'image';
    }

    const reader = new FileReader();
    
    // For images, we can extract details or read as dataURL; for text files we read as Text
    if (type === 'image') {
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setParsedFile({
          name: file.name.replace(/\.[^/.]+$/, ""), // remove extension
          content: `![Uploaded Image](${result.slice(0, 1000)}... Data truncated for storage)`,
          size: file.size,
          type: 'image',
        });
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (e) => {
        const text = e.target?.result as string || '';
        setParsedFile({
          name: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' '),
          content: text,
          size: file.size,
          type,
        });
      };
      
      reader.onerror = () => {
        setErrorMsg('Failed to read the local file. Please try another standard format.');
      };

      reader.readAsText(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedFile && selectedShelf) {
      onUpload(
        parsedFile.name,
        parsedFile.content,
        parsedFile.type,
        selectedShelf,
        parsedFile.size
      );
      onClose();
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <motion.div
      id="upload-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none"
    >
      <motion.div
        id="upload-modal-container"
        initial={{ y: 20, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 20, scale: 0.98 }}
        className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-lg p-6 overflow-hidden flex flex-col"
      >
        {/* Head */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-55">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Upload className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Upload Workspace File</h3>
          </div>
          <button
            id="close-upload-modal"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-605 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form schema */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Target Shelf row Selection */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Folder className="h-3.5 w-3.5 inline text-gray-400" /> Target Shelf row:
            </label>
            <select
              id="upload-shelf-select"
              value={selectedShelf}
              onChange={(e) => setSelectedShelf(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none focus:bg-white"
              required
            >
              {shelves.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* DND Target Block */}
          {!parsedFile ? (
            <div
              id="drop-zone"
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={onButtonClick}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-50/40 text-indigo-700 scale-[0.99]'
                  : 'border-gray-200 hover:border-indigo-400 hover:bg-gray-50/50 text-gray-550'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".txt,.md,.json,.csv,.xml,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
              />
              <div className="p-3 bg-gray-50 text-gray-400 group-hover:text-indigo-600 rounded-full border border-gray-100">
                <CloudUpload className="h-7 w-7" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold">Drag & drop files here, or click to browse</span>
                <span className="text-[10px] text-gray-450">Supports standard formats (.txt, .md, .json, .csv) up to 2 MB</span>
              </div>
            </div>
          ) : (
            // Upload successful, display confirmation
            <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-emerald-800 truncate max-w-[240px]">{parsedFile.name}</span>
                  <span className="text-[10px] text-emerald-600 font-mono">
                    Type: <span className="uppercase">{parsedFile.type}</span> • Size: {(parsedFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
              <button
                type="button"
                id="discard-file-upload"
                onClick={() => setParsedFile(null)}
                className="p-1 px-2 text-xs hover:bg-emerald-500/10 text-emerald-700 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Change
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
              <AlertTriangle className="h-4 w-4 stroke-[2.5]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submits */}
          <div className="flex gap-2.5 mt-2 justify-end">
            <button
              type="button"
              id="upload-cancel-btn"
              onClick={onClose}
              className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700 font-medium rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="upload-submit-btn"
              disabled={!parsedFile}
              className={`px-4 py-2 text-xs font-semibold rounded-xl text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                parsedFile 
                  ? 'bg-indigo-600 hover:bg-indigo-700' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              Import to Shelf
            </button>
          </div>

        </form>
      </motion.div>
    </motion.div>
  );
}
