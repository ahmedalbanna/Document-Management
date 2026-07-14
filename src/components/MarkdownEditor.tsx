import React, { useState, useEffect, useRef } from 'react';
import { 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  List, 
  Quote, 
  Code, 
  Sparkles, 
  BookOpen, 
  Eye, 
  ListTodo,
  Columns,
  Calculator,
  Compass,
  FileCode,
  Link,
  Tag,
  Plus,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flame,
  CheckCircle2,
  Clock,
  Layout,
  Trello,
  PlusCircle,
  HelpCircle,
  CheckSquare
} from 'lucide-react';

interface MarkdownEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  renderMarkdown: (text: string) => React.ReactNode;
  title: string;
  documents?: any[];
  onOpenDoc?: (doc: any) => void;
}

export default function MarkdownEditor({ content, onChange, renderMarkdown, title }: MarkdownEditorProps) {
  const [mdContent, setMdContent] = useState<string>('');
  const [layout, setLayout] = useState<'split' | 'edit-only' | 'preview-only'>('split');
  const [dashboardMode, setDashboardMode] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Stateful goal values parsed from Markdown
  const [goalValue, setGoalValue] = useState<number>(6);
  const [goalTarget, setGoalTarget] = useState<number>(10);
  const [counterValue, setCounterValue] = useState<number>(3);
  const [completedDates, setCompletedDates] = useState<string[]>(['2026-07-14']);

  useEffect(() => {
    setMdContent(content);
  }, [content]);

  // Isomorphic Parser: Read custom goals & dates from mdContent on changes
  useEffect(() => {
    // Match [goal:Launch Progress|value:6|target:10]
    const goalMatch = mdContent.match(/\[goal:[^|]+\|value:(\d+)\|target:(\d+)\]/);
    if (goalMatch) {
      setGoalValue(parseInt(goalMatch[1], 10));
      setGoalTarget(parseInt(goalMatch[2], 10));
    }
    // Match [counter:Achievements|value:3]
    const counterMatch = mdContent.match(/\[counter:[^|]+\|value:(\d+)\]/);
    if (counterMatch) {
      setCounterValue(parseInt(counterMatch[1], 10));
    }
    // Match [calendar:2026-07-01,...]
    const calendarMatch = mdContent.match(/\[calendar:([^\]]*)\]/);
    if (calendarMatch) {
      const datesStr = calendarMatch[1];
      setCompletedDates(datesStr ? datesStr.split(',') : []);
    }
  }, [mdContent]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMdContent(val);
    onChange(val);
  };

  // Helper to wrap selected text in markdown markers
  const insertMarker = (markerBefore: string, markerAfter: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const selectedText = mdContent.slice(start, end);
    const before = mdContent.slice(0, start);
    const after = mdContent.slice(end);

    const replacement = markerBefore + (selectedText || 'text') + markerAfter;
    const newContent = before + replacement + after;

    setMdContent(newContent);
    onChange(newContent);

    // Refocus and select
    setTimeout(() => {
      textarea.focus();
      const newCursorStart = start + markerBefore.length;
      const newCursorEnd = newCursorStart + (selectedText || 'text').length;
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 50);
  };

  // Scan headers to build Table of Contents
  const getTableOfContents = () => {
    const lines = mdContent.split('\n');
    const headersList: { text: string; level: number; lineIdx: number }[] = [];
    
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        headersList.push({ text: trimmed.replace('# ', ''), level: 1, lineIdx: idx });
      } else if (trimmed.startsWith('## ')) {
        headersList.push({ text: trimmed.replace('## ', ''), level: 2, lineIdx: idx });
      } else if (trimmed.startsWith('### ')) {
        headersList.push({ text: trimmed.replace('### ', ''), level: 3, lineIdx: idx });
      }
    });

    return headersList;
  };

  const headers = getTableOfContents();

  // Word & Character count HUD
  const wordCount = mdContent.trim() === '' ? 0 : mdContent.trim().split(/\s+/).length;
  const charCount = mdContent.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // --- Parser & Serializer for Dynamic Dashboards ---
  const parseMarkdownKanban = () => {
    const lines = mdContent.split('\n');
    const columns: { [key: string]: { id: string; text: string; completed: boolean }[] } = {
      'Backlog / Tasks': [],
      'In Progress': [],
      'Completed': []
    };

    let currentColumn = 'Backlog / Tasks';

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('### ')) {
        const header = trimmed.replace('### ', '').trim();
        if (['backlog', 'todo', 'tasks', 'to do', 'لم يبدأ'].some(v => header.toLowerCase().includes(v))) {
          currentColumn = 'Backlog / Tasks';
        } else if (['progress', 'doing', 'قيد التنفيذ', 'قيد'].some(v => header.toLowerCase().includes(v))) {
          currentColumn = 'In Progress';
        } else if (['done', 'completed', 'تم', 'تم الإنجاز'].some(v => header.toLowerCase().includes(v))) {
          currentColumn = 'Completed';
        } else if (header !== 'Goal Trackers') {
          currentColumn = header;
          if (!columns[currentColumn]) {
            columns[currentColumn] = [];
          }
        }
      } else if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]')) {
        const completed = trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]');
        const text = trimmed.substring(5).trim();
        if (text && !text.startsWith('[goal:') && !text.startsWith('[counter:') && !text.startsWith('[calendar:')) {
          columns[currentColumn].push({ id: text, text, completed });
        }
      } else if (trimmed.startsWith('- ') && !trimmed.startsWith('- [') && trimmed.length > 2) {
        const text = trimmed.substring(2).trim();
        columns[currentColumn].push({ id: text, text, completed: false });
      }
    });

    return columns;
  };

  const saveDashboardData = (
    newCols: { [key: string]: { id: string; text: string; completed: boolean }[] },
    gVal: number,
    gTarget: number,
    cVal: number,
    cDates: string[]
  ) => {
    let result: string[] = [];
    result.push(`# Project Workspace: ${title}`);
    result.push(`Welcome to your dynamic dashboard and interactive project workstation. All widgets below sync directly to this text sheet.\n`);

    result.push(`### Goal Trackers`);
    result.push(`- [goal:Launch Progress|value:${gVal}|target:${gTarget}]`);
    result.push(`- [counter:Daily Achievements|value:${cVal}]`);
    result.push(`- [calendar:${cDates.join(',')}]\n`);

    Object.keys(newCols).forEach(colName => {
      result.push(`### ${colName}`);
      newCols[colName].forEach(item => {
        result.push(`- [${item.completed ? 'x' : ' '}] ${item.text}`);
      });
      result.push('');
    });

    const finalMd = result.join('\n');
    setMdContent(finalMd);
    onChange(finalMd);
  };

  // Trigger default workspace if Markdown has no structures
  const handleActivateDashboard = () => {
    const columns = parseMarkdownKanban();
    const totalItems = Object.values(columns).reduce((acc, list) => acc + list.length, 0);
    if (totalItems === 0) {
      // Setup initial beautiful templates
      const defaultCols = {
        'Backlog / Tasks': [
          { id: 'Mechanical elastomer testing', text: 'Mechanical elastomer testing', completed: false },
          { id: 'Symmetric platform parity audits', text: 'Symmetric platform parity audits', completed: false }
        ],
        'In Progress': [
          { id: 'Parallel hardware equilibrium research', text: 'Parallel hardware equilibrium research', completed: false }
        ],
        'Completed': [
          { id: 'Initial workspace categories layout sketch', text: 'Initial workspace categories layout sketch', completed: true }
        ]
      };
      saveDashboardData(defaultCols, 6, 10, 3, ['2026-07-13', '2026-07-14']);
    }
    setDashboardMode(true);
  };

  const kanbanColumns = parseMarkdownKanban();

  // Kanban operations
  const handleToggleTaskCheck = (colName: string, taskId: string) => {
    const updated = { ...kanbanColumns };
    updated[colName] = updated[colName].map(item => 
      item.id === taskId ? { ...item, completed: !item.completed } : item
    );
    saveDashboardData(updated, goalValue, goalTarget, counterValue, completedDates);
  };

  const handleMoveTask = (fromCol: string, toCol: string, taskId: string) => {
    if (fromCol === toCol) return;
    const updated = { ...kanbanColumns };
    const task = updated[fromCol].find(item => item.id === taskId);
    if (!task) return;

    updated[fromCol] = updated[fromCol].filter(item => item.id !== taskId);
    // Mark as completed if moving to Completed
    const isCompleted = toCol === 'Completed' ? true : toCol === 'Backlog / Tasks' ? false : task.completed;
    updated[toCol].push({ ...task, completed: isCompleted });

    saveDashboardData(updated, goalValue, goalTarget, counterValue, completedDates);
  };

  const handleAddTask = (colName: string, text: string) => {
    if (!text.trim()) return;
    const updated = { ...kanbanColumns };
    updated[colName].push({ id: text, text, completed: colName === 'Completed' });
    saveDashboardData(updated, goalValue, goalTarget, counterValue, completedDates);
  };

  const handleDeleteTask = (colName: string, taskId: string) => {
    const updated = { ...kanbanColumns };
    updated[colName] = updated[colName].filter(item => item.id !== taskId);
    saveDashboardData(updated, goalValue, goalTarget, counterValue, completedDates);
  };

  // Calendar helpers
  const handleToggleCalendarDate = (dateStr: string) => {
    let updatedDates = [...completedDates];
    if (updatedDates.includes(dateStr)) {
      updatedDates = updatedDates.filter(d => d !== dateStr);
    } else {
      updatedDates.push(dateStr);
    }
    setCompletedDates(updatedDates);
    saveDashboardData(kanbanColumns, goalValue, goalTarget, counterValue, updatedDates);
  };

  // Generate date list of July 2026 (as requested)
  const renderJuly2026Calendar = () => {
    const daysInJuly = 31;
    const startingDayOfWeek = 3; // July 1st 2026 is Wednesday (0=Sunday, 3=Wednesday)
    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];

    // Empty spacers for starting days
    for (let i = 0; i < startingDayOfWeek; i++) {
      currentWeek.push(null);
    }

    for (let day = 1; day <= daysInJuly; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Spacers for ending week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return (
      <div className="bg-white border border-gray-150 p-4 rounded-2xl shadow-3xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black text-gray-800 font-mono tracking-wider flex items-center gap-1">
            <Calendar className="h-4 w-4 text-purple-600" /> Habits Tracker (تموز 2026)
          </span>
          <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-bold font-mono">
            {completedDates.length} Check-ins
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-gray-400 font-mono uppercase mb-1">
          <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-6" />;
            }
            const dateStr = `2026-07-${day < 10 ? '0' + day : day}`;
            const isCompleted = completedDates.includes(dateStr);
            const isToday = day === 14; // July 14 is the template sandbox date

            return (
              <button
                key={`day-${day}`}
                type="button"
                onClick={() => handleToggleCalendarDate(dateStr)}
                className={`h-6 text-[10px] font-bold rounded-md cursor-pointer transition-all flex items-center justify-center relative ${
                  isCompleted 
                    ? 'bg-purple-600 text-white shadow-2xs scale-105' 
                    : isToday
                      ? 'bg-purple-50 text-purple-700 border border-purple-300'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
                title={`Toggle habit for July ${day}`}
              >
                {day}
                {isCompleted && (
                  <span className="absolute bottom-0.5 right-0.5 h-1 w-1 bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full select-none">
      {/* Markdown Rich Formatting Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-150 p-3 rounded-2xl shadow-xs shrink-0 mb-4">
        {/* Formatting actions */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => insertMarker('**', '**')}
            className="p-2 hover:bg-gray-150 text-gray-600 rounded-lg transition-colors cursor-pointer"
            title="Bold (**text**)"
          >
            <Bold className="h-4 w-4" />
          </button>
          
          <button
            type="button"
            onClick={() => insertMarker('*', '*')}
            className="p-2 hover:bg-gray-150 text-gray-600 rounded-lg transition-colors cursor-pointer"
            title="Italic (*text*)"
          >
            <Italic className="h-4 w-4" />
          </button>
          
          <button
            type="button"
            onClick={() => insertMarker('# ', '')}
            className="p-2 hover:bg-gray-150 text-gray-600 rounded-lg transition-colors cursor-pointer"
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => insertMarker('## ', '')}
            className="p-2 hover:bg-gray-150 text-gray-600 rounded-lg transition-colors cursor-pointer"
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-gray-200 mx-1" />

          <button
            type="button"
            onClick={() => insertMarker('- ', '')}
            className="p-2 hover:bg-gray-150 text-gray-600 rounded-lg transition-colors cursor-pointer"
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => insertMarker('> ', '')}
            className="p-2 hover:bg-gray-150 text-gray-600 rounded-lg transition-colors cursor-pointer"
            title="Blockquote"
          >
            <Quote className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => insertMarker('```\n', '\n```')}
            className="p-2 hover:bg-gray-150 text-gray-600 rounded-lg transition-colors cursor-pointer"
            title="Code Block"
          >
            <Code className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-gray-200 mx-1" />

          <button
            type="button"
            onClick={() => insertMarker('[[', ']]')}
            className="p-2 hover:bg-indigo-50 hover:text-indigo-650 text-gray-600 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
            title="Wiki Page Link"
          >
            <Link className="h-3.5 w-3.5 text-indigo-500" /> [[Wiki]]
          </button>

          <button
            type="button"
            onClick={() => insertMarker('$$', '$$')}
            className="p-2 hover:bg-emerald-50 hover:text-emerald-700 text-gray-600 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
            title="LaTeX Mathematics"
          >
            <Calculator className="h-3.5 w-3.5 text-emerald-500" /> $$Math$$
          </button>
        </div>

        {/* Dynamic Dashboard Switcher */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (dashboardMode) {
                setDashboardMode(false);
              } else {
                handleActivateDashboard();
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              dashboardMode
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-md shadow-indigo-100'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" /> {dashboardMode ? '✓ Dashboard Active' : '⚡ Dynamic Dashboard (تطبيق مصغر)'}
          </button>

          <div className="h-5 w-[1px] bg-gray-200" />

          {/* Layout toggle tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200/20">
            <button
              type="button"
              disabled={dashboardMode}
              onClick={() => setLayout('split')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                dashboardMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${
                layout === 'split' && !dashboardMode ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-400'
              }`}
            >
              <Columns className="h-3.5 w-3.5" /> Split Pane
            </button>
            
            <button
              type="button"
              disabled={dashboardMode}
              onClick={() => setLayout('edit-only')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                dashboardMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${
                layout === 'edit-only' && !dashboardMode ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-400'
              }`}
            >
              <FileCode className="h-3.5 w-3.5" /> Edit Only
            </button>

            <button
              type="button"
              disabled={dashboardMode}
              onClick={() => setLayout('preview-only')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                dashboardMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${
                layout === 'preview-only' && !dashboardMode ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-400'
              }`}
            >
              <Eye className="h-3.5 w-3.5" /> Preview Only
            </button>
          </div>
        </div>
      </div>

      {/* Main split working area */}
      {dashboardMode ? (
        /* Dynamic Widgets Dashboard */
        <div className="flex-grow flex flex-col lg:flex-row gap-5 overflow-y-auto max-h-[60vh] select-none [scrollbar-width:thin] p-1">
          {/* Left Column: Interactive Goal Trackers & Habits Calendar */}
          <div className="lg:w-80 flex flex-col gap-4 shrink-0">
            {/* Goal Tracker 1: Progress Meter */}
            <div className="bg-white border border-gray-150 p-4 rounded-2xl shadow-3xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-gray-800 font-mono tracking-wider flex items-center gap-1">
                  <Flame className="h-4 w-4 text-orange-500 animate-pulse" /> Progress Goal Tracker
                </span>
                <span className="text-[10px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                  {Math.round((goalValue / goalTarget) * 100)}% Done
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3.5">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-amber-400 h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (goalValue / goalTarget) * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500 font-mono">
                  <span>Val:</span>
                  <input
                    type="number"
                    value={goalValue}
                    onChange={(e) => {
                      const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                      setGoalValue(v);
                      saveDashboardData(kanbanColumns, v, goalTarget, counterValue, completedDates);
                    }}
                    className="w-10 bg-gray-50 border border-gray-200 rounded px-1 text-center text-gray-800 font-bold"
                  />
                  <span>/</span>
                  <input
                    type="number"
                    value={goalTarget}
                    onChange={(e) => {
                      const t = Math.max(1, parseInt(e.target.value, 10) || 1);
                      setGoalTarget(t);
                      saveDashboardData(kanbanColumns, goalValue, t, counterValue, completedDates);
                    }}
                    className="w-10 bg-gray-50 border border-gray-200 rounded px-1 text-center text-gray-800 font-bold"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const v = Math.max(0, goalValue - 1);
                      setGoalValue(v);
                      saveDashboardData(kanbanColumns, v, goalTarget, counterValue, completedDates);
                    }}
                    className="h-6 w-6 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded text-gray-600 font-black cursor-pointer text-xs flex items-center justify-center transition-colors"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const v = goalValue + 1;
                      setGoalValue(v);
                      saveDashboardData(kanbanColumns, v, goalTarget, counterValue, completedDates);
                    }}
                    className="h-6 w-6 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded text-gray-600 font-black cursor-pointer text-xs flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Goal Tracker 2: Mechanical Digital Clicker */}
            <div className="bg-white border border-gray-150 p-4 rounded-2xl shadow-3xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-gray-800 font-mono tracking-wider flex items-center gap-1">
                  <Clock className="h-4 w-4 text-emerald-500" /> Digital Counters Widget
                </span>
                <span className="text-[10px] text-gray-400 font-bold font-mono">Increment Clicker</span>
              </div>
              <div className="flex items-center justify-between bg-gray-900 text-white rounded-xl px-4 py-3.5 shadow-inner">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold tracking-wider uppercase text-emerald-400 font-mono">Achievements</span>
                  <span className="text-2xl font-black font-mono tracking-widest text-emerald-300">
                    {String(counterValue).padStart(4, '0')}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const v = Math.max(0, counterValue - 1);
                      setCounterValue(v);
                      saveDashboardData(kanbanColumns, goalValue, goalTarget, v, completedDates);
                    }}
                    className="h-8 w-8 bg-gray-800 hover:bg-gray-750 text-gray-300 font-black rounded-lg cursor-pointer text-sm flex items-center justify-center transition-colors shadow"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const v = counterValue + 1;
                      setCounterValue(v);
                      saveDashboardData(kanbanColumns, goalValue, goalTarget, v, completedDates);
                    }}
                    className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg cursor-pointer text-sm flex items-center justify-center transition-colors shadow shadow-emerald-950/40"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Habits Calendar widget */}
            {renderJuly2026Calendar()}
          </div>

          {/* Right Column: Trello Drag-free Kanban Workspace */}
          <div className="flex-1 flex gap-4 overflow-x-auto items-start pb-4 [scrollbar-width:thin]">
            {Object.keys(kanbanColumns).map(colName => {
              const list = kanbanColumns[colName];
              return (
                <div 
                  key={colName} 
                  className="w-72 bg-gray-50 border border-gray-200/80 rounded-2xl p-4 flex flex-col gap-3 shrink-0 max-h-[480px] shadow-3xs"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${
                        colName.toLowerCase().includes('completed') || colName.toLowerCase().includes('done')
                          ? 'bg-emerald-500 shadow-sm'
                          : colName.toLowerCase().includes('progress')
                            ? 'bg-amber-500 shadow-sm'
                            : 'bg-purple-500 shadow-sm'
                      }`} />
                      <span className="text-xs font-black text-gray-800 font-mono uppercase tracking-tight">{colName}</span>
                    </div>
                    <span className="text-[10px] font-bold font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                      {list.length}
                    </span>
                  </div>

                  {/* Task list container */}
                  <div className="flex flex-col gap-2.5 overflow-y-auto pr-0.5 flex-1 max-h-[350px] [scrollbar-width:thin]">
                    {list.length > 0 ? (
                      list.map(item => (
                        <div 
                          key={item.id} 
                          className="bg-white border border-gray-200 rounded-xl p-3 shadow-3xs hover:border-purple-300 hover:shadow-xs transition-all relative group flex flex-col gap-2"
                        >
                          <div className="flex items-start gap-2 pr-6">
                            <button
                              type="button"
                              onClick={() => handleToggleTaskCheck(colName, item.id)}
                              className="mt-0.5 text-gray-400 hover:text-purple-600 transition-colors cursor-pointer shrink-0"
                            >
                              <CheckSquare className={`h-4 w-4 ${item.completed ? 'text-purple-600 fill-purple-50' : 'text-gray-300'}`} />
                            </button>
                            <span className={`text-xs font-semibold text-gray-700 leading-tight font-sans break-words ${item.completed ? 'line-through text-gray-400 font-normal' : ''}`}>
                              {item.text}
                            </span>
                          </div>

                          {/* Controls to shift column or delete */}
                          <div className="opacity-0 group-hover:opacity-100 flex items-center justify-between border-t border-gray-100 pt-2 transition-opacity mt-1">
                            <div className="flex gap-1">
                              {Object.keys(kanbanColumns).map(targetCol => {
                                if (targetCol === colName) return null;
                                return (
                                  <button
                                    key={targetCol}
                                    type="button"
                                    onClick={() => handleMoveTask(colName, targetCol, item.id)}
                                    className="text-[9px] font-bold bg-purple-50 hover:bg-purple-100 border border-purple-100 text-purple-700 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                    title={`Move to ${targetCol}`}
                                  >
                                    Move to {targetCol.split('/')[0].trim()}
                                  </button>
                                );
                              })}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(colName, item.id)}
                              className="text-gray-400 hover:text-red-600 p-0.5 rounded cursor-pointer transition-colors"
                              title="Delete task"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-[10px] text-gray-400 italic py-6">
                        Empty column
                      </div>
                    )}
                  </div>

                  {/* Add task field */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const input = form.elements.namedItem('taskText') as HTMLInputElement;
                      if (input && input.value.trim()) {
                        handleAddTask(colName, input.value);
                        input.value = '';
                      }
                    }}
                    className="flex gap-1.5 border-t border-gray-100 pt-2"
                  >
                    <input
                      type="text"
                      name="taskText"
                      placeholder="Insert task name..."
                      className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-700"
                    />
                    <button
                      type="submit"
                      className="p-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden split-pane divide-x divide-gray-150 border border-gray-150 rounded-3xl bg-white shadow-sm min-h-[350px]">
          
          {/* 1. Editor Panel */}
          {layout !== 'preview-only' && (
            <div className="flex-grow flex flex-col min-w-0 h-full bg-white relative">
              {/* Outline list in editor side if headers exist */}
              {headers.length > 0 && layout === 'edit-only' && (
                <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center gap-2 overflow-x-auto select-none shrink-0 [scrollbar-width:none]">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <Compass className="h-3.5 w-3.5" /> Document Outline:
                  </span>
                  {headers.map((hdr, hIdx) => (
                    <span 
                      key={hIdx} 
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-md shrink-0 border border-gray-200 cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 transition-colors ${
                        hdr.level === 1 ? 'bg-indigo-50/50 text-indigo-700' : 'bg-white text-gray-500'
                      }`}
                    >
                      {hdr.text}
                    </span>
                  ))}
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={mdContent}
                onChange={handleTextareaChange}
                id="editor-textarea"
                className="flex-grow p-6 resize-none focus:outline-none text-sm text-gray-800 font-mono leading-relaxed placeholder-gray-300 overflow-y-auto"
                placeholder="Start drafting standard markdown templates (# headers, - lists, tables, code blocks)... Type '[[' to link and reference wiki sheets."
              />
            </div>
          )}

          {/* 2. Live Rendering Panel */}
          {layout !== 'edit-only' && (
            <div className="flex-grow bg-gray-50/40 p-6 overflow-y-auto h-full [scrollbar-width:thin]">
              <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] p-6 min-h-full">
                <div className="mb-4 text-[9px] font-extrabold text-indigo-500 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 animate-spin" /> Uncompromised Markdown Preview
                </div>
                <h1 className="text-xl font-black text-gray-900 mb-5">{title}</h1>
                <div className="border-t border-gray-100 pt-5">
                  {renderMarkdown(mdContent)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Writing Metrics pill HUD */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-[10px] text-gray-400 font-mono mt-4 flex flex-wrap items-center justify-between select-none">
        <span className="flex items-center gap-1 font-bold">
          <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
          MARKDOWN WRITING STUDIO
        </span>
        <div className="flex items-center gap-4">
          <span>WORDS: <strong className="text-gray-600 font-bold">{wordCount}</strong></span>
          <span>CHARS: <strong className="text-gray-600 font-bold">{charCount}</strong></span>
          <span>EST. READING TIME: <strong className="text-gray-600 font-bold">{readingTime} min</strong></span>
        </div>
      </div>
    </div>
  );
}
