import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Link, 
  Copy, 
  Check, 
  Users, 
  Lock, 
  Globe, 
  UserPlus, 
  Shield, 
  Trash2,
  LockKeyhole,
  Mail,
  UserCheck
} from 'lucide-react';
import { Document, FilePermission, ShareSettings } from '../types';

interface ShareModalProps {
  document: Document;
  onClose: () => void;
  onUpdatePermissions: (
    docId: string, 
    shareSettings: ShareSettings, 
    permissions: FilePermission[]
  ) => void;
}

export default function ShareModal({
  document,
  onClose,
  onUpdatePermissions,
}: ShareModalProps) {
  // Local states for edit persistence
  const [isPublic, setIsPublic] = useState<boolean>(document.shareSettings?.isPublic ?? false);
  const [publicRole, setPublicRole] = useState<'viewer' | 'editor'>(document.shareSettings?.publicRole ?? 'viewer');
  const [permissions, setPermissions] = useState<FilePermission[]>(document.permissions ?? []);
  
  // Invite form state
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'viewer' | 'editor'>('viewer');
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Generate the absolute, real URL for sharing
  const generateShareUrl = () => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const currentRole = isPublic ? publicRole : 'viewer';
    return `${origin}${pathname}?sharedDocId=${document.id}&accessRole=${currentRole}`;
  };

  const handleCopyLink = () => {
    const shareUrl = generateShareUrl();
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    const email = newEmail.trim().toLowerCase();
    if (!email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (email === 'ahmedalbanna966@gmail.com') {
      setErrorMessage('This user is already the document owner.');
      return;
    }

    if (permissions.some(p => p.email === email)) {
      setErrorMessage('This teammate already has explicit permissions.');
      return;
    }

    setPermissions([...permissions, { email, role: newRole }]);
    setNewEmail('');
  };

  const handleRemoveMember = (emailToRemove: string) => {
    setPermissions(permissions.filter(p => p.email !== emailToRemove));
  };

  const handleUpdateMemberRole = (email: string, role: 'viewer' | 'editor') => {
    setPermissions(
      permissions.map(p => p.email === email ? { ...p, role } : p)
    );
  };

  const handleSave = () => {
    onUpdatePermissions(
      document.id,
      { isPublic, publicRole },
      permissions
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-[90] select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl border border-gray-150 shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-tight">Teamwork & File Permissions</h3>
              <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[280px]">
                Managing access controls for <span className="font-semibold text-gray-650 font-mono">"{document.title}"</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200/50 rounded-lg text-gray-400 hover:text-gray-650 transition-colors cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[70vh] [scrollbar-width:thin]">
          {/* 1. General Access Section */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <LockKeyhole className="h-3 w-3 text-indigo-550" /> General Access Settings
            </span>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Restricted Option */}
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`p-3.5 rounded-2xl border text-left flex gap-3 transition-all ${
                  !isPublic 
                    ? 'border-indigo-500 bg-indigo-50/20 ring-1 ring-indigo-500' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                }`}
              >
                <div className={`p-2 rounded-xl h-9 w-9 flex items-center justify-center shrink-0 ${!isPublic ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-gray-800">Restricted</span>
                  <span className="text-[9px] text-gray-400 leading-tight mt-0.5">Only specific members invited below can open this file.</span>
                </div>
              </button>

              {/* Public Option */}
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`p-3.5 rounded-2xl border text-left flex gap-3 transition-all ${
                  isPublic 
                    ? 'border-indigo-500 bg-indigo-50/20 ring-1 ring-indigo-500' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                }`}
              >
                <div className={`p-2 rounded-xl h-9 w-9 flex items-center justify-center shrink-0 ${isPublic ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                  <Globe className="h-4.5 w-4.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-gray-800">Anyone with Link</span>
                  <span className="text-[9px] text-gray-400 leading-tight mt-0.5">Anyone possessing the access URL can view or edit directly.</span>
                </div>
              </button>
            </div>

            {/* Public Link Role Configuration */}
            {isPublic && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 bg-indigo-50/40 border border-indigo-100/30 rounded-xl p-3 flex items-center justify-between text-xs text-indigo-900"
              >
                <span className="font-semibold flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-indigo-550 shrink-0" /> Public Access Level:
                </span>
                <select
                  value={publicRole}
                  onChange={(e) => setPublicRole(e.target.value as any)}
                  className="bg-white border border-indigo-200 text-xs font-bold text-indigo-800 rounded-lg py-1 px-2.5 focus:outline-none focus:ring-0"
                >
                  <option value="viewer">Viewer (Read Only)</option>
                  <option value="editor">Editor (Can Make Edits)</option>
                </select>
              </motion.div>
            )}
          </div>

          {/* 2. Copy Link Container */}
          <div className="bg-gray-50 border border-gray-150 p-3.5 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-white border border-gray-200 text-gray-400">
                <Link className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Access Link</span>
                <span className="text-xs text-gray-500 truncate font-mono mt-0.5 max-w-[270px]">
                  {generateShareUrl()}
                </span>
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                copied 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
              }`}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied Link' : 'Copy Link'}
            </button>
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-gray-100" />

          {/* 3. Specific Member Invites Section */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Mail className="h-3 w-3 text-indigo-550" /> Direct Teammate Permissions
            </span>

            {/* Invite Form */}
            <form onSubmit={handleAddMember} className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Invite colleague by email..."
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full text-xs bg-white border border-gray-200 rounded-xl pl-3 pr-2.5 py-2.5 focus:border-indigo-500 focus:outline-none placeholder-gray-405 font-medium"
                />
              </div>
              
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="bg-white border border-gray-200 text-xs rounded-xl px-2 focus:outline-none focus:border-indigo-500 font-semibold"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>

              <button
                type="submit"
                className="bg-gray-100 hover:bg-gray-200 hover:text-gray-900 text-gray-700 rounded-xl px-4 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <UserPlus className="h-4 w-4" /> Add
              </button>
            </form>

            {errorMessage && (
              <span className="text-[10px] text-red-500 font-bold ml-1">
                ⚠️ {errorMessage}
              </span>
            )}

            {/* Teammates List */}
            <div className="flex flex-col gap-1.5 mt-1 max-h-48 overflow-y-auto pr-1 border border-gray-50 rounded-2xl bg-gray-50/30 p-2 [scrollbar-width:thin]">
              {/* Document Owner entry */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-100 shadow-3xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0 leading-none">
                    <span className="text-xs font-bold text-gray-800 truncate">ahmedalbanna966@gmail.com</span>
                    <span className="text-[9px] text-indigo-500 font-bold font-mono tracking-wider mt-0.5">OWNER (YOU)</span>
                  </div>
                </div>
                <span className="text-[10px] bg-indigo-50 text-indigo-750 font-bold px-2 py-1 rounded-lg">
                  Full Owner
                </span>
              </div>

              {/* Invited teammates */}
              {permissions.length > 0 ? (
                permissions.map((member) => (
                  <div key={member.email} className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-100 shadow-3xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 font-bold text-xs uppercase shrink-0">
                        {member.email.charAt(0)}
                      </div>
                      <div className="flex flex-col min-w-0 leading-none">
                        <span className="text-xs font-semibold text-gray-750 truncate">{member.email}</span>
                        <span className="text-[8px] text-gray-400 font-mono tracking-wider mt-0.5 uppercase">{member.role} Access</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateMemberRole(member.email, e.target.value as any)}
                        className="bg-transparent border border-gray-150 hover:border-gray-200 text-[10px] font-bold text-gray-600 rounded-md py-0.5 px-1.5 focus:outline-none"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.email)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all cursor-pointer"
                        title="Remove Access"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-[10px] text-gray-400 italic">
                  No other team members have direct permissions. Use link sharing or add emails above.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-150 transition-all cursor-pointer"
          >
            Apply Settings
          </button>
        </div>
      </motion.div>
    </div>
  );
}
