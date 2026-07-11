import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Tv, 
  Bookmark, 
  Clock, 
  Settings, 
  Sliders,
  Check,
  Video as VideoIcon
} from 'lucide-react';

interface VideoEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  title: string;
}

interface VideoMarker {
  id: string;
  timestamp: number;
  note: string;
}

const DEFAULT_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

export default function VideoEditor({ content, onChange, title }: VideoEditorProps) {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [loopEnabled, setLoopEnabled] = useState<boolean>(false);

  // AI Summarization states
  const [activeTab, setActiveTab] = useState<'markers' | 'ai_summary'>('markers');
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [summaryText, setSummaryText] = useState<string>('');
  const [summaryError, setSummaryError] = useState<string>('');

  const handleSummarizeVideo = async () => {
    setIsSummarizing(true);
    setSummaryError('');
    setSummaryText('');
    
    try {
      const response = await fetch('/api/gemini/summarize-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl,
          title,
          markers
        }),
      });
      
      if (!response.ok) {
        throw new Error('Video summarization failed.');
      }
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      
      setSummaryText(data.summary || 'No summary was generated.');
    } catch (err: any) {
      console.error(err);
      setSummaryError(err.message || 'An error occurred during video analysis.');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Video annotations/markers
  const [markers, setMarkers] = useState<VideoMarker[]>([]);
  const [newNote, setNewNote] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);

  // Parse video content (either base64, direct url, or default)
  useEffect(() => {
    if (content.startsWith('data:video') || content.startsWith('http') || content.startsWith('https')) {
      setVideoUrl(content);
    } else if (content.includes('http')) {
      // Extract URL
      const urlMatch = content.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        setVideoUrl(urlMatch[0]);
      } else {
        setVideoUrl(DEFAULT_VIDEO);
      }
    } else {
      setVideoUrl(DEFAULT_VIDEO);
    }
  }, [content]);

  // Load saved markers from metadata if stored as json inside content
  useEffect(() => {
    try {
      if (content.startsWith('{')) {
        const parsed = JSON.parse(content);
        if (parsed.videoUrl) setVideoUrl(parsed.videoUrl);
        if (parsed.markers) setMarkers(parsed.markers);
      }
    } catch (e) {
      // Fallback
    }
  }, [content]);

  const saveVideoState = (updatedMarkers = markers, url = videoUrl) => {
    const data = {
      videoUrl: url,
      markers: updatedMarkers
    };
    onChange(JSON.stringify(data, null, 2));
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.log("Playback interrupted", err);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
    }
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (videoRef.current) {
      videoRef.current.muted = nextMute;
    }
  };

  const handleAddMarker = () => {
    if (!newNote.trim()) return;
    const newMarker: VideoMarker = {
      id: `marker-${Date.now()}`,
      timestamp: currentTime,
      note: newNote.trim()
    };
    const updatedMarkers = [...markers, newMarker].sort((a, b) => a.timestamp - b.timestamp);
    setMarkers(updatedMarkers);
    setNewNote('');
    saveVideoState(updatedMarkers);
  };

  const handleDeleteMarker = (id: string) => {
    const updatedMarkers = markers.filter(m => m.id !== id);
    setMarkers(updatedMarkers);
    saveVideoState(updatedMarkers);
  };

  const handleSeekToMarker = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      setCurrentTime(timestamp);
      if (!isPlaying) {
        videoRef.current.play().then(() => setIsPlaying(true));
      }
    }
  };

  // Utility to format seconds into MM:SS
  const formatTime = (timeInSecs: number) => {
    if (isNaN(timeInSecs)) return "00:00";
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full select-none">
      
      {/* LEFT: Video Screen viewport with customized controls */}
      <div className="flex-1 bg-gray-950 rounded-2xl flex flex-col justify-between p-5 border border-gray-900 shadow-2xl relative min-h-[380px]">
        {/* Dynamic header info overlay */}
        <div className="absolute top-4 left-4 flex gap-1.5 z-10 font-mono text-[9px] text-gray-500 leading-none">
          <span className="bg-gray-900 px-2 py-1 rounded border border-gray-800">PREVIEW PORT: MP4 VIDEO</span>
          {isPlaying && <span className="bg-emerald-950/80 border border-emerald-900 px-2 py-1 rounded text-emerald-400 font-bold animate-pulse">● STREAMING ACTIVE</span>}
        </div>

        {/* Video stream rendering panel */}
        <div className="flex-1 flex items-center justify-center relative bg-black rounded-xl overflow-hidden group max-h-[420px] aspect-video w-full mx-auto self-center mt-4">
          <video
            ref={videoRef}
            src={videoUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onClick={handlePlayPause}
            loop={loopEnabled}
            className="w-full h-full object-contain cursor-pointer"
          />

          {/* Large play pause hover overlay */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none group-hover:bg-black/40 transition-colors">
              <div className="p-4 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white transform scale-100 group-hover:scale-110 transition-transform">
                <Play className="h-8 w-8 fill-current" />
              </div>
            </div>
          )}
        </div>

        {/* Customized scrubbing timeline */}
        <div className="flex flex-col gap-2 mt-4 shrink-0">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.05"
              value={currentTime}
              onChange={handleSeek}
              className="flex-grow accent-indigo-500 bg-gray-800 rounded-lg cursor-pointer h-1.5"
            />
            <span className="text-[10px] text-gray-400 font-mono shrink-0 select-none">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Interactive button layout */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePlayPause}
                className="p-2 bg-white hover:bg-gray-100 text-gray-950 rounded-xl cursor-pointer transition-all transform hover:scale-105 shadow"
              >
                {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = 0;
                }}
                className="p-2 bg-gray-900 hover:bg-gray-850 text-gray-400 hover:text-white rounded-xl border border-gray-800 cursor-pointer transition-colors"
                title="Restart playback"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              <div className="h-4 w-px bg-gray-800" />

              {/* Volume sliders */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 accent-gray-200 bg-gray-800 rounded-lg cursor-pointer h-1"
                />
              </div>
            </div>

            {/* Loop state and playback rates */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLoopEnabled(!loopEnabled)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                  loopEnabled 
                    ? 'bg-indigo-950 border-indigo-800 text-indigo-400' 
                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                LOOP
              </button>

              <div className="flex bg-gray-900 p-0.5 rounded-lg border border-gray-800">
                {[1.0, 1.5, 2.0].map(speed => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-2 py-0.5 text-[9px] font-bold font-mono rounded-md transition-colors cursor-pointer ${
                      playbackSpeed === speed 
                        ? 'bg-gray-800 text-white' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Video markers/annotations panel */}
      <div className="w-full xl:w-72 bg-gray-50 border border-gray-150 rounded-2xl p-4 flex flex-col justify-between shrink-0 h-[500px]">
        
        <div className="flex flex-col gap-3 h-full overflow-hidden">
          {/* Navigation Tab Header */}
          <div className="flex bg-gray-200/55 p-1 rounded-xl gap-0.5 border border-gray-200/20 text-center shrink-0 mb-1">
            <button
              type="button"
              onClick={() => setActiveTab('markers')}
              className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-0.5 cursor-pointer ${
                activeTab === 'markers' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-850'
              }`}
            >
              <Bookmark className="h-3 w-3" /> Marks
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai_summary')}
              className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-0.5 cursor-pointer ${
                activeTab === 'ai_summary' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-850'
              }`}
            >
              <VideoIcon className="h-3 w-3 text-indigo-550" /> AI Summary
            </button>
          </div>

          {activeTab === 'markers' ? (
            <div className="flex flex-col gap-2.5 flex-grow overflow-hidden">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1 shrink-0">
                <Bookmark className="h-3.5 w-3.5 text-indigo-550" /> Video Timestamp Marks
              </span>

              {/* Insertion form */}
              <div className="flex gap-1.5 shrink-0">
                <input
                  type="text"
                  placeholder="Add annotation..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddMarker();
                  }}
                  className="flex-grow bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-550 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddMarker}
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer shadow-sm transition-all flex items-center justify-center shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Markers List */}
              <div className="flex-grow overflow-y-auto pr-0.5 [scrollbar-width:thin]">
                {markers.length > 0 ? (
                  markers.map((marker) => (
                    <div
                      key={marker.id}
                      className="p-2 bg-white border border-gray-150 hover:border-indigo-150 rounded-xl flex items-start gap-2.5 transition-all text-left group mb-2"
                    >
                      <button
                        type="button"
                        onClick={() => handleSeekToMarker(marker.timestamp)}
                        className="mt-0.5 p-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-[9px] font-mono font-bold flex items-center gap-0.5 shrink-0 transition-colors"
                        title="Seek to time"
                      >
                        <Clock className="h-2.5 w-2.5" />
                        {formatTime(marker.timestamp)}
                      </button>
                      
                      <div className="flex-grow min-w-0 flex flex-col justify-center">
                        <p className="text-xs text-gray-700 leading-normal break-words">{marker.note}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteMarker(marker.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer shrink-0"
                        title="Delete annotation"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-gray-400 italic text-xs border border-dashed border-gray-200 rounded-xl bg-white/50">
                    No annotations added yet.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 flex-grow overflow-hidden">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1 shrink-0">
                <VideoIcon className="h-3.5 w-3.5 text-indigo-550" /> Gemini Video Summarizer
              </span>
              
              {!summaryText ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-3.5 bg-white border border-dashed border-gray-250 rounded-2xl select-none my-1">
                  <VideoIcon className="h-7 w-7 text-indigo-300 stroke-[1.5] mb-2 animate-bounce animate-pulse" style={{ animationDuration: '3s' }} />
                  <span className="text-xs font-bold text-gray-600 mb-1">Summarize with AI</span>
                  <p className="text-[10px] text-gray-400 leading-normal max-w-[180px] mb-4">
                    Generate an analytical engineering report & timeline snapshots of this stream using Gemini.
                  </p>
                  <button
                    type="button"
                    onClick={handleSummarizeVideo}
                    disabled={isSummarizing}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow flex items-center gap-1.5 transition-all disabled:bg-indigo-300 animate-pulse"
                  >
                    {isSummarizing ? (
                      <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Bookmark className="h-3.5 w-3.5 fill-current text-white/95" />
                    )}
                    <span>{isSummarizing ? 'Analyzing...' : 'Generate Summary'}</span>
                  </button>
                </div>
              ) : (
                <div className="flex-grow flex flex-col overflow-hidden gap-1.5">
                  <div className="flex justify-between items-center shrink-0">
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Analysis Complete</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(summaryText);
                        alert('Summary copied to clipboard!');
                      }}
                      className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer lowercase"
                    >
                      copy
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={summaryText}
                    className="flex-grow w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-mono text-gray-700 leading-relaxed focus:outline-none resize-none select-text [scrollbar-width:thin] overflow-y-auto"
                  />
                  <button
                    type="button"
                    onClick={() => setSummaryText('')}
                    className="w-full text-center text-[10px] text-gray-400 hover:text-indigo-600 font-bold cursor-pointer transition-colors py-0.5 shrink-0"
                  >
                    Re-run analysis
                  </button>
                </div>
              )}
              {summaryError && (
                <p className="text-[10px] text-red-500 font-semibold leading-normal shrink-0">{summaryError}</p>
              )}
            </div>
          )}
        </div>

        {/* Simulated visual spectrum analyzer */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3.5 mt-4 text-[10px] text-gray-400 font-mono select-none">
          <span className="text-gray-500 block mb-2 uppercase text-[9px] font-bold">MOCK AUDIO WAVEFORM</span>
          <div className="flex items-end justify-between h-8 gap-0.5">
            {Array.from({ length: 24 }).map((_, i) => {
              // Simulated pulsing animation bar when playing
              const height = isPlaying 
                ? `${Math.max(10, Math.floor(Math.random() * 100))}%` 
                : '15%';
              return (
                <div
                  key={i}
                  className="flex-grow bg-indigo-550/80 rounded-t-xs transition-all duration-150"
                  style={{ height }}
                />
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => saveVideoState()}
            className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-xl mt-4 flex items-center justify-center gap-1.5 shadow"
          >
            <Check className="h-3.5 w-3.5" /> Commit Annotations
          </button>
        </div>

      </div>
    </div>
  );
}
