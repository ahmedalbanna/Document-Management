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

    </div>
  );
}
