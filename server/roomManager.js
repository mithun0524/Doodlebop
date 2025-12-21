class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
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
      createdAt: Date.now(),
      gameState: null
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



