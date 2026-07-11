import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  Trash2, 
  MessageSquare, 
  BookOpen, 
  Layers, 
  Tag, 
  HelpCircle, 
  FileText, 
  ChevronRight, 
  Clock, 
  Lightbulb, 
  Loader2, 
  Database,
  ArrowRight,
  RefreshCw,
  Search,
  CheckCircle,
  FileBadge,
  BadgeAlert
} from 'lucide-react';
import { Document, Shelf } from '../types';
import MathRenderer from './MathRenderer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface RagChatProps {
  documents: Document[];
  shelves: Shelf[];
  onOpenDoc: (doc: Document) => void;
  currentUserEmail?: string;
}

export default function RagChat({ documents, shelves, onOpenDoc, currentUserEmail }: RagChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeShelfFilter, setActiveShelfFilter] = useState<string>('all');
  const [chatError, setChatError] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to the bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedChat = localStorage.getItem('doc_manager_rag_chat');
    if (savedChat) {
      setMessages(JSON.parse(savedChat));
    } else {
      // Set initial welcome message
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hello! I am your local AI workspace assistant. I can analyze and chat about all the documents on your physical shelves using Gemini. 

Here are some things you can ask me:
* **"Summarize everything you've written about physics"**
* **"What were the previous decisions in Project X?"**
* **"Which documents contain code fragments or spreadsheets?"**

I will analyze your documents in real-time and provide direct clickable citations to the exact source files so you can verify any answer instantly. 

How can I help you today?`,
          timestamp: new Date().toISOString()
        }
      ]);
    }
  }, []);

  // Save chat to localStorage when updated
  const saveChatHistory = (nextMessages: Message[]) => {
    setMessages(nextMessages);
    localStorage.setItem('doc_manager_rag_chat', JSON.stringify(nextMessages));
  };

  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear your chat history?')) {
      const resetMessages: Message[] = [
        {
          id: 'welcome',
          role: 'assistant',
          content: `Chat history cleared. How can I help you analyze your documents today?`,
          timestamp: new Date().toISOString()
        }
      ];
      saveChatHistory(resetMessages);
      setChatError(null);
    }
  };

  // Preset prompt suggestions
  const suggestions = [
    { text: "Summarize everything written about physics", icon: "⚛️" },
    { text: "What were the previous decisions in Project X?", icon: "📁" },
    { text: "List all documents and their categories", icon: "📚" },
    { text: "Analyze the mathematical formula on bouncy elastomers", icon: "📐" }
  ];

  const handleApplySuggestion = (text: string) => {
    setInputValue(text);
    inputRef.current?.focus();
  };

  // Filter documents in-scope based on selected shelf
  const inScopeDocs = documents.filter(doc => {
    if (doc.isArchived) return false;
    if (activeShelfFilter === 'all') return true;
    return doc.category === activeShelfFilter;
  });

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessageText = inputValue.trim();
    setInputValue('');
    setChatError(null);

    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: userMessageText,
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [...messages, userMsg];
    saveChatHistory(updatedHistory);
    setIsLoading(true);

    try {
      // Map history to server format
      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Send post request to server Gemini RAG endpoint
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessageText,
          history: historyPayload,
          documents: inScopeDocs
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate response.');
      }

      const responseData = await response.json();

      const assistantMsg: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: responseData.text,
        timestamp: new Date().toISOString()
      };

      saveChatHistory([...updatedHistory, assistantMsg]);

    } catch (err: any) {
      console.error('RAG Chat Error:', err);
      setChatError(err.message || 'An error occurred while communicating with Gemini.');
    } finally {
      setIsLoading(false);
    }
  };

  // Parse inline equations, wiki links, and custom [id:doc-id] citations
  const renderMessageContent = (text: string) => {
    if (!text) return null;

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];

    const renderTextWithCitationsAndMath = (paragraphText: string) => {
      // Matches both standard [id:doc-id] / [doc-id] citations and math/wiki patterns
      if (!paragraphText.includes('[id:') && !paragraphText.includes('$') && !paragraphText.includes('[[')) {
        return <span>{paragraphText}</span>;
      }

      const parts: React.ReactNode[] = [];
      let currentIndex = 0;

      while (currentIndex < paragraphText.length) {
        const nextMathIdx = paragraphText.indexOf('$', currentIndex);
        const nextWikiIdx = paragraphText.indexOf('[[', currentIndex);
        const nextCitationIdx = paragraphText.indexOf('[id:', currentIndex);

        const indices = [
          { type: 'math', idx: nextMathIdx },
          { type: 'wiki', idx: nextWikiIdx },
          { type: 'citation', idx: nextCitationIdx }
        ].filter(item => item.idx !== -1);

        if (indices.length === 0) {
          parts.push(paragraphText.slice(currentIndex));
          break;
        }

        // Find the earliest matching token
        const earliest = indices.sort((a, b) => a.idx - b.idx)[0];

        if (earliest.type === 'math') {
          if (earliest.idx > currentIndex) {
            parts.push(paragraphText.slice(currentIndex, earliest.idx));
          }

          const endMathIdx = paragraphText.indexOf('$', earliest.idx + 1);
          if (endMathIdx === -1) {
            parts.push(paragraphText.slice(earliest.idx));
            break;
          }

          const mathExpr = paragraphText.slice(earliest.idx + 1, endMathIdx);
          parts.push(
            <MathRenderer key={`math-${earliest.idx}`} math={mathExpr} block={false} />
          );
          currentIndex = endMathIdx + 1;
        } else if (earliest.type === 'wiki') {
          if (earliest.idx > currentIndex) {
            parts.push(paragraphText.slice(currentIndex, earliest.idx));
          }

          const endWikiIdx = paragraphText.indexOf(']]', earliest.idx + 2);
          if (endWikiIdx === -1) {
            parts.push(paragraphText.slice(earliest.idx));
            break;
          }

          const linkRaw = paragraphText.slice(earliest.idx + 2, endWikiIdx);
          let targetIdOrTitle = linkRaw;
          let displayLabel = linkRaw;

          if (linkRaw.includes('|')) {
            const partsSplit = linkRaw.split('|');
            targetIdOrTitle = partsSplit[0].trim();
            displayLabel = partsSplit[1].trim();
          }

          const linkedDoc = documents.find(d => 
            d.id === targetIdOrTitle || 
            d.title.toLowerCase() === targetIdOrTitle.toLowerCase()
          );

          if (linkedDoc) {
            parts.push(
              <button
                key={`wiki-${earliest.idx}`}
                type="button"
                onClick={() => onOpenDoc(linkedDoc)}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-semibold hover:bg-indigo-100 transition-colors cursor-pointer select-text"
              >
                <FileText className="h-2.5 w-2.5" />
                {displayLabel}
              </button>
            );
          } else {
            parts.push(
              <span key={`wiki-missing-${earliest.idx}`} className="text-gray-400 italic">
                [[{displayLabel}]]
              </span>
            );
          }
          currentIndex = endWikiIdx + 2;
        } else {
          // Citation is first: [id:doc-id]
          if (earliest.idx > currentIndex) {
            parts.push(paragraphText.slice(currentIndex, earliest.idx));
          }

          const endCitationIdx = paragraphText.indexOf(']', earliest.idx + 4);
          if (endCitationIdx === -1) {
            parts.push(paragraphText.slice(earliest.idx));
            break;
          }

          const docId = paragraphText.slice(earliest.idx + 4, endCitationIdx).trim();
          const referencedDoc = documents.find(d => d.id === docId);

          if (referencedDoc) {
            parts.push(
              <button
                key={`cit-${earliest.idx}`}
                type="button"
                onClick={() => onOpenDoc(referencedDoc)}
                className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100/80 transition-all font-mono text-[10px] font-bold cursor-pointer hover:shadow-xs shrink-0 select-text active:scale-95"
                title={`Sources citation: Click to open "${referencedDoc.title}"`}
              >
                <FileBadge className="h-3 w-3 text-indigo-500 stroke-[2.5]" />
                {referencedDoc.title.length > 25 ? `${referencedDoc.title.slice(0, 25)}...` : referencedDoc.title}
              </button>
            );
          } else {
            parts.push(
              <span key={`cit-missing-${earliest.idx}`} className="text-gray-400 text-[10px] font-mono">
                [Source: {docId}]
              </span>
            );
          }
          currentIndex = endCitationIdx + 1;
        }
      }

      return (
        <span>
          {parts.map((p, i) => (
            <React.Fragment key={i}>{p}</React.Fragment>
          ))}
        </span>
      );
    };

    let idx = 0;
    while (idx < lines.length) {
      const line = lines[idx];
      const trimmed = line.trim();

      // Multiline math blocks starting with $$
      if (trimmed.startsWith('$$') && !trimmed.endsWith('$$', 2)) {
        let mathContent = trimmed.slice(2);
        let j = idx + 1;
        while (j < lines.length) {
          const nextTrimmed = lines[j].trim();
          if (nextTrimmed.endsWith('$$')) {
            mathContent += '\n' + nextTrimmed.slice(0, -2);
            break;
          } else {
            mathContent += '\n' + lines[j];
            j++;
          }
        }
        elements.push(
          <div key={idx} className="my-3 py-2 px-3 overflow-x-auto text-center bg-gray-55/80 rounded-xl border border-gray-150">
            <MathRenderer math={mathContent.trim()} block={true} />
          </div>
        );
        idx = j + 1;
        continue;
      }

      // Single line block math
      if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
        const math = trimmed.slice(2, -2).trim();
        elements.push(
          <div key={idx} className="my-3 py-2 px-3 overflow-x-auto text-center bg-gray-55/80 rounded-xl border border-gray-150">
            <MathRenderer math={math} block={true} />
          </div>
        );
        idx++;
        continue;
      }

      // Code blocks
      if (trimmed.startsWith('```')) {
        let codeContent = '';
        let j = idx + 1;
        while (j < lines.length) {
          if (lines[j].trim().startsWith('```')) {
            break;
          }
          codeContent += lines[j] + '\n';
          j++;
        }
        elements.push(
          <pre key={idx} className="bg-gray-900 text-gray-100 font-mono text-[11px] p-3 rounded-xl my-2 overflow-x-auto leading-relaxed shadow-inner">
            <code>{codeContent}</code>
          </pre>
        );
        idx = j + 1;
        continue;
      }

      // Headers
      if (trimmed.startsWith('# ')) {
        elements.push(
          <h1 key={idx} className="text-base font-bold text-gray-900 border-b border-gray-100 pb-1 mt-3">
            {renderTextWithCitationsAndMath(trimmed.replace('# ', ''))}
          </h1>
        );
        idx++;
        continue;
      }
      if (trimmed.startsWith('## ')) {
        elements.push(
          <h2 key={idx} className="text-sm font-semibold text-gray-800 mt-2">
            {renderTextWithCitationsAndMath(trimmed.replace('## ', ''))}
          </h2>
        );
        idx++;
        continue;
      }
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h3 key={idx} className="text-xs font-semibold text-gray-850 mt-1.5">
            {renderTextWithCitationsAndMath(trimmed.replace('### ', ''))}
          </h3>
        );
        idx++;
        continue;
      }

      // Bullets
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        elements.push(
          <div key={idx} className="flex items-start gap-1.5 pl-3 my-0.5">
            <span className="text-indigo-500 font-bold mt-1">•</span>
            <span className="text-gray-650 text-xs leading-normal">{renderTextWithCitationsAndMath(trimmed.slice(2))}</span>
          </div>
        );
        idx++;
        continue;
      }

      if (/^\d+\.\s/.test(trimmed)) {
        const listNum = trimmed.match(/^\d+\./)?.[0];
        const content = trimmed.replace(/^\d+\.\s/, '');
        elements.push(
          <div key={idx} className="flex items-start gap-1.5 pl-3 my-0.5">
            <span className="text-indigo-600 font-mono text-xs mt-0.5">{listNum}</span>
            <span className="text-gray-650 text-xs leading-normal">{renderTextWithCitationsAndMath(content)}</span>
          </div>
        );
        idx++;
        continue;
      }

      // Standard paragraphs
      if (trimmed === '') {
        elements.push(<div key={idx} className="h-1.5" />);
      } else {
        elements.push(
          <p key={idx} className="text-gray-650 text-xs leading-relaxed my-1">
            {renderTextWithCitationsAndMath(trimmed)}
          </p>
        );
      }

      idx++;
    }

    return <div className="space-y-1 select-text">{elements}</div>;
  };

  return (
    <div id="rag-chat-container" className="flex-1 flex flex-col lg:flex-row gap-6 h-full min-h-[500px]">
      
      {/* LEFT CHAT AREA */}
      <div className="flex-1 bg-white border border-gray-150 rounded-3xl p-5 flex flex-col shadow-xs min-h-[400px]">
        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 select-none">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-150/50 flex items-center justify-center">
              <Sparkles className="h-4.5 w-4.5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-950 flex items-center gap-1.5 uppercase">
                Gemini Workspace RAG Engine
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Chatting with <span className="font-bold text-indigo-600">{inScopeDocs.length}</span> active documents in real-time
              </p>
            </div>
          </div>

          <button
            onClick={handleClearChat}
            className="p-2 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-all border border-gray-200/50 cursor-pointer flex items-center justify-center gap-1.5 text-[10px] font-bold"
            title="Clear Chat History"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear Chat
          </button>
        </div>

        {/* Message scroll list */}
        <div className="flex-1 overflow-y-auto px-1 space-y-4 max-h-[55vh] [scrollbar-width:thin]">
          {messages.map((msg, mIdx) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-gray-50/80 border border-gray-150 text-gray-800 rounded-bl-none'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="text-xs whitespace-pre-wrap leading-relaxed select-text">{msg.content}</p>
                ) : (
                  renderMessageContent(msg.content)
                )}
              </div>
              <span className="text-[9px] text-gray-400 mt-1 pl-1 pr-1 font-mono">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {isLoading && (
            <div className="flex flex-col items-start">
              <div className="bg-gray-50/80 border border-gray-150 rounded-2xl rounded-bl-none px-4 py-3.5 flex items-center gap-3 shadow-xs">
                <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
                <span className="text-xs text-gray-500 font-medium animate-pulse">
                  Gemini is reading your shelf workspace and drafting response...
                </span>
              </div>
            </div>
          )}

          {chatError && (
            <div className="bg-red-50/50 border border-red-200/50 rounded-2xl p-4 flex items-start gap-3 select-none">
              <BadgeAlert className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-bold text-red-700">RAG Pipeline Error</h4>
                <p className="text-[10px] text-red-600 mt-1 leading-relaxed">{chatError}</p>
                <button
                  onClick={handleSendMessage}
                  className="mt-2.5 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" /> Retry Generation
                </button>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Empty state suggests */}
        {messages.length <= 1 && !isLoading && (
          <div className="mt-4 pt-4 border-t border-gray-100 select-none">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-1.5 mb-2.5">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> Suggested Questions
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {suggestions.map((sug, sIdx) => (
                <button
                  key={sIdx}
                  type="button"
                  onClick={() => handleApplySuggestion(sug.text)}
                  className="w-full text-left bg-gray-50 hover:bg-indigo-50/30 border border-gray-150 hover:border-indigo-200 rounded-xl p-3 text-xs text-gray-650 hover:text-indigo-950 transition-all cursor-pointer flex items-center gap-2.5"
                >
                  <span className="text-sm shrink-0">{sug.icon}</span>
                  <span className="truncate font-medium">{sug.text}</span>
                  <ArrowRight className="h-3 w-3 text-gray-300 ml-auto group-hover:text-indigo-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text Input entry */}
        <form onSubmit={handleSendMessage} className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            placeholder={isLoading ? "Gemini is typing..." : "Ask a question about your files (e.g. physics elastomer bounce coefficient)..."}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white shadow-2xs disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 text-white disabled:text-gray-400 p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 hover:shadow-md active:scale-95 shadow-xs"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* RIGHT SIDEBAR PANEL: Workspace RAG Index scope */}
      <aside className="w-full lg:w-72 bg-white border border-gray-150 rounded-3xl p-5 flex flex-col shadow-xs select-none">
        <div className="flex flex-col gap-0.5 border-b border-gray-100 pb-3 mb-4">
          <h3 className="text-xs font-bold text-gray-450 uppercase tracking-widest flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-indigo-500 stroke-[2]" /> RAG Context Scope
          </h3>
          <span className="text-[10px] text-gray-400">Select shelf criteria to narrow down Gemini's scanner perspective:</span>
        </div>

        {/* Shelf perspective filtering select list */}
        <div className="flex flex-col gap-1 mb-4">
          <button
            onClick={() => setActiveShelfFilter('all')}
            className={`w-full text-left font-medium text-[11px] px-2.5 py-1.5 rounded-xl transition-all flex items-center justify-between cursor-pointer border ${
              activeShelfFilter === 'all'
                ? 'bg-indigo-50/50 border-indigo-200 text-indigo-700 font-semibold'
                : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-indigo-400" /> [Scan All Shelves]
            </span>
            <span className="font-mono text-[9px] bg-white border border-gray-100 rounded px-1.5 py-0.2">
              {documents.filter(d => !d.isArchived).length}
            </span>
          </button>

          {shelves.map(shelf => {
            const shelfDocCount = documents.filter(d => !d.isArchived && d.category === shelf.id).length;
            return (
              <button
                key={shelf.id}
                onClick={() => setActiveShelfFilter(shelf.id)}
                className={`w-full text-left font-medium text-[11px] px-2.5 py-1.5 rounded-xl transition-all flex items-center justify-between cursor-pointer border ${
                  activeShelfFilter === shelf.id
                    ? 'bg-indigo-50/50 border-indigo-200 text-indigo-700 font-semibold'
                    : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${
                    shelf.color === 'emerald' ? 'bg-emerald-500' :
                    shelf.color === 'teal' ? 'bg-teal-500' :
                    shelf.color === 'violet' ? 'bg-violet-500' :
                    shelf.color === 'amber' ? 'bg-amber-500' :
                    shelf.color === 'rose' ? 'bg-rose-500' : 'bg-sky-500'
                  }`} />
                  <span className="truncate pr-1">{shelf.name}</span>
                </span>
                <span className="font-mono text-[9px] bg-white border border-gray-100 rounded px-1.5 py-0.2">
                  {shelfDocCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* List of active document sources in-scope */}
        <div className="flex-1 flex flex-col min-h-0">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-2.5 flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500 stroke-[2.5]" /> Active Scanned Files ({inScopeDocs.length})
          </span>
          
          <div className="flex-grow overflow-y-auto space-y-1.5 max-h-[30vh] pr-1 [scrollbar-width:thin]">
            {inScopeDocs.length > 0 ? (
              inScopeDocs.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => onOpenDoc(doc)}
                  className="group flex items-center gap-2 p-2 hover:bg-indigo-50/10 border border-gray-100 hover:border-indigo-200/50 rounded-xl cursor-pointer select-none transition-all"
                  title={`Open: ${doc.title}`}
                >
                  <div className="h-7 w-7 rounded-lg bg-gray-50 border border-gray-200/50 flex items-center justify-center text-gray-500 group-hover:text-indigo-600 group-hover:bg-indigo-50/50 shrink-0">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[10px] font-bold text-gray-700 truncate group-hover:text-indigo-950">{doc.title}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[8px] font-semibold text-gray-400 uppercase font-mono">{doc.type}</span>
                      <span className="h-1 w-1 bg-gray-200 rounded-full" />
                      <span className="text-[8px] font-mono text-gray-400">{(doc.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                  <ChevronRight className="h-3 w-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              ))
            ) : (
              <div className="py-8 text-center flex flex-col items-center justify-center text-gray-400 gap-1.5">
                <FileText className="h-6 w-6 stroke-[1.5]" />
                <span className="text-[10px] font-semibold">No files on this shelf row</span>
              </div>
            )}
          </div>
        </div>
      </aside>

    </div>
  );
}
