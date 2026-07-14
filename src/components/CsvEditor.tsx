import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Plus, 
  Trash2, 
  Search, 
  Download, 
  Sparkles, 
  Database,
  ArrowUpDown,
  Filter,
  Check,
  TrendingUp,
  BarChart3,
  LineChart as LineIcon,
  PieChart as PieIcon,
  Activity,
  CheckSquare,
  Square,
  BarChart4,
  LayoutGrid,
  Link as LinkIcon,
  ExternalLink,
  Kanban,
  Sliders,
  FolderOpen,
  PlusCircle,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  AreaChart as RechartsAreaChart,
  Area,
  ScatterChart,
  Scatter,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Document } from '../types';

interface CsvEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  title: string;
  documents?: Document[];
  onOpenDoc?: (doc: Document) => void;
}

export default function CsvEditor({ content, onChange, title, documents, onOpenDoc }: CsvEditorProps) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortColIdx, setSortColIdx] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Chart modes & customizations
  const [viewMode, setViewMode] = useState<'grid' | 'database' | 'charts'>('grid');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area' | 'pie' | 'scatter'>('line');
  const [xAxisKey, setXAxisKey] = useState<string>('');
  const [selectedYKeys, setSelectedYKeys] = useState<string[]>([]);
  const [colorTheme, setColorTheme] = useState<'indigo' | 'emerald' | 'violet' | 'rose' | 'amber'>('indigo');

  // Notion Relational Database view states
  const [dbSubView, setDbSubView] = useState<'table' | 'board'>('table');
  const [dbFilterCol, setDbFilterCol] = useState<string>('');
  const [dbFilterQuery, setDbFilterQuery] = useState<string>('');
  const [dbGroupByCol, setDbGroupByCol] = useState<string>('');
  const [activeLinkDropdown, setActiveLinkDropdown] = useState<{ rowIdx: number; colIdx: number } | null>(null);

  // Auto-detect good defaults for database groupings & filters
  useEffect(() => {
    if (headers.length > 0) {
      if (!dbGroupByCol) {
        const bestGroup = headers.find(h => ['state', 'status', 'category', 'priority', 'group', 'phase'].includes(h.toLowerCase())) || headers[headers.length - 1];
        setDbGroupByCol(bestGroup || headers[0]);
      }
      if (!dbFilterCol) {
        setDbFilterCol(headers[0]);
      }
    }
  }, [headers]);

  // Parse CSV string on load
  useEffect(() => {
    if (!content.trim()) {
      // Default placeholder matrix
      setHeaders(['TIMESTAMP', 'ACCEL_Y', 'VEL_Y', 'STATE']);
      setRows([
        ['1718665320', '-9.81', '14.20', 'IMPACT_01'],
        ['1718665321', '-5.21', '11.50', 'IMPACT_02'],
        ['1718665322', '3.10', '9.10', 'IMPACT_03'],
        ['1718665323', '8.44', '7.20', 'IMPACT_04'],
        ['1718665324', '-1.12', '12.80', 'IMPACT_05']
      ]);
    } else {
      parseCsv(content);
    }
  }, [content]);

  // Auto-detect keys for charts once data is loaded
  useEffect(() => {
    if (headers.length > 0) {
      if (!xAxisKey) setXAxisKey(headers[0]);
      
      // Discover columns containing numbers
      const numericCols = headers.filter(h => {
        const idx = headers.indexOf(h);
        return rows.some(r => {
          const val = r[idx];
          return val !== undefined && val !== '' && !isNaN(parseFloat(val));
        });
      });
      
      if (numericCols.length > 0 && selectedYKeys.length === 0) {
        const firstY = numericCols.find(c => c !== headers[0]) || numericCols[0];
        setSelectedYKeys([firstY]);
      }
    }
  }, [headers, rows]);

  const parseCsv = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
    if (lines.length === 0) return;

    // First line holds headers
    const headerRow = lines[0].split(',').map(h => h.trim());
    
    // Remaining lines hold rows
    const dataRows = lines.slice(1).map(line => {
      const cells = line.split(',');
      // Pad cells if they don't match header length
      while (cells.length < headerRow.length) {
        cells.push('');
      }
      return cells.slice(0, headerRow.length).map(c => c.trim());
    });

    setHeaders(headerRow);
    setRows(dataRows);
  };

  // Serialize current grid back to CSV and trigger onChange
  const serializeAndSave = (currentHeaders: string[], currentRows: string[][]) => {
    const headerLine = currentHeaders.join(',');
    const rowLines = currentRows.map(row => row.join(','));
    const fullCsv = [headerLine, ...rowLines].join('\n');
    onChange(fullCsv);
  };

  // Modify cell value directly
  const handleCellChange = (rowIdx: number, colIdx: number, val: string) => {
    const sanitizedVal = val.replace(/,/g, '');
    const updatedRows = rows.map((r, rIdx) => {
      if (rIdx === rowIdx) {
        return r.map((c, cIdx) => (cIdx === colIdx ? sanitizedVal : c));
      }
      return r;
    });
    setRows(updatedRows);
    serializeAndSave(headers, updatedRows);
  };

  // Modify header label directly
  const handleHeaderChange = (colIdx: number, val: string) => {
    const sanitizedVal = val.replace(/,/g, '').trim() || `COLUMN_${colIdx + 1}`;
    const updatedHeaders = headers.map((h, cIdx) => (cIdx === colIdx ? sanitizedVal : h));
    setHeaders(updatedHeaders);
    serializeAndSave(updatedHeaders, rows);
  };

  // Row operations
  const handleAddRow = () => {
    const newRow = Array(headers.length).fill('');
    const updatedRows = [...rows, newRow];
    setRows(updatedRows);
    serializeAndSave(headers, updatedRows);
  };

  const handleDeleteRow = (rowIdxToDelete: number) => {
    const updatedRows = rows.filter((_, idx) => idx !== rowIdxToDelete);
    setRows(updatedRows);
    serializeAndSave(headers, updatedRows);
  };

  // Column operations
  const handleAddColumn = () => {
    const nextColNum = headers.length + 1;
    const updatedHeaders = [...headers, `NEW_METRIC_${nextColNum}`];
    const updatedRows = rows.map(r => [...r, '']);
    setHeaders(updatedHeaders);
    setRows(updatedRows);
    serializeAndSave(updatedHeaders, updatedRows);
  };

  const handleDeleteColumn = (colIdxToDelete: number) => {
    if (headers.length <= 1) return; // Must hold at least one column
    const updatedHeaders = headers.filter((_, idx) => idx !== colIdxToDelete);
    const updatedRows = rows.map(r => r.filter((_, idx) => idx !== colIdxToDelete));
    setHeaders(updatedHeaders);
    setRows(updatedRows);
    serializeAndSave(updatedHeaders, updatedRows);
  };

  // Sort columns
  const handleSort = (colIdx: number) => {
    const isAscending = sortColIdx === colIdx ? !sortAsc : true;
    setSortColIdx(colIdx);
    setSortAsc(isAscending);

    const sorted = [...rows].sort((a, b) => {
      const valA = a[colIdx];
      const valB = b[colIdx];
      const numA = parseFloat(valA);
      const numB = parseFloat(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return isAscending ? numA - numB : numB - numA;
      }
      return isAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    setRows(sorted);
    serializeAndSave(headers, sorted);
  };

  const handleDownloadCsv = () => {
    const headerLine = headers.join(',');
    const rowLines = rows.map(row => row.join(','));
    const fullCsv = [headerLine, ...rowLines].join('\n');
    const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}_spreadsheet.csv`;
    link.click();
  };

  // Row filtering based on search text
  const filteredRows = rows.map((r, originalIdx) => ({ r, originalIdx })).filter(({ r }) => {
    if (!searchQuery.trim()) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return r.some(cell => cell.toLowerCase().includes(lowerQuery));
  });

  // --- Chart Data Preparation ---
  const numericColumns = headers.filter(h => {
    const idx = headers.indexOf(h);
    return rows.some(r => {
      const val = r[idx];
      return val !== undefined && val !== '' && !isNaN(parseFloat(val));
    });
  });

  const chartData = rows.map((row) => {
    const obj: Record<string, any> = {};
    headers.forEach((header, idx) => {
      const val = row[idx];
      const num = parseFloat(val);
      obj[header] = isNaN(num) ? val : num;
    });
    return obj;
  });

  // Theme palettes definition
  const themes = {
    indigo: { primary: '#4f46e5', secondary: '#818cf8', gradient: ['#4f46e5', '#818cf8', '#c7d2fe', '#e0e7ff', '#312e81'] },
    emerald: { primary: '#10b981', secondary: '#34d399', gradient: ['#10b981', '#34d399', '#a7f3d0', '#d1fae5', '#064e3b'] },
    violet: { primary: '#8b5cf6', secondary: '#a78bfa', gradient: ['#8b5cf6', '#a78bfa', '#ddd6fe', '#f5f3ff', '#4c1d95'] },
    rose: { primary: '#f43f5e', secondary: '#fb7185', gradient: ['#f43f5e', '#fb7185', '#fecdd3', '#fff1f2', '#881337'] },
    amber: { primary: '#f59e0b', secondary: '#fbbf24', gradient: ['#f59e0b', '#fbbf24', '#fde68a', '#fef3c7', '#78350f'] }
  };

  const activeTheme = themes[colorTheme];

  const handleToggleYKey = (key: string) => {
    setSelectedYKeys(prev => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // Keep at least one selected
        return prev.filter(k => k !== key);
      }
      return [...prev, key];
    });
  };

  // Compute aggregate statistics for the selected Y keys
  const getStats = (key: string) => {
    const vals = rows.map(r => parseFloat(r[headers.indexOf(key)])).filter(v => !isNaN(v));
    if (vals.length === 0) return { min: 0, max: 0, avg: 0, sum: 0 };
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const sum = vals.reduce((s, v) => s + v, 0);
    const avg = sum / vals.length;
    return { min, max, avg, sum };
  };

  const parseDocLink = (cellVal: string) => {
    if (cellVal && cellVal.startsWith('[doc:') && cellVal.endsWith(']')) {
      return cellVal.slice(5, -1);
    }
    return null;
  };

  const getLinkedDocInfo = (docId: string) => {
    if (!documents) return null;
    return documents.find(d => d.id === docId || d.title.toLowerCase() === docId.toLowerCase());
  };

  const getFilteredDbRows = () => {
    return rows.map((r, originalIdx) => ({ r, originalIdx })).filter(({ r }) => {
      // 1. General search query
      if (searchQuery.trim()) {
        const lowerQuery = searchQuery.toLowerCase();
        const matchesSearch = r.some(cell => cell.toLowerCase().includes(lowerQuery));
        if (!matchesSearch) return false;
      }

      // 2. Column specific filter
      if (dbFilterCol && dbFilterQuery.trim()) {
        const colIdx = headers.indexOf(dbFilterCol);
        if (colIdx !== -1 && r[colIdx]) {
          const cellVal = r[colIdx].toLowerCase();
          const filterVal = dbFilterQuery.toLowerCase();
          if (!cellVal.includes(filterVal)) return false;
        } else if (colIdx !== -1) {
          return false;
        }
      }

      return true;
    });
  };

  const getStatusBadgeStyle = (val: string) => {
    const clean = val.toUpperCase().trim();
    if (['TODO', 'BACKLOG', 'لم يبدأ', 'قيد الانتظار', 'STATE_01', 'IMPACT_01'].includes(clean)) {
      return 'bg-blue-50 text-blue-700 border-blue-200/60 hover:bg-blue-100';
    }
    if (['IN PROGRESS', 'DOING', 'قيد التنفيذ', 'STATE_02', 'IMPACT_02', 'STATE_03', 'IMPACT_03', 'STATE_04'].includes(clean)) {
      return 'bg-amber-50 text-amber-700 border-amber-200/60 hover:bg-amber-100';
    }
    if (['DONE', 'COMPLETED', 'تم الإنجاز', 'SUCCESS', 'STATE_05', 'IMPACT_04', 'IMPACT_05'].includes(clean)) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/60 hover:bg-emerald-100';
    }
    if (['FAILED', 'CANCELLED', 'ملغي', 'مرفوض'].includes(clean)) {
      return 'bg-rose-50 text-rose-700 border-rose-200/60 hover:bg-rose-100';
    }
    // Default pastel style based on string hash
    let hash = 0;
    for (let i = 0; i < val.length; i++) {
      hash = val.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200/60 hover:bg-purple-100' },
      { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200/60 hover:bg-indigo-100' },
      { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200/60 hover:bg-pink-100' },
      { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200/60 hover:bg-teal-100' },
      { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200/60 hover:bg-cyan-100' },
    ];
    const picked = colors[Math.abs(hash) % colors.length];
    return `${picked.bg} ${picked.text} ${picked.border}`;
  };

  return (
    <div className="flex flex-col gap-5 h-full select-none">
      
      {/* Top Controller Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-gray-150 p-4 rounded-2xl shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-550 rounded-xl text-white shadow-sm shadow-indigo-150">
            {viewMode === 'grid' ? <Grid className="h-4 w-4" /> : viewMode === 'database' ? <Database className="h-4 w-4" /> : <BarChart4 className="h-4 w-4" />}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-widest font-mono">
              {viewMode === 'grid' ? 'Parity CSV Spreadsheet' : viewMode === 'database' ? 'Notion Relational DB' : 'Interactive Analytical Charts'}
            </span>
            <span className="text-[10px] text-gray-400 font-mono">
              Dimension size: <span className="text-gray-600 font-semibold">{rows.length} rows</span> × <span className="text-gray-600 font-semibold">{headers.length} metrics</span>
            </span>
          </div>
        </div>

        {/* View Switcher toggle */}
        <div className="flex items-center gap-2">
          <div className="bg-gray-100 p-0.8 rounded-xl border border-gray-200 flex items-center shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-gray-550 hover:text-gray-800'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Spreadsheet Grid
            </button>
            <button
              onClick={() => setViewMode('database')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'database'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-gray-550 hover:text-gray-800'
              }`}
            >
              <Database className="h-3.5 w-3.5 text-indigo-600" /> Relational Database
            </button>
            <button
              onClick={() => setViewMode('charts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'charts'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-gray-550 hover:text-gray-800'
              }`}
            >
              <BarChart4 className="h-3.5 w-3.5 text-indigo-600 fill-indigo-100/40" /> Interactive Charts
            </button>
          </div>

          <div className="h-6 w-[1px] bg-gray-200 mx-1 hidden md:block" />

          {/* Quick Filters / Search (only for Grid/Database Mode) */}
          {viewMode === 'grid' || viewMode === 'database' ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter cell values..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none w-36 focus:bg-white"
                />
              </div>

              {viewMode === 'database' && (
                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1">
                  <Sliders className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <select
                    value={dbFilterCol}
                    onChange={(e) => setDbFilterCol(e.target.value)}
                    className="text-[10px] bg-transparent border-none text-gray-700 focus:outline-none cursor-pointer font-bold max-w-[80px]"
                  >
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Filter criteria..."
                    value={dbFilterQuery}
                    onChange={(e) => setDbFilterQuery(e.target.value)}
                    className="text-[10px] bg-white border border-gray-200 rounded-md px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-16"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleAddColumn}
                className="px-3 py-2 border border-gray-200 hover:border-indigo-150 hover:bg-indigo-50/20 text-gray-600 hover:text-indigo-600 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Metric
              </button>

              <button
                type="button"
                onClick={handleAddRow}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" /> Insert Row
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">Theme:</span>
              <div className="flex items-center gap-1">
                {(Object.keys(themes) as Array<keyof typeof themes>).map(tName => (
                  <button
                    key={tName}
                    onClick={() => setColorTheme(tName)}
                    style={{ backgroundColor: themes[tName].primary }}
                    className={`h-4.5 w-4.5 rounded-full border cursor-pointer transition-transform ${
                      colorTheme === tName ? 'scale-120 border-gray-900 ring-2 ring-indigo-200' : 'border-transparent hover:scale-110'
                    }`}
                    title={`Theme: ${tName}`}
                  />
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-500 hover:text-gray-800 transition-colors cursor-pointer shrink-0"
            title="Download CSV Spreadsheet"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Area: Grid, Database, or Charts */}
      {viewMode === 'grid' ? (
        <div className="flex-1 bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-start min-h-[400px]">
          <div className="overflow-auto max-h-[50vh] [scrollbar-width:thin]">
            <table className="min-w-full divide-y divide-gray-150 border-collapse table-auto">
              {/* Table Headers */}
              <thead className="bg-gray-50/80 sticky top-0 backdrop-blur-xs z-10 border-b border-gray-150">
                <tr>
                  <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono w-10 border-r border-gray-150 select-none">
                    #
                  </th>
                  {headers.map((hdr, colIdx) => (
                    <th 
                      key={`th-${colIdx}`} 
                      className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-150 hover:bg-gray-100 group min-w-[130px]"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <input
                          type="text"
                          value={hdr}
                          onChange={(e) => handleHeaderChange(colIdx, e.target.value)}
                          className="bg-transparent font-bold text-gray-800 focus:outline-none focus:border-indigo-500 border-b border-transparent w-full"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSort(colIdx)}
                            className="p-1 hover:bg-gray-200/60 rounded text-gray-400 hover:text-indigo-600 transition-colors"
                            title="Sort Column"
                          >
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteColumn(colIdx)}
                            disabled={headers.length <= 1}
                            className={`p-1 hover:bg-red-50 hover:text-red-600 rounded transition-colors ${headers.length <= 1 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400'}`}
                            title="Delete Metric"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Rows */}
              <tbody className="divide-y divide-gray-100 bg-white text-xs text-gray-600">
                {filteredRows.length > 0 ? (
                  filteredRows.map(({ r, originalIdx }, rowIdx) => (
                    <tr key={`tr-${originalIdx}`} className="hover:bg-gray-50/40 group">
                      {/* Index row */}
                      <td className="px-3 py-1.5 text-center font-mono text-[10px] text-gray-400 bg-gray-50/40 border-r border-gray-100 font-bold select-none">
                        <div className="flex items-center justify-center gap-1">
                          <span>{originalIdx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(originalIdx)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-600 rounded transition-opacity cursor-pointer animate-fade-in"
                            title="Delete Row"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>

                      {/* Data Cells */}
                      {r.map((cell, colIdx) => (
                        <td key={`td-${originalIdx}-${colIdx}`} className="px-4 py-1.5 border-r border-gray-100">
                          <input
                            type="text"
                            value={cell}
                            onChange={(e) => handleCellChange(originalIdx, colIdx, e.target.value)}
                            className="bg-transparent focus:outline-none focus:bg-indigo-50/20 focus:text-indigo-950 p-1 rounded-md border border-transparent focus:border-indigo-200 w-full font-mono text-xs text-gray-700"
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={headers.length + 1} className="py-12 text-center text-gray-400 italic">
                      No cell matching "{searchQuery}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'database' ? (
        /* Database Mode Render block */
        <div className="flex-1 flex flex-col gap-4 min-h-[450px]">
          {/* Database Sub-view Toolbar */}
          <div className="flex items-center justify-between bg-white border border-gray-150 p-3.5 rounded-2xl shadow-3xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDbSubView('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  dbSubView === 'table'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    : 'text-gray-550 hover:text-gray-800 border border-transparent'
                }`}
              >
                <Grid className="h-3.5 w-3.5" /> Table View (عرض الجدول)
              </button>
              <button
                type="button"
                onClick={() => setDbSubView('board')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  dbSubView === 'board'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    : 'text-gray-550 hover:text-gray-800 border border-transparent'
                }`}
              >
                <Kanban className="h-3.5 w-3.5" /> Board / Kanban (لوحة التتبع)
              </button>
            </div>

            {dbSubView === 'board' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-bold font-mono uppercase tracking-wider">Group By:</span>
                <select
                  value={dbGroupByCol}
                  onChange={(e) => setDbGroupByCol(e.target.value)}
                  className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-550 font-bold text-gray-700 cursor-pointer"
                >
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Database Sub-view Body */}
          {dbSubView === 'table' ? (
            /* Database Table View */
            <div className="flex-1 bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden flex flex-col justify-start">
              <div className="overflow-auto max-h-[50vh] [scrollbar-width:thin]">
                <table className="min-w-full divide-y divide-gray-150 border-collapse table-auto">
                  <thead className="bg-gray-50/80 sticky top-0 backdrop-blur-xs z-10 border-b border-gray-150">
                    <tr>
                      <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono w-10 border-r border-gray-150">
                        #
                      </th>
                      {headers.map((hdr, colIdx) => (
                        <th key={`db-th-${colIdx}`} className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 border-r border-gray-150 min-w-[140px]">
                          <div className="flex items-center justify-between">
                            <span className="truncate">{hdr}</span>
                            <span className="text-[9px] font-mono font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              {hdr.toLowerCase().includes('state') || hdr.toLowerCase().includes('status') ? 'status' : hdr.startsWith('[doc') ? 'relation' : 'text'}
                            </span>
                          </div>
                        </th>
                      ))}
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {getFilteredDbRows().map(({ r, originalIdx }, rowSeq) => (
                      <tr key={`db-tr-${originalIdx}`} className="hover:bg-gray-50/60 transition-colors group">
                        <td className="px-3 py-2 text-center font-mono text-[10px] font-bold text-gray-400 border-r border-gray-100 select-none">
                          {rowSeq + 1}
                        </td>
                        {r.map((cell, colIdx) => {
                          const docLink = parseDocLink(cell);
                          const linkedDoc = docLink ? getLinkedDocInfo(docLink) : null;
                          const isStatus = headers[colIdx].toLowerCase().includes('state') || headers[colIdx].toLowerCase().includes('status');

                          return (
                            <td key={`db-td-${originalIdx}-${colIdx}`} className="px-4 py-2 border-r border-gray-100 relative">
                              {docLink ? (
                                <div className="flex items-center gap-1.5">
                                  {linkedDoc ? (
                                    <div className="flex items-center gap-1 bg-indigo-50/80 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-bold shadow-3xs max-w-full">
                                      <FileText className="h-3 w-3 shrink-0 text-indigo-500" />
                                      <span className="truncate max-w-[120px]">{linkedDoc.title}</span>
                                      {onOpenDoc && (
                                        <button
                                          type="button"
                                          onClick={() => onOpenDoc(linkedDoc)}
                                          className="p-0.5 hover:bg-indigo-100 rounded text-indigo-600 cursor-pointer"
                                          title="Open related document"
                                        >
                                          <ExternalLink className="h-2.5 w-2.5" />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 bg-rose-50 border border-rose-100 text-rose-700 px-2.5 py-1 rounded-lg text-xs font-bold max-w-full">
                                      <FileText className="h-3 w-3 text-rose-500 shrink-0" />
                                      <span className="truncate max-w-[100px] italic">Red link: {docLink}</span>
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleCellChange(originalIdx, colIdx, '')}
                                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 cursor-pointer text-[10px] font-bold"
                                    title="Clear link"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : isStatus && cell.trim() ? (
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border shadow-3xs ${getStatusBadgeStyle(cell)}`}>
                                    {cell}
                                  </span>
                                  <input
                                    type="text"
                                    value={cell}
                                    onChange={(e) => handleCellChange(originalIdx, colIdx, e.target.value)}
                                    className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-white/90 border border-indigo-200 text-xs text-gray-800 p-2 font-mono rounded focus:opacity-100 focus:outline-none transition-opacity focus:ring-1 focus:ring-indigo-550"
                                  />
                                </div>
                              ) : (
                                <div className="relative w-full">
                                  <input
                                    type="text"
                                    value={cell}
                                    onChange={(e) => handleCellChange(originalIdx, colIdx, e.target.value)}
                                    className="bg-transparent focus:outline-none focus:bg-indigo-50/20 focus:text-indigo-950 p-1.5 rounded-lg border border-transparent hover:border-gray-200 focus:border-indigo-200 w-full font-mono text-xs text-gray-700"
                                  />
                                  {/* Link Doc Quick Trigger */}
                                  {!cell.trim() && documents && documents.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setActiveLinkDropdown({ rowIdx: originalIdx, colIdx })}
                                      className="absolute right-1 top-1.5 p-1 bg-gray-50 border border-gray-150 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 text-[10px] text-gray-455 font-bold rounded-md flex items-center gap-0.5 cursor-pointer transition-colors shadow-3xs"
                                    >
                                      <LinkIcon className="h-2.5 w-2.5" /> Relation
                                    </button>
                                  )}

                                  {/* Relational Link Dropdown Menu */}
                                  {activeLinkDropdown && activeLinkDropdown.rowIdx === originalIdx && activeLinkDropdown.colIdx === colIdx && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setActiveLinkDropdown(null)} />
                                      <div className="absolute right-0 top-8 bg-white border border-gray-200 shadow-xl rounded-xl p-2 z-50 w-52 max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-1">
                                        <div className="text-[10px] text-gray-400 font-bold uppercase p-1.5 border-b border-gray-100">
                                          Link to document:
                                        </div>
                                        <div className="flex flex-col gap-0.5 mt-1">
                                          {documents.map(doc => (
                                            <button
                                              key={doc.id}
                                              type="button"
                                              onClick={() => {
                                                handleCellChange(originalIdx, colIdx, `[doc:${doc.id}]`);
                                                setActiveLinkDropdown(null);
                                              }}
                                              className="w-full text-left px-2 py-1.5 hover:bg-indigo-50 text-xs font-semibold text-gray-750 hover:text-indigo-700 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                                            >
                                              <FileText className="h-3.5 w-3.5 text-indigo-550 shrink-0" />
                                              <span className="truncate">{doc.title}</span>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(originalIdx)}
                            className="p-1 text-gray-350 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="Delete Row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Database Kanban Board / Gallery View */
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 [scrollbar-width:thin] flex gap-5 items-start min-h-[380px]">
              {(() => {
                const groupColIdx = headers.indexOf(dbGroupByCol);
                if (groupColIdx === -1) return <div className="text-gray-400 text-xs font-bold p-6">Please select a valid group-by column.</div>;

                // Extract all unique values for the grouping column
                const uniqueGroupVals = Array.from(new Set(rows.map(r => r[groupColIdx] || 'Unassigned')));
                if (!uniqueGroupVals.includes('Unassigned') && rows.some(r => !r[groupColIdx])) {
                  uniqueGroupVals.push('Unassigned');
                }

                return uniqueGroupVals.map(groupVal => {
                  const filteredRows = getFilteredDbRows().filter(({ r }) => {
                    const cellVal = String(r[groupColIdx] || 'Unassigned');
                    const gValStr = String(groupVal);
                    return cellVal.toLowerCase().trim() === gValStr.toLowerCase().trim();
                  });

                  return (
                    <div
                      key={String(groupVal)}
                      className="w-72 shrink-0 bg-gray-50 border border-gray-200/80 rounded-2xl p-4 flex flex-col gap-3 max-h-[480px] shadow-3xs"
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${
                            ['todo', 'لم يبدأ'].includes(String(groupVal).toLowerCase()) ? 'bg-blue-500' :
                            ['doing', 'in progress', 'قيد التنفيذ'].includes(String(groupVal).toLowerCase()) ? 'bg-amber-500' :
                            ['done', 'completed', 'تم الإنجاز'].includes(String(groupVal).toLowerCase()) ? 'bg-emerald-500' : 'bg-gray-400'
                          }`} />
                          <span className="text-xs font-bold text-gray-800 tracking-tight uppercase font-mono">{String(groupVal)}</span>
                        </div>
                        <span className="text-[10px] font-bold font-mono text-gray-455 bg-gray-200 px-2 py-0.5 rounded-full">
                          {filteredRows.length}
                        </span>
                      </div>

                      {/* Cards Container */}
                      <div className="flex flex-col gap-3 overflow-y-auto pr-1 flex-1 max-h-[380px] [scrollbar-width:thin]">
                        {filteredRows.length > 0 ? (
                          filteredRows.map(({ r, originalIdx }) => {
                            // First cell is the primary card title
                            const cardTitle = r[0] || `Row #${originalIdx + 1}`;
                            
                            // Find any related docs in the remaining cells
                            const linkedDocsList = r
                              .map((cell, idx) => ({ cell, idx }))
                              .filter(({ cell }) => parseDocLink(cell));

                            return (
                              <div
                                key={originalIdx}
                                className="bg-white border border-gray-200 rounded-xl p-3.5 hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col gap-2.5 relative group cursor-default"
                              >
                                {/* Card Title */}
                                <div className="text-xs font-bold text-gray-800 tracking-tight font-sans line-clamp-1">
                                  {cardTitle}
                                </div>

                                {/* Custom Status Badge if applicable */}
                                <div className="flex flex-wrap gap-1">
                                  {r.map((cell, idx) => {
                                    if (idx !== groupColIdx && (headers[idx].toLowerCase().includes('status') || headers[idx].toLowerCase().includes('state')) && cell.trim()) {
                                      return (
                                        <span key={idx} className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${getStatusBadgeStyle(cell)}`}>
                                          {cell}
                                        </span>
                                      );
                                    }
                                    return null;
                                  })}
                                </div>

                                {/* Micro Details Grid */}
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono text-gray-500 border-t border-gray-100 pt-2">
                                  {r.map((cell, idx) => {
                                    // Skip first (title), group-by col, and empty cells
                                    if (idx === 0 || idx === groupColIdx || !cell.trim() || parseDocLink(cell)) return null;
                                    return (
                                      <div key={idx} className="truncate">
                                        <span className="text-gray-400 font-semibold">{headers[idx]}:</span> {cell}
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Linked Documents list inside card */}
                                {linkedDocsList.length > 0 && (
                                  <div className="flex flex-wrap gap-1 border-t border-gray-100 pt-2.5 mt-0.5">
                                    {linkedDocsList.map(({ cell, idx }) => {
                                      const docId = parseDocLink(cell);
                                      const docInfo = docId ? getLinkedDocInfo(docId) : null;
                                      if (!docInfo) return null;
                                      return (
                                        <button
                                          key={idx}
                                          type="button"
                                          onClick={() => onOpenDoc && onOpenDoc(docInfo)}
                                          className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md text-[9px] font-extrabold shadow-3xs cursor-pointer hover:bg-indigo-100"
                                        >
                                          <LinkIcon className="h-2 w-2 text-indigo-500" />
                                          <span className="truncate max-w-[80px]">{docInfo.title}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Action bar & column shifting */}
                                <div className="opacity-0 group-hover:opacity-100 absolute bottom-2 right-2 flex items-center gap-1 transition-opacity">
                                  <select
                                    value={r[groupColIdx] || 'Unassigned'}
                                    onChange={(e) => handleCellChange(originalIdx, groupColIdx, e.target.value)}
                                    className="text-[9px] bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 font-bold text-gray-600 focus:outline-none cursor-pointer"
                                  >
                                    {uniqueGroupVals.map(val => (
                                      <option key={val} value={val === 'Unassigned' ? '' : val}>{val}</option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRow(originalIdx)}
                                    className="p-1 hover:bg-rose-50 text-gray-350 hover:text-rose-600 rounded cursor-pointer transition-colors"
                                    title="Delete Card"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center text-[10px] text-gray-400 italic py-6">
                            Empty column
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      ) : (
        /* Charts Mode Render block */
        <div className="flex-1 flex flex-col xl:flex-row gap-5 min-h-[480px]">
          
          {/* Charts control sidebar - Left */}
          <div className="xl:w-64 bg-white border border-gray-150 rounded-2xl p-5 shadow-xs shrink-0 flex flex-col gap-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Chart Configuration</span>

            {/* Chart type selector rows of buttons */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Visual Format</label>
              <div className="grid grid-cols-5 gap-1 bg-gray-50 border border-gray-150 p-1 rounded-xl">
                <button
                  onClick={() => setChartType('line')}
                  className={`p-2 rounded-lg flex items-center justify-center cursor-pointer transition-all ${chartType === 'line' ? 'bg-white text-indigo-700 shadow-3xs' : 'text-gray-400 hover:text-gray-700'}`}
                  title="Line Graph"
                >
                  <LineIcon className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`p-2 rounded-lg flex items-center justify-center cursor-pointer transition-all ${chartType === 'bar' ? 'bg-white text-indigo-700 shadow-3xs' : 'text-gray-400 hover:text-gray-700'}`}
                  title="Bar Chart"
                >
                  <BarChart3 className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => setChartType('area')}
                  className={`p-2 rounded-lg flex items-center justify-center cursor-pointer transition-all ${chartType === 'area' ? 'bg-white text-indigo-700 shadow-3xs' : 'text-gray-400 hover:text-gray-700'}`}
                  title="Area Area Graph"
                >
                  <TrendingUp className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => setChartType('pie')}
                  className={`p-2 rounded-lg flex items-center justify-center cursor-pointer transition-all ${chartType === 'pie' ? 'bg-white text-indigo-700 shadow-3xs' : 'text-gray-400 hover:text-gray-700'}`}
                  title="Donut Pie Chart"
                >
                  <PieIcon className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => setChartType('scatter')}
                  className={`p-2 rounded-lg flex items-center justify-center cursor-pointer transition-all ${chartType === 'scatter' ? 'bg-white text-indigo-700 shadow-3xs' : 'text-gray-400 hover:text-gray-700'}`}
                  title="Scatter plot"
                >
                  <Activity className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* X Axis dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">X-Axis Column</label>
              <div className="relative">
                <select
                  value={xAxisKey}
                  onChange={(e) => setXAxisKey(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 text-gray-750 px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-semibold"
                >
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Y Axis Checklist */}
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                Y-Axis Metrics {chartType === 'pie' ? '(Single-Select)' : '(Multi-Select)'}
              </label>
              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[180px] border border-gray-150 p-2.5 rounded-xl bg-gray-50/40">
                {numericColumns.map(col => {
                  const isSelected = selectedYKeys.includes(col);
                  return (
                    <button
                      key={col}
                      onClick={() => {
                        if (chartType === 'pie') {
                          setSelectedYKeys([col]);
                        } else {
                          handleToggleYKey(col);
                        }
                      }}
                      className="w-full flex items-center gap-2 text-left text-xs font-semibold py-1 px-1.5 hover:bg-indigo-50/30 rounded-lg transition-colors cursor-pointer text-gray-700"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-indigo-600 fill-indigo-50" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-300" />
                      )}
                      <span className="truncate">{col}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Chart Display Canvas - Right */}
          <div className="flex-1 bg-white border border-gray-150 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            {chartData.length === 0 || selectedYKeys.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                  <Activity className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-gray-900">Awaiting Plot Configurations</h4>
                <p className="text-[10px] text-gray-400 max-w-xs leading-relaxed">
                  Select at least one metric from the configuration panel on the left to map your CSV rows dynamically.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6 flex-1">
                {/* Visual Chart Header */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex flex-col">
                    <h4 className="text-sm font-bold text-gray-950 uppercase tracking-tight">
                      {chartType.toUpperCase()} CHART ANALYTICS
                    </h4>
                    <span className="text-[10px] font-mono text-gray-400">
                      X: <span className="text-indigo-650 font-bold">{xAxisKey}</span> | Y: <span className="text-gray-600 font-bold">{selectedYKeys.join(', ')}</span>
                    </span>
                  </div>
                  <div className="text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded animate-pulse">
                    LIVE COMPILING
                  </div>
                </div>

                {/* Recharts Canvas */}
                <div className="h-[280px] w-full bg-slate-50/35 border border-slate-100/80 rounded-xl p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'line' ? (
                      <RechartsLineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={10} fontFamily="monospace" />
                        <YAxis stroke="#94a3b8" fontSize={10} fontFamily="monospace" />
                        <Tooltip contentStyle={{ fontSize: 11, fontFamily: 'sans-serif', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }} />
                        <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'sans-serif', fontWeight: 600 }} />
                        {selectedYKeys.map((yKey, idx) => (
                          <Line
                            key={yKey}
                            type="monotone"
                            dataKey={yKey}
                            stroke={activeTheme.gradient[idx % activeTheme.gradient.length]}
                            strokeWidth={2.5}
                            dot={{ r: 3, strokeWidth: 1 }}
                            activeDot={{ r: 5 }}
                          />
                        ))}
                      </RechartsLineChart>
                    ) : chartType === 'bar' ? (
                      <RechartsBarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={10} fontFamily="monospace" />
                        <YAxis stroke="#94a3b8" fontSize={10} fontFamily="monospace" />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }} />
                        <Legend wrapperStyle={{ fontSize: 10, fontWeight: 600 }} />
                        {selectedYKeys.map((yKey, idx) => (
                          <Bar
                            key={yKey}
                            dataKey={yKey}
                            fill={activeTheme.gradient[idx % activeTheme.gradient.length]}
                            radius={[4, 4, 0, 0]}
                          />
                        ))}
                      </RechartsBarChart>
                    ) : chartType === 'area' ? (
                      <RechartsAreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          {selectedYKeys.map((yKey, idx) => (
                            <linearGradient key={`grad-${yKey}`} id={`color-${yKey}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={activeTheme.gradient[idx % activeTheme.gradient.length]} stopOpacity={0.8}/>
                              <stop offset="95%" stopColor={activeTheme.gradient[idx % activeTheme.gradient.length]} stopOpacity={0}/>
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={10} fontFamily="monospace" />
                        <YAxis stroke="#94a3b8" fontSize={10} fontFamily="monospace" />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }} />
                        <Legend wrapperStyle={{ fontSize: 10, fontWeight: 600 }} />
                        {selectedYKeys.map((yKey, idx) => (
                          <Area
                            key={yKey}
                            type="monotone"
                            dataKey={yKey}
                            stroke={activeTheme.gradient[idx % activeTheme.gradient.length]}
                            fillOpacity={1}
                            fill={`url(#color-${yKey})`}
                          />
                        ))}
                      </RechartsAreaChart>
                    ) : chartType === 'pie' ? (
                      <RechartsPieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                        <Pie
                          data={chartData.map(item => ({
                            name: String(item[xAxisKey] || ''),
                            value: Math.abs(parseFloat(item[selectedYKeys[0]]) || 0)
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {chartData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={activeTheme.gradient[idx % activeTheme.gradient.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} units`, 'Metric Value']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 10, fontWeight: 600 }} />
                      </RechartsPieChart>
                    ) : (
                      <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey={xAxisKey} name={xAxisKey} stroke="#94a3b8" fontSize={10} fontFamily="monospace" />
                        <YAxis dataKey={selectedYKeys[0]} name={selectedYKeys[0]} stroke="#94a3b8" fontSize={10} fontFamily="monospace" />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 11 }} />
                        <Legend wrapperStyle={{ fontSize: 10, fontWeight: 600 }} />
                        <Scatter name={selectedYKeys[0]} data={chartData} fill={activeTheme.primary} />
                      </ScatterChart>
                    )}
                  </ResponsiveContainer>
                </div>

                {/* Bottom Aggregate stats cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 border-t border-gray-100 pt-4">
                  {selectedYKeys.slice(0, 4).map(yKey => {
                    const stats = getStats(yKey);
                    return (
                      <div key={yKey} className="border border-gray-150 p-3 rounded-xl bg-gray-50/40 flex flex-col gap-1 shadow-2xs">
                        <span className="text-[10px] text-gray-500 font-bold truncate tracking-tight" title={yKey}>
                          📈 {yKey}
                        </span>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[9px] text-gray-400 pt-1 border-t border-gray-100">
                          <div>MIN: <span className="text-gray-800 font-bold">{stats.min.toFixed(2)}</span></div>
                          <div>MAX: <span className="text-gray-800 font-bold">{stats.max.toFixed(2)}</span></div>
                          <div className="col-span-2 mt-0.5">AVG: <span className="text-indigo-650 font-extrabold">{stats.avg.toFixed(2)}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Grid status footer metrics info */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-[10px] text-gray-500 font-mono flex items-center justify-between shrink-0 select-none">
        <span className="flex items-center gap-1">
          <Database className="h-3.5 w-3.5 text-indigo-550" />
          {viewMode === 'grid' ? 'CSV METRIC SHEETS STATUS' : 'ANALYTICAL INTERACTIVE VISUALIZER'}
        </span>
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded font-bold flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> 
          {viewMode === 'grid' ? 'Symmetrical Cells Aligned' : 'Render Engine Locked @ 60FPS'}
        </span>
      </div>

    </div>
  );
}
