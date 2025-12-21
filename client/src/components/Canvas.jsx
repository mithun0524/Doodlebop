import { useEffect, useRef, useState } from 'react';

function Canvas({ socket, isDrawer, currentWord }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(4);
  const strokesRef = useRef([]);

  const colors = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

  // Handle canvas resizing and high-DPI rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    let resizeTimeout;
    
    const resizeCanvas = () => {
      // Debounce to avoid continuous resizing
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const rect = container.getBoundingClientRect();
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);
        
        // Avoid resize if dimensions haven't changed significantly
        if (Math.abs(canvas.width / (dpr * 2) - width) < 1 && 
            Math.abs(canvas.height / (dpr * 2) - height) < 1) {
          return;
        }
        
        // Set actual resolution (2x for crisp rendering)
        canvas.width = width * dpr * 2;
        canvas.height = height * dpr * 2;
        
        // Set display size
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        
        // Scale for high DPI
        ctx.scale(dpr * 2, dpr * 2);
        
        // Fill with white
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        // Redraw all strokes with normalized coordinates
        strokesRef.current.forEach(stroke => {
          if (stroke.type === 'clear') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          } else {
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            if (stroke.prevX !== undefined && stroke.prevY !== undefined) {
              ctx.beginPath();
              ctx.moveTo(stroke.prevX, stroke.prevY);
              ctx.lineTo(stroke.x, stroke.y);
              ctx.stroke();
            }
          }
        });
      }, 50);
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);

    return () => {
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleCanvasUpdate = (data) => {
      if (data.type === 'clear') {
        strokesRef.current = [];
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      } else {
        strokesRef.current.push(data);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (data.prevX !== undefined && data.prevY !== undefined) {
          ctx.beginPath();
          ctx.moveTo(data.prevX, data.prevY);
          ctx.lineTo(data.x, data.y);
          ctx.stroke();
        }
      }
    };

    const handleRoundStarted = () => {
      // Clear canvas on new round
      strokesRef.current = [];
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };

    socket.on('canvas-update', handleCanvasUpdate);
    socket.on('round-started', handleRoundStarted);

    return () => {
      socket.off('canvas-update', handleCanvasUpdate);
      socket.off('round-started', handleRoundStarted);
    };
  }, [socket]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return { x: 0, y: 0 };
    
    const rect = container.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;
    
    // Store coordinates relative to the display size (not internal canvas resolution)
    return {
      x: x,
      y: y
    };
  };

  const startDrawing = (e) => {
    if (!isDrawer || !currentWord) return;
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCoordinates(e);
    strokesRef.current.push({ ...coords, color, size: brushSize, prevX: coords.x, prevY: coords.y });
  };

  const draw = (e) => {
    if (!isDrawing || !isDrawer || !currentWord) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);
    const lastStroke = strokesRef.current[strokesRef.current.length - 1];
    
    // Scale to internal canvas coordinates for drawing
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const scale = dpr * 2;
    const internalX = (coords.x / rect.width) * canvas.width;
    const internalY = (coords.y / rect.height) * canvas.height;
    const internalPrevX = (lastStroke.x / rect.width) * canvas.width;
    const internalPrevY = (lastStroke.y / rect.height) * canvas.height;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(internalPrevX, internalPrevY);
    ctx.lineTo(internalX, internalY);
    ctx.stroke();

    // Store in display coordinates (will be scaled when drawing)
    const strokeData = { ...coords, color, size: brushSize, prevX: lastStroke.x, prevY: lastStroke.y };
    strokesRef.current.push(strokeData);
    
    socket.emit('draw-stroke', strokeData);
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const handleClear = () => {
    if (!isDrawer || !currentWord) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    strokesRef.current = [];
    socket.emit('clear-canvas');
  };

  // Only show waiting message if user is drawer but hasn't selected word yet
  // Non-drawers should see the canvas (even if empty) to see what's being drawn
  if (!currentWord && isDrawer) {
    return (
      <div className="bg-neutral-900 rounded-lg p-8 text-center border-2 border-neutral-800">
        <p className="text-neutral-400 text-sm">Please select a word to draw from the options above</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Toolbar - Compact and responsive */}
      <div className="bg-neutral-900 rounded-lg p-3 lg:p-4 mb-3 lg:mb-4 border-2 border-neutral-800 flex items-center gap-3 lg:gap-6 flex-wrap lg:flex-nowrap flex-shrink-0">
        <div className="flex gap-2" role="group" aria-label="Color palette">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 lg:w-10 h-8 lg:h-10 rounded-lg border-2 transition-all duration-200 ${color === c ? 'border-white scale-110 ring-2 ring-white/50' : 'border-neutral-600 hover:border-white'} focus:outline-none focus:ring-4 focus:ring-white/50`}
              style={{ backgroundColor: c }}
              disabled={!isDrawer}
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
            />
          ))}
        </div>
        <div className="hidden lg:block flex-1 h-px bg-neutral-700"></div>
        <div className="flex items-center gap-2 lg:gap-4">
          <label htmlFor="brush-size" className="text-white text-xs lg:text-sm font-medium uppercase tracking-wide hidden sm:block">Brush</label>
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
            aria-valuemin="2"
            aria-valuemax="30"
            aria-valuenow={brushSize}
          />
          <span className="text-white text-xs lg:text-sm font-bold w-10 lg:w-12 text-right">{brushSize}px</span>
        </div>
        <button
          onClick={handleClear}
          disabled={!isDrawer}
          className="px-3 lg:px-6 py-2 bg-white hover:bg-neutral-200 disabled:bg-neutral-700 disabled:cursor-not-allowed text-black disabled:text-neutral-500 rounded-lg transition-all duration-200 font-bold text-xs lg:text-sm uppercase tracking-wide focus:outline-none focus:ring-4 focus:ring-white/50"
          aria-label="Clear canvas"
        >
          Clear
        </button>
      </div>
      
      {/* Canvas - Full remaining height */}
      <div ref={containerRef} className="flex-1 overflow-hidden rounded-lg border-2 border-white bg-white" style={{ touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`w-full h-full touch-none ${isDrawer ? 'cursor-crosshair' : 'cursor-default'}`}
          aria-label={isDrawer ? 'Drawing canvas - draw your word here' : 'Drawing canvas - watch the drawer'}
          role="img"
        />
      </div>
    </div>
  );
}

export default Canvas;

