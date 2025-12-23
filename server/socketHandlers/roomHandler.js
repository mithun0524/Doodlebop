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
    
    // Create session token for reconnection
    const sessionToken = roomManager.createSession(room.code, username.trim(), socket.id);
    
    socket.emit('room-created', {
      roomCode: room.code,
      players: room.players,
      sessionToken,
      settings: room.settings
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

    // Check if room is full
    const maxPlayers = room.settings?.maxPlayers || 8;
    if (room.players.length >= maxPlayers) {
      socket.emit('room-error', { message: 'Room is full' });
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
    
    // Create session token for reconnection
    const sessionToken = roomManager.createSession(roomCode, username.trim(), socket.id);
    
    socket.emit('room-joined', {
      roomCode: updatedRoom.code,
      players: updatedRoom.players,
      sessionToken,
      settings: updatedRoom.settings
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
      const updatedRoom = roomManager.removePlayer(socket.id);

      // Notify other players
      socket.to(room.code).emit('player-left', {
        playerId: socket.id,
        players: updatedRoom ? updatedRoom.players : []
      });

      // If a game is in progress and only one player remains, end the game immediately
      if (updatedRoom && updatedRoom.gameState && updatedRoom.players.length === 1) {
        try {
          const { endGame } = require('../gameLogic');
          endGame(updatedRoom.code, roomManager, io);
        } catch (error) {
          console.error('Error ending game after player left:', error);
        }
      }
    }
  });

  socket.on('reconnect-player', (data) => {
    try {
      const { sessionToken } = data;
      
      if (!sessionToken) {
        socket.emit('reconnect-error', { message: 'Invalid session token' });
        return;
      }

      const result = roomManager.updateSessionSocketId(sessionToken, socket.id);
      
      if (!result) {
        socket.emit('reconnect-error', { message: 'Session not found or expired' });
        return;
      }

      const { oldSocketId, session } = result;
      const room = roomManager.getRoom(session.roomCode);
      
      if (!room) {
        socket.emit('reconnect-error', { message: 'Room no longer exists' });
        roomManager.removeSession(sessionToken);
        return;
      }

      // Update player's socket ID in the room
      const player = room.players.find(p => p.username === session.username);
      if (player) {
        player.id = socket.id;
        socket.join(session.roomCode);

        // Send full game state to reconnected player
        socket.emit('reconnect-success', {
          roomCode: session.roomCode,
          players: room.players,
          gameState: room.gameState,
          username: session.username
        });

        // Notify other players
        socket.to(session.roomCode).emit('player-reconnected', {
          username: session.username,
          players: room.players
        });
      } else {
        socket.emit('reconnect-error', { message: 'Player not found in room' });
        roomManager.removeSession(sessionToken);
      }
    } catch (error) {
      console.error('Error in reconnect-player:', error);
      socket.emit('reconnect-error', { message: 'Failed to reconnect' });
    }
  });

  socket.on('update-settings', (data) => {
    try {
      const { settings } = data;
      const room = roomManager.getRoomBySocketId(socket.id);
      
      if (!room) {
        socket.emit('settings-error', { message: 'Room not found' });
        return;
      }

      // Only host can update settings
      if (room.host !== socket.id) {
        socket.emit('settings-error', { message: 'Only the host can change settings' });
        return;
      }

      // Validate settings
      const roundTime = parseInt(settings.roundTime);
      const maxRounds = parseInt(settings.maxRounds);
      const maxPlayers = parseInt(settings.maxPlayers);
      const hintsEnabled = Boolean(settings.hintsEnabled);

      if (isNaN(roundTime) || roundTime < 30 || roundTime > 180) {
        socket.emit('settings-error', { message: 'Round time must be between 30 and 180 seconds' });
        return;
      }

      if (isNaN(maxRounds) || maxRounds < 1 || maxRounds > 10) {
        socket.emit('settings-error', { message: 'Max rounds must be between 1 and 10' });
        return;
      }

      if (isNaN(maxPlayers) || maxPlayers < 2 || maxPlayers > 12) {
        socket.emit('settings-error', { message: 'Max players must be between 2 and 12' });
        return;
      }

      // Update room settings
      room.settings = {
        roundTime,
        maxRounds,
        maxPlayers,
        hintsEnabled
      };

      // Broadcast updated settings to all players
      io.to(room.code).emit('settings-updated', { settings: room.settings });
    } catch (error) {
      console.error('Error in update-settings:', error);
      socket.emit('settings-error', { message: 'Failed to update settings' });
    }
  });
}

module.exports = { handleRoomEvents };



