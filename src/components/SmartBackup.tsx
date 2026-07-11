import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  FileArchive, 
  RefreshCw, 
  Download, 
  Trash2, 
  History, 
  Sparkles, 
  Search, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  HardDrive, 
  Clock, 
  Lock, 
  Unlock, 
  ChevronRight, 
  ArrowRightLeft,
  Info
} from 'lucide-react';
import JSZip from 'jszip';
import { Document, Shelf, ActivityLog } from '../types';

interface SmartBackupProps {
  documents: Document[];
  shelves: Shelf[];
  activities: ActivityLog[];
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  setShelves: React.Dispatch<React.SetStateAction<Shelf[]>>;
  setActivities: React.Dispatch<React.SetStateAction<ActivityLog[]>>;
  logAction: (action: string, type: 'create' | 'edit' | 'delete' | 'share') => void;
  currentUserEmail: string;
}

interface BackupSnapshot {
  id: string;
  label: string;
  timestamp: string;
  documentsCount: number;
  shelvesCount: number;
  totalSize: number;
  documents: Document[];
  shelves: Shelf[];
}

interface CompressionRecommendation {
  docId: string;
  title: string;
  rationale: string;
  savingsPercent: number;
  urgency: 'High' | 'Medium' | 'Low';
}

// Browser Crypto helper functions for client-side End-to-End Encryption
async function encryptData(plainText: string, passphrase: string) {
  const encoder = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    aesKey,
    encoder.encode(plainText)
  );
  
  const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, "0")).join("");
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  
  return {
    ciphertext: ciphertextBase64,
    iv: ivHex,
    salt: saltHex
  };
}

async function decryptData(ciphertextBase64: string, ivHex: string, saltHex: string, passphrase: string) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  
  const encryptedBinary = atob(ciphertextBase64);
  const encryptedBytes = new Uint8Array(encryptedBinary.length);
  for (let i = 0; i < encryptedBinary.length; i++) {
    encryptedBytes[i] = encryptedBinary.charCodeAt(i);
  }
  
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    aesKey,
    encryptedBytes
  );
  
  return decoder.decode(decrypted);
}

export default function SmartBackup({
  documents,
  shelves,
  activities,
  setDocuments,
  setShelves,
  setActivities,
  logAction,
  currentUserEmail
}: SmartBackupProps) {
  // Navigation tabs: 'sync' | 'compression' | 'recovery'
  const [subTab, setSubTab] = useState<'sync' | 'compression' | 'recovery'>('sync');

  // --- Snapshot Restore Points State ---
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>(() => {
    const saved = localStorage.getItem('doc_manager_snapshots');
    if (saved) return JSON.parse(saved);
    return [];
  });
  const [newSnapshotLabel, setNewSnapshotLabel] = useState('');
  const [snapshotSuccess, setSnapshotSuccess] = useState<string | null>(null);

  // --- Compression State ---
  const [recommendations, setRecommendations] = useState<CompressionRecommendation[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [selectedToCompress, setSelectedToCompress] = useState<string[]>([]);
  const [compressingState, setCompressingState] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [compressedFileUrl, setCompressedFileUrl] = useState<string | null>(null);
  const [compressedFileName, setCompressedFileName] = useState('');

  // --- Sync State ---
  const [syncPassphrase, setSyncPassphrase] = useState('');
  const [syncDeviceLabel, setSyncDeviceLabel] = useState('My Workstation');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message: string;
    lastSyncTime?: string;
    deviceLabel?: string;
  }>({ type: 'idle', message: '' });

  // --- AI Recovery Assistant State ---
  const [recoveryQuery, setRecoveryQuery] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAdvice, setRecoveryAdvice] = useState<string>('');
  const [parsedRecoveryActions, setParsedRecoveryActions] = useState<{
    trashRecovers: string[];
    snapshotRestores: string[];
  }>({ trashRecovers: [], snapshotRestores: [] });

  // Save snapshots back to localStorage
  useEffect(() => {
    localStorage.setItem('doc_manager_snapshots', JSON.stringify(snapshots));
  }, [snapshots]);

  // Handle Automatic Daily background Recovery points
  useEffect(() => {
    const lastAutoBackup = localStorage.getItem('doc_manager_last_auto_backup');
    const now = Date.now();
    const twelveHours = 12 * 60 * 60 * 1000;

    if (!lastAutoBackup || now - parseInt(lastAutoBackup) > twelveHours) {
      // Auto-trigger clean restore snapshot
      const totalBytes = documents.reduce((acc, d) => acc + (d.size || 0), 0);
      const autoSnapshot: BackupSnapshot = {
        id: `snap-auto-${Date.now()}`,
        label: `Automated Health Snapshot - ${new Date().toLocaleDateString()}`,
        timestamp: new Date().toISOString(),
        documentsCount: documents.length,
        shelvesCount: shelves.length,
        totalSize: totalBytes,
        documents: JSON.parse(JSON.stringify(documents)),
        shelves: JSON.parse(JSON.stringify(shelves))
      };
      setSnapshots(prev => {
        const next = [autoSnapshot, ...prev].slice(0, 8); // Keep last 8 snapshots to conserve quota
        return next;
      });
      localStorage.setItem('doc_manager_last_auto_backup', now.toString());
    }
  }, [documents, shelves]);

  // --- Create Manual Snapshot Restore Point ---
  const handleCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newSnapshotLabel.trim() || `User Point - ${new Date().toLocaleTimeString()}`;
    const totalBytes = documents.reduce((acc, d) => acc + (d.size || 0), 0);

    const snapshot: BackupSnapshot = {
      id: `snap-manual-${Date.now()}`,
      label,
      timestamp: new Date().toISOString(),
      documentsCount: documents.length,
      shelvesCount: shelves.length,
      totalSize: totalBytes,
      documents: JSON.parse(JSON.stringify(documents)),
      shelves: JSON.parse(JSON.stringify(shelves))
    };

    setSnapshots(prev => [snapshot, ...prev]);
    setNewSnapshotLabel('');
    setSnapshotSuccess(`Successfully created snapshot point: "${label}"`);
    logAction(`Created snapshot point: ${label}`, 'create');

    setTimeout(() => {
      setSnapshotSuccess(null);
    }, 4000);
  };

  // --- Apply Snapshot Restore Point ---
  const handleApplySnapshot = (snapshot: BackupSnapshot) => {
    if (!confirm(`Warning: Restoring the workspace to "${snapshot.label}" will replace your current files and shelves. Would you like to proceed?`)) {
      return;
    }

    // Auto-create a rollback point first!
    const rollbackBytes = documents.reduce((acc, d) => acc + (d.size || 0), 0);
    const rollbackPoint: BackupSnapshot = {
      id: `snap-rollback-${Date.now()}`,
      label: `System Pre-Restore Rollback - ${snapshot.label}`,
      timestamp: new Date().toISOString(),
      documentsCount: documents.length,
      shelvesCount: shelves.length,
      totalSize: rollbackBytes,
      documents: JSON.parse(JSON.stringify(documents)),
      shelves: JSON.parse(JSON.stringify(shelves))
    };

    setSnapshots(prev => [rollbackPoint, ...prev.filter(s => s.id !== snapshot.id)]);
    
    // Set actual app states
    setDocuments(snapshot.documents);
    setShelves(snapshot.shelves);

    localStorage.setItem('doc_manager_documents', JSON.stringify(snapshot.documents));
    localStorage.setItem('doc_manager_shelves', JSON.stringify(snapshot.shelves));

    logAction(`Restored workspace snapshot to: ${snapshot.label}`, 'edit');
    alert(`Success: Workspace state restored completely. A rollback recovery point has been created in case of mistake.`);
  };

  // --- Delete Snapshot ---
  const handleDeleteSnapshot = (snapId: string) => {
    setSnapshots(prev => prev.filter(s => s.id !== snapId));
  };

  // --- Fetch Compression Recommendations via Gemini ---
  const handleFetchRecommendations = async () => {
    setIsLoadingRecommendations(true);
    setRecommendations([]);
    try {
      const response = await fetch('/api/backup/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents })
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setRecommendations(data.recommendations || []);
      // Auto select high urgency items
      const highUrgencyIds = (data.recommendations || [])
        .filter((r: CompressionRecommendation) => r.urgency === 'High')
        .map((r: CompressionRecommendation) => r.docId);
      setSelectedToCompress(highUrgencyIds);
    } catch (err: any) {
      console.error(err);
      alert(`Could not fetch recommendations: ${err.message || 'Server error'}`);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // --- Perform Intelligent Zip Compression ---
  const handleCompressSelection = async () => {
    if (selectedToCompress.length === 0) return;
    setCompressingState('running');
    setCompressedFileUrl(null);

    try {
      const zip = new JSZip();
      const filesToArchive = documents.filter(d => selectedToCompress.includes(d.id));

      filesToArchive.forEach(doc => {
        // Build metadata headers (Frontmatter style)
        const frontmatter = `---
title: ${doc.title}
category: ${doc.category}
tags: ${(doc.tags || []).join(', ')}
type: ${doc.type}
created_at: ${doc.createdAt}
updated_at: ${doc.updatedAt || doc.createdAt}
size_bytes: ${doc.size}
---

${doc.content}`;

        const extension = doc.type === 'markdown' ? 'md' :
                          doc.type === 'code' ? 'ts' :
                          doc.type === 'spreadsheet' ? 'csv' :
                          doc.type === 'pdf' ? 'pdf' :
                          doc.type === 'html' ? 'html' : 'txt';

        zip.file(`${doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${extension}`, frontmatter);
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const name = `archived_bundle_${Date.now()}.zip`;

      setCompressedFileUrl(url);
      setCompressedFileName(name);
      setCompressingState('success');

      logAction(`Compressed & archived ${filesToArchive.length} legacy files`, 'edit');
    } catch (err) {
      console.error(err);
      setCompressingState('error');
    }
  };

  // --- Mark Compressed Files as Retired / Legacy Archive ---
  const handleRetireCompressedFiles = () => {
    if (selectedToCompress.length === 0) return;
    const updatedDocs = documents.map(doc => {
      if (selectedToCompress.includes(doc.id)) {
        return {
          ...doc,
          isArchived: true, // Send to local trash/archive
          tags: Array.from(new Set([...doc.tags, 'Compressed-Archive', 'Legacy']))
        };
      }
      return doc;
    });

    setDocuments(updatedDocs);
    localStorage.setItem('doc_manager_documents', JSON.stringify(updatedDocs));
    setSelectedToCompress([]);
    setCompressingState('idle');
    setCompressedFileUrl(null);
    logAction(`Archived compressed legacy documents from categorical shelves`, 'delete');
    alert('Selected documents have been compressed and transferred safely to the legacy archive (Trash Bin).');
  };

  // --- E2E Encrypted Synchronize with Server ---
  const handleEncryptAndSync = async () => {
    if (!syncPassphrase) {
      setSyncStatus({ type: 'error', message: 'Sync passphrase is required for End-to-End client-side encryption.' });
      return;
    }
    setIsSyncing(true);
    setSyncStatus({ type: 'idle', message: 'Deriving key and encrypting client state...' });

    try {
      // Assemble full workspace payload
      const plainPayload = JSON.stringify({
        documents,
        shelves,
        activities
      });

      // Local local cryptographic encryption
      const encrypted = await encryptData(plainPayload, syncPassphrase);

      // Post encrypted payload to Server
      const res = await fetch('/api/backup/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: currentUserEmail,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          salt: encrypted.salt,
          deviceLabel: syncDeviceLabel
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setSyncStatus({
        type: 'success',
        message: 'Workspace encrypted & synchronized successfully.',
        lastSyncTime: new Date(data.timestamp).toLocaleTimeString(),
        deviceLabel: syncDeviceLabel
      });

      logAction(`E2E encrypted synchronization completed for ${currentUserEmail}`, 'share');
    } catch (err: any) {
      console.error(err);
      setSyncStatus({
        type: 'error',
        message: `Sync failed: ${err.message || 'Server connection error'}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // --- Retrieve and Decrypt from Server ---
  const handleRetrieveAndDecrypt = async () => {
    if (!syncPassphrase) {
      setSyncStatus({ type: 'error', message: 'Passphrase is required to authenticate & decrypt server backup.' });
      return;
    }
    setIsSyncing(true);
    setSyncStatus({ type: 'idle', message: 'Fetching synchronized payload from server...' });

    try {
      const res = await fetch(`/api/backup/sync?userEmail=${encodeURIComponent(currentUserEmail)}`);
      if (res.status === 404) {
        throw new Error('No synchronized backup found for your email on the server.');
      }
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setSyncStatus({ type: 'idle', message: 'Decrypting synchronized payload locally...' });

      // Decrypt locally
      const decryptedText = await decryptData(data.ciphertext, data.iv, data.salt, syncPassphrase);
      const parsed = JSON.parse(decryptedText);

      if (!parsed.documents || !parsed.shelves) {
        throw new Error('Decrypted content is corrupt or missing tables.');
      }

      // Restore states safely
      setDocuments(parsed.documents);
      setShelves(parsed.shelves);
      if (parsed.activities) setActivities(parsed.activities);

      localStorage.setItem('doc_manager_documents', JSON.stringify(parsed.documents));
      localStorage.setItem('doc_manager_shelves', JSON.stringify(parsed.shelves));
      if (parsed.activities) localStorage.setItem('doc_manager_activities', JSON.stringify(parsed.activities));

      setSyncStatus({
        type: 'success',
        message: `Workspace successfully restored from server. Source: "${data.deviceLabel}"`,
        lastSyncTime: new Date(data.timestamp).toLocaleTimeString(),
        deviceLabel: data.deviceLabel
      });

      logAction(`Succeeded in restoring synchronized workspace for ${currentUserEmail}`, 'edit');
      alert('Workspace sync completely restored and decrypted successfully.');
    } catch (err: any) {
      console.error(err);
      setSyncStatus({
        type: 'error',
        message: `Decryption / Sync retrieval failed: ${err.message || 'Incorrect passphrase or bad network payload'}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // --- Ask Deletion Recovery Assistant ---
  const handleAskRecoveryAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryQuery.trim()) return;

    setIsRecovering(true);
    setRecoveryAdvice('');
    setParsedRecoveryActions({ trashRecovers: [], snapshotRestores: [] });

    try {
      const trashDocs = documents.filter(d => d.isArchived);
      
      const response = await fetch('/api/backup/recovery-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: recoveryQuery,
          trashDocuments: trashDocs,
          snapshots: snapshots.map(s => ({
            id: s.id,
            timestamp: s.timestamp,
            label: s.label,
            documentsCount: s.documentsCount
          }))
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const adviceText = data.advice || '';
      setRecoveryAdvice(adviceText);

      // Extract custom actionable anchors
      const trashRecoversMatches = Array.from(adviceText.matchAll(/\[trash-recover:([^\]]+)\]/g)).map(m => m[1]);
      const snapshotRestoresMatches = Array.from(adviceText.matchAll(/\[snapshot-restore:([^\]]+)\]/g)).map(m => m[1]);

      setParsedRecoveryActions({
        trashRecovers: trashRecoversMatches,
        snapshotRestores: snapshotRestoresMatches
      });

    } catch (err: any) {
      console.error(err);
      setRecoveryAdvice(`Recovery Assistant experienced an issue: ${err.message || 'Server timeout'}`);
    } finally {
      setIsRecovering(false);
    }
  };

  // --- Helper Action: Recover specific doc from Trash inline ---
  const executeTrashRecovery = (docId: string) => {
    const updated = documents.map(d => d.id === docId ? { ...d, isArchived: false } : d);
    setDocuments(updated);
    localStorage.setItem('doc_manager_documents', JSON.stringify(updated));
    logAction(`Recovered document via AI Recovery tool: ${docId}`, 'edit');
    alert('Document successfully restored to its original categorical shelf!');
    // Clear matches
    setParsedRecoveryActions(prev => ({ ...prev, trashRecovers: prev.trashRecovers.filter(id => id !== docId) }));
  };

  // --- Helper Action: Restore specific snapshot inline ---
  const executeSnapshotRestore = (snapId: string) => {
    const found = snapshots.find(s => s.id === snapId);
    if (found) {
      handleApplySnapshot(found);
      setParsedRecoveryActions(prev => ({ ...prev, snapshotRestores: prev.snapshotRestores.filter(id => id !== snapId) }));
    }
  };

  return (
    <div id="smart-backup-workstation" className="flex flex-col gap-6 w-full max-w-6xl mx-auto select-none bg-white border border-gray-150 rounded-2xl shadow-sm p-6">
      
      {/* Header telemetry pill */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
            <Shield className="h-5 w-5 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
              Smart Backup Workspace <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </h3>
            <p className="text-xs text-gray-400">Secure E2E encrypted sync, file compression, and automated disaster recovery</p>
          </div>
        </div>
        
        {/* Performance & encryption indicator pill */}
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-150 px-3 py-1.5 rounded-full text-[10px] font-bold font-mono text-indigo-700 shadow-3xs">
          <Lock className="h-3.5 w-3.5 text-indigo-500" />
          VCS-SYNC @ SECURE AES-256
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-gray-100 gap-1 select-none">
        <button
          onClick={() => setSubTab('sync')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            subTab === 'sync' 
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/10' 
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          <ArrowRightLeft className="h-4 w-4" /> E2E Encrypted Sync
        </button>
        <button
          onClick={() => setSubTab('compression')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            subTab === 'compression' 
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/10' 
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          <FileArchive className="h-4 w-4" /> AI Compression Archive
        </button>
        <button
          onClick={() => setSubTab('recovery')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            subTab === 'recovery' 
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/10' 
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          <History className="h-4 w-4" /> Disaster Recovery
        </button>
      </div>

      {/* Main Tab Panels */}
      <div className="py-2">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: END-TO-END ENCRYPTED SYNC */}
          {subTab === 'sync' && (
            <motion.div
              key="tab-sync"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col lg:flex-row gap-6"
            >
              <div className="flex-1 flex flex-col gap-5 border border-gray-100 rounded-2xl p-5 bg-gray-50/30">
                <div className="flex items-center gap-2 text-gray-800">
                  <Lock className="h-4 w-4 text-indigo-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Device Synchronization Hub</h4>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed">
                  Protect your entire workstation library using a custom client-side passphrase. 
                  Your files, shelves, and activities are derived locally into an <strong>AES-256 GCM</strong> encrypted ciphertext before synchronization. 
                  Neither our server nor any third party can read your data without your password.
                </p>

                <div className="flex flex-col gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Local Passphrase (E2E Master Key)</label>
                    <div className="relative">
                      <input
                        type="password"
                        placeholder="Enter secure master key passphrase..."
                        value={syncPassphrase}
                        onChange={(e) => setSyncPassphrase(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-xl p-2.5 pl-9 focus:border-indigo-500 focus:outline-none bg-white font-mono"
                      />
                      <Shield className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 block leading-normal">
                      💡 Important: Keep this passphrase safe. If you lose it, synchronized server backups cannot be recovered.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Device Label identifier</label>
                    <input
                      type="text"
                      placeholder="e.g. primary-macbook-pro"
                      value={syncDeviceLabel}
                      onChange={(e) => setSyncDeviceLabel(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={handleEncryptAndSync}
                    disabled={isSyncing}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl py-2.5 px-4 text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> Synchronizing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" /> Secure Sync to Cloud
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleRetrieveAndDecrypt}
                    disabled={isSyncing}
                    className="flex-1 border border-gray-200 hover:bg-gray-50 disabled:bg-white text-gray-700 rounded-xl py-2.5 px-4 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> Fetching...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" /> Pull Sync & Decrypt
                      </>
                    )}
                  </button>
                </div>

                {/* Local encryption details warning banner */}
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 flex items-start gap-2.5 mt-1">
                  <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-[10px] text-amber-800 leading-normal">
                    <strong>Zero-Knowledge Standard:</strong> Encryption keys are derived strictly in-memory on this browser session using 100,000 PBKDF2 iterations. Plaintext contents never traverse the network layer.
                  </span>
                </div>
              </div>

              {/* Sync Status Logs Pane */}
              <div className="w-full lg:w-80 border border-gray-100 rounded-2xl p-5 flex flex-col gap-4">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-50 pb-2">Sync Status Registry</h4>
                
                {syncStatus.type === 'idle' && !isSyncing && (
                  <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-gray-400">
                    <ArrowRightLeft className="h-8 w-8 stroke-[1.5]" />
                    <span className="text-xs font-medium">Device is not synchronized</span>
                    <span className="text-[10px]">Set a master key password to establish sync links.</span>
                  </div>
                )}

                {isSyncing && (
                  <div className="py-12 flex flex-col items-center justify-center text-center gap-3 text-indigo-600">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                    <span className="text-xs font-semibold">{syncStatus.message}</span>
                  </div>
                )}

                {!isSyncing && syncStatus.type !== 'idle' && (
                  <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
                    syncStatus.type === 'success' ? 'bg-emerald-50 border-emerald-150 text-emerald-800' : 'bg-red-50 border-red-150 text-red-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      {syncStatus.type === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-xs font-bold">{syncStatus.type === 'success' ? 'Synchronized' : 'Synchronization Fail'}</span>
                    </div>
                    <p className="text-[11px] leading-normal">{syncStatus.message}</p>
                    {syncStatus.type === 'success' && syncStatus.lastSyncTime && (
                      <div className="mt-2 pt-2 border-t border-emerald-200/50 flex flex-col gap-0.5 text-[9px] font-mono">
                        <div>🕒 Timestamp: {syncStatus.lastSyncTime}</div>
                        <div>💻 Device identifier: {syncStatus.deviceLabel}</div>
                        <div>👤 Identity key: {currentUserEmail}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 2: AI COMPRESSION ARCHIVE */}
          {subTab === 'compression' && (
            <motion.div
              key="tab-compression"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-5"
            >
              <div className="border border-gray-100 rounded-2xl p-5 bg-gray-50/20 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1 flex flex-col gap-1">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-indigo-500 fill-current animate-pulse" />
                    Intelligent Archival Optimizer
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    AI analyzes your workstation categories, file modification metadata, and content logs to recommend inactive legacy documents or checklists for intelligent offline ZIP storage.
                  </p>
                </div>
                <button
                  onClick={handleFetchRecommendations}
                  disabled={isLoadingRecommendations}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 px-4 text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer self-start md:self-center shrink-0"
                >
                  {isLoadingRecommendations ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Analyzing Workstation...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" /> Analyze legacy documents
                    </>
                  )}
                </button>
              </div>

              {/* Recommendations list */}
              {recommendations.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between pl-1 select-none">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recommended legacy Candidates ({recommendations.length})</span>
                    <button
                      onClick={() => {
                        if (selectedToCompress.length === recommendations.length) {
                          setSelectedToCompress([]);
                        } else {
                          setSelectedToCompress(recommendations.map(r => r.docId));
                        }
                      }}
                      className="text-[10px] text-indigo-600 hover:underline font-bold cursor-pointer"
                    >
                      {selectedToCompress.length === recommendations.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendations.map((rec) => {
                      const isSelected = selectedToCompress.includes(rec.docId);
                      const targetDoc = documents.find(d => d.id === rec.docId);
                      return (
                        <div
                          key={rec.docId}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedToCompress(prev => prev.filter(id => id !== rec.docId));
                            } else {
                              setSelectedToCompress(prev => [...prev, rec.docId]);
                            }
                          }}
                          className={`border rounded-xl p-4 cursor-pointer transition-all flex flex-col gap-2.5 relative select-none ${
                            isSelected 
                              ? 'bg-indigo-50/20 border-indigo-500 shadow-3xs' 
                              : 'bg-white border-gray-150 hover:border-gray-250'
                          }`}
                        >
                          {/* Selected Checkbox */}
                          <div className="absolute top-4 right-4 flex items-center gap-1.5">
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              rec.urgency === 'High' ? 'bg-red-50 text-red-600 border border-red-100' :
                              rec.urgency === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                              'bg-gray-50 text-gray-500 border border-gray-100'
                            }`}>
                              {rec.urgency} Priority
                            </span>
                            <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                              isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 bg-white'
                            }`}>
                              {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5 pr-20">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                              <FileArchive className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-bold text-gray-800 truncate" title={rec.title}>{rec.title}</h5>
                              {targetDoc && (
                                <span className="text-[9px] text-gray-400 font-mono block mt-0.5 uppercase tracking-wide">
                                  Type: {targetDoc.type} • Shelf: {targetDoc.category}
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-[11px] text-gray-500 leading-normal bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                            {rec.rationale}
                          </p>

                          <div className="flex items-center gap-2 text-[10px] text-indigo-600 font-semibold pl-1 select-none">
                            <span>📦 Compression savings:</span>
                            <span className="bg-indigo-50 px-1.5 py-0.2 rounded text-[9px] font-bold text-indigo-700 font-mono">
                              ~{rec.savingsPercent}% Storage Recovery
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions Bar */}
                  {selectedToCompress.length > 0 && (
                    <div className="bg-gray-900 border border-gray-800 text-white rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 mt-2 select-none shadow-lg">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest font-mono">ZIP Compression pipeline</span>
                        <span className="text-xs font-semibold">{selectedToCompress.length} legacy candidates selected for offline compilation</span>
                      </div>

                      <div className="flex gap-2.5 items-center w-full md:w-auto">
                        {compressingState === 'idle' && (
                          <button
                            onClick={handleCompressSelection}
                            className="w-full md:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <FileArchive className="h-4 w-4" /> Compile Offline ZIP Bundle
                          </button>
                        )}

                        {compressingState === 'running' && (
                          <div className="text-xs text-gray-400 font-semibold flex items-center gap-1.5 bg-gray-800 px-3 py-2 rounded-lg border border-gray-750">
                            <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                            Encoding archive segments...
                          </div>
                        )}

                        {compressingState === 'success' && compressedFileUrl && (
                          <div className="flex gap-2 w-full md:w-auto">
                            <a
                              href={compressedFileUrl}
                              download={compressedFileName}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 flex-1 md:flex-initial"
                            >
                              <Download className="h-4 w-4" /> Download ZIP Archive
                            </a>
                            <button
                              onClick={handleRetireCompressedFiles}
                              className="px-4 py-2 bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white border border-gray-750 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 flex-1 md:flex-initial"
                              title="Retire selected documents to clean shelves"
                            >
                              <Trash2 className="h-4 w-4 text-red-400" /> Archive from Workstation
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                !isLoadingRecommendations && (
                  <div className="py-16 border-2 border-dashed border-gray-150 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
                    <FileArchive className="h-10 w-10 text-gray-200 stroke-[1.5]" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-500">Workspace is not analyzed</span>
                      <span className="text-[11px] text-gray-400">Click &quot;Analyze legacy documents&quot; to inspect inactive candidate files.</span>
                    </div>
                  </div>
                )
              )}
            </motion.div>
          )}

          {/* TAB 3: DISASTER RECOVERY & SNAPSHOTS */}
          {subTab === 'recovery' && (
            <motion.div
              key="tab-recovery"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-6"
            >
              {/* Deletion Recovery AI Assistant */}
              <div className="border border-gray-100 rounded-2xl p-5 bg-gradient-to-r from-violet-50/20 to-indigo-50/20">
                <div className="flex items-center gap-2 text-indigo-900 mb-2">
                  <Sparkles className="h-4 w-4 text-indigo-600 fill-current" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">AI Deletion Recovery Assistant</h4>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Accidentally deleted an elastomer calculation, a parallel symmetry checklist, or want to restore a state? 
                  Ask the Recovery Assistant! It crawls deleted trash bins and historical snapshot points to resolve recovery commands immediately.
                </p>

                <form onSubmit={handleAskRecoveryAssistant} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g. I deleted the symmetrical product release goals checklist, please locate it..."
                      value={recoveryQuery}
                      onChange={(e) => setRecoveryQuery(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-xl p-3 pl-10 focus:border-indigo-500 focus:outline-none bg-white shadow-3xs"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isRecovering || !recoveryQuery.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl px-5 text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {isRecovering ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Crawling...
                      </>
                    ) : (
                      <>
                        Ask Assistant
                      </>
                    )}
                  </button>
                </form>

                {/* AI advice logs and actionable restore blocks */}
                {recoveryAdvice && (
                  <div className="mt-4 p-4 rounded-xl border border-indigo-100 bg-white/60 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                      AI Recovery Recommendation
                    </div>
                    
                    <p className="text-xs text-gray-600 leading-normal whitespace-pre-wrap font-sans">
                      {recoveryAdvice.replace(/\[(trash-recover|snapshot-restore):[^\]]+\]/g, '')}
                    </p>

                    {/* Renders real actionable quick buttons parsed from the response anchors */}
                    {(parsedRecoveryActions.trashRecovers.length > 0 || parsedRecoveryActions.snapshotRestores.length > 0) && (
                      <div className="flex flex-wrap gap-2.5 mt-2 pt-3 border-t border-indigo-50 select-none">
                        {parsedRecoveryActions.trashRecovers.map(docId => {
                          const doc = documents.find(d => d.id === docId);
                          return (
                            <button
                              key={docId}
                              onClick={() => executeTrashRecovery(docId)}
                              className="text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.8 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Restore &quot;{doc ? doc.title : docId}&quot; From Trash Now
                            </button>
                          );
                        })}

                        {parsedRecoveryActions.snapshotRestores.map(snapId => {
                          const snap = snapshots.find(s => s.id === snapId);
                          return (
                            <button
                              key={snapId}
                              onClick={() => executeSnapshotRestore(snapId)}
                              className="text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.8 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <History className="h-3.5 w-3.5" />
                              Apply System Snapshot &quot;{snap ? snap.label : snapId}&quot;
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Snapshots / Restore points manager */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">System Snapshot Restore Points</h4>
                  </div>

                  <form onSubmit={handleCreateSnapshot} className="flex gap-2 w-full md:w-auto select-none">
                    <input
                      type="text"
                      placeholder="Snapshot label (e.g. Pre-Milestone 2)..."
                      value={newSnapshotLabel}
                      onChange={(e) => setNewSnapshotLabel(e.target.value)}
                      className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 focus:border-indigo-500 focus:outline-none bg-white w-full md:w-60"
                    />
                    <button
                      type="submit"
                      className="bg-gray-800 hover:bg-gray-950 text-white rounded-xl px-3 text-xs font-bold transition-all cursor-pointer shrink-0"
                    >
                      Capture Point
                    </button>
                  </form>
                </div>

                {snapshotSuccess && (
                  <div className="bg-emerald-50 border border-emerald-150 p-3 rounded-xl flex items-center gap-2 text-[11px] font-semibold text-emerald-800">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    {snapshotSuccess}
                  </div>
                )}

                {snapshots.length > 0 ? (
                  <div className="flex flex-col gap-3 select-none">
                    {snapshots.map((snap) => (
                      <div
                        key={snap.id}
                        className="bg-white border border-gray-150 hover:border-gray-250 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            snap.id.includes('auto') ? 'bg-indigo-50 text-indigo-600' :
                            snap.id.includes('rollback') ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-600'
                          }`}>
                            <Clock className="h-4 w-4" />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                              {snap.label}
                              {snap.id.includes('auto') && (
                                <span className="bg-indigo-100 text-indigo-800 text-[8px] font-bold px-1 py-0.2 rounded uppercase font-mono border border-indigo-200">AUTO</span>
                              )}
                              {snap.id.includes('rollback') && (
                                <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1 py-0.2 rounded uppercase font-mono border border-amber-200">ROLLBACK</span>
                              )}
                            </h5>
                            <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5 mt-1">
                              <span>🕒 {new Date(snap.timestamp).toLocaleString()}</span>
                              <span>•</span>
                              <span>📂 {snap.documentsCount} documents</span>
                              <span>•</span>
                              <span>📊 {snap.shelvesCount} categories</span>
                              <span>•</span>
                              <span>💾 {(snap.totalSize / 1024).toFixed(1)} KB footprint</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 shrink-0 select-none">
                          <button
                            onClick={() => handleApplySnapshot(snap)}
                            className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 hover:border-indigo-250 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            title="Revert workstation to this state"
                          >
                            <History className="h-3.5 w-3.5" /> Revert Workspace
                          </button>
                          <button
                            onClick={() => handleDeleteSnapshot(snap.id)}
                            className="hover:bg-red-50 text-gray-400 hover:text-red-600 p-2 rounded-lg transition-colors cursor-pointer"
                            title="Delete snapshot"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-gray-400">
                    <History className="h-8 w-8 stroke-[1.5]" />
                    <span className="text-xs font-medium">No snapshot points captured</span>
                    <span className="text-[10px]">Create manual capture restore points above.</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
