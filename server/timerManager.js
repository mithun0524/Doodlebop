const timers = new Map();

function startRoundTimer(roomCode, duration, roomManager, io) {
  // Clear existing timer if any
  clearTimer(roomCode);

  let timeLeft = duration;
  
  const interval = setInterval(() => {
    timeLeft--;
    
    io.to(roomCode).emit('timer-update', {
      timeLeft,
      roomCode
    });

    if (timeLeft <= 0) {
      clearInterval(interval);
      timers.delete(roomCode);
      endRound(roomCode, roomManager, io);
    }
  }, 1000);

  timers.set(roomCode, interval);
}

function endRound(roomCode, roomManager, io) {
  const room = roomManager.getRoom(roomCode);
  if (!room || !room.gameState) return;

  const { currentWord, players } = room.gameState;
  const drawer = players[room.gameState.currentDrawer];

  // Emit round end
  io.to(roomCode).emit('round-end', {
    word: currentWord,
    scores: players.map(p => ({
      username: p.username,
      score: p.score
    })),
    drawer: drawer.username,
    round: room.gameState.currentRound
  });

  // Wait 5 seconds before next round
  setTimeout(() => {
    const { nextRound } = require('./gameLogic');
    nextRound(roomCode, roomManager, io, module.exports);
  }, 5000);
}

function clearTimer(roomCode) {
  const timer = timers.get(roomCode);
  if (timer) {
    clearInterval(timer);
    timers.delete(roomCode);
  }
}

module.exports = {
  startRoundTimer,
  endRound,
  clearTimer
};

