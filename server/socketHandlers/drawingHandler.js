function handleDrawingEvents(socket, io, roomManager) {
  // Rate limiting: track last stroke time per socket
  const lastStrokeTime = new Map();
  const STROKE_RATE_LIMIT_MS = 10; // Minimum 10ms between strokes

  socket.on('draw-stroke', (data) => {
    try {
      const room = roomManager.getRoomBySocketId(socket.id);
      
      if (!room || !room.gameState) return;

      // Only drawer can draw
      const drawer = room.gameState.players[room.gameState.currentDrawer];
      if (drawer.id !== socket.id) return;

      // Rate limiting check
      const now = Date.now();
      const lastTime = lastStrokeTime.get(socket.id) || 0;
      if (now - lastTime < STROKE_RATE_LIMIT_MS) {
        // Silently drop - too fast
        return;
      }
      lastStrokeTime.set(socket.id, now);

      // Validate stroke data
      if (data.type !== 'clear') {
        if (typeof data.x0 !== 'number' || typeof data.y0 !== 'number' ||
            typeof data.x1 !== 'number' || typeof data.y1 !== 'number') {
          console.warn('Invalid stroke data from', socket.id);
          return;
        }
      }

      // Store stroke in game state
      if (!room.gameState.strokes) {
        room.gameState.strokes = [];
      }
      
      if (data.type === 'clear') {
        room.gameState.strokes = [];
      } else {
        room.gameState.strokes.push(data);
      }

      // Broadcast to all except sender
      socket.to(room.code).emit('canvas-update', data);
    } catch (error) {
      console.error('Error in draw-stroke:', error);
    }
  });

  socket.on('clear-canvas', () => {
    try {
      const room = roomManager.getRoomBySocketId(socket.id);
      
      if (!room || !room.gameState) return;

      // Only drawer can clear
      const drawer = room.gameState.players[room.gameState.currentDrawer];
      if (drawer.id !== socket.id) return;

      room.gameState.strokes = [];
      
      socket.to(room.code).emit('canvas-update', { type: 'clear' });
    } catch (error) {
      console.error('Error in clear-canvas:', error);
    }
  });

  socket.on('undo-stroke', () => {
    try {
      const room = roomManager.getRoomBySocketId(socket.id);
      if (!room || !room.gameState) return;
      const drawer = room.gameState.players[room.gameState.currentDrawer];
      if (drawer.id !== socket.id) return;

      if (room.gameState.strokes && room.gameState.strokes.length > 0) {
        const last = room.gameState.strokes[room.gameState.strokes.length - 1];
        if (!last || last.type === 'clear') return;
        room.gameState.strokes.pop();
        socket.to(room.code).emit('undo-stroke');
      }
    } catch (error) {
      console.error('Error in undo-stroke:', error);
    }
  });

  socket.on('redo-stroke', (data) => {
    try {
      const room = roomManager.getRoomBySocketId(socket.id);
      if (!room || !room.gameState) return;
      const drawer = room.gameState.players[room.gameState.currentDrawer];
      if (drawer.id !== socket.id) return;

      if (!room.gameState.strokes) room.gameState.strokes = [];
      if (data && typeof data.x0 === 'number' && typeof data.y0 === 'number' && typeof data.x1 === 'number' && typeof data.y1 === 'number') {
        room.gameState.strokes.push(data);
        socket.to(room.code).emit('redo-stroke', data);
      }
    } catch (error) {
      console.error('Error in redo-stroke:', error);
    }
  });
}

module.exports = { handleDrawingEvents };



