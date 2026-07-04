import React, { useState, useEffect, useRef } from 'react';
import { 
  Code, 
  Play, 
  Terminal, 
  Sparkles, 
  FileCode, 
  Search, 
  Replace, 
  Check, 
  HelpCircle,
  Copy,
  Sliders,
  Maximize2,
  WrapText
} from 'lucide-react';

interface CodeEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  title: string;
}

const LANGUAGES = [
  { id: 'typescript', name: 'TypeScript', ext: 'ts' },
  { id: 'javascript', name: 'JavaScript', ext: 'js' },
  { id: 'python', name: 'Python', ext: 'py' },
  { id: 'rust', name: 'Rust', ext: 'rs' },
  { id: 'go', name: 'Go', ext: 'go' },
  { id: 'cpp', name: 'C++', ext: 'cpp' }
];

const BOILERPLATES: Record<string, string> = {
  typescript: `// TypeScript Symmetrical Parity Engine
interface ParityCluster {
  nodeId: string;
  status: 'active' | 'syncing' | 'offline';
  loadIndex: number;
}

export function balanceTelemetry(nodes: ParityCluster[]): ParityCluster[] {
  console.log("Initializing symmetrical load redistribution...");
  const activeNodes = nodes.filter(n => n.status !== 'offline');
  const totalLoad = activeNodes.reduce((acc, n) => acc + n.loadIndex, 0);
  const averageLoad = totalLoad / activeNodes.length;

  return activeNodes.map(node => ({
    ...node,
    loadIndex: Math.round(averageLoad)
  }));
}`,
  javascript: `// JavaScript Elastomer Bounce Simulation
class ElastomerSimulation {
  constructor(gravity = -9.81, elasticity = 0.85) {
    this.gravity = gravity;
    this.elasticity = elasticity;
    this.heights = [];
  }

  computeImpactCurve(initialVelocity, steps = 10) {
    let velocity = initialVelocity;
    let height = 0;
    
    for (let i = 0; i < steps; i++) {
      velocity += this.gravity * 0.1;
      height += velocity * 0.1;
      if (height <= 0) {
        height = 0;
        velocity = -velocity * this.elasticity; // Bounce action
      }
      this.heights.push(height.toFixed(3));
    }
    return this.heights;
  }
}`,
  python: `# Python Symmetric Node Balancer
class BalanceTable:
    def __init__(self, capacity: float):
        self.capacity = capacity
        self.indices = []

    def distribute_payload(self, weight: float, clusters: int) -> list:
        print(f"Distributing payload weight: {weight} across {clusters} clusters")
        segment = weight / clusters
        return [round(segment, 2) for _ in range(clusters)]

balancer = BalanceTable(4096.0)
print(balancer.distribute_payload(256.40, 4))`,
  rust: `// Rust Mechanical Equilibrium Evaluator
#[derive(Debug)]
pub struct MechanicalNode {
    pub mass: f64,
    pub velocity: f64,
}

impl MechanicalNode {
    pub fn compute_momentum(&self) -> f64 {
        self.mass * self.velocity
    }
}

fn main() {
    let node = MechanicalNode { mass: 12.50, velocity: 4.44 };
    println!("Momentum: {} kg*m/s", node.compute_momentum());
}`,
  go: `package main

import (
	"fmt"
)

// Go Parallel Micro-balancing Routine
type ParityCluster struct {
	ID        string
	Active    bool
	LoadIndex int
}

func main() {
	cluster := ParityCluster{ID: "node-04", Active: true, LoadIndex: 94}
	fmt.Printf("Cluster system running: %s at %d load index\\n", cluster.ID, cluster.LoadIndex)
}`,
  cpp: `// C++ Hardware Symmetrical Parity Sorters
#include <iostream>
#include <vector>
#include <numeric>

class ParitySorter {
public:
    double computeAverageParity(const std::vector<double>& metrics) {
        if (metrics.empty()) return 0.0;
        double sum = std::accumulate(metrics.begin(), metrics.end(), 0.0);
        return sum / metrics.size();
    }
};

int main() {
    ParitySorter sorter;
    std::vector<double> scores = {94.4, 88.2, 91.5, 99.0};
    std::cout << "Parity average: " << sorter.computeAverageParity(scores) << "%" << std::endl;
    return 0;
}`
};

export default function CodeEditor({ content, onChange, title }: CodeEditorProps) {
  const [codeVal, setCodeVal] = useState<string>('');
  const [language, setLanguage] = useState<string>('typescript');
  const [wordWrap, setWordWrap] = useState<boolean>(true);
  
  // Search and replace state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [replaceQuery, setReplaceQuery] = useState<string>('');
  const [searchMatchesCount, setSearchMatchesCount] = useState<number>(0);

  // Executable compilation simulator
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compileStatus, setCompileStatus] = useState<'idle' | 'success' | 'failed'>('idle');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!content.trim()) {
      setCodeVal(BOILERPLATES[language]);
    } else {
      setCodeVal(content);
    }
  }, [content]);

  // Check search matches
  useEffect(() => {
    if (!searchQuery) {
      setSearchMatchesCount(0);
      return;
    }
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const matches = codeVal.match(regex);
    setSearchMatchesCount(matches ? matches.length : 0);
  }, [searchQuery, codeVal]);

  const handleLanguageChange = (langId: string) => {
    setLanguage(langId);
    // Auto populate boilerplates if previous is similar to existing boilerplate
    const currentIsBoilerplate = Object.values(BOILERPLATES).includes(codeVal.trim());
    if (currentIsBoilerplate || !codeVal.trim()) {
      setCodeVal(BOILERPLATES[langId]);
      onChange(BOILERPLATES[langId]);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCodeVal(val);
    onChange(val);
  };

  // Tab indentation helper
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      const nextCode = codeVal.substring(0, start) + "  " + codeVal.substring(end);
      setCodeVal(nextCode);
      onChange(nextCode);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Inline find & replace
  const handleReplaceAll = () => {
    if (!searchQuery) return;
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const replaced = codeVal.replace(regex, replaceQuery);
    setCodeVal(replaced);
    onChange(replaced);
    setSearchQuery('');
    setReplaceQuery('');
  };

  // Execution simulation logic
  const handleRunCompiler = () => {
    setIsCompiling(true);
    setCompileStatus('idle');
    setConsoleLogs([`> Initializing compiler for target dialect: [${language.toUpperCase()}]`]);

    setTimeout(() => {
      // Analyze code content for errors
      const hasSyntaxError = codeVal.includes('error') || codeVal.includes('undefined') || codeVal.trim().length < 5;
      
      if (hasSyntaxError) {
        setConsoleLogs(prev => [
          ...prev,
          `[!] SYNTAX SCAN: Symmetrical parse error identified on standard check.`,
          `[-] Compilation halted: Unresolved token declarations exist in workspace.`,
          `> PROCESS STATUS: TERMINATED (Exit Code: 1)`
        ]);
        setCompileStatus('failed');
      } else {
        // Successful simulation outputs based on language
        setConsoleLogs(prev => [
          ...prev,
          `[✓] PARSING SUCCESS: Zero structural errors identified.`,
          `[+] LINKER: Bundled code module securely linked against system core.`,
          `[+] EXECUTION OUTPUT:`,
          `-------------------------------------------`,
          language === 'typescript' ? `[OK] Telemetry balanced Average Node Load: 92%` :
          language === 'javascript' ? `[OK] Elastomer Bounce Simulation Heights: [0.000, 1.420, 2.500, 2.110, 0.000]` :
          language === 'python' ? `[OK] Distributed payload weight: 256.40 across 4 clusters successfully.` :
          language === 'rust' ? `[OK] Cargo build target release succeeded in 0.04s` :
          `[OK] Executable routine triggered standard exit protocol safely.`,
          `-------------------------------------------`,
          `> PROCESS STATUS: SUCCESSFUL (Exit Code: 0)`
        ]);
        setCompileStatus('success');
      }
      setIsCompiling(false);
    }, 1200);
  };

  // Generate line numbers column
  const lineCount = codeVal.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full select-none">
      {/* LEFT: Multi-language Code Workstation */}
      <div className="flex-1 flex flex-col bg-[#0f141c] rounded-3xl border border-gray-900 shadow-2xl p-5 overflow-hidden min-h-[350px]">
        
        {/* Editor Toolbar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-800/60 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#1a2333] rounded-lg text-indigo-400 border border-indigo-950">
              <Code className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">CODE WORKSTATION</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Word wrap button */}
            <button
              type="button"
              onClick={() => setWordWrap(!wordWrap)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                wordWrap ? 'bg-[#1a2333] border-indigo-950 text-indigo-400' : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'
              }`}
              title="Word wrap toggle"
            >
              <WrapText className="h-3.5 w-3.5" />
            </button>

            {/* Language Selector */}
            <div className="flex bg-gray-900 p-0.5 rounded-xl border border-gray-800">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => handleLanguageChange(lang.id)}
                  className={`px-2 py-1 text-[9px] font-bold rounded-lg transition-all cursor-pointer uppercase ${
                    language === lang.id
                      ? 'bg-[#1e293b] text-indigo-400 font-extrabold border border-indigo-950'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Text Area layout with Line Numbers */}
        <div className="flex-grow flex bg-[#080c10] rounded-2xl border border-gray-900 relative overflow-hidden h-[35vh] xl:h-[45vh]">
          {/* Line Numbers Column */}
          <div className="w-10 bg-[#0c1015] border-r border-gray-900 text-right pr-2.5 py-4 select-none font-mono text-[10px] text-gray-600 leading-relaxed overflow-hidden shrink-0">
            {lineNumbers.map((num) => (
              <div key={num} className="h-[21px]">{num}</div>
            ))}
          </div>

          {/* Interactive Text Field */}
          <textarea
            ref={textareaRef}
            value={codeVal}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            className={`flex-grow bg-transparent text-slate-200 font-mono text-[11px] p-4 focus:outline-none resize-none leading-relaxed overflow-auto [scrollbar-width:thin] ${
              wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre overflow-x-auto'
            }`}
            placeholder="Write program code logic here..."
          />
        </div>

        {/* Quick boilerplates bar */}
        <div className="mt-3 text-[10px] text-gray-500 font-mono flex items-center justify-between select-none">
          <span>LINE NUMBERS: <strong className="text-gray-300">{lineCount}</strong> | WORDS: <strong className="text-gray-300">{codeVal.trim() === '' ? 0 : codeVal.trim().split(/\s+/).length}</strong></span>
          <button
            type="button"
            onClick={() => setCodeVal(BOILERPLATES[language])}
            className="text-[9px] font-bold text-indigo-400 hover:text-indigo-350 flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="h-3 w-3" /> Reset default template
          </button>
        </div>
      </div>

      {/* RIGHT: High-fidelity Compiler Console and Search panel */}
      <div className="w-full xl:w-72 bg-gray-50 border border-gray-150 rounded-2xl p-4.5 flex flex-col justify-between shrink-0 h-full">
        
        {/* Find & Replace Tools */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1">
            <Search className="h-3.5 w-3.5 text-indigo-550" /> Search & Replace
          </span>

          <div className="flex flex-col gap-2 bg-white border border-gray-150 p-2.5 rounded-xl">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Find token..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 pl-7 pr-3 py-1 text-xs rounded-lg border border-gray-200 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
              />
              {searchQuery && (
                <span className="absolute right-2 top-1.5 text-[9px] font-mono text-indigo-650 bg-indigo-50 px-1 py-0.2 rounded font-bold border border-indigo-100">
                  {searchMatchesCount} matches
                </span>
              )}
            </div>

            {searchQuery && (
              <div className="flex gap-1.5 mt-0.5 animate-fadeIn">
                <input
                  type="text"
                  placeholder="Replace with..."
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  className="flex-grow bg-gray-50 px-2.5 py-1 text-xs rounded-lg border border-gray-200 focus:outline-none focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleReplaceAll}
                  className="px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center justify-center shrink-0 transition-all"
                >
                  Replace All
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Executable Telemetry compiler console */}
        <div className="flex flex-col gap-2.5 mt-4">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1">
            <Terminal className="h-3.5 w-3.5 text-indigo-550" /> Compiler Console
          </span>

          <div className="bg-slate-950 rounded-xl p-3 border border-slate-900 font-mono text-[10px] text-slate-300 flex flex-col gap-1 shadow-inner h-44 overflow-y-auto">
            {consoleLogs.length > 0 ? (
              consoleLogs.map((log, idx) => {
                let colorClass = 'text-slate-400';
                if (log.startsWith('[✓]') || log.includes('[OK]')) colorClass = 'text-emerald-400';
                else if (log.startsWith('[!]') || log.startsWith('[-]')) colorClass = 'text-red-400';
                else if (log.startsWith('>')) colorClass = 'text-indigo-400 font-bold';
                
                return (
                  <div key={idx} className={`${colorClass} leading-normal`}>
                    {log}
                  </div>
                );
              })
            ) : (
              <span className="text-slate-600 italic">Compiler offline. Press trigger to run static parity tests...</span>
            )}
            
            {isCompiling && (
              <div className="text-indigo-400 flex items-center gap-1.5 font-bold mt-1">
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
                Compiling files and testing constraints...
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRunCompiler}
              disabled={isCompiling}
              className={`flex-grow font-bold text-xs py-2.5 rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-y-0.5 ${
                isCompiling
                  ? 'bg-gray-200 text-gray-400 cursor-default shadow-none'
                  : compileStatus === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100'
                  : compileStatus === 'failed'
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-100'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
              }`}
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              {isCompiling ? 'Running Test...' : compileStatus === 'success' ? 'Compiled Ok' : compileStatus === 'failed' ? 'Failed - Retry' : 'Compile & Execute'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
