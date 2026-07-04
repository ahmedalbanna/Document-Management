import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, AlertTriangle, FileText, ArrowRight, HelpCircle } from 'lucide-react';

interface MergeModalProps {
  localTitle: string;
  localContent: string;
  ancestorContent: string;
  incomingContent: string;
  onResolve: (mergedContent: string) => void;
  onCancel: () => void;
}

interface AlignedRow {
  index: number;
  local: string | null;
  ancestor: string | null;
  incoming: string | null;
  status: 'unchanged' | 'local-changed' | 'incoming-changed' | 'conflict';
}

export default function MergeModal({
  localTitle,
  localContent,
  ancestorContent,
  incomingContent,
  onResolve,
  onCancel,
}: MergeModalProps) {
  // Normalize and split files into lines
  const localLines = localContent.replace(/\r\n/g, '\n').split('\n');
  const ancestorLines = ancestorContent.replace(/\r\n/g, '\n').split('\n');
  const incomingLines = incomingContent.replace(/\r\n/g, '\n').split('\n');
  const maxLength = Math.max(localLines.length, ancestorLines.length, incomingLines.length);

  // Align lines and classify statuses
  const alignedRows: AlignedRow[] = [];
  for (let i = 0; i < maxLength; i++) {
    const lLine = i < localLines.length ? localLines[i] : null;
    const aLine = i < ancestorLines.length ? ancestorLines[i] : null;
    const iLine = i < incomingLines.length ? incomingLines[i] : null;

    let status: AlignedRow['status'] = 'unchanged';

    if (lLine !== aLine && iLine === aLine) {
      status = 'local-changed';
    } else if (iLine !== aLine && lLine === aLine) {
      status = 'incoming-changed';
    } else if (lLine !== aLine && iLine !== aLine) {
      if (lLine === iLine) {
        status = 'unchanged'; // both changed to the same thing
      } else {
        status = 'conflict';
      }
    }

    alignedRows.push({
      index: i,
      local: lLine,
      ancestor: aLine,
      incoming: iLine,
      status,
    });
  }

  // State to hold resolutions: mapping rowIndex -> 'local' | 'incoming' | 'ancestor'
  const [resolutions, setResolutions] = useState<Record<number, 'local' | 'incoming' | 'ancestor'>>(() => {
    const initial: Record<number, 'local' | 'incoming' | 'ancestor'> = {};
    alignedRows.forEach((row) => {
      if (row.status === 'local-changed') {
        initial[row.index] = 'local';
      } else if (row.status === 'incoming-changed') {
        initial[row.index] = 'incoming';
      } else if (row.status === 'unchanged') {
        initial[row.index] = 'local'; // they are all matching, so use local
      }
      // Leave 'conflict' keys undefined so user is forced to choose
    });
    return initial;
  });

  const conflicts = alignedRows.filter(r => r.status === 'conflict');
  const unresolvedCount = conflicts.filter(r => resolutions[r.index] === undefined).length;

  const handleResolveRow = (index: number, choice: 'local' | 'incoming' | 'ancestor') => {
    setResolutions(prev => ({
      ...prev,
      [index]: choice,
    }));
  };

  const handleApply = () => {
    if (unresolvedCount > 0) return;

    // Reconstruct merged content based on resolutions
    const mergedLines: string[] = [];
    for (let i = 0; i < maxLength; i++) {
      const choice = resolutions[i];
      const row = alignedRows[i];

      if (choice === 'local' && row.local !== null) {
        mergedLines.push(row.local);
      } else if (choice === 'incoming' && row.incoming !== null) {
        mergedLines.push(row.incoming);
      } else if (choice === 'ancestor' && row.ancestor !== null) {
        mergedLines.push(row.ancestor);
      } else {
        // Fallback or empty padded line
        if (row.local !== null) mergedLines.push(row.local);
        else if (row.incoming !== null) mergedLines.push(row.incoming);
      }
    }

    onResolve(mergedLines.join('\n'));
  };

  const handleAutoResolveAll = (choice: 'local' | 'incoming') => {
    const updated = { ...resolutions };
    conflicts.forEach((row) => {
      updated[row.index] = choice;
    });
    setResolutions(updated);
  };

  return (
    <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-[90] select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 15 }}
        className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header bar */}
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              <AlertTriangle className="h-5 w-5 animate-bounce" style={{ animationDuration: '3s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none">Smart Merge Tool</span>
                <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 font-bold px-2 py-0.5 rounded-md font-mono leading-none">
                  {unresolvedCount > 0 ? `${unresolvedCount} Conflicts Left` : 'All Resolved'}
                </span>
              </div>
              <h2 className="text-sm font-bold text-white mt-1">
                Conflict Resolution for "{localTitle}"
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {unresolvedCount > 0 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  id="auto-resolve-local"
                  onClick={() => handleAutoResolveAll('local')}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Accept All Local
                </button>
                <button
                  type="button"
                  id="auto-resolve-incoming"
                  onClick={() => handleAutoResolveAll('incoming')}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Accept All Incoming
                </button>
              </div>
            )}

            <button
              type="button"
              id="apply-merge-btn"
              disabled={unresolvedCount > 0}
              onClick={handleApply}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                unresolvedCount === 0
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-150'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Check className="h-3.5 w-3.5" /> Apply Merge & Commit
            </button>

            <button
              type="button"
              id="cancel-merge-btn"
              onClick={onCancel}
              className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Legend / Status Banner */}
        <div className="bg-gray-50 border-b border-gray-150 px-6 py-2.5 flex items-center justify-between text-[11px] font-medium text-gray-500 select-none shrink-0">
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Local Changes Only (Auto-merged)</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500" /> Incoming Changes Only (Auto-merged)</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> Conflict (Action Required)</span>
          </div>
          <div className="flex items-center gap-1 text-gray-400 font-mono text-[10px]">
            <HelpCircle className="h-3 w-3" /> Select Local or Incoming diff blocks in the Merged column below.
          </div>
        </div>

        {/* 3-Way Split Pane Grid */}
        <div className="flex-1 overflow-hidden flex bg-gray-100 p-6 gap-4 min-h-0">
          
          {/* COLUMN 1: LOCAL CHANGES */}
          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-150 flex items-center justify-between shrink-0 select-none">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Local Changes (Mine)</span>
              <span className="text-[9px] font-mono text-gray-400">Current Workstation File</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-6 bg-gray-950 text-gray-200 divide-y divide-gray-900/50 [scrollbar-width:thin]">
              {alignedRows.map((row) => {
                const isConflicted = row.status === 'conflict';
                const isLocalChanged = row.status === 'local-changed';
                
                return (
                  <div
                    key={row.index}
                    className={`flex items-start px-2 font-mono transition-colors ${
                      isConflicted 
                        ? 'bg-red-950/20 border-l-2 border-red-500 text-red-400' 
                        : isLocalChanged
                        ? 'bg-emerald-950/20 border-l-2 border-emerald-500 text-emerald-400'
                        : 'text-gray-400 opacity-60'
                    }`}
                  >
                    <span className="w-8 select-none text-right pr-3 opacity-30 text-[9px] font-mono">{row.index + 1}</span>
                    <span className="break-all whitespace-pre-wrap flex-1">{row.local !== null ? row.local : <span className="opacity-20 italic">&lt;EOF&gt;</span>}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUMN 2: COMBINED MERGED OUTPUT */}
          <div className="flex-1 flex flex-col bg-white rounded-2xl border-2 border-indigo-200 overflow-hidden shadow-md">
            <div className="bg-indigo-50/50 px-4 py-2.5 border-b border-indigo-100 flex items-center justify-between shrink-0 select-none">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Merged Output (Result)</span>
              <span className="text-[9px] font-mono text-indigo-500 font-bold">Interactive Resolution View</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-6 bg-gray-900 text-gray-100 divide-y divide-gray-800/40 [scrollbar-width:thin]">
              {alignedRows.map((row) => {
                const isConflicted = row.status === 'conflict';
                const isLocalChanged = row.status === 'local-changed';
                const isIncomingChanged = row.status === 'incoming-changed';
                const choice = resolutions[row.index];

                let lineContent = '';
                if (choice === 'local') lineContent = row.local || '';
                else if (choice === 'incoming') lineContent = row.incoming || '';
                else if (choice === 'ancestor') lineContent = row.ancestor || '';
                else lineContent = '<<< CONFLICT >>>';

                return (
                  <div key={row.index} className="flex flex-col">
                    {isConflicted && choice === undefined ? (
                      // Interactive Action box for Unresolved Conflict
                      <div className="bg-red-950/60 border border-red-500/40 p-2.5 my-1.5 rounded-xl flex flex-col gap-2 font-sans select-none">
                        <div className="flex items-center justify-between text-[10px] font-bold text-red-400 uppercase tracking-wide">
                          <span>Unresolved Line {row.index + 1}</span>
                          <span className="animate-pulse">Action Required</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => handleResolveRow(row.index, 'local')}
                            className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            Accept Local
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveRow(row.index, 'incoming')}
                            className="py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            Accept Incoming
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 font-mono italic">
                          <span className="truncate">Local: "{row.local}"</span>
                          <span className="truncate">Incoming: "{row.incoming}"</span>
                        </div>
                      </div>
                    ) : (
                      // Resolved / Aligned Line render
                      <div
                        className={`flex items-start px-2 font-mono transition-colors ${
                          isConflicted
                            ? choice === 'local'
                              ? 'bg-emerald-950/30 border-l-2 border-emerald-500 text-emerald-300 font-semibold'
                              : 'bg-indigo-950/30 border-l-2 border-indigo-500 text-indigo-300 font-semibold'
                            : isLocalChanged
                            ? 'bg-emerald-950/20 text-emerald-400'
                            : isIncomingChanged
                            ? 'bg-indigo-950/20 text-indigo-400'
                            : 'text-gray-300'
                        }`}
                      >
                        <span className="w-8 select-none text-right pr-3 opacity-30 text-[9px] font-mono">{row.index + 1}</span>
                        <span className="break-all whitespace-pre-wrap flex-1 flex items-center gap-1.5">
                          {lineContent !== '' ? lineContent : <span className="opacity-10">&nbsp;</span>}
                          
                          {/* Small clickable resolution tag if it was a resolved conflict */}
                          {isConflicted && (
                            <button
                              onClick={() => handleResolveRow(row.index, choice === 'local' ? 'incoming' : 'local')}
                              className={`text-[8px] px-1 py-0.2 rounded font-sans font-bold uppercase transition-colors shrink-0 ml-2 ${
                                choice === 'local'
                                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'
                              }`}
                              title="Click to toggle choice"
                            >
                              Using {choice} (Change)
                            </button>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUMN 3: INCOMING CHANGES */}
          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-150 flex items-center justify-between shrink-0 select-none">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Incoming Changes (Theirs)</span>
              <span className="text-[9px] font-mono text-gray-400">Uploaded File</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-6 bg-gray-950 text-gray-200 divide-y divide-gray-900/50 [scrollbar-width:thin]">
              {alignedRows.map((row) => {
                const isConflicted = row.status === 'conflict';
                const isIncomingChanged = row.status === 'incoming-changed';

                return (
                  <div
                    key={row.index}
                    className={`flex items-start px-2 font-mono transition-colors ${
                      isConflicted 
                        ? 'bg-red-950/20 border-l-2 border-red-500 text-red-400' 
                        : isIncomingChanged
                        ? 'bg-indigo-950/20 border-l-2 border-indigo-500 text-indigo-400'
                        : 'text-gray-400 opacity-60'
                    }`}
                  >
                    <span className="w-8 select-none text-right pr-3 opacity-30 text-[9px] font-mono">{row.index + 1}</span>
                    <span className="break-all whitespace-pre-wrap flex-1">{row.incoming !== null ? row.incoming : <span className="opacity-20 italic">&lt;EOF&gt;</span>}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </motion.div>
    </div>
  );
}
