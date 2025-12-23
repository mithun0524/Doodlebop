const scoringEngine = require('../scoringEngine');
const stringSimilarity = require('string-similarity');

// Calculate Levenshtein distance
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

function handleGuessEvents(socket, io, roomManager, timerManager) {
  socket.on('send-guess', (data) => {
    try {
      const { guess } = data;
      
      // Validate input
      if (!guess || typeof guess !== 'string') {
        socket.emit('game-error', { message: 'Invalid guess format' });
        return;
      }

      const room = roomManager.getRoomBySocketId(socket.id);
      
      if (!room || !room.gameState) {
        socket.emit('game-error', { message: 'Game not in progress' });
        return;
      }

      // Validate player scores before processing
      scoringEngine.validatePlayerScores(room.gameState.players);

      const player = room.gameState.players.find(p => p.id === socket.id);
      if (!player) {
        console.error('Player not found in room');
        return;
      }

      // Don't let drawer guess
      const drawer = room.gameState.players[room.gameState.currentDrawer];
      if (!drawer) {
        console.error('Drawer not found');
        return;
      }

      if (drawer.id === socket.id) {
        socket.emit('new-message', {
          username: 'System',
          message: 'You are drawing! You cannot guess.',
          type: 'system'
        });
        return;
      }

      // Validate current word
      if (!room.gameState.currentWord || typeof room.gameState.currentWord !== 'string') {
        console.error('Invalid current word');
        return;
      }

      const normalizedGuess = guess.trim().toLowerCase();
      const normalizedWord = room.gameState.currentWord.toLowerCase();

      // Check if correct guess
      if (normalizedGuess === normalizedWord) {
        // Don't allow duplicate guesses
        if (player.hasGuessed) {
          // Already guessed, just show as regular message
          io.to(room.code).emit('new-message', {
            username: player.username,
            message: guess,
            type: 'message'
          });
          return;
        }

        // Calculate time elapsed (with fallback)
        const timeElapsed = room.gameState.startTime 
          ? Math.floor((Date.now() - room.gameState.startTime) / 1000)
          : 0;

        // Mark as guessed before scoring (prevents race conditions)
        player.hasGuessed = true;
        
        // Use scoring engine to process the guess
        const scoreResult = scoringEngine.processCorrectGuess(room, player, timeElapsed);

        // Emit correct guess with detailed scoring info
        io.to(room.code).emit('correct-guess', {
          username: player.username,
          points: scoreResult.guesserPoints,
          drawer: drawer.username,
          drawerPoints: scoreResult.drawerPoints,
          bonuses: scoreResult.bonuses,
          timeElapsed: scoreResult.timeElapsed
        });

        // Update all players with new scores
        io.to(room.code).emit('update-players', room.gameState.players);

        // Check if all players guessed
        const nonDrawerPlayers = room.gameState.players.filter(p => p.id !== drawer.id);
        
        // Edge case: single player game (only drawer)
        if (nonDrawerPlayers.length === 0) {
          console.warn('Single player game - no other players to guess');
          return;
        }

        const allGuessed = nonDrawerPlayers.every(p => p.hasGuessed);

        if (allGuessed) {
          // All players guessed - end round early
          console.log('All players guessed correctly - ending round early');
          timerManager.clearTimer(room.code);
          timerManager.endRound(room.code, roomManager, io, timerManager);
        }
      } else {
        // Check for close guess using fuzzy matching
        const distance = levenshteinDistance(normalizedGuess, normalizedWord);
        const similarity = stringSimilarity.compareTwoStrings(normalizedGuess, normalizedWord);
        
        // Close guess threshold: distance <= 2 OR similarity > 0.6
        const isCloseGuess = distance <= 2 || similarity > 0.6;
        
        if (isCloseGuess && !player.hasGuessed) {
          // Send close guess feedback to the player only
          socket.emit('close-guess', {
            guess: guess,
            message: "You're very close! Keep trying!"
          });
        }
        
        // Show as normal message to everyone
        io.to(room.code).emit('new-message', {
          username: player.username,
          message: guess,
          type: 'message'
        });
      }
    } catch (error) {
      console.error('Error in send-guess:', error);
      socket.emit('game-error', { message: 'An error occurred processing your guess' });
    }
  });
}

module.exports = { handleGuessEvents };



