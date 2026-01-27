import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Scissors,
  Clock,
  SkipBack,
  SkipForward,
  Download,
  Save,
  Loader2,
  ZoomIn,
  ZoomOut,
  Music,
  Type,
  Layers,
  FastForward,
  Rewind,
  Maximize,
  Minimize,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VideoEditorProps {
  videoUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updates: VideoEditUpdates) => Promise<void>;
  fileName?: string;
}

interface VideoEditUpdates {
  trimStart?: number;
  trimEnd?: number;
  speed?: number;
  volume?: number;
}

interface TimelineClip {
  id: string;
  start: number;
  end: number;
  type: 'video' | 'audio' | 'text';
  label?: string;
}

export function VideoEditor({
  videoUrl,
  isOpen,
  onClose,
  onSave,
  fileName = 'edited-video',
}: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(100);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // Trim points
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isDraggingTrim, setIsDraggingTrim] = useState<'start' | 'end' | null>(null);
  
  // Timeline zoom
  const [timelineZoom, setTimelineZoom] = useState(1);
  
  // Clips
  const [clips, setClips] = useState<TimelineClip[]>([]);
  
  // Text overlay
  const [textOverlays, setTextOverlays] = useState<{ text: string; startTime: number; endTime: number; position: string }[]>([]);
  const [newOverlayText, setNewOverlayText] = useState('');

  // Load video
  useEffect(() => {
    if (!isOpen || !videoUrl) return;
    
    setLoading(true);
    const video = videoRef.current;
    if (!video) return;
    
    video.src = videoUrl;
    video.load();
  }, [videoUrl, isOpen]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setTrimEnd(video.duration);
      setLoading(false);
      
      // Initialize main video clip
      setClips([{
        id: 'main',
        start: 0,
        end: video.duration,
        type: 'video',
        label: 'Main Video',
      }]);
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      // Loop within trim points
      if (video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
        if (!video.paused) {
          video.pause();
          setIsPlaying(false);
        }
      }
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [trimStart, trimEnd]);

  // Play/Pause
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.currentTime < trimStart) {
      video.currentTime = trimStart;
    }
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Seek
  const seek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    const clampedTime = Math.max(trimStart, Math.min(trimEnd, time));
    video.currentTime = clampedTime;
    setCurrentTime(clampedTime);
  };

  // Skip forward/backward
  const skip = (seconds: number) => {
    seek(currentTime + seconds);
  };

  // Volume
  const handleVolumeChange = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    setVolume(value);
    video.volume = value / 100;
    setIsMuted(value === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isMuted) {
      video.volume = volume / 100;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  // Playback speed
  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    setPlaybackSpeed(speed);
    video.playbackRate = speed;
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Timeline click handler
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !duration) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;
    
    seek(time);
  };

  // Trim handlers
  const handleTrimDrag = (e: React.MouseEvent, type: 'start' | 'end') => {
    e.stopPropagation();
    setIsDraggingTrim(type);
  };

  useEffect(() => {
    if (!isDraggingTrim) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current || !duration) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = x / rect.width;
      const time = percentage * duration;
      
      if (isDraggingTrim === 'start') {
        setTrimStart(Math.min(time, trimEnd - 0.5));
      } else {
        setTrimEnd(Math.max(time, trimStart + 0.5));
      }
    };
    
    const handleMouseUp = () => {
      setIsDraggingTrim(null);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingTrim, duration, trimStart, trimEnd]);

  // Add text overlay
  const addTextOverlay = () => {
    if (!newOverlayText.trim()) return;
    
    setTextOverlays(prev => [...prev, {
      text: newOverlayText,
      startTime: currentTime,
      endTime: Math.min(currentTime + 5, duration),
      position: 'center',
    }]);
    setNewOverlayText('');
    toast.success('Text overlay added');
  };

  // Split at current time
  const splitAtPlayhead = () => {
    if (currentTime <= trimStart || currentTime >= trimEnd) {
      toast.error('Cannot split at this position');
      return;
    }
    
    const mainClip = clips.find(c => c.id === 'main');
    if (!mainClip) return;
    
    setClips([
      { id: 'clip1', start: trimStart, end: currentTime, type: 'video', label: 'Clip 1' },
      { id: 'clip2', start: currentTime, end: trimEnd, type: 'video', label: 'Clip 2' },
    ]);
    
    toast.success('Video split at playhead');
  };

  // Save
  const handleSave = async () => {
    if (!onSave) {
      toast.error('Save functionality not available');
      return;
    }
    
    setSaving(true);
    try {
      await onSave({
        trimStart,
        trimEnd,
        speed: playbackSpeed,
        volume: volume / 100,
      });
      toast.success('Changes saved');
      onClose();
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === 'ArrowLeft') skip(-5);
      if (e.key === 'ArrowRight') skip(5);
      if (e.key === 'm') toggleMute();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isPlaying, currentTime]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const trimStartPercent = duration > 0 ? (trimStart / duration) * 100 : 0;
  const trimEndPercent = duration > 0 ? (trimEnd / duration) * 100 : 100;
  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
            <h2 className="font-semibold">Video Editor</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(videoUrl, '_blank')} className="gap-2">
              <Download className="w-4 h-4" />
              Download Original
            </Button>
            {onSave && (
              <Button variant="gradient" size="sm" onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Video Area */}
          <div className="flex-1 flex flex-col">
            {/* Video Preview */}
            <div className="flex-1 bg-black flex items-center justify-center relative">
              {loading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading video...</p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className="max-w-full max-h-full"
                    onClick={togglePlay}
                  />
                  
                  {/* Play overlay */}
                  {!isPlaying && (
                    <button
                      onClick={togglePlay}
                      className="absolute inset-0 flex items-center justify-center bg-black/20"
                    >
                      <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Play className="w-10 h-10 text-white ml-1" />
                      </div>
                    </button>
                  )}
                  
                  {/* Text overlays preview */}
                  {textOverlays
                    .filter(o => currentTime >= o.startTime && currentTime <= o.endTime)
                    .map((overlay, i) => (
                      <div
                        key={i}
                        className="absolute text-white text-2xl font-bold drop-shadow-lg"
                        style={{
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        {overlay.text}
                      </div>
                    ))}
                </>
              )}
            </div>

            {/* Controls */}
            <div className="bg-card border-t border-border p-4 space-y-4">
              {/* Playback controls */}
              <div className="flex items-center justify-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => skip(-10)}>
                  <Rewind className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => skip(-5)}>
                  <SkipBack className="w-5 h-5" />
                </Button>
                <Button variant="gradient" size="icon" onClick={togglePlay} className="w-12 h-12">
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => skip(5)}>
                  <SkipForward className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => skip(10)}>
                  <FastForward className="w-5 h-5" />
                </Button>
              </div>
              
              {/* Time display */}
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono">{formatTime(currentTime)}</span>
                <span className="text-muted-foreground">
                  Trimmed: {formatTime(trimEnd - trimStart)}
                </span>
                <span className="font-mono">{formatTime(duration)}</span>
              </div>

              {/* Timeline */}
              <div className="relative">
                {/* Zoom controls */}
                <div className="absolute -top-8 right-0 flex items-center gap-2">
                  <Button variant="ghost" size="icon-sm" onClick={() => setTimelineZoom(z => Math.max(z - 0.5, 1))}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">{timelineZoom}x</span>
                  <Button variant="ghost" size="icon-sm" onClick={() => setTimelineZoom(z => Math.min(z + 0.5, 4))}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
                
                <div
                  ref={timelineRef}
                  className="relative h-16 bg-muted rounded-lg cursor-pointer overflow-hidden"
                  style={{ width: `${100 * timelineZoom}%` }}
                  onClick={handleTimelineClick}
                >
                  {/* Waveform placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-end gap-px h-full px-1">
                      {Array.from({ length: 100 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-primary/30 rounded-t"
                          style={{ height: `${20 + Math.random() * 60}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Trim overlay - before */}
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-foreground/60"
                    style={{ width: `${trimStartPercent}%` }}
                  />
                  
                  {/* Trim overlay - after */}
                  <div
                    className="absolute top-0 bottom-0 right-0 bg-foreground/60"
                    style={{ width: `${100 - trimEndPercent}%` }}
                  />
                  
                  {/* Trim handles */}
                  <div
                    className="absolute top-0 bottom-0 w-3 bg-primary cursor-ew-resize flex items-center justify-center"
                    style={{ left: `${trimStartPercent}%`, transform: 'translateX(-50%)' }}
                    onMouseDown={(e) => handleTrimDrag(e, 'start')}
                  >
                    <div className="w-0.5 h-8 bg-white rounded" />
                  </div>
                  <div
                    className="absolute top-0 bottom-0 w-3 bg-primary cursor-ew-resize flex items-center justify-center"
                    style={{ left: `${trimEndPercent}%`, transform: 'translateX(-50%)' }}
                    onMouseDown={(e) => handleTrimDrag(e, 'end')}
                  >
                    <div className="w-0.5 h-8 bg-white rounded" />
                  </div>
                  
                  {/* Playhead */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
                    style={{ left: `${playheadPercent}%` }}
                  >
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
                  </div>
                </div>
              </div>
              
              {/* Clips */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {clips.map(clip => (
                  <div
                    key={clip.id}
                    className="flex-shrink-0 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-sm"
                  >
                    <span className="font-medium">{clip.label}</span>
                    <span className="text-muted-foreground ml-2">
                      {formatTime(clip.end - clip.start)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="w-72 bg-card border-l border-border overflow-y-auto">
            <Tabs defaultValue="trim" className="w-full">
              <TabsList className="w-full grid grid-cols-3 p-1 m-2">
                <TabsTrigger value="trim">Trim</TabsTrigger>
                <TabsTrigger value="speed">Speed</TabsTrigger>
                <TabsTrigger value="audio">Audio</TabsTrigger>
              </TabsList>
              
              <TabsContent value="trim" className="p-4 space-y-6">
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <Scissors className="w-4 h-4" />
                    Trim Points
                  </Label>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Start</span>
                      <span className="font-mono text-sm">{formatTime(trimStart)}</span>
                    </div>
                    <Slider
                      value={[trimStart]}
                      onValueChange={([value]) => setTrimStart(Math.min(value, trimEnd - 0.5))}
                      min={0}
                      max={duration}
                      step={0.1}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">End</span>
                      <span className="font-mono text-sm">{formatTime(trimEnd)}</span>
                    </div>
                    <Slider
                      value={[trimEnd]}
                      onValueChange={([value]) => setTrimEnd(Math.max(value, trimStart + 0.5))}
                      min={0}
                      max={duration}
                      step={0.1}
                    />
                  </div>
                  
                  <Button variant="outline" size="sm" onClick={splitAtPlayhead} className="w-full gap-2">
                    <Scissors className="w-4 h-4" />
                    Split at Playhead
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTrimStart(0);
                      setTrimEnd(duration);
                    }}
                    className="w-full"
                  >
                    Reset Trim
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="speed" className="p-4 space-y-6">
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Playback Speed
                  </Label>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(speed => (
                      <Button
                        key={speed}
                        variant={playbackSpeed === speed ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => handleSpeedChange(speed)}
                      >
                        {speed}x
                      </Button>
                    ))}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Custom Speed</span>
                      <span className="font-mono text-sm">{playbackSpeed}x</span>
                    </div>
                    <Slider
                      value={[playbackSpeed]}
                      onValueChange={([value]) => handleSpeedChange(value)}
                      min={0.25}
                      max={4}
                      step={0.25}
                    />
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    New duration: {formatTime((trimEnd - trimStart) / playbackSpeed)}
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="audio" className="p-4 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4" />
                      Volume
                    </Label>
                    <Button variant="ghost" size="icon-sm" onClick={toggleMute}>
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    onValueChange={([value]) => handleVolumeChange(value)}
                    min={0}
                    max={100}
                    step={1}
                  />
                  <span className="text-sm text-muted-foreground">{volume}%</span>
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    Audio Track
                  </Label>
                  <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground text-center">
                    Original audio track
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            {/* Text Overlay Section */}
            <div className="p-4 border-t border-border space-y-4">
              <Label className="flex items-center gap-2">
                <Type className="w-4 h-4" />
                Text Overlay
              </Label>
              
              <div className="space-y-2">
                <Input
                  value={newOverlayText}
                  onChange={(e) => setNewOverlayText(e.target.value)}
                  placeholder="Enter text..."
                />
                <Button variant="outline" size="sm" onClick={addTextOverlay} className="w-full">
                  Add at Current Time
                </Button>
              </div>
              
              {textOverlays.length > 0 && (
                <div className="space-y-2">
                  {textOverlays.map((overlay, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                      <span className="truncate">{overlay.text}</span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setTextOverlays(prev => prev.filter((_, idx) => idx !== i))}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
