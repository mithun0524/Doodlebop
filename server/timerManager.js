const timers = new Map();

function startRoundTimer(roomCode, duration, roomManager, io) {
  // Clear existing timer if any
  clearTimer(roomCode);

  let timeLeft = duration;
  
  const timerMgr = module.exports;
  const interval = setInterval(() => {
    timeLeft--;
    
    io.to(roomCode).emit('timer-update', {
      timeLeft,
      roomCode
    });

    if (timeLeft <= 0) {
      clearInterval(interval);
      timers.delete(roomCode);
      endRound(roomCode, roomManager, io, timerMgr);
    }
  }, 1000);

  timers.set(roomCode, interval);
}

function endRound(roomCode, roomManager, io, timerMgr) {
  try {
    console.log('endRound: Called for room:', roomCode);
    const room = roomManager.getRoom(roomCode);
    if (!room || !room.gameState) {
      console.log('endRound: No room or gameState found');
      return;
    }

    const { currentWord, players } = room.gameState;
    const drawer = players[room.gameState.currentDrawer];

    console.log('endRound: Emitting round-end for round', room.gameState.currentRound);
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
      try {
        console.log('endRound: Calling nextRound after delay');
        const { nextRound } = require('./gameLogic');
        nextRound(roomCode, roomManager, io, timerMgr);
      } catch (error) {
        console.error('Error in nextRound:', error);
      }
    }, 5000);
  } catch (error) {
    console.error('Error in endRound:', error);
  }
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

