function handleDrawingEvents(socket, io, roomManager) {
  socket.on('draw-stroke', (data) => {
    const room = roomManager.getRoomBySocketId(socket.id);
    
    if (!room || !room.gameState) return;

    // Only drawer can draw
    const drawer = room.gameState.players[room.gameState.currentDrawer];
    if (drawer.id !== socket.id) return;

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
  });

  socket.on('clear-canvas', () => {
    const room = roomManager.getRoomBySocketId(socket.id);
    
    if (!room || !room.gameState) return;

    // Only drawer can clear
    const drawer = room.gameState.players[room.gameState.currentDrawer];
    if (drawer.id !== socket.id) return;

    room.gameState.strokes = [];
    
    socket.to(room.code).emit('canvas-update', { type: 'clear' });
  });
}

module.exports = { handleDrawingEvents };



