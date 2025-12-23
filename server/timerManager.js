const scoringEngine = require('./scoringEngine');
const timers = new Map();

function startRoundTimer(roomCode, duration, roomManager, io) {
  try {
    // Clear existing timer if any
    clearTimer(roomCode);

    // Validate duration
    if (typeof duration !== 'number' || duration <= 0) {
      console.error('Invalid timer duration:', duration);
      duration = 90; // Default to 90 seconds
    }

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
  } catch (error) {
    console.error('Error starting round timer:', error);
  }
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
    
    // Validate players array
    if (!Array.isArray(players) || players.length === 0) {
      console.error('Invalid players array');
      return;
    }

    const drawer = players[room.gameState.currentDrawer];
    if (!drawer) {
      console.error('Drawer not found at index:', room.gameState.currentDrawer);
      return;
    }

    // Process round-end scoring (drawer completion bonus)
    const roundEndResult = scoringEngine.processRoundEnd(room);
    
    console.log('endRound: Round end scoring result:', {
      drawerBonus: roundEndResult.drawerBonus,
      guessersCount: roundEndResult.guessersCount,
      totalPlayers: roundEndResult.totalPlayers
    });

    // Validate all player scores
    scoringEngine.validatePlayerScores(players);

    console.log('endRound: Emitting round-end for round', room.gameState.currentRound);
    // Emit round end with detailed scoring info
    io.to(roomCode).emit('round-end', {
      word: currentWord,
      scores: players.map(p => ({
        username: p.username,
        score: p.score,
        hasGuessed: p.hasGuessed || false,
        streak: p.streak || 0
      })),
      drawer: drawer.username,
      round: room.gameState.currentRound,
      roundEndBonus: {
        drawerBonus: roundEndResult.drawerBonus,
        guessersCount: roundEndResult.guessersCount,
        totalPlayers: roundEndResult.totalPlayers
      }
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
  try {
    const timer = timers.get(roomCode);
    if (timer) {
      clearInterval(timer);
      timers.delete(roomCode);
    }
  } catch (error) {
    console.error('Error clearing timer:', error);
  }
}

module.exports = {
  startRoundTimer,
  endRound,
  clearTimer
};

