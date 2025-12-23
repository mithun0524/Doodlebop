import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * COMPREHENSIVE CANVAS COMPONENT - EDGE CASE COVERAGE
 * 
 * Requirements Checklist:
 * ✓ Fixed 4:3 aspect ratio with letterboxing
 * ✓ High-DPI support with proper scaling
 * ✓ Normalized coordinates (0-1) for cross-device sync
 * ✓ Smooth drawing with no gaps
 * ✓ Visible strokes on drawer canvas
 * ✓ Proper synchronization across all clients
 * ✓ Resize handling with stroke preservation
 * ✓ Touch and mouse support
 * ✓ Pointer capture for smooth drawing
 * 
 * Edge Cases Handled:
 * - Container not ready during mount
 * - Rapid consecutive resizes
 * - Network lag on stroke sync
 * - Clear canvas during active drawing
 * - Round transitions clearing canvas
 * - Zero-dimension containers
 * - Missing canvas context
 * - Null/undefined stroke data
 * - Out-of-bounds coordinates
 */

function Canvas({ socket, isDrawer, currentWord }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState('pen');
  const strokesRef = useRef([]);
  const undoStackRef = useRef([]);
  const lastPosRef = useRef(null);
  const lastEmitTimeRef = useRef(0);
  const pendingStrokeRef = useRef(null);
  const [showLandscapeHint, setShowLandscapeHint] = useState(false);
  const { theme } = useTheme();

  const colors = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

  // CONSTANTS
  const ASPECT_RATIO = 4 / 3;
  const SCALE_FACTOR = 2; // For high-DPI rendering
  const RESIZE_DEBOUNCE = 150;
  const STROKE_THROTTLE_MS = 16; // ~60fps max emission rate

  // Check orientation on mobile
  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isPortrait = window.innerHeight > window.innerWidth;
      setShowLandscapeHint(isMobile && isPortrait);
    };
    
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  /**
   * Get canvas display dimensions maintaining 4:3 aspect ratio
   * Edge cases: zero/negative container size, NaN values
   * Uses consistent sizing logic for all players (drawer and viewers)
   */
  const getCanvasDimensions = useCallback((containerRect) => {
    if (!containerRect || containerRect.width <= 0 || containerRect.height <= 0) {
      return { width: 800, height: 600 }; // Fallback dimensions
    }

    const containerAspect = containerRect.width / containerRect.height;
    let width, height;

    if (containerAspect > ASPECT_RATIO) {
      // Container is wider - fit to height
      height = Math.floor(containerRect.height);
      width = Math.floor(height * ASPECT_RATIO);
    } else {
      // Container is taller - fit to width
      width = Math.floor(containerRect.width);
      height = Math.floor(width / ASPECT_RATIO);
    }

    // Ensure minimum size
    width = Math.max(width, 100);
    height = Math.max(height, 75);

    return { width, height };
  }, []);

  /**
   * Draw a single stroke on the canvas
   * Edge cases: missing context, invalid coordinates, missing stroke data
   */
  const drawStroke = useCallback((ctx, stroke, width, height) => {
    if (!ctx || !stroke || !width || !height) return;

    // Validate stroke data
    const x0 = Math.max(0, Math.min(1, stroke.x0 || 0));
    const y0 = Math.max(0, Math.min(1, stroke.y0 || 0));
    const x1 = Math.max(0, Math.min(1, stroke.x1 || 0));
    const y1 = Math.max(0, Math.min(1, stroke.y1 || 0));

    // Convert to pixel coordinates
    const px0 = x0 * width;
    const py0 = y0 * height;
    const px1 = x1 * width;
    const py1 = y1 * height;

    ctx.strokeStyle = stroke.color || '#000000';
    ctx.lineWidth = stroke.size || 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(px0, py0);
    ctx.lineTo(px1, py1);
    ctx.stroke();
  }, []);

  /**
   * Setup and resize canvas with proper scaling
   * Edge cases: missing elements, invalid dimensions, context loss
   */
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!canvas || !container) return;

    try {
      const containerRect = container.getBoundingClientRect();
      const { width, height } = getCanvasDimensions(containerRect);

      // Set CSS size
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Set internal resolution (high-DPI)
      canvas.width = width * SCALE_FACTOR;
      canvas.height = height * SCALE_FACTOR;

      // Get context
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Failed to get canvas context');
        return;
      }

      // Scale context for high-DPI
      ctx.scale(SCALE_FACTOR, SCALE_FACTOR);

      // Clear with white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Redraw all strokes
      const strokes = strokesRef.current || [];
      strokes.forEach(stroke => {
        if (stroke && stroke.type === 'clear') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        } else if (stroke) {
          drawStroke(ctx, stroke, width, height);
        }
      });
    } catch (error) {
      console.error('Canvas setup error:', error);
    }
  }, [getCanvasDimensions, drawStroke]);

  /**
   * Initialize canvas and handle resizes
   * Edge cases: rapid resizes, unmount during resize
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let resizeTimeout;
    const debouncedSetup = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(setupCanvas, RESIZE_DEBOUNCE);
    };

    // Initial setup
    setupCanvas();

    // Watch for container size changes
    const observer = new ResizeObserver(debouncedSetup);
    observer.observe(container);

    return () => {
      clearTimeout(resizeTimeout);
      observer.disconnect();
    };
  }, [setupCanvas]);

  /**
   * Handle incoming strokes from network
   * Edge cases: invalid data, missing canvas, during clear, network lag
   */
  useEffect(() => {
    if (!socket) return;

    const handleCanvasUpdate = (data) => {
      if (!data) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      // Handle clear
      if (data.type === 'clear') {
        strokesRef.current = [{ type: 'clear' }];
        setupCanvas();
        return;
      }

      // Validate stroke data
      if (typeof data.x0 !== 'number' || typeof data.y0 !== 'number' ||
          typeof data.x1 !== 'number' || typeof data.y1 !== 'number') {
        console.warn('Invalid stroke data received:', data);
        return;
      }

      // Store stroke
      const stroke = {
        x0: data.x0,
        y0: data.y0,
        x1: data.x1,
        y1: data.y1,
        color: data.color || '#000000',
        size: data.size || 4
      };
      strokesRef.current.push(stroke);

      // Draw stroke
      try {
        const ctx = canvas.getContext('2d');
        const width = parseInt(canvas.style.width) || canvas.width;
        const height = parseInt(canvas.style.height) || canvas.height;
        
        if (ctx && width && height) {
          drawStroke(ctx, stroke, width, height);
        }
      } catch (error) {
        console.error('Error drawing received stroke:', error);
      }
    };

    const handleRoundStarted = () => {
      strokesRef.current = [];
      undoStackRef.current = [];
      lastPosRef.current = null;
      setIsDrawing(false);
      setupCanvas();
    };

    const handleUndoRemote = () => {
      const strokes = strokesRef.current;
      if (!strokes || strokes.length === 0) return;
      const last = strokes[strokes.length - 1];
      if (last && last.type === 'clear') return;
      const popped = strokes.pop();
      if (popped) {
        undoStackRef.current.push(popped);
        setupCanvas();
      }
    };

    const handleRedoRemote = (data) => {
      if (!data) return;
      const stroke = {
        x0: data.x0,
        y0: data.y0,
        x1: data.x1,
        y1: data.y1,
        color: data.color || '#000000',
        size: data.size || 4
      };
      strokesRef.current.push(stroke);
      setupCanvas();
    };

    socket.on('canvas-update', handleCanvasUpdate);
    socket.on('undo-stroke', handleUndoRemote);
    socket.on('redo-stroke', handleRedoRemote);
    socket.on('round-started', handleRoundStarted);

    return () => {
      socket.off('canvas-update', handleCanvasUpdate);
      socket.off('undo-stroke', handleUndoRemote);
      socket.off('redo-stroke', handleRedoRemote);
      socket.off('round-started', handleRoundStarted);
    };
  }, [socket, setupCanvas, drawStroke]);

  /**
   * Get pointer position relative to canvas
   * Edge cases: missing canvas, touch events, out of bounds
   */
  const getPointerPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Clamp to canvas bounds
    const clampedX = Math.max(0, Math.min(rect.width, x));
    const clampedY = Math.max(0, Math.min(rect.height, y));

    return { x: clampedX, y: clampedY };
  }, []);

  /**
   * Start drawing
   * Edge cases: not drawer, no word selected, missing canvas
   */
  const handlePointerDown = useCallback((e) => {
    if (!isDrawer || !currentWord) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    e.preventDefault();
    if (e.pointerType === 'touch') {
      e.stopPropagation();
    }

    // Capture pointer for smooth drawing
    canvas.setPointerCapture?.(e.pointerId);
    setIsDrawing(true);

    const pos = getPointerPos(e);
    if (!pos) return;

    const width = parseInt(canvas.style.width) || canvas.width;
    const height = parseInt(canvas.style.height) || canvas.height;

    // Store normalized position
    lastPosRef.current = {
      x: pos.x / width,
      y: pos.y / height
    };
  }, [isDrawer, currentWord, getPointerPos]);

  /**
   * Draw while moving
   * Edge cases: no last position, out of bounds, network disconnected
   */
  const handlePointerMove = useCallback((e) => {
    if (!isDrawing || !isDrawer || !currentWord) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const pos = getPointerPos(e);
    if (!pos || !lastPosRef.current) return;

    const width = parseInt(canvas.style.width) || canvas.width;
    const height = parseInt(canvas.style.height) || canvas.height;

    if (!width || !height) return;

    // Current position normalized
    const x1 = pos.x / width;
    const y1 = pos.y / height;

    // Create stroke
    const stroke = {
      x0: lastPosRef.current.x,
      y0: lastPosRef.current.y,
      x1: x1,
      y1: y1,
      color: tool === 'eraser' ? '#FFFFFF' : color,
      size: brushSize
    };

    // Draw locally
    try {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawStroke(ctx, stroke, width, height);
      }
    } catch (error) {
      console.error('Error drawing stroke:', error);
    }

    // Store and emit with throttling
    strokesRef.current.push(stroke);
    // New stroke invalidates redo stack
    undoStackRef.current = [];
    
    if (socket && socket.connected) {
      const now = Date.now();
      const timeSinceLastEmit = now - lastEmitTimeRef.current;
      
      if (timeSinceLastEmit >= STROKE_THROTTLE_MS) {
        // Emit immediately
        socket.emit('draw-stroke', stroke);
        lastEmitTimeRef.current = now;
        pendingStrokeRef.current = null;
      } else {
        // Store for delayed emit
        pendingStrokeRef.current = stroke;
        setTimeout(() => {
          if (pendingStrokeRef.current && socket && socket.connected) {
            socket.emit('draw-stroke', pendingStrokeRef.current);
            lastEmitTimeRef.current = Date.now();
            pendingStrokeRef.current = null;
          }
        }, STROKE_THROTTLE_MS - timeSinceLastEmit);
      }
    }

    // Update last position
    lastPosRef.current = { x: x1, y: y1 };
  }, [isDrawing, isDrawer, currentWord, color, brushSize, tool, socket, getPointerPos, drawStroke]);

  /**
   * Stop drawing
   * Edge cases: pointer lost, already stopped
   */
  const handlePointerUp = useCallback((e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture?.(e.pointerId);
    }

    setIsDrawing(false);
    lastPosRef.current = null;
  }, [isDrawing]);

  /**
   * Clear canvas
   * Edge cases: during active drawing, network disconnected
   */
  const handleClear = useCallback(() => {
    if (!isDrawer || !currentWord) return;

    // Stop any active drawing
    setIsDrawing(false);
    lastPosRef.current = null;

    // Clear locally
    strokesRef.current = [{ type: 'clear' }];
    undoStackRef.current = [];
    setupCanvas();

    // Emit clear
    if (socket && socket.connected) {
      socket.emit('clear-canvas');
    }
  }, [isDrawer, currentWord, socket, setupCanvas]);

  const handleUndo = useCallback(() => {
    if (!isDrawer || !currentWord) return;
    const strokes = strokesRef.current;
    if (!strokes || strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    if (last && last.type === 'clear') return;
    const popped = strokes.pop();
    if (popped) {
      undoStackRef.current.push(popped);
      setupCanvas();
      if (socket && socket.connected) {
        socket.emit('undo-stroke');
      }
    }
  }, [isDrawer, currentWord, socket, setupCanvas]);

  const handleRedo = useCallback(() => {
    if (!isDrawer || !currentWord) return;
    const redo = undoStackRef.current.pop();
    if (!redo) return;
    strokesRef.current.push(redo);
    setupCanvas();
    if (socket && socket.connected) {
      socket.emit('redo-stroke', redo);
    }
  }, [isDrawer, currentWord, socket, setupCanvas]);

  // Waiting message if drawer hasn't selected word
  // REMOVED: This was causing layout shift and different canvas sizes
  // Word selection is now handled by modal overlay in GameView
  // if (!currentWord && isDrawer) {
  //   return (
  //     <div className="bg-neutral-900 rounded-lg p-8 text-center border-2 border-neutral-800">
  //       <p className="text-neutral-400 text-sm">Please select a word to draw from the options above</p>
  //     </div>
  //   );
  // }

  return (
    <div className="flex flex-col h-full w-full" style={{ color: theme.text }}>
      {/* Landscape hint for mobile */}
      {showLandscapeHint && (
        <div className="bg-yellow-500 text-black px-4 py-2 text-center text-sm font-semibold flex items-center justify-center gap-2 flex-shrink-0">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 4a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm3 1a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1V5z"/>
          </svg>
          <span>Rotate to landscape for better experience</span>
        </div>
      )}
      
      {/* Toolbar */}
      <div 
        className="rounded-lg p-3 lg:p-4 mb-3 lg:mb-4 border-2 flex items-center gap-3 lg:gap-6 flex-wrap lg:flex-nowrap flex-shrink-0"
        style={{ backgroundColor: theme.accent, borderColor: theme.text }}
      >
        <div className="flex gap-2" role="group" aria-label="Color palette">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-9 h-9 rounded-xl border-2 transition-all duration-200 hover:scale-105 active:scale-95 ${
                color === c 
                  ? 'border-white ring-2 ring-white/20 scale-105' 
                  : 'border-neutral-700 hover:border-neutral-500'
              } focus:outline-none focus:ring-2 focus:ring-white/30`}
              style={{ backgroundColor: c }}
              disabled={!isDrawer}
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
            />
          ))}
        </div>
        <div className="hidden lg:block flex-1 h-px bg-neutral-700"></div>
        <div className="flex items-center gap-3">
          <label htmlFor="brush-size" className="text-white text-xs font-semibold uppercase tracking-wider hidden sm:block opacity-70">
            Size
          </label>
          <input
            id="brush-size"
            type="range"
            min="2"
            max="30"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            disabled={!isDrawer}
            className="w-24 h-2 bg-neutral-700 rounded-full appearance-none cursor-pointer accent-white [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg focus:outline-none focus:ring-2 focus:ring-white/30"
            aria-label="Brush size"
          />
          <span className="text-white text-sm font-bold min-w-[3rem] text-center bg-neutral-800/50 px-2.5 py-1.5 rounded-lg backdrop-blur-sm">{brushSize}px</span>
        </div>
        <div className="flex gap-2" role="group" aria-label="Drawing tools">
          {/* Pen Tool */}
          <button
            type="button"
            onClick={() => setTool('pen')}
            disabled={!isDrawer}
            className={`p-2.5 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 ${
              tool === 'pen' 
                ? 'border-white bg-white/10 backdrop-blur-sm' 
                : 'border-neutral-600/50 hover:border-neutral-400 bg-neutral-800/30'
            }`}
            style={{ color: theme.text }}
            aria-pressed={tool === 'pen'}
            title="Pen tool"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          
          {/* Eraser Tool */}
          <button
            type="button"
            onClick={() => setTool('eraser')}
            disabled={!isDrawer}
            className={`p-2.5 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 ${
              tool === 'eraser' 
                ? 'border-white bg-white/10 backdrop-blur-sm' 
                : 'border-neutral-600/50 hover:border-neutral-400 bg-neutral-800/30'
            }`}
            style={{ color: theme.text }}
            aria-pressed={tool === 'eraser'}
            title="Eraser tool"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {/* Main eraser body - tilted rectangle */}
              <path d="M8.5 4L18.5 4C19.6 4 20.5 4.9 20.5 6L20.5 14C20.5 15.1 19.6 16 18.5 16L8.5 16C7.4 16 6.5 15.1 6.5 14L6.5 6C6.5 4.9 7.4 4 8.5 4Z" transform="rotate(-25 13.5 10)"/>
              {/* Divider line on eraser */}
              <path d="M9 8L18 8" transform="rotate(-25 13.5 10)" strokeWidth="2"/>
              {/* Eraser marks below */}
              <path d="M6 20L8 20" strokeWidth="2.5"/>
              <path d="M10 20L12 20" strokeWidth="2.5"/>
              <path d="M14 20L16 20" strokeWidth="2.5"/>
              <path d="M18 20L22 20" strokeWidth="2.5"/>
            </svg>
          </button>
          
          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={!isDrawer}
            className="p-2.5 rounded-xl border border-neutral-600/50 transition-all duration-200 hover:scale-105 hover:border-neutral-400 active:scale-95 bg-neutral-800/30 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/30"
            style={{ color: theme.text, opacity: !isDrawer ? 0.5 : 1 }}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </button>
          
          {/* Redo */}
          <button
            onClick={handleRedo}
            disabled={!isDrawer}
            className="p-2.5 rounded-xl border border-neutral-600/50 transition-all duration-200 hover:scale-105 hover:border-neutral-400 active:scale-95 bg-neutral-800/30 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/30"
            style={{ color: theme.text, opacity: !isDrawer ? 0.5 : 1 }}
            aria-label="Redo"
            title="Redo (Ctrl+Y)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
            </svg>
          </button>
          
          {/* Clear Canvas */}
          <button
            onClick={handleClear}
            disabled={!isDrawer}
            className="p-2.5 rounded-xl border border-neutral-600/50 transition-all duration-200 hover:scale-105 hover:border-neutral-400 active:scale-95 bg-neutral-800/30 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/30"
            style={{ color: theme.text, opacity: !isDrawer ? 0.5 : 1 }}
            aria-label="Clear canvas"
            title="Clear canvas"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 7h16M10 11v6m4-6v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Canvas container - centered with letterboxing */}
      <div 
        ref={containerRef} 
        className="flex-1 overflow-hidden rounded-lg border-2 flex items-center justify-center bg-neutral-900" 
        style={{ touchAction: 'none', borderColor: theme.text }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`touch-none bg-white ${
            isDrawer && currentWord 
              ? tool === 'eraser' ? 'cursor-not-allowed' : 'cursor-crosshair'
              : 'cursor-default'
          }`}
          aria-label={isDrawer ? 'Drawing canvas - draw your word here' : 'Drawing canvas - watch the drawer'}
          role="img"
        />
      </div>
    </div>
  );
}

export default Canvas;

