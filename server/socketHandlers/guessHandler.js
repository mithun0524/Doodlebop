const scoringEngine = require('../scoringEngine');

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
        // Wrong guess - show as normal message
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



