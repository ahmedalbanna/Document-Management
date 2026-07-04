import React, { useState, useEffect } from 'react';
import { 
  Info, 
  Binary, 
  Sliders, 
  Settings, 
  ShieldAlert, 
  Activity, 
  Plus, 
  Trash2, 
  Check, 
  RefreshCw,
  Fingerprint,
  Lock,
  Compass
} from 'lucide-react';

interface OtherEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  title: string;
}

interface CustomProperty {
  key: string;
  value: string;
}

export default function OtherEditor({ content, onChange, title }: OtherEditorProps) {
  const [mimeType, setMimeType] = useState<string>('application/octet-stream');
  const [properties, setProperties] = useState<CustomProperty[]>([
    { key: 'Owner', value: 'System Administrative Terminal' },
    { key: 'Permissions', value: '0755 (Read-Write-Execute)' },
    { key: 'Parity Checked', value: 'Enabled' }
  ]);
  const [newKey, setNewKey] = useState<string>('');
  const [newValue, setNewValue] = useState<string>('');

  // Technical calculations
  const [hexRows, setHexRows] = useState<Array<{ offset: string; hex: string; ascii: string }>>([]);
  const [checksum, setChecksum] = useState<string>('6f4a8b29c1d0e5f3a2b10987654321cd');
  const [entropy, setEntropy] = useState<number>(7.84);
  const [isEncrypted, setIsEncrypted] = useState<boolean>(false);

  // Initialize and generate Hex dumps
  useEffect(() => {
    generateHexDump(content || 'System administrative parity raw files.');
    guessMimeType();
  }, [content]);

  const guessMimeType = () => {
    const titleLower = title.toLowerCase();
    if (titleLower.endsWith('.pdf')) setMimeType('application/pdf');
    else if (titleLower.endsWith('.exe')) setMimeType('application/x-msdownload');
    else if (titleLower.endsWith('.dll')) setMimeType('application/x-sharedlib');
    else if (titleLower.endsWith('.bin')) setMimeType('application/octet-stream');
    else if (titleLower.endsWith('.config')) setMimeType('text/plain');
    else setMimeType('application/octet-stream');
  };

  const generateHexDump = (rawContent: string) => {
    // Generate simulated Hex rows based on input text
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(rawContent.substring(0, 192)); // scan up to 192 chars for hex view
    
    const rows: Array<{ offset: string; hex: string; ascii: string }> = [];
    
    for (let i = 0; i < Math.max(dataBytes.length, 64); i += 8) {
      const offset = i.toString(16).toUpperCase().padStart(8, '0');
      
      const chunkBytes: number[] = [];
      for (let j = 0; j < 8; j++) {
        if (i + j < dataBytes.length) {
          chunkBytes.push(dataBytes[i + j]);
        } else {
          // Fill remainder bytes with deterministic mock values
          chunkBytes.push((i + j * 17) % 256);
        }
      }

      const hex = chunkBytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
      const ascii = chunkBytes.map(b => {
        // Only readable ASCII characters, replace else with dot
        if (b >= 32 && b <= 126) return String.fromCharCode(b);
        return '.';
      }).join('');

      rows.push({ offset, hex, ascii });
    }
    setHexRows(rows);
  };

  const handleAddProperty = () => {
    if (!newKey.trim() || !newValue.trim()) return;
    const updated = [...properties, { key: newKey.trim(), value: newValue.trim() }];
    setProperties(updated);
    setNewKey('');
    setNewValue('');
    saveState(updated);
  };

  const handleDeleteProperty = (keyToDelete: string) => {
    const updated = properties.filter(p => p.key !== keyToDelete);
    setProperties(updated);
    saveState(updated);
  };

  const saveState = (updatedProps = properties) => {
    // Persist properties as raw json inside the file content structure
    const data = {
      systemMetadata: {
        mimeType,
        checksum,
        isEncrypted,
        entropy
      },
      customProperties: updatedProps
    };
    onChange(JSON.stringify(data, null, 2));
  };

  // Perform a simulated XOR obfuscation on the Hex stream
  const handleXorObfuscate = () => {
    setIsEncrypted(!isEncrypted);
    // Change Checksum dynamically
    const nextChecksum = isEncrypted 
      ? '6f4a8b29c1d0e5f3a2b10987654321cd' 
      : 'e3f5d1c0b2a93c7d6e5a4f3b2a1c0d5e';
    setChecksum(nextChecksum);
    
    const nextEntropy = isEncrypted ? 7.84 : 7.98; // Entropy increases on encryption
    setEntropy(nextEntropy);
    
    // Scramble / descramble raw text simulation
    if (!isEncrypted) {
      generateHexDump("[OBFUSCATED DATA MATRIX] " + content);
    } else {
      generateHexDump(content || 'System administrative parity raw files.');
    }
  };

  const handleRecalculateMD5 = () => {
    // Generate new random logical hash
    const chars = '0123456789abcdef';
    let nextHash = '';
    for (let i = 0; i < 32; i++) {
      nextHash += chars[Math.floor(Math.random() * 16)];
    }
    setChecksum(nextHash);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full select-none">
      
      {/* LEFT: Structural Hex dump / Binary stream visualizer */}
      <div className="flex-grow bg-[#0f141c] rounded-3xl border border-gray-900 shadow-2xl p-5 flex flex-col justify-between overflow-hidden min-h-[350px]">
        
        <div className="flex items-center justify-between border-b border-gray-800/60 pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#1a2333] rounded-lg text-amber-500 border border-indigo-950">
              <Binary className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">HEX STREAM WORKSTATION</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[9px] text-gray-400 bg-gray-900 px-2 py-1 rounded border border-gray-800">
            <span>MIME SCHEMA: {mimeType.toUpperCase()}</span>
          </div>
        </div>

        {/* High-fidelity Hex Dump panel rendering */}
        <div className="flex-grow bg-[#080c10] rounded-2xl border border-gray-900 p-4 font-mono text-[10px] text-slate-300 leading-relaxed overflow-y-auto [scrollbar-width:thin] text-left h-[30vh] xl:h-[40vh]">
          {/* Hex headers */}
          <div className="text-slate-500 border-b border-gray-900 pb-1 mb-2 flex justify-between uppercase select-none">
            <span>Offset</span>
            <span>Hexadecimal Values (8-bit blocks)</span>
            <span>ASCII translation</span>
          </div>

          <div className="flex flex-col gap-0.5">
            {hexRows.map((row, idx) => (
              <div key={idx} className="flex justify-between hover:bg-[#131a24] rounded px-1 transition-colors group">
                <span className="text-indigo-400 font-bold group-hover:text-indigo-300">{row.offset}</span>
                <span className="text-emerald-400 group-hover:text-emerald-300 font-medium tracking-wide">{row.hex}</span>
                <span className="text-amber-500 bg-[#161d28]/30 px-1 rounded font-bold">{row.ascii}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Binary integrity statistics */}
        <div className="mt-3.5 border border-gray-900 bg-[#0c1015] rounded-xl p-3 flex flex-wrap justify-between items-center text-[10px] text-gray-400 font-mono select-none shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Fingerprint className="h-3.5 w-3.5 text-indigo-450" /> MD5: <strong className="text-slate-200 uppercase font-bold">{checksum.slice(0, 12)}...</strong>
            </span>
            <span>Shannon Entropy: <strong className="text-emerald-400">{entropy.toFixed(2)} / 8.00</strong></span>
          </div>
          
          <button
            type="button"
            onClick={handleRecalculateMD5}
            className="text-[9px] text-indigo-450 hover:text-indigo-350 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="h-2.5 w-2.5" /> Re-hash integrity
          </button>
        </div>

      </div>

      {/* RIGHT: Metadata parameter and properties board */}
      <div className="w-full xl:w-72 bg-gray-50 border border-gray-150 rounded-2xl p-4.5 flex flex-col justify-between shrink-0 h-full">
        
        {/* Advanced metadata and custom tags */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1">
            <Compass className="h-3.5 w-3.5 text-indigo-550" /> System Attributes
          </span>

          {/* Properties collection */}
          <div className="flex flex-col gap-2 mt-1">
            {properties.map((prop) => (
              <div 
                key={prop.key}
                className="p-2.5 bg-white border border-gray-150 hover:border-indigo-150 rounded-xl flex items-center justify-between text-left group transition-all"
              >
                <div className="min-w-0 flex flex-col">
                  <span className="text-[9px] font-mono text-gray-400 uppercase font-bold">{prop.key}</span>
                  <span className="text-xs text-gray-700 font-medium truncate">{prop.value}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteProperty(prop.key)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-all cursor-pointer shrink-0"
                  title="Remove Attribute"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Property Injection panel */}
          <div className="bg-white border border-gray-150 p-3 rounded-xl flex flex-col gap-2.5 mt-1.5">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Add Custom Property</span>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text"
                placeholder="Key..."
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-550 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Value..."
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-550 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleAddProperty}
              className="w-full bg-gray-900 hover:bg-gray-850 text-white rounded-lg text-[10px] font-bold py-1.5 cursor-pointer transition-colors"
            >
              Inject Property
            </button>
          </div>
        </div>

        {/* XOR mask trigger utility */}
        <div className="mt-4 flex flex-col gap-2 bg-[#1a2333]/10 border border-[#1a2333]/20 p-3 rounded-xl select-none">
          <span className="text-[9px] font-bold text-indigo-950 uppercase tracking-wider font-mono flex items-center gap-1">
            <Lock className="h-3 w-3 text-indigo-750 animate-pulse" /> Obfuscation Masker
          </span>
          <p className="text-[10px] text-gray-500 leading-normal mb-1.5">Apply logical XOR binary filter to obscure raw data contents inside visual previews.</p>
          <button
            type="button"
            onClick={handleXorObfuscate}
            className={`w-full font-bold text-xs py-2 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isEncrypted 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                : 'bg-indigo-650 hover:bg-indigo-700 text-white'
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            {isEncrypted ? 'Obfuscated Active' : 'Apply Obfuscation'}
          </button>
        </div>

      </div>
    </div>
  );
}
