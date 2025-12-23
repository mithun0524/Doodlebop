class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.sessionTokens = new Map(); // Map of sessionToken -> {roomCode, username, playerId}
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  generateSessionToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  createSession(roomCode, username, socketId) {
    const sessionToken = this.generateSessionToken();
    this.sessionTokens.set(sessionToken, {
      roomCode,
      username,
      playerId: socketId,
      createdAt: Date.now()
    });
    return sessionToken;
  }

  getSession(sessionToken) {
    return this.sessionTokens.get(sessionToken);
  }

  updateSessionSocketId(sessionToken, newSocketId) {
    const session = this.sessionTokens.get(sessionToken);
    if (session) {
      const oldSocketId = session.playerId;
      session.playerId = newSocketId;
      return { oldSocketId, session };
    }
    return null;
  }

  removeSession(sessionToken) {
    this.sessionTokens.delete(sessionToken);
  }

  createRoom(playerData) {
    let code = this.generateRoomCode();
    // Ensure unique code
    while (this.rooms.has(code)) {
      code = this.generateRoomCode();
    }

    const room = {
      code,
      players: [playerData],
      host: playerData.id,
      createdAt: Date.now(),
      gameState: null,
      settings: {
        roundTime: 90,
        maxRounds: 3,
        maxPlayers: 8,
        hintsEnabled: true
      }
    };

    this.rooms.set(code, room);
    return room;
  }

  joinRoom(roomCode, playerData) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return null;
    }

    // Check if player already in room
    if (!room.players.find(p => p.id === playerData.id)) {
      room.players.push(playerData);
    }

    return room;
  }

  removePlayer(socketId) {
    // Find and remove session token for this socket
    for (const [token, session] of this.sessionTokens.entries()) {
      if (session.playerId === socketId) {
        this.sessionTokens.delete(token);
        break;
      }
    }
    
    for (const [code, room] of this.rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socketId);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        
        // If room is empty, delete it
        if (room.players.length === 0) {
          this.rooms.delete(code);
        }
        
        return room;
      }
    }
    return null;
  }

  getRoomBySocketId(socketId) {
    for (const room of this.rooms.values()) {
      if (room.players.some(p => p.id === socketId)) {
        return room;
      }
    }
    return null;
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode);
  }
}

module.exports = RoomManager;



