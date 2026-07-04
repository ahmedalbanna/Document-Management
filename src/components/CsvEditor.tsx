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
  Check
} from 'lucide-react';

interface CsvEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  title: string;
}

export default function CsvEditor({ content, onChange, title }: CsvEditorProps) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortColIdx, setSortColIdx] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Parse CSV string on load
  useEffect(() => {
    if (!content.trim()) {
      // Default placeholder matrix
      setHeaders(['TIMESTAMP', 'ACCEL_Y', 'VEL_Y', 'STATE']);
      setRows([
        ['1718665320', '-9.81', '14.20', 'IMPACT_01'],
        ['1718665321', '-9.81', '11.50', 'IMPACT_02'],
        ['1718665322', '-9.81', '9.10', 'IMPACT_03'],
        ['1718665323', '-9.81', '7.20', 'IMPACT_04']
      ]);
    } else {
      parseCsv(content);
    }
  }, [content]);

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
    // Sanitize commas to prevent parsing collision issues
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
      // Try to parse as numbers
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

  return (
    <div className="flex flex-col gap-5 h-full select-none">
      {/* Top Controller Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-150 p-4 rounded-2xl shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-550 rounded-xl text-white shadow-sm shadow-indigo-150">
            <Grid className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-widest font-mono">Parity CSV Spreadsheet</span>
            <span className="text-[10px] text-gray-400 font-mono">
              Dimension size: <span className="text-gray-600 font-semibold">{rows.length} rows</span> × <span className="text-gray-600 font-semibold">{headers.length} metrics</span>
            </span>
          </div>
        </div>

        {/* Quick Filters / Search */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Filter cell values..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none w-52 focus:bg-white"
            />
          </div>

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
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Insert Row
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
            title="Download CSV Spreadsheet"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-start">
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
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-600 rounded transition-opacity cursor-pointer"
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

      {/* Grid status footer metrics info */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-[10px] text-gray-500 font-mono flex items-center justify-between shrink-0 select-none">
        <span className="flex items-center gap-1">
          <Database className="h-3.5 w-3.5 text-indigo-550" />
          CSV METRIC SHEETS STATUS
        </span>
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded font-bold flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Symmetrical Cells Aligned
        </span>
      </div>
    </div>
  );
}
