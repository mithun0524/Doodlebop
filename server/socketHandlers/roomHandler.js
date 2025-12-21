function handleRoomEvents(socket, io, roomManager) {
  socket.on('create-room', (data) => {
    const { username } = data;
    
    if (!username || username.trim().length < 3 || username.trim().length > 20) {
      socket.emit('room-error', { message: 'Username must be 3-20 characters' });
      return;
    }

    const playerData = {
      id: socket.id,
      username: username.trim(),
      score: 0,
      hasGuessed: false
    };

    const room = roomManager.createRoom(playerData);
    socket.join(room.code);
    
    socket.emit('room-created', {
      roomCode: room.code,
      players: room.players
    });
  });

  socket.on('join-room', (data) => {
    const { roomCode, username } = data;

    if (!username || username.trim().length < 3 || username.trim().length > 20) {
      socket.emit('room-error', { message: 'Username must be 3-20 characters' });
      return;
    }

    if (!roomCode || !/^[A-Z]{6}$/.test(roomCode)) {
      socket.emit('room-error', { message: 'Invalid room code' });
      return;
    }

    const room = roomManager.getRoom(roomCode);
    
    if (!room) {
      socket.emit('room-error', { message: 'Room not found' });
      return;
    }

    // Check if game is already in progress
    if (room.gameState) {
      socket.emit('room-error', { message: 'Game already in progress' });
      return;
    }

    const playerData = {
      id: socket.id,
      username: username.trim(),
      score: 0,
      hasGuessed: false
    };

    const updatedRoom = roomManager.joinRoom(roomCode, playerData);
    socket.join(roomCode);
    
    socket.emit('room-joined', {
      roomCode: updatedRoom.code,
      players: updatedRoom.players
    });

    socket.to(roomCode).emit('player-joined', {
      player: playerData,
      players: updatedRoom.players
    });
  });

  socket.on('leave-room', () => {
    const room = roomManager.getRoomBySocketId(socket.id);
    if (room) {
      socket.leave(room.code);
      roomManager.removePlayer(socket.id);
      socket.to(room.code).emit('player-left', {
        playerId: socket.id,
        players: room.players
      });
    }
  });
}

module.exports = { handleRoomEvents };



