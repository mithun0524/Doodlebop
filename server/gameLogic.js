const fs = require('fs');
const path = require('path');

const WORDS_FILE = path.join(__dirname, 'words.json');
let words = [];

// Load words from file
try {
  const wordsData = fs.readFileSync(WORDS_FILE, 'utf8');
  words = JSON.parse(wordsData);
} catch (error) {
  console.error('Error loading words:', error);
  words = ['cat', 'dog', 'bird']; // Fallback words
}

function getRandomWords(count = 3) {
  const selected = [];
  const available = [...words];
  
  for (let i = 0; i < count && available.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * available.length);
    selected.push(available[randomIndex]);
    available.splice(randomIndex, 1);
  }
  
  return selected;
}

function nextRound(roomCode, roomManager, io, timerManager) {
  try {
    const room = roomManager.getRoom(roomCode);
    if (!room || !room.gameState) {
      console.log('nextRound: No room or gameState found for roomCode:', roomCode);
      return;
    }

    const { currentRound, maxRounds, players } = room.gameState;
    console.log('nextRound: Current round:', currentRound, 'Max rounds:', maxRounds);
    
    // Reset round state and increment round counter
    room.gameState.currentRound++;
    room.gameState.currentDrawer = (room.gameState.currentDrawer + 1) % players.length;
    room.gameState.currentWord = null;
    room.gameState.timer = 90;
    room.gameState.strokes = [];
    
    console.log('nextRound: Incremented to round:', room.gameState.currentRound);
    
    // Check if we've exceeded max rounds
    if (room.gameState.currentRound > maxRounds) {
      console.log('nextRound: Round', room.gameState.currentRound, 'exceeds maxRounds', maxRounds, '- ending game');
      endGame(roomCode, roomManager, io);
      return;
    }
    
    console.log('nextRound: Starting round', room.gameState.currentRound);
    
    // Reset all players' guessed status
    players.forEach(player => {
      player.hasGuessed = false;
    });

    // Get drawer socket
    const drawer = players[room.gameState.currentDrawer];
    
    // Select 3 words for drawer to choose from
    const wordOptions = getRandomWords(3);
    
    // Emit to drawer
    const drawerSocket = io.sockets.sockets.get(drawer.id);
    if (drawerSocket) {
      console.log('gameLogic: Emitting your-turn to drawer:', drawer.username, 'ID:', drawer.id, 'words:', wordOptions);
      drawerSocket.emit('your-turn', {
        words: wordOptions,
        round: room.gameState.currentRound
      });
    } else {
      console.log('gameLogic: Drawer socket not found, emitting to room with drawerId');
      io.to(roomCode).emit('your-turn', {
        words: wordOptions,
        round: room.gameState.currentRound,
        drawerId: drawer.id
      });
    }

    // Emit to all (including drawer) to update state
    io.to(roomCode).emit('round-started', {
      drawer: drawer.username,
      drawerId: drawer.id,
      currentDrawer: room.gameState.currentDrawer,
      round: room.gameState.currentRound,
      maxRounds,
      players: room.gameState.players
    });
  } catch (error) {
    console.error('Error in nextRound:', error);
  }
}

function endGame(roomCode, roomManager, io) {
  try {
    const room = roomManager.getRoom(roomCode);
    if (!room || !room.gameState) {
      console.log('endGame: No room or gameState found for roomCode:', roomCode);
      return;
    }

    console.log('endGame: Ending game for room:', roomCode);
    
    // Clear any active timers first
    const timerManager = require('./timerManager');
    timerManager.clearTimer(roomCode);
    
    const players = [...room.gameState.players].sort((a, b) => b.score - a.score);
    const winner = players[0];

    console.log('endGame: Emitting game-ended event with winner:', winner.username);
    io.to(roomCode).emit('game-ended', {
      winner: {
        username: winner.username,
        score: winner.score
      },
      scores: players.map(p => ({
        username: p.username,
        score: p.score
      }))
    });

    // Clear game state immediately to prevent further rounds
    room.gameState = null;
    console.log('endGame: Game state cleared immediately for room:', roomCode);
  } catch (error) {
    console.error('Error in endGame:', error);
  }
}

function resetGame(roomCode, roomManager) {
  try {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    // Reset all player scores and states
    room.players.forEach(player => {
      player.score = 0;
      player.hasGuessed = false;
    });

    // Clear game state
    room.gameState = null;
  } catch (error) {
    console.error('Error in resetGame:', error);
  }
}

module.exports = {
  getRandomWords,
  nextRound,
  endGame,
  resetGame
};

