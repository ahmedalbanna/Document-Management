import React from 'react';
import { motion } from 'motion/react';
import { 
  Database, 
  Layers, 
  FileText, 
  Heart, 
  History, 
  Trash2, 
  CircleDot,
  FileCode,
  FileJson,
  TrendingUp,
  Download
} from 'lucide-react';
import { Document, Shelf, ActivityLog } from '../types';

interface DashboardStatsProps {
  documents: Document[];
  shelves: Shelf[];
  activities: ActivityLog[];
  onClearActivities: () => void;
}

export default function DashboardStats({
  documents,
  shelves,
  activities,
  onClearActivities,
}: DashboardStatsProps) {
  
  // Calculate key metrics
  const activeDocs = documents.filter(d => !d.isArchived);
  const totalSize = activeDocs.reduce((acc, d) => acc + d.size, 0);
  const favoriteCount = activeDocs.filter(d => d.isFavorite).length;
  
  // Quota: Let's assume 5 MB is our soft target capacity
  const MAX_CAPACITY = 5 * 1024 * 1024; // 5MB in bytes
  const capacityPercentage = Math.min(100, Math.round((totalSize / MAX_CAPACITY) * 100));

  // Count by Document types safely
  const typeDistribution = activeDocs.reduce((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Formatter helpers
  const formattedSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getLogIcon = (action: string) => {
    switch (action) {
      case 'create':
      case 'upload':
        return <CircleDot className="h-3 w-3 text-emerald-500" />;
      case 'edit':
        return <CircleDot className="h-3 w-3 text-indigo-500" />;
      case 'delete':
        return <CircleDot className="h-3 w-3 text-red-500" />;
      case 'download':
        return <Download className="h-3 w-3 text-sky-500" />;
      default:
        return <CircleDot className="h-3 w-3 text-amber-500" />;
    }
  };

  const formattedLogTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  // --- Readability Grade Level calculations (ARI) ---
  const calculateARI = (text: string) => {
    if (!text || text.trim() === '') return 0;
    const chars = text.replace(/[^a-zA-Z0-9]/g, '').length;
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const sentences = Math.max(1, text.split(/[.!?]+(\s|$)/).filter(s => s.trim().length > 0).length);
    if (words === 0) return 0;
    const ari = 4.71 * (chars / words) + 0.5 * (words / sentences) - 21.43;
    return Math.max(1, Math.min(20, Math.round(ari)));
  };

  const getReadabilityLabel = (score: number) => {
    if (score === 0) return 'Empty';
    if (score <= 4) return 'Elementary';
    if (score <= 8) return 'Middle School';
    if (score <= 12) return 'High School';
    if (score <= 16) return 'College';
    return 'Graduate Level';
  };

  const getReadabilityColor = (label: string) => {
    switch (label) {
      case 'Elementary': return 'bg-emerald-50 text-emerald-700 border-emerald-250';
      case 'Middle School': return 'bg-teal-50 text-teal-700 border-teal-250';
      case 'High School': return 'bg-sky-50 text-sky-700 border-sky-250';
      case 'College': return 'bg-indigo-50 text-indigo-700 border-indigo-250';
      case 'Graduate Level': return 'bg-violet-50 text-violet-700 border-violet-250';
      default: return 'bg-gray-50 text-gray-500 border-gray-250';
    }
  };

  // Compute average ARI across active documents
  const avgARI = activeDocs.length > 0
    ? Math.round(activeDocs.reduce((sum, d) => sum + calculateARI(d.content), 0) / activeDocs.length)
    : 0;
  const avgReadabilityLabel = getReadabilityLabel(avgARI);

  // --- Code-to-Text Ratio calculations ---
  const calculateCodeRatio = (text: string) => {
    if (!text || text.trim() === '') return 0;
    const codeBlockRegex = /```[\s\S]*?```/g;
    const matches = text.match(codeBlockRegex);
    let codeChars = 0;
    if (matches) {
      matches.forEach(m => {
        codeChars += m.length - 6; // remove ``` delimiters
      });
    }
    const inlineCodeRegex = /`[^`\n]+`/g;
    const inlineMatches = text.match(inlineCodeRegex);
    if (inlineMatches) {
      inlineMatches.forEach(m => {
        codeChars += m.length - 2;
      });
    }
    const totalChars = text.length;
    return totalChars > 0 ? Math.round((codeChars / totalChars) * 100) : 0;
  };

  const avgCodeRatio = activeDocs.length > 0
    ? Math.round(activeDocs.reduce((sum, d) => sum + calculateCodeRatio(d.content), 0) / activeDocs.length)
    : 0;

  // --- Structural Sentiment calculations ---
  const calculateSentiment = (text: string) => {
    if (!text || text.trim() === '') return 0;
    const lowerText = text.toLowerCase();
    
    const positiveWords = [
      'optimal', 'bounce', 'symmetric', 'parity', 'release', 'perfect', 
      'equilibrium', 'success', 'resolve', 'stable', 'even', 'pristine', 
      'excellent', 'beautiful', 'creative', 'active', 'high-fidelity', 
      'complete', 'save', 'restore', 'smart', 'integrated', 'fast', 'smooth'
    ];
    
    const negativeWords = [
      'fail', 'error', 'drop', 'decay', 'unbalance', 'collision', 'gravity', 
      'trash', 'archive', 'conflict', 'merge', 'regression', 'delete', 'empty', 
      'missing', 'problem', 'unstable', 'issue', 'crash', 'broken', 'slow'
    ];
    
    let pCount = 0;
    let nCount = 0;
    
    positiveWords.forEach(w => {
      const regex = new RegExp(`\\b${w}\\b`, 'g');
      const matches = lowerText.match(regex);
      if (matches) pCount += matches.length;
    });
    
    negativeWords.forEach(w => {
      const regex = new RegExp(`\\b${w}\\b`, 'g');
      const matches = lowerText.match(regex);
      if (matches) nCount += matches.length;
    });
    
    if (pCount === 0 && nCount === 0) return 0; // Neutral
    return Math.round(((pCount - nCount) / (pCount + nCount)) * 100);
  };

  // Classify sentiments across active documents
  let positiveDocs = 0;
  let neutralDocs = 0;
  let negativeDocs = 0;

  activeDocs.forEach(d => {
    const score = calculateSentiment(d.content);
    if (score > 10) positiveDocs++;
    else if (score < -10) negativeDocs++;
    else neutralDocs++;
  });

  const totalDocsCount = activeDocs.length || 1;
  const pctPositive = Math.round((positiveDocs / totalDocsCount) * 100);
  const pctNeutral = Math.round((neutralDocs / totalDocsCount) * 100);
  const pctNegative = Math.round((negativeDocs / totalDocsCount) * 100);

  // --- Tag Densities ---
  const tagCounts: Record<string, number> = {};
  activeDocs.forEach(d => {
    d.tags.forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });
  
  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const maxTagCount = sortedTags.length > 0 ? sortedTags[0][1] : 1;

  // --- Past Week Activity (7 Days Heatmap) ---
  const getPast7Days = () => {
    const days = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      days.push({
        dateStr: d.toISOString().split('T')[0], // YYYY-MM-DD
        dayName: daysOfWeek[d.getDay()],
        dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: 0
      });
    }
    return days;
  };

  const heatmapDays = getPast7Days();
  activities.forEach(log => {
    const logDateStr = log.timestamp.split('T')[0];
    const foundDay = heatmapDays.find(d => d.dateStr === logDateStr);
    if (foundDay) {
      foundDay.count += 1;
    }
  });

  // Calculate hot spots: Most active shelf (total edits in last 7 days across its docs)
  const shelfActivityCounts: Record<string, number> = {};
  shelves.forEach(s => {
    shelfActivityCounts[s.id] = 0;
  });

  activeDocs.forEach(d => {
    if (d.versions) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentEdits = d.versions.filter(v => new Date(v.updatedAt) >= oneWeekAgo).length;
      shelfActivityCounts[d.category] = (shelfActivityCounts[d.category] || 0) + recentEdits;
    }
  });

  let mostActiveShelfId = '';
  let maxShelfEdits = -1;
  Object.entries(shelfActivityCounts).forEach(([sid, count]) => {
    if (count > maxShelfEdits) {
      maxShelfEdits = count;
      mostActiveShelfId = sid;
    }
  });

  const activeShelf = shelves.find(s => s.id === mostActiveShelfId);

  // Top active document cards in the last week
  const docRecentEdits = activeDocs.map(d => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const count = d.versions ? d.versions.filter(v => new Date(v.updatedAt) >= oneWeekAgo).length : 0;
    return { doc: d, count };
  }).filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 2);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 select-none">
      
      {/* 1. Storage & Quota Metrics Card */}
      <div id="stats-storage-card" className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <Database className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Storage Capacity</h3>
              <p className="text-lg font-bold text-gray-800">{formattedSize(totalSize)} <span className="text-xs text-gray-400 font-normal">of 5.0 MB</span></p>
            </div>
          </div>
          <span className="text-xs bg-indigo-50 text-indigo-700 font-mono font-semibold px-2 py-0.5 rounded-full">
            {capacityPercentage}%
          </span>
        </div>

        {/* Visual progress meter */}
        <div className="flex flex-col gap-2 mt-2">
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${capacityPercentage || 2}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 font-mono">
            <span>Quota Utilized</span>
            <span>{formattedSize(MAX_CAPACITY - totalSize)} free</span>
          </div>
        </div>

        {/* Dynamic small counters */}
        <div className="grid grid-cols-3 gap-2 border-t border-gray-50 pt-3 mt-4">
          <div className="flex flex-col items-center p-2 bg-gray-50/50 rounded-xl">
            <span className="text-[9px] text-gray-450 uppercase font-semibold">Docs</span>
            <span className="text-sm font-bold text-gray-850 mt-0.5">{activeDocs.length}</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-gray-50/50 rounded-xl">
            <span className="text-[9px] text-gray-450 uppercase font-semibold">Shelves</span>
            <span className="text-sm font-bold text-gray-850 mt-0.5">{shelves.length}</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-gray-50/50 rounded-xl">
            <span className="text-[9px] text-gray-450 uppercase font-semibold">Favorites</span>
            <span className="text-sm font-bold text-gray-850 mt-0.5 flex items-center gap-0.5">
              <Heart className="h-3 w-3 text-rose-500 fill-current inline" />
              {favoriteCount}
            </span>
          </div>
        </div>
      </div>

      {/* 2. File Signature distribution SVG Graphic */}
      <div id="stats-signature-card" className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between">
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Signature Breakdown</h3>
          
          {/* Custom SVG Bar Chart */}
          <div className="flex flex-col gap-3 mt-2">
            {['markdown', 'text', 'json', 'pdf'].map((type) => {
              const count = typeDistribution[type] || 0;
              const pct = activeDocs.length ? Math.round((count / activeDocs.length) * 100) : 0;
              
              // Define specific tag color representations
              const colorBg = 
                type === 'markdown' ? 'bg-indigo-500' :
                type === 'json' ? 'bg-amber-500' :
                type === 'pdf' ? 'bg-rose-500' : 'bg-teal-500';

              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-[10px] uppercase font-semibold text-gray-400 w-16 truncate font-mono">
                    {type === 'markdown' ? '.md' : type === 'json' ? '.json' : type === 'pdf' ? '.pdf' : '.txt'}
                  </span>
                  
                  {/* Dynamic slider */}
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${colorBg}`}
                      style={{ width: `${pct || 1}%` }}
                    />
                  </div>
                  
                  <span className="text-[10px] text-gray-500 font-mono text-right w-10">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="text-[10px] text-gray-400 font-mono border-t border-gray-50 pt-2 flex items-center justify-between">
          <span>Active signature coverage</span>
          <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
        </div>
      </div>

      {/* 3. Chronicle Workspace Log Feed */}
      <div id="stats-activity-card" className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col h-[225px]">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-gray-500" />
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Chronicle Logs</h3>
          </div>
          {activities.length > 0 && (
            <button
              id="clear-logs-btn"
              onClick={onClearActivities}
              className="text-[10px] text-red-500 hover:text-red-700 font-medium cursor-pointer transition-colors"
            >
              Clear Feed
            </button>
          )}
        </div>

        {/* Scroll feed container */}
        <div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-2 scrollbar-none">
          {activities.length > 0 ? (
            activities.slice(0, 15).map((log) => (
              <div key={log.id} className="flex items-start gap-2.5 bg-gray-55/40 p-2 rounded-xl border border-gray-100 text-[11px] leading-relaxed text-gray-600">
                <div className="mt-0.5 shrink-0 bg-white p-1 rounded-full shadow-sm border border-gray-200/55">
                  {getLogIcon(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate">
                    <span className="capitalize font-semibold text-gray-800">{log.action}</span>
                    {` `}
                    <span className="font-mono text-gray-600">{log.documentTitle}</span>
                  </p>
                  <span className="text-[9px] text-gray-400 block font-mono mt-0.5">{formattedLogTime(log.timestamp)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-300 gap-1.5 py-6">
              <CircleDot className="h-6 w-6 text-gray-200 stroke-[1.5]" />
              <span className="text-xs font-medium text-gray-400">Chronicle path clear</span>
              <span className="text-[9px] text-gray-450">Active edits populate logs instantly</span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION DIVIDER */}
      <div className="col-span-1 lg:col-span-3 border-t border-gray-100 pt-5 mt-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-500" />
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">
            Expanded Content Analysis & Activity Heatmaps
          </h4>
        </div>
        <span className="text-[9px] text-gray-400 font-mono">Administrative Engine active</span>
      </div>

      {/* 4. Reading Grade Levels & Readability */}
      <div id="stats-readability-card" className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col h-[270px] justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Readability & Code</h3>
            <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${getReadabilityColor(avgReadabilityLabel)}`}>
              {avgReadabilityLabel}
            </span>
          </div>
          
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-gray-800">{avgARI}</span>
            <span className="text-xs text-gray-400 font-medium">Avg ARI Score</span>
          </div>

          {/* Code to text ratio comparison */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] font-semibold text-gray-500 font-mono mb-1.5">
              <span>Code-to-Text Ratio</span>
              <span>{avgCodeRatio}% Code</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
              <div 
                className="bg-indigo-500 h-full transition-all duration-500"
                style={{ width: `${avgCodeRatio}%` }}
                title={`Code: ${avgCodeRatio}%`}
              />
              <div 
                className="bg-emerald-400 h-full transition-all duration-500"
                style={{ width: `${100 - avgCodeRatio}%` }}
                title={`Plain Text: ${100 - avgCodeRatio}%`}
              />
            </div>
            <div className="flex justify-between text-[9px] text-gray-400 font-mono mt-1">
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Code blocks</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Plain prose</span>
            </div>
          </div>
        </div>

        {/* Micro list of document scores */}
        <div className="border-t border-gray-50 pt-2.5 mt-2 overflow-y-auto max-h-[85px] scrollbar-none">
          {activeDocs.slice(0, 3).map(d => {
            const docARI = calculateARI(d.content);
            const docLabel = getReadabilityLabel(docARI);
            return (
              <div key={d.id} className="flex items-center justify-between py-1 text-[10px]">
                <span className="text-gray-600 font-medium truncate max-w-[140px]">{d.title}</span>
                <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] border ${getReadabilityColor(docLabel)}`}>
                  ARI {docARI}
                </span>
              </div>
            );
          })}
          {activeDocs.length === 0 && (
            <div className="text-center text-[10px] text-gray-400 py-2">No documents available</div>
          )}
        </div>
      </div>

      {/* 5. Tag Densities & Sentiment Insights */}
      <div id="stats-sentiment-card" className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col h-[270px] justify-between">
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Sentiment & Tags</h3>
          
          {/* Sentiment segment bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[10px] text-gray-500 font-mono font-semibold mb-1">
              <span>Tone Distribution</span>
              <span className="text-emerald-600 font-bold">+{pctPositive}% Positive</span>
            </div>
            <div className="w-full bg-gray-150 rounded-full h-2 overflow-hidden flex">
              <div className="bg-emerald-500 h-full" style={{ width: `${pctPositive}%` }} title={`Positive: ${pctPositive}%`} />
              <div className="bg-gray-350 h-full" style={{ width: `${pctNeutral}%` }} title={`Neutral: ${pctNeutral}%`} />
              <div className="bg-rose-400 h-full" style={{ width: `${pctNegative}%` }} title={`Negative: ${pctNegative}%`} />
            </div>
            <div className="flex justify-between text-[8px] text-gray-400 font-mono mt-1">
              <span className="text-emerald-600">● Positive ({positiveDocs})</span>
              <span className="text-gray-450">● Neutral ({neutralDocs})</span>
              <span className="text-rose-500">● Negative ({negativeDocs})</span>
            </div>
          </div>

          {/* Top Tags density */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider font-mono">Popular Tag Densities</span>
            {sortedTags.map(([tag, count]) => {
              const pct = Math.round((count / maxTagCount) * 100);
              return (
                <div key={tag} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-600 w-12 truncate font-medium">#{tag}</span>
                  <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[9px] text-gray-400 font-mono font-medium">{count}x</span>
                </div>
              );
            })}
            {sortedTags.length === 0 && (
              <span className="text-[10px] text-gray-400 italic py-1">No tags defined</span>
            )}
          </div>
        </div>
        <div className="text-[10px] text-gray-400 font-mono border-t border-gray-50 pt-2 flex items-center justify-between">
          <span>Structural word correlation</span>
          <Database className="h-3.5 w-3.5 text-gray-300" />
        </div>
      </div>

      {/* 6. Workspace Commit Heatmap */}
      <div id="stats-heatmap-card" className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col h-[270px] justify-between">
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Commit Activity (Past Week)</h3>
          
          {/* GitHub-style 7-Day heatmap boxes */}
          <div className="flex justify-between items-center bg-gray-50/50 p-2.5 rounded-xl border border-gray-100 mb-3.5">
            <div className="flex gap-1.5 flex-1 justify-around">
              {heatmapDays.map((day) => {
                // Color scaling based on action count
                let cellBg = 'bg-gray-100 text-gray-450';
                let cellRing = 'hover:ring-gray-300';
                if (day.count > 0 && day.count <= 2) {
                  cellBg = 'bg-indigo-100 text-indigo-700 font-bold';
                  cellRing = 'hover:ring-indigo-300';
                } else if (day.count > 2 && day.count <= 5) {
                  cellBg = 'bg-indigo-300 text-indigo-900 font-extrabold';
                  cellRing = 'hover:ring-indigo-400';
                } else if (day.count > 5) {
                  cellBg = 'bg-indigo-600 text-white font-black';
                  cellRing = 'hover:ring-indigo-600';
                }

                return (
                  <div 
                    key={day.dateStr} 
                    className={`flex flex-col items-center justify-center h-10 w-9 rounded-lg text-center transition-all cursor-help border border-transparent hover:scale-105 hover:shadow-xs hover:border-white ${cellBg} ${cellRing}`}
                    title={`${day.dateLabel}: ${day.count} active logs`}
                  >
                    <span className="text-[8px] uppercase tracking-wider block font-bold leading-none opacity-80">{day.dayName}</span>
                    <span className="text-xs mt-0.5 leading-none">{day.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hot alert alerts */}
          <div className="flex flex-col gap-2">
            <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider font-mono">Telemetry Heatspots</span>
            {activeShelf && maxShelfEdits > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                <span className="text-amber-500">🔥</span>
                <span>Active Shelf: <strong className="text-gray-800">{activeShelf.name}</strong> ({maxShelfEdits} week edits)</span>
              </div>
            )}
            {docRecentEdits.length > 0 ? (
              docRecentEdits.map(({ doc, count }) => (
                <div key={doc.id} className="flex items-center gap-1.5 text-[10px] text-gray-600">
                  <span className="text-rose-500">⚡</span>
                  <span className="truncate">Hot Doc: <strong className="text-gray-800">{doc.title}</strong> ({count} revisions)</span>
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-[10px] italic">No revisions detected this week</div>
            )}
          </div>
        </div>

        <div className="text-[10px] text-gray-400 font-mono border-t border-gray-50 pt-2 flex items-center justify-between">
          <span>Weekly revision timeline</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-indigo-50 border border-indigo-150 text-indigo-700 font-mono">
            {activities.length} total events
          </span>
        </div>
      </div>

    </div>
  );
}
