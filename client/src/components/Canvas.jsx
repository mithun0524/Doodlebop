import { useEffect, useRef, useState } from 'react';

function Canvas({ socket, isDrawer, currentWord }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const strokesRef = useRef([]);

  const colors = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    // Larger canvas for better drawing experience
    canvas.width = 1200;
    canvas.height = 800;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw all strokes
    strokesRef.current.forEach(stroke => {
      if (stroke.type === 'clear') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
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
    
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastStroke.x, lastStroke.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

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
      <div className="bg-gray-700 rounded-lg p-8 text-center">
        <p className="text-gray-300 text-lg">Please select a word to draw from the options above</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="bg-gray-700 rounded-lg p-4 mb-4 w-full">
        <div className="flex flex-wrap gap-4 items-center justify-center">
          <div className="flex gap-2">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded border-2 ${
                  color === c ? 'border-white' : 'border-gray-500'
                }`}
                style={{ backgroundColor: c }}
                disabled={!isDrawer}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-gray-300 text-sm">Size:</label>
            <input
              type="range"
              min="2"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              disabled={!isDrawer}
              className="w-24"
            />
            <span className="text-gray-300 text-sm w-8">{brushSize}</span>
          </div>
          <button
            onClick={handleClear}
            disabled={!isDrawer}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="border-2 border-gray-600 rounded-lg cursor-crosshair bg-white touch-none w-full"
        style={{ width: '100%', maxWidth: '1200px', height: 'auto', aspectRatio: '1200/800' }}
      />
    </div>
  );
}

export default Canvas;

