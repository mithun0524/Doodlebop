const { getRandomWords, nextRound, endGame, resetGame } = require('../gameLogic');
const timerManager = require('../timerManager');
const { validateWord } = require('../middleware/validation');
const fs = require('fs');
const path = require('path');

const WORDS_FILE = path.join(__dirname, '../words.json');
let wordList = [];
try {
  wordList = JSON.parse(fs.readFileSync(WORDS_FILE, 'utf8'));
} catch (error) {
  console.error('Error loading words for validation:', error);
}

function handleGameEvents(socket, io, roomManager) {
  socket.on('start-game', (data) => {
    try {
      const room = roomManager.getRoomBySocketId(socket.id);
    
      if (!room) {
        socket.emit('game-error', { message: 'You are not in a room' });
        return;
      }

      if (room.gameState) {
        socket.emit('game-error', { message: 'Game already in progress' });
        return;
      }

      if (room.players.length < 2) {
        socket.emit('game-error', { message: 'Need at least 2 players to start' });
        return;
      }

      // Initialize game state with custom settings
      const currentDrawer = Math.floor(Math.random() * room.players.length);
      const drawer = room.players[currentDrawer];
      const wordOptions = getRandomWords(3);
      
      // Use room settings
      const maxRounds = room.settings?.maxRounds || 3;
      const roundTime = room.settings?.roundTime || 90;
      const roundsPerPlayer = Math.ceil(maxRounds / room.players.length);

      room.gameState = {
        currentRound: 1,
        maxRounds: maxRounds,
        roundsPerPlayer: roundsPerPlayer,
        currentDrawer,
        currentWord: null,
        timer: roundTime,
        strokes: [],
        players: room.players.map(p => ({
          ...p,
          hasGuessed: false
        })),
        startTime: Date.now()
      };

      // Emit game started to all (with word options for drawer only via separate event)
      io.to(room.code).emit('game-started', {
        round: 1,
        maxRounds: maxRounds,
        currentDrawer,
        drawerId: drawer.id,
        drawer: drawer.username,
        players: room.gameState.players
      });

    // Emit word choices to drawer - use a small delay to ensure socket is ready
    console.log('Emitting your-turn to drawer:', drawer.username, 'ID:', drawer.id);
    setTimeout(() => {
      const drawerSocket = io.sockets.sockets.get(drawer.id);
      if (drawerSocket) {
        console.log('Drawer socket found, emitting your-turn with words:', wordOptions);
        drawerSocket.emit('your-turn', {
          words: wordOptions,
          round: 1
        });
      } else {
        console.log('Drawer socket NOT found for ID:', drawer.id);
        console.log('Available sockets:', Array.from(io.sockets.sockets.keys()));
        // Fallback: emit to room with drawer info so client can filter
        io.to(room.code).emit('your-turn', {
          words: wordOptions,
          round: 1,
          drawerId: drawer.id
        });
      }
    }, 100);

    // Emit to all to update state
    io.to(room.code).emit('round-started', {
      drawer: drawer.username,
      drawerId: drawer.id,
      currentDrawer,
      round: 1,
      maxRounds: maxRounds,
      players: room.gameState.players
    });
    } catch (error) {
      console.error('Error in start-game:', error);
      socket.emit('game-error', { message: 'An error occurred starting the game' });
    }
  });

  socket.on('request-words', () => {
    try {
      const room = roomManager.getRoomBySocketId(socket.id);
      if (!room || !room.gameState) return;
      
      const drawer = room.gameState.players[room.gameState.currentDrawer];
      if (drawer.id === socket.id) {
        // This player is the drawer, send them words
        const wordOptions = getRandomWords(3);
        socket.emit('your-turn', {
          words: wordOptions,
          round: room.gameState.currentRound
        });
      }
    } catch (error) {
      console.error('Error in request-words:', error);
    }
  });

  socket.on('select-word', (data) => {
    try {
      const { word } = data;
      const room = roomManager.getRoomBySocketId(socket.id);
      
      if (!room || !room.gameState) {
        socket.emit('game-error', { message: 'Game not in progress' });
        return;
      }

      const drawer = room.gameState.players[room.gameState.currentDrawer];
      if (drawer.id !== socket.id) {
        socket.emit('game-error', { message: 'Not your turn to draw' });
        return;
      }

      // Validate word
      const wordValidation = validateWord(word, wordList);
      if (!wordValidation.valid) {
        socket.emit('game-error', { message: wordValidation.message });
        return;
      }

      // Set the selected word
      room.gameState.currentWord = word;
      room.gameState.startTime = Date.now();

      // Emit word length as underscores to guessers
      const wordLength = word.length;
      const underscores = '_ '.repeat(wordLength).trim();

      socket.to(room.code).emit('word-selected', {
        wordLength,
        underscores
      });

      // Emit to all that drawing has started
      io.to(room.code).emit('drawing-started', {
        drawer: drawer.username
      });

      // Start timer
      timerManager.startRoundTimer(room.code, 90, roomManager, io);
    } catch (error) {
      console.error('Error in select-word:', error);
      socket.emit('game-error', { message: 'An error occurred selecting word' });
    }
  });

  socket.on('restart-game', () => {
    try {
      const room = roomManager.getRoomBySocketId(socket.id);
      
      if (!room) {
        socket.emit('game-error', { message: 'You are not in a room' });
        return;
      }

      timerManager.clearTimer(room.code);
      resetGame(room.code, roomManager);

      io.to(room.code).emit('game-reset');
    } catch (error) {
      console.error('Error in restart-game:', error);
      socket.emit('game-error', { message: 'An error occurred restarting the game' });
    }
  });
}

module.exports = { handleGameEvents };

