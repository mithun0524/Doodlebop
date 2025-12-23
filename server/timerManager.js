const scoringEngine = require('./scoringEngine');
const timers = new Map();
const hintData = new Map();

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
    
    // Initialize hints for this round (if enabled)
    const room = roomManager.getRoom(roomCode);
    if (room && room.gameState && room.gameState.currentWord) {
      const hintsEnabled = room.settings?.hintsEnabled !== false;
      if (hintsEnabled) {
        initializeHints(roomCode, room.gameState.currentWord, duration);
      }
    }
    
    const timerMgr = module.exports;
    const interval = setInterval(() => {
      timeLeft--;
      
      // Check if it's time to reveal a hint
      checkAndRevealHint(roomCode, timeLeft, io);
      
      io.to(roomCode).emit('timer-update', {
        timeLeft,
        roomCode
      });

      if (timeLeft <= 0) {
        clearInterval(interval);
        timers.delete(roomCode);
        hintData.delete(roomCode);
        endRound(roomCode, roomManager, io, timerMgr);
      }
    }, 1000);

    timers.set(roomCode, interval);
  } catch (error) {
    console.error('Error starting round timer:', error);
  }
}

function initializeHints(roomCode, word, duration) {
  try {
    const wordLower = word.toLowerCase();
    const wordLength = wordLower.length;
    
    // Calculate hint reveal times (at 2/3 and 1/3 of time remaining)
    const hintTimes = [];
    if (duration >= 60) {
      hintTimes.push(Math.floor(duration * 2/3)); // First hint at 2/3 time
      hintTimes.push(Math.floor(duration * 1/3)); // Second hint at 1/3 time
    } else if (duration >= 30) {
      hintTimes.push(Math.floor(duration / 2)); // One hint at halfway
    }
    
    // Choose random positions to reveal (not first or last letter)
    const revealablePositions = [];
    for (let i = 1; i < wordLength - 1; i++) {
      if (wordLower[i] !== ' ') { // Don't reveal spaces
        revealablePositions.push(i);
      }
    }
    
    // Shuffle positions
    for (let i = revealablePositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [revealablePositions[i], revealablePositions[j]] = [revealablePositions[j], revealablePositions[i]];
    }
    
    hintData.set(roomCode, {
      word: wordLower,
      hintTimes,
      revealablePositions,
      revealedPositions: new Set(),
      currentHintIndex: 0
    });
  } catch (error) {
    console.error('Error initializing hints:', error);
  }
}

function checkAndRevealHint(roomCode, timeLeft, io) {
  try {
    const hints = hintData.get(roomCode);
    if (!hints || hints.currentHintIndex >= hints.hintTimes.length) {
      return;
    }
    
    const nextHintTime = hints.hintTimes[hints.currentHintIndex];
    
    if (timeLeft === nextHintTime) {
      // Reveal next letter(s)
      const numToReveal = Math.min(2, hints.revealablePositions.length - hints.revealedPositions.size);
      
      for (let i = 0; i < numToReveal; i++) {
        const posIndex = hints.revealedPositions.size;
        if (posIndex < hints.revealablePositions.length) {
          const position = hints.revealablePositions[posIndex];
          hints.revealedPositions.add(position);
        }
      }
      
      hints.currentHintIndex++;
      
      // Build hint string with revealed letters
      const hintString = buildHintString(hints.word, hints.revealedPositions);
      
      io.to(roomCode).emit('hint-revealed', {
        hint: hintString,
        revealedCount: hints.revealedPositions.size
      });
    }
  } catch (error) {
    console.error('Error checking hint reveal:', error);
  }
}

function buildHintString(word, revealedPositions) {
  return word.split('').map((char, index) => {
    if (char === ' ') return ' ';
    if (revealedPositions.has(index)) return char;
    return '_';
  }).join(' ');
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
    hintData.delete(roomCode);
  } catch (error) {
    console.error('Error clearing timer:', error);
  }
}

module.exports = {
  startRoundTimer,
  endRound,
  clearTimer
};

