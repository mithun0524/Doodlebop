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
  const strokesRef = useRef([]);
  const lastPosRef = useRef(null);
  const [showLandscapeHint, setShowLandscapeHint] = useState(false);
  const { theme } = useTheme();

  const colors = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

  // CONSTANTS
  const ASPECT_RATIO = 4 / 3;
  const SCALE_FACTOR = 2; // For high-DPI rendering
  const RESIZE_DEBOUNCE = 150;

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
      lastPosRef.current = null;
      setIsDrawing(false);
      setupCanvas();
    };

    socket.on('canvas-update', handleCanvasUpdate);
    socket.on('round-started', handleRoundStarted);

    return () => {
      socket.off('canvas-update', handleCanvasUpdate);
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
      color: color,
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

    // Store and emit
    strokesRef.current.push(stroke);
    
    if (socket && socket.connected) {
      socket.emit('draw-stroke', stroke);
    }

    // Update last position
    lastPosRef.current = { x: x1, y: y1 };
  }, [isDrawing, isDrawer, currentWord, color, brushSize, socket, getPointerPos, drawStroke]);

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
    setupCanvas();

    // Emit clear
    if (socket && socket.connected) {
      socket.emit('clear-canvas');
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
              className={`w-8 lg:w-10 h-8 lg:h-10 rounded-lg border-2 transition-all duration-200 ${
                color === c ? 'border-white scale-110 ring-2 ring-white/50' : 'border-neutral-600 hover:border-white'
              } focus:outline-none focus:ring-4 focus:ring-white/50`}
              style={{ backgroundColor: c }}
              disabled={!isDrawer}
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
            />
          ))}
        </div>
        <div className="hidden lg:block flex-1 h-px bg-neutral-700"></div>
        <div className="flex items-center gap-2 lg:gap-4">
          <label htmlFor="brush-size" className="text-white text-xs lg:text-sm font-medium uppercase tracking-wide hidden sm:block">
            Brush
          </label>
          <input
            id="brush-size"
            type="range"
            min="2"
            max="30"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            disabled={!isDrawer}
            className="w-20 lg:w-32 accent-white focus:outline-none focus:ring-4 focus:ring-white/50 cursor-pointer"
            aria-label="Brush size"
          />
          <span className="text-white text-xs lg:text-sm font-bold w-10 lg:w-12 text-right">{brushSize}px</span>
        </div>
        <button
          onClick={handleClear}
          disabled={!isDrawer}
          className="px-3 lg:px-6 py-2 rounded-lg transition-all duration-200 font-bold text-xs lg:text-sm uppercase tracking-wide focus:outline-none focus:ring-4 focus:ring-white/50"
          style={{ backgroundColor: theme.text, color: theme.bg, opacity: !isDrawer ? 0.5 : 1 }}
          aria-label="Clear canvas"
        >
          Clear
        </button>
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
          className={`touch-none bg-white ${isDrawer && currentWord ? 'cursor-crosshair' : 'cursor-default'}`}
          aria-label={isDrawer ? 'Drawing canvas - draw your word here' : 'Drawing canvas - watch the drawer'}
          role="img"
        />
      </div>
    </div>
  );
}

export default Canvas;

