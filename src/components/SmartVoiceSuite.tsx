import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  Volume2, 
  Play, 
  Pause, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  FileAudio, 
  FileText, 
  HelpCircle, 
  ChevronRight,
  ArrowRight,
  Trash2,
  Copy,
  Info
} from 'lucide-react';

interface SmartVoiceSuiteProps {
  content: string;
  onChangeContent: (val: string) => void;
  title: string;
  onChangeTitle: (val: string) => void;
  isReadOnly?: boolean;
}

interface GrammarCorrection {
  original: string;
  replacement: string;
  explanation: string;
  context?: string;
}

interface ToneRewrite {
  style: string;
  text: string;
  explanation: string;
}

export default function SmartVoiceSuite({
  content,
  onChangeContent,
  title,
  onChangeTitle,
  isReadOnly = false
}: SmartVoiceSuiteProps) {
  const [activeTab, setActiveTab] = useState<'dictation' | 'podcast' | 'grammar'>('dictation');

  // Common loading / error states
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('');

  // 1. DICTATION STATES
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isLiveSpeech, setIsLiveSpeech] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [dictationStyle, setDictationStyle] = useState<string>('General Professional');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Analyser node for custom canvas animation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 2. PODCAST / TTS STATES
  const [podcastType, setPodcastType] = useState<'single' | 'podcast'>('podcast');
  const [podcastAudio, setPodcastAudio] = useState<string | null>(null); // base64
  const [podcastScript, setPodcastScript] = useState<string>('');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(0); // percent 0-100
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);

  const audioSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const decodedAudioBufferRef = useRef<AudioBuffer | null>(null);

  // 3. GRAMMAR STATES
  const [corrections, setCorrections] = useState<GrammarCorrection[]>([]);
  const [rewrites, setRewrites] = useState<ToneRewrite[]>([]);
  const [scanDone, setScanDone] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize Speech Recognition (Web Speech API) if available
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let finalTrans = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTrans) {
          setLiveTranscript(prev => prev + finalTrans);
        }
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please enable microphone permissions.');
        }
      };

      speechRecognitionRef.current = rec;
    }

    return () => {
      stopRecording();
      stopPlayback();
    };
  }, []);

  // Timer for audio duration
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Audio wave visualizer canvas animation
  useEffect(() => {
    if (isRecording && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#6366f1';
        
        // Render 18 jumping bars representing audio waveforms
        const barCount = 18;
        const barWidth = 6;
        const barGap = 4;
        const startX = (canvas.width - (barCount * (barWidth + barGap))) / 2;

        for (let i = 0; i < barCount; i++) {
          const height = Math.random() * 45 + 5; // Randomized live amplitude simulation
          const x = startX + i * (barWidth + barGap);
          const y = (canvas.height - height) / 2;
          
          // Draw rounded bars
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, height, 4);
          ctx.fill();
        }

        animationFrameRef.current = requestAnimationFrame(draw);
      };

      draw();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording]);

  // --- 1. VOICE DICTATION LOGIC ---

  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setRecordedUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(250);

      if (isLiveSpeech && speechRecognitionRef.current) {
        setLiveTranscript('');
        try {
          speechRecognitionRef.current.start();
        } catch (e) {
          console.warn('SpeechRecognition already active:', e);
        }
      }
    } catch (err: any) {
      console.error('Error starting recording:', err);
      setError('Could not access microphone. Make sure it is plugged in and authorized.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);

    if (isLiveSpeech && speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {
        console.warn('SpeechRecognition stop error:', e);
      }
    }
  };

  const handleApplyLiveTranscript = async () => {
    if (!liveTranscript.trim()) return;
    setLoading(true);
    setStatusText('Refining raw transcript with Gemini...');
    setError(null);

    try {
      const response = await fetch('/api/gemini/format-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: liveTranscript, style: dictationStyle })
      });
      const data = await response.json();

      if (response.ok) {
        onChangeContent(data.text);
        setLiveTranscript('');
        setSuccessMessage('Voice dictated content successfully refined and loaded!');
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setError(data.error || 'Failed to refine transcript.');
      }
    } catch (err) {
      setError('Connection failure refining transcript.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAudioToGemini = async () => {
    if (!audioBlob) return;
    setLoading(true);
    setStatusText('Transcribing and formatting audio with Gemini...');
    setError(null);

    try {
      // Read audioBlob as Base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        try {
          const response = await fetch('/api/gemini/dictate-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audio: base64Data,
              mimeType: 'audio/webm',
              style: dictationStyle
            })
          });
          const data = await response.json();

          if (response.ok) {
            onChangeContent(data.text);
            setSuccessMessage('Audio file transcribed and beautifully formatted!');
            setAudioBlob(null);
            setRecordedUrl(null);
            setTimeout(() => setSuccessMessage(null), 4000);
          } else {
            setError(data.error || 'Failed to process audio.');
          }
        } catch (e) {
          setError('Error posting audio to backend.');
        } finally {
          setLoading(false);
        }
      };
    } catch (err) {
      setError('Failed to process recorded audio.');
      setLoading(false);
    }
  };

  const handleLocalAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioBlob(file);
      setRecordedUrl(URL.createObjectURL(file));
      setIsLiveSpeech(false);
    }
  };


  // --- 2. PODCAST / TTS LOGIC ---

  const handleGeneratePodcast = async () => {
    if (!content.trim()) {
      setError('Document must contain text content to read.');
      return;
    }
    setLoading(true);
    setStatusText(podcastType === 'podcast' ? 'Drafting engaging Host dialogue and synthesizing voices...' : 'Synthesizing professional narrator voice...');
    setError(null);
    stopPlayback();

    try {
      const response = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: content,
          type: podcastType
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPodcastAudio(data.audio);
        setPodcastScript(data.script);
        setSuccessMessage('Podcast generated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
        
        // Auto decode and prepare audio buffer
        await decodeAudioData(data.audio);
      } else {
        setError(data.error || 'Failed to synthesize Text-to-Speech.');
      }
    } catch (err) {
      setError('Network failure during voice synthesis.');
    } finally {
      setLoading(false);
    }
  };

  // Decode Base64 16-bit PCM little-endian audio returned by TTS API
  const decodeAudioData = async (base64Audio: string) => {
    try {
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Gemini TTS provides raw PCM data or Wav depending on candidate
      // We process 16-bit PCM (2 bytes per sample, 24000Hz sampling rate)
      const numSamples = len / 2;
      const pcmData = new Int16Array(bytes.buffer);

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 24000 });
      audioContextRef.current = audioCtx;

      const audioBuffer = audioCtx.createBuffer(1, numSamples, 24000);
      const channelData = audioBuffer.getChannelData(0);

      for (let i = 0; i < numSamples; i++) {
        channelData[i] = pcmData[i] / 32768.0; // scale Int16 to float [-1.0, 1.0]
      }

      decodedAudioBufferRef.current = audioBuffer;
      setTotalDuration(audioBuffer.duration);
      setAudioProgress(0);
      setCurrentTime(0);
    } catch (err) {
      console.error('Error decoding audio buffer:', err);
      setError('Could not decode audio response stream.');
    }
  };

  const startPlayback = () => {
    if (!decodedAudioBufferRef.current) return;
    
    // Ensure AudioContext is running
    const ctx = audioContextRef.current;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }

    const source = ctx!.createBufferSource();
    source.buffer = decodedAudioBufferRef.current;
    source.playbackRate.value = playbackSpeed;
    source.connect(ctx!.destination);

    // Calculate resume offset
    const offset = pauseTimeRef.current;
    source.start(0, offset);
    startTimeRef.current = ctx!.currentTime - (offset / playbackSpeed);

    source.onended = () => {
      // Only set to false if it reached the very end
      if (ctx!.currentTime - startTimeRef.current >= decodedAudioBufferRef.current!.duration / playbackSpeed - 0.1) {
        setIsPlaying(false);
        setAudioProgress(100);
        setCurrentTime(decodedAudioBufferRef.current!.duration);
        pauseTimeRef.current = 0;
      }
    };

    audioSourceNodeRef.current = source;
    setIsPlaying(true);
  };

  const pausePlayback = () => {
    if (audioSourceNodeRef.current) {
      audioSourceNodeRef.current.stop();
    }
    const ctx = audioContextRef.current;
    if (ctx) {
      pauseTimeRef.current = (ctx.currentTime - startTimeRef.current) * playbackSpeed;
    }
    setIsPlaying(false);
  };

  const stopPlayback = () => {
    if (audioSourceNodeRef.current) {
      audioSourceNodeRef.current.stop();
    }
    setIsPlaying(false);
    setAudioProgress(0);
    setCurrentTime(0);
    pauseTimeRef.current = 0;
  };

  // Monitor playback progress
  useEffect(() => {
    let interval: any;
    if (isPlaying && decodedAudioBufferRef.current && audioContextRef.current) {
      interval = setInterval(() => {
        const ctx = audioContextRef.current;
        if (!ctx) return;
        const current = (ctx.currentTime - startTimeRef.current) * playbackSpeed;
        const total = decodedAudioBufferRef.current!.duration;
        
        if (current <= total) {
          setCurrentTime(current);
          setAudioProgress((current / total) * 100);
        }
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (isPlaying) {
      // To change rate on-the-fly, pause and restart with new speed rate
      pausePlayback();
      setTimeout(() => {
        startPlayback();
      }, 50);
    }
  };

  const handleSeek = (percent: number) => {
    if (!decodedAudioBufferRef.current) return;
    const seekTime = (percent / 100) * decodedAudioBufferRef.current.duration;
    
    pausePlayback();
    pauseTimeRef.current = seekTime;
    setCurrentTime(seekTime);
    setAudioProgress(percent);
    
    setTimeout(() => {
      startPlayback();
    }, 50);
  };

  const formatAudioTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };


  // --- 3. GRAMMAR PROOFREADER LOGIC ---

  const handleScanDocument = async () => {
    if (!content.trim()) {
      setError('Document has no content to scan.');
      return;
    }
    setLoading(true);
    setStatusText('Running structural sentiment & grammar engines...');
    setError(null);
    setScanDone(false);

    try {
      const response = await fetch('/api/gemini/grammar-rewriting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content })
      });

      const data = await response.json();

      if (response.ok) {
        setCorrections(data.corrections || []);
        setRewrites(data.rewrites || []);
        setScanDone(true);
        if ((data.corrections || []).length === 0) {
          setSuccessMessage('No grammar or spelling errors found. Great writing!');
          setTimeout(() => setSuccessMessage(null), 4000);
        }
      } else {
        setError(data.error || 'Failed to analyze text grammar.');
      }
    } catch (err) {
      setError('Network failure scanning document.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptCorrection = (correction: GrammarCorrection) => {
    // Escape special regex chars
    const escaped = correction.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'g');
    
    if (content.includes(correction.original)) {
      const newContent = content.replace(regex, correction.replacement);
      onChangeContent(newContent);
      setCorrections(prev => prev.filter(c => c.original !== correction.original));
      
      setSuccessMessage(`Applied correction: "${correction.replacement}"`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError(`Match not found in editor: "${correction.original}"`);
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleAcceptRewrite = (rewrite: ToneRewrite) => {
    onChangeContent(rewrite.text);
    setSuccessMessage(`Document rewritten in ${rewrite.style} style!`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-800">
      
      {/* Dynamic Notifications */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-850 rounded-2xl flex items-center gap-2 text-xs font-medium shadow-sm"
          >
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </motion.div>
        )}
        
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 text-red-850 rounded-2xl flex items-center gap-2 text-xs font-medium shadow-sm"
          >
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs list inside Smart Suite */}
      <div className="flex border-b border-gray-100 pb-3 mb-4 gap-1 select-none shrink-0">
        <button
          onClick={() => { setActiveTab('dictation'); setError(null); }}
          className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer border ${
            activeTab === 'dictation'
              ? 'bg-indigo-50 border-indigo-200 text-indigo-750 shadow-xs'
              : 'bg-white border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Mic className="h-4 w-4" />
          <span>Dictation</span>
        </button>
        <button
          onClick={() => { setActiveTab('podcast'); setError(null); }}
          className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer border ${
            activeTab === 'podcast'
              ? 'bg-indigo-50 border-indigo-200 text-indigo-750 shadow-xs'
              : 'bg-white border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Volume2 className="h-4 w-4" />
          <span>Podcast Studio</span>
        </button>
        <button
          onClick={() => { setActiveTab('grammar'); setError(null); }}
          className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer border ${
            activeTab === 'grammar'
              ? 'bg-indigo-50 border-indigo-200 text-indigo-750 shadow-xs'
              : 'bg-white border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Proofreader</span>
        </button>
      </div>

      {/* Main Content Area based on Tab */}
      <div className="flex-grow overflow-y-auto pr-1">
        
        {/* TAB 1: VOICE DICTATION */}
        {activeTab === 'dictation' && (
          <div className="flex flex-col gap-4">
            
            {/* Format Style Selector */}
            <div className="flex flex-col gap-1.5 bg-gray-50 p-3 rounded-2xl border border-gray-150">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <FileText className="h-3 w-3 text-indigo-500" /> Formatted Format Style
              </label>
              <select
                value={dictationStyle}
                onChange={(e) => setDictationStyle(e.target.value)}
                className="w-full text-xs bg-white border border-gray-200 rounded-lg p-2 focus:border-indigo-500 focus:outline-none"
              >
                <option value="General Professional">General Professional (.txt)</option>
                <option value="Scientific Report">Scientific Rigorous Report (.md)</option>
                <option value="Meeting Notes">Concise Meeting Notes (.md)</option>
                <option value="Product Release Plan">Symmetric Product Release Plan (.md)</option>
                <option value="Lively Blog Post">Lively & Creative Blog Post (.md)</option>
              </select>
            </div>

            {/* Live Dictation / Recorder Station */}
            <div className="border border-gray-150 rounded-2xl p-4 flex flex-col items-center gap-4 bg-white/50 relative overflow-hidden">
              <div className="absolute top-2.5 right-2.5">
                <span className="flex h-2 w-2 relative">
                  {isRecording && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isRecording ? 'bg-red-500' : 'bg-gray-300'}`} />
                </span>
              </div>

              <div className="text-center">
                <h4 className="text-xs font-bold text-gray-800">Voice Dictation Hub</h4>
                <p className="text-[10px] text-gray-450 mt-1">Speak into your mic to structure beautiful technical text.</p>
              </div>

              {/* Waveform visualizer */}
              {isRecording ? (
                <canvas 
                  ref={canvasRef} 
                  width={200} 
                  height={60} 
                  className="bg-indigo-50/50 rounded-xl border border-indigo-100/50 w-full"
                />
              ) : (
                <div className="flex items-center justify-center h-[60px] bg-gray-50 rounded-xl border border-gray-100 w-full font-mono text-[10px] text-gray-400">
                  {audioBlob ? 'Recording captured successfully.' : 'Microphone is inactive.'}
                </div>
              )}

              {/* Status and Timer */}
              {isRecording && (
                <div className="flex items-center gap-2 font-mono text-xs font-semibold text-red-600 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                  <span>Recording: {formatAudioTime(recordingDuration)}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full">
                {isRecording ? (
                  <button
                    onClick={stopRecording}
                    className="flex-1 py-2.5 bg-red-650 hover:bg-red-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <MicOff className="h-4 w-4" /> Stop Recording
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    disabled={isReadOnly}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Mic className="h-4 w-4" /> Start Dictation
                  </button>
                )}
              </div>

              {/* Browser speech transcription checklist */}
              <div className="flex items-center gap-2 self-start select-none">
                <input
                  type="checkbox"
                  id="toggle-live-speech"
                  checked={isLiveSpeech}
                  onChange={(e) => setIsLiveSpeech(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                />
                <label htmlFor="toggle-live-speech" className="text-[10px] text-gray-500 font-medium cursor-pointer">
                  Enable real-time preview (Web Speech API)
                </label>
              </div>
            </div>

            {/* LIVE PREVIEW FEED */}
            {isLiveSpeech && liveTranscript && (
              <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-3 flex flex-col gap-2 select-text">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-550" /> Live Transcript Preview
                </span>
                <p className="text-xs text-gray-700 font-mono leading-relaxed max-h-32 overflow-y-auto">
                  {liveTranscript}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={handleApplyLiveTranscript}
                    className="text-[10px] bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-lg font-bold cursor-pointer transition-colors"
                  >
                    Format & Insert into Editor
                  </button>
                  <button
                    onClick={() => setLiveTranscript('')}
                    className="text-[10px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg cursor-pointer ml-auto"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* POST-RECORDING FLOW */}
            {!isRecording && audioBlob && recordedUrl && (
              <div className="bg-gray-50 border border-gray-150 rounded-2xl p-3.5 flex flex-col gap-3 select-none">
                <div className="flex items-center gap-2.5">
                  <FileAudio className="h-5 w-5 text-indigo-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-800">Recorded Audio Audio</span>
                    <span className="text-[9px] text-gray-400 font-mono mt-0.5">Size: {(audioBlob.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <button
                    onClick={() => { setAudioBlob(null); setRecordedUrl(null); }}
                    className="p-1.5 hover:bg-gray-200/60 text-gray-450 hover:text-red-600 rounded-lg ml-auto transition-colors cursor-pointer"
                    title="Discard audio"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <audio src={recordedUrl} controls className="w-full h-8 scale-95" />

                <button
                  onClick={handleUploadAudioToGemini}
                  className="py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/50 text-indigo-750 text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Structure & Beautify with Gemini
                </button>
              </div>
            )}

            {/* UPLOAD LOCAL AUDIO CONTROLS */}
            <div className="border border-dashed border-gray-250 hover:border-gray-300 rounded-2xl p-4 flex flex-col items-center gap-2 bg-gray-50/50 cursor-pointer relative">
              <input
                type="file"
                accept="audio/*"
                onChange={handleLocalAudioUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                title="Upload audio file"
              />
              <FileAudio className="h-5 w-5 text-gray-400" />
              <span className="text-xs font-semibold text-gray-600">Upload pre-recorded audio file</span>
              <span className="text-[9px] text-gray-400 font-mono">Supports WAV, MP3, WEBM, M4A</span>
            </div>

          </div>
        )}

        {/* TAB 2: AUDIO PODCAST (TEXT TO SPEECH) */}
        {activeTab === 'podcast' && (
          <div className="flex flex-col gap-4 select-none">
            
            <div className="bg-indigo-50/40 border border-indigo-100/50 rounded-2xl p-4 flex flex-col gap-3">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                <Volume2 className="h-4 w-4 fill-indigo-100" /> Podcast Config
              </span>
              <p className="text-[10px] text-indigo-950/70 leading-relaxed font-medium">
                Generate an audio podcast overview. Choose single speaker narrator or a dual-host conversation explaining the sheet.
              </p>

              {/* Podcast Mode Selection */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => setPodcastType('single')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col gap-1 items-center transition-all cursor-pointer ${
                    podcastType === 'single'
                      ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm ring-1 ring-indigo-500'
                      : 'bg-white/50 border-gray-200 text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Volume2 className="h-4 w-4" />
                  <span>Single Narrator</span>
                </button>
                <button
                  onClick={() => setPodcastType('podcast')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col gap-1 items-center transition-all cursor-pointer ${
                    podcastType === 'podcast'
                      ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm ring-1 ring-indigo-500'
                      : 'bg-white/50 border-gray-200 text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <FileAudio className="h-4 w-4" />
                  <span>Dual Host Podcast</span>
                </button>
              </div>

              <button
                onClick={handleGeneratePodcast}
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-150 cursor-pointer flex items-center justify-center gap-1.5 mt-2"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                {podcastAudio ? 'Regenerate Podcast' : 'Synthesize Audio Podcast'}
              </button>
            </div>

            {/* INTEGRATED PLAYBACK STATION */}
            {podcastAudio && (
              <div className="border border-gray-150 rounded-2xl p-4 flex flex-col gap-4 bg-white shadow-3xs">
                
                {/* Audio Waveform scrubbing interface */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between font-mono text-[10px] text-gray-400">
                    <span>{formatAudioTime(currentTime)}</span>
                    <span>{formatAudioTime(totalDuration)}</span>
                  </div>

                  {/* Interactive timeline scrubber bar */}
                  <div 
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const percent = Math.min(100, Math.max(0, (x / rect.width) * 100));
                      handleSeek(percent);
                    }}
                    className="h-2.5 bg-gray-150 hover:bg-gray-200 rounded-full cursor-pointer relative overflow-hidden transition-colors"
                  >
                    <div 
                      className="h-full bg-indigo-600 transition-all rounded-full" 
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                </div>

                {/* Control Panel */}
                <div className="flex items-center justify-between gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  
                  {/* Play / Pause button */}
                  {isPlaying ? (
                    <button
                      onClick={pausePlayback}
                      className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full cursor-pointer shadow-sm transition-all flex items-center justify-center"
                    >
                      <Pause className="h-4 w-4 fill-current" />
                    </button>
                  ) : (
                    <button
                      onClick={startPlayback}
                      className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full cursor-pointer shadow-sm transition-all flex items-center justify-center"
                    >
                      <Play className="h-4 w-4 fill-current translate-x-0.5" />
                    </button>
                  )}

                  {/* Playback speed buttons */}
                  <div className="flex items-center gap-1 border border-gray-200/70 bg-white p-1 rounded-xl">
                    {[1.0, 1.25, 1.5, 2.0].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSpeedChange(s)}
                        className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                          playbackSpeed === s
                            ? 'bg-indigo-50 text-indigo-700 shadow-3xs'
                            : 'text-gray-400 hover:text-gray-700'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={stopPlayback}
                    className="text-[10px] text-gray-400 hover:text-red-500 font-bold px-2 py-1 cursor-pointer transition-colors"
                  >
                    Reset
                  </button>
                </div>

                {/* Synced Script Conversation Board */}
                {podcastScript && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Synced Episode Script</span>
                    
                    <div className="max-h-48 overflow-y-auto flex flex-col gap-2.5 pr-1 [scrollbar-width:thin]">
                      {podcastScript.split('\n').filter(line => line.trim().includes(':')).map((line, idx) => {
                        const colonIdx = line.indexOf(':');
                        const speaker = line.slice(0, colonIdx).trim();
                        const dialogue = line.slice(colonIdx + 1).trim();

                        const isJoe = speaker.toLowerCase().includes('joe');
                        
                        return (
                          <div 
                            key={idx} 
                            className={`p-2.5 rounded-2xl border text-xs leading-relaxed flex flex-col gap-1 transition-all ${
                              isJoe 
                                ? 'bg-indigo-50/30 border-indigo-150/40 self-start mr-8' 
                                : 'bg-purple-50/20 border-purple-150/30 self-end ml-8'
                            }`}
                          >
                            <span className={`text-[10px] font-extrabold tracking-wide uppercase ${
                              isJoe ? 'text-indigo-600' : 'text-purple-600'
                            }`}>
                              {speaker}
                            </span>
                            <p className="text-gray-750 font-sans leading-relaxed">{dialogue}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

        {/* TAB 3: GRAMMAR SCAN & REWRITING */}
        {activeTab === 'grammar' && (
          <div className="flex flex-col gap-4 select-none">
            
            <div className="bg-gray-50 p-4 border border-gray-150 rounded-2xl flex flex-col gap-2">
              <span className="text-[10px] font-bold text-indigo-550 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="h-4 w-4" /> AI Proofreader
              </span>
              <p className="text-[10px] text-gray-450 leading-relaxed">
                Analyze your document's grammatical structure, syntax, and spelling accuracy. Generate dynamic tone variations on-the-fly.
              </p>
              <button
                onClick={handleScanDocument}
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-150 cursor-pointer flex items-center justify-center gap-1.5 mt-2"
              >
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {scanDone ? 'Re-scan Document' : 'Scan Document Structure'}
              </button>
            </div>

            {scanDone && (
              <div className="flex flex-col gap-4">
                
                {/* 3a. Grammar Corrections list */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-1 shrink-0">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Grammar & Syntax Fixes</span>
                    <span className="text-[9px] font-mono bg-red-50 text-red-700 font-bold px-1.5 py-0.5 rounded-md leading-none">
                      {corrections.length} issues
                    </span>
                  </div>

                  {corrections.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {corrections.map((corr, idx) => (
                        <div 
                          key={corr.original + idx}
                          className="bg-white border border-gray-200 hover:border-indigo-200 p-3 rounded-2xl flex flex-col gap-2.5 shadow-3xs transition-all"
                        >
                          {corr.context && (
                            <p className="text-[10px] font-mono text-gray-400 line-clamp-2 italic leading-normal">
                              "{corr.context}"
                            </p>
                          )}
                          
                          <div className="flex items-center flex-wrap gap-2 text-xs">
                            <span className="bg-red-50 text-red-700 line-through px-1.5 py-0.5 rounded font-mono">
                              {corr.original}
                            </span>
                            <ArrowRight className="h-3 w-3 text-gray-350" />
                            <span className="bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded font-mono">
                              {corr.replacement}
                            </span>
                          </div>

                          <p className="text-[11px] text-gray-550 leading-relaxed leading-normal select-text border-l-2 border-indigo-500 pl-2">
                            {corr.explanation}
                          </p>

                          <button
                            onClick={() => handleAcceptCorrection(corr)}
                            disabled={isReadOnly}
                            className="w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:bg-gray-100 disabled:text-gray-400 text-emerald-800 text-[10px] font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Check className="h-3 w-3" /> Apply Correction
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/30 text-center select-none">
                      <Check className="h-6 w-6 text-emerald-500 mb-1" />
                      <span className="text-xs font-bold text-gray-700">Perfect grammar and spelling</span>
                      <span className="text-[9px] text-gray-400 mt-0.5">Everything matches structural guidelines.</span>
                    </div>
                  )}
                </div>

                {/* 3b. Tone Rewriting cards */}
                {rewrites.length > 0 && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tone Style Presets</span>
                    
                    <div className="flex flex-col gap-3">
                      {rewrites.map((rw) => (
                        <div 
                          key={rw.style}
                          className="bg-white border border-gray-200/85 p-3 rounded-2xl flex flex-col gap-2 shadow-4xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-800">{rw.style} style</span>
                            <span className="text-[9px] font-mono text-indigo-500">{rw.explanation}</span>
                          </div>

                          <p className="text-xs text-gray-600 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100 leading-relaxed select-text font-sans">
                            {rw.text.slice(0, 150)}{rw.text.length > 150 ? '...' : ''}
                          </p>

                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={() => handleAcceptRewrite(rw)}
                              disabled={isReadOnly}
                              className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:bg-gray-100 disabled:text-gray-400 text-indigo-850 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                            >
                              Insert & Replace Text
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(rw.text);
                                setSuccessMessage('Copied rewritten text to clipboard!');
                                setTimeout(() => setSuccessMessage(null), 3000);
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-450 hover:text-indigo-600 cursor-pointer transition-colors"
                              title="Copy to clipboard"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

      </div>

      {/* Expandable full-status overlay for loading sessions */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-[90] select-none"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full border border-gray-150 shadow-2xl text-center flex flex-col items-center gap-4"
            >
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full animate-bounce">
                <Sparkles className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-extrabold text-gray-900 leading-tight">AI Smart Suite Engine</h4>
                <p className="text-xs text-indigo-650 font-bold mt-1.5">{statusText}</p>
                <p className="text-[10px] text-gray-400">Processing real-time server-side models...</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
