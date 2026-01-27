import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Sun,
  Contrast,
  Palette,
  Paintbrush,
  Type,
  Eraser,
  Download,
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Move,
  Loader2,
  Droplets,
  Square,
  Circle,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ImageEditorProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => Promise<void>;
  fileName?: string;
}

type Tool = 'select' | 'crop' | 'draw' | 'text' | 'shape';
type Shape = 'rectangle' | 'circle' | 'line';

interface HistoryState {
  imageData: ImageData;
  adjustments: Adjustments;
}

interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
}

interface DrawingPath {
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: 'brush' | 'eraser';
}

const FILTERS = [
  { name: 'None', filter: '' },
  { name: 'Grayscale', filter: 'grayscale(100%)' },
  { name: 'Sepia', filter: 'sepia(100%)' },
  { name: 'Vintage', filter: 'sepia(50%) contrast(90%) brightness(90%)' },
  { name: 'Warm', filter: 'sepia(30%) saturate(120%)' },
  { name: 'Cool', filter: 'hue-rotate(180deg) saturate(80%)' },
  { name: 'Dramatic', filter: 'contrast(150%) brightness(90%)' },
  { name: 'Fade', filter: 'contrast(80%) brightness(110%) saturate(80%)' },
];

const COLORS = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ff6600', '#9933ff',
];

export function ImageEditor({
  imageUrl,
  isOpen,
  onClose,
  onSave,
  fileName = 'edited-image',
}: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [activeFilter, setActiveFilter] = useState('');
  const [adjustments, setAdjustments] = useState<Adjustments>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    rotation: 0,
    flipH: false,
    flipV: false,
  });
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  
  // Text state
  const [textItems, setTextItems] = useState<{ text: string; x: number; y: number; size: number; color: string }[]>([]);
  const [newText, setNewText] = useState('');
  const [textSize, setTextSize] = useState(24);
  const [textColor, setTextColor] = useState('#000000');
  
  // Crop state
  const [cropArea, setCropArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  
  // Shape state
  const [activeShape, setActiveShape] = useState<Shape>('rectangle');
  const [shapeColor, setShapeColor] = useState('#000000');
  const [shapeSize, setShapeSize] = useState(2);
  
  // History
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Zoom
  const [zoom, setZoom] = useState(1);

  // Load image
  useEffect(() => {
    if (!isOpen || !imageUrl) return;
    
    setLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImage(img);
      setLoading(false);
      // Reset state
      setAdjustments({
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
        rotation: 0,
        flipH: false,
        flipV: false,
      });
      setActiveFilter('');
      setDrawingPaths([]);
      setTextItems([]);
      setHistory([]);
      setHistoryIndex(-1);
      setZoom(1);
    };
    img.onerror = () => {
      toast.error('Failed to load image');
      setLoading(false);
    };
    img.src = imageUrl;
  }, [imageUrl, isOpen]);

  // Render canvas
  const renderCanvas = useCallback(() => {
    if (!canvasRef.current || !originalImage) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate dimensions based on rotation
    const isRotated = adjustments.rotation % 180 !== 0;
    const width = isRotated ? originalImage.height : originalImage.width;
    const height = isRotated ? originalImage.width : originalImage.height;
    
    canvas.width = width;
    canvas.height = height;
    
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    
    // Apply transformations
    ctx.translate(width / 2, height / 2);
    ctx.rotate((adjustments.rotation * Math.PI) / 180);
    ctx.scale(adjustments.flipH ? -1 : 1, adjustments.flipV ? -1 : 1);
    
    // Apply filters
    const filters = [
      `brightness(${adjustments.brightness}%)`,
      `contrast(${adjustments.contrast}%)`,
      `saturate(${adjustments.saturation}%)`,
      adjustments.blur > 0 ? `blur(${adjustments.blur}px)` : '',
      activeFilter,
    ].filter(Boolean).join(' ');
    
    ctx.filter = filters || 'none';
    
    ctx.drawImage(
      originalImage,
      -originalImage.width / 2,
      -originalImage.height / 2,
      originalImage.width,
      originalImage.height
    );
    
    ctx.restore();
    
    // Draw paths
    ctx.filter = 'none';
    drawingPaths.forEach(path => {
      if (path.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = path.tool === 'eraser' ? '#ffffff' : path.color;
      ctx.lineWidth = path.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });
    
    // Draw text items
    textItems.forEach(item => {
      ctx.font = `${item.size}px sans-serif`;
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, item.x, item.y);
    });
  }, [originalImage, adjustments, activeFilter, drawingPaths, textItems]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Get canvas coordinates from mouse event
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Drawing handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    
    if (activeTool === 'draw') {
      setIsDrawing(true);
      setCurrentPath({
        points: [coords],
        color: brushColor,
        size: brushSize,
        tool: e.shiftKey ? 'eraser' : 'brush',
      });
    } else if (activeTool === 'crop') {
      setIsCropping(true);
      setCropStart(coords);
      setCropArea({ x: coords.x, y: coords.y, width: 0, height: 0 });
    } else if (activeTool === 'text' && newText.trim()) {
      setTextItems(prev => [...prev, {
        text: newText,
        x: coords.x,
        y: coords.y,
        size: textSize,
        color: textColor,
      }]);
      setNewText('');
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    
    if (isDrawing && currentPath) {
      setCurrentPath(prev => prev ? {
        ...prev,
        points: [...prev.points, coords],
      } : null);
      
      // Draw current path in real-time
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && currentPath.points.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = currentPath.tool === 'eraser' ? '#ffffff' : currentPath.color;
        ctx.lineWidth = currentPath.size;
        ctx.lineCap = 'round';
        const lastPoint = currentPath.points[currentPath.points.length - 1];
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      }
    } else if (isCropping && cropStart) {
      setCropArea({
        x: Math.min(cropStart.x, coords.x),
        y: Math.min(cropStart.y, coords.y),
        width: Math.abs(coords.x - cropStart.x),
        height: Math.abs(coords.y - cropStart.y),
      });
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && currentPath) {
      setDrawingPaths(prev => [...prev, currentPath]);
      setCurrentPath(null);
    }
    setIsDrawing(false);
    setIsCropping(false);
  };

  // Apply crop
  const applyCrop = () => {
    if (!cropArea || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const imageData = ctx.getImageData(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
    
    canvas.width = cropArea.width;
    canvas.height = cropArea.height;
    ctx.putImageData(imageData, 0, 0);
    
    setCropArea(null);
    toast.success('Crop applied');
  };

  // Rotation helpers
  const rotate = (degrees: number) => {
    setAdjustments(prev => ({
      ...prev,
      rotation: (prev.rotation + degrees + 360) % 360,
    }));
  };

  const flipHorizontal = () => {
    setAdjustments(prev => ({ ...prev, flipH: !prev.flipH }));
  };

  const flipVertical = () => {
    setAdjustments(prev => ({ ...prev, flipV: !prev.flipV }));
  };

  // Save image
  const handleSave = async () => {
    if (!canvasRef.current) return;
    
    setSaving(true);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      await onSave(dataUrl);
      toast.success('Image saved');
      onClose();
    } catch (error) {
      toast.error('Failed to save image');
    } finally {
      setSaving(false);
    }
  };

  // Download image
  const handleDownload = () => {
    if (!canvasRef.current) return;
    
    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    toast.success('Image downloaded');
  };

  // Reset adjustments
  const handleReset = () => {
    setAdjustments({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      rotation: 0,
      flipH: false,
      flipV: false,
    });
    setActiveFilter('');
    setDrawingPaths([]);
    setTextItems([]);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          handleSave();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
            <h2 className="font-semibold">Image Editor</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button variant="gradient" size="sm" onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Toolbar */}
          <div className="w-16 bg-card border-r border-border flex flex-col items-center py-4 gap-2">
            <Button
              variant={activeTool === 'select' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setActiveTool('select')}
              title="Select"
            >
              <Move className="w-5 h-5" />
            </Button>
            <Button
              variant={activeTool === 'crop' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setActiveTool('crop')}
              title="Crop"
            >
              <Crop className="w-5 h-5" />
            </Button>
            <Button
              variant={activeTool === 'draw' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setActiveTool('draw')}
              title="Draw"
            >
              <Paintbrush className="w-5 h-5" />
            </Button>
            <Button
              variant={activeTool === 'text' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setActiveTool('text')}
              title="Text"
            >
              <Type className="w-5 h-5" />
            </Button>
            
            <div className="h-px w-8 bg-border my-2" />
            
            <Button variant="ghost" size="icon" onClick={() => rotate(-90)} title="Rotate Left">
              <RotateCcw className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => rotate(90)} title="Rotate Right">
              <RotateCw className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={flipHorizontal} title="Flip Horizontal">
              <FlipHorizontal className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={flipVertical} title="Flip Vertical">
              <FlipVertical className="w-5 h-5" />
            </Button>
            
            <div className="h-px w-8 bg-border my-2" />
            
            <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(z + 0.25, 3))} title="Zoom In">
              <ZoomIn className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))} title="Zoom Out">
              <ZoomOut className="w-5 h-5" />
            </Button>
          </div>

          {/* Main Canvas Area */}
          <div 
            ref={containerRef}
            className="flex-1 bg-muted/50 flex items-center justify-center overflow-auto p-8"
          >
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading image...</p>
              </div>
            ) : (
              <div className="relative" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-full shadow-xl rounded-lg cursor-crosshair"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
                
                {/* Crop overlay */}
                {cropArea && cropArea.width > 0 && cropArea.height > 0 && (
                  <div
                    className="absolute border-2 border-dashed border-primary bg-primary/10 pointer-events-none"
                    style={{
                      left: cropArea.x / (canvasRef.current?.width || 1) * 100 + '%',
                      top: cropArea.y / (canvasRef.current?.height || 1) * 100 + '%',
                      width: cropArea.width / (canvasRef.current?.width || 1) * 100 + '%',
                      height: cropArea.height / (canvasRef.current?.height || 1) * 100 + '%',
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="w-72 bg-card border-l border-border overflow-y-auto">
            <Tabs defaultValue="adjust" className="w-full">
              <TabsList className="w-full grid grid-cols-3 p-1 m-2">
                <TabsTrigger value="adjust">Adjust</TabsTrigger>
                <TabsTrigger value="filters">Filters</TabsTrigger>
                <TabsTrigger value="tools">Tools</TabsTrigger>
              </TabsList>
              
              <TabsContent value="adjust" className="p-4 space-y-6">
                {/* Brightness */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Sun className="w-4 h-4" />
                      Brightness
                    </Label>
                    <span className="text-sm text-muted-foreground">{adjustments.brightness}%</span>
                  </div>
                  <Slider
                    value={[adjustments.brightness]}
                    onValueChange={([value]) => setAdjustments(prev => ({ ...prev, brightness: value }))}
                    min={0}
                    max={200}
                    step={1}
                  />
                </div>
                
                {/* Contrast */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Contrast className="w-4 h-4" />
                      Contrast
                    </Label>
                    <span className="text-sm text-muted-foreground">{adjustments.contrast}%</span>
                  </div>
                  <Slider
                    value={[adjustments.contrast]}
                    onValueChange={([value]) => setAdjustments(prev => ({ ...prev, contrast: value }))}
                    min={0}
                    max={200}
                    step={1}
                  />
                </div>
                
                {/* Saturation */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Saturation
                    </Label>
                    <span className="text-sm text-muted-foreground">{adjustments.saturation}%</span>
                  </div>
                  <Slider
                    value={[adjustments.saturation]}
                    onValueChange={([value]) => setAdjustments(prev => ({ ...prev, saturation: value }))}
                    min={0}
                    max={200}
                    step={1}
                  />
                </div>
                
                {/* Blur */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Droplets className="w-4 h-4" />
                      Blur
                    </Label>
                    <span className="text-sm text-muted-foreground">{adjustments.blur}px</span>
                  </div>
                  <Slider
                    value={[adjustments.blur]}
                    onValueChange={([value]) => setAdjustments(prev => ({ ...prev, blur: value }))}
                    min={0}
                    max={20}
                    step={0.5}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="filters" className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  {FILTERS.map(filter => (
                    <button
                      key={filter.name}
                      onClick={() => setActiveFilter(filter.filter)}
                      className={cn(
                        'p-2 rounded-lg border text-sm transition-colors',
                        activeFilter === filter.filter
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-muted'
                      )}
                    >
                      {filter.name}
                    </button>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="tools" className="p-4 space-y-6">
                {/* Crop Controls */}
                {activeTool === 'crop' && cropArea && cropArea.width > 0 && (
                  <div className="space-y-2">
                    <Label>Crop</Label>
                    <Button variant="gradient" size="sm" onClick={applyCrop} className="w-full">
                      Apply Crop
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCropArea(null)} className="w-full">
                      Cancel
                    </Button>
                  </div>
                )}
                
                {/* Drawing Controls */}
                {activeTool === 'draw' && (
                  <div className="space-y-4">
                    <Label>Brush Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => setBrushColor(color)}
                          className={cn(
                            'w-8 h-8 rounded-full border-2 transition-transform',
                            brushColor === color ? 'border-primary scale-110' : 'border-border'
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Brush Size</Label>
                        <span className="text-sm text-muted-foreground">{brushSize}px</span>
                      </div>
                      <Slider
                        value={[brushSize]}
                        onValueChange={([value]) => setBrushSize(value)}
                        min={1}
                        max={50}
                        step={1}
                      />
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      Hold Shift while drawing to use eraser
                    </p>
                  </div>
                )}
                
                {/* Text Controls */}
                {activeTool === 'text' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Text</Label>
                      <Input
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        placeholder="Enter text..."
                      />
                    </div>
                    
                    <Label>Text Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => setTextColor(color)}
                          className={cn(
                            'w-8 h-8 rounded-full border-2 transition-transform',
                            textColor === color ? 'border-primary scale-110' : 'border-border'
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Font Size</Label>
                        <span className="text-sm text-muted-foreground">{textSize}px</span>
                      </div>
                      <Slider
                        value={[textSize]}
                        onValueChange={([value]) => setTextSize(value)}
                        min={12}
                        max={120}
                        step={1}
                      />
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      Click on the canvas to place text
                    </p>
                  </div>
                )}
                
                {activeTool === 'select' && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    Select a tool from the left toolbar to start editing
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
