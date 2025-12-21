function handleGuessEvents(socket, io, roomManager, timerManager) {
  socket.on('send-guess', (data) => {
    try {
      const { guess } = data;
      const room = roomManager.getRoomBySocketId(socket.id);
      
      if (!room || !room.gameState) {
        socket.emit('game-error', { message: 'Game not in progress' });
        return;
      }

      const player = room.gameState.players.find(p => p.id === socket.id);
      if (!player) return;

      // Don't let drawer guess
      const drawer = room.gameState.players[room.gameState.currentDrawer];
      if (drawer.id === socket.id) {
        socket.emit('new-message', {
          username: 'System',
          message: 'You are drawing! You cannot guess.',
          type: 'system'
        });
        return;
      }

      const normalizedGuess = guess.trim().toLowerCase();
      const normalizedWord = room.gameState.currentWord.toLowerCase();

      // Check if correct guess
      if (normalizedGuess === normalizedWord) {
        if (player.hasGuessed) {
          // Already guessed, just show as regular message
          io.to(room.code).emit('new-message', {
            username: player.username,
            message: guess,
            type: 'message'
          });
          return;
        }

        // Calculate points based on time elapsed
        const timeElapsed = Math.floor((Date.now() - room.gameState.startTime) / 1000);
        const points = Math.max(10, 100 - (timeElapsed * 2));
        
        // Award points to guesser
        player.score += points;
        player.hasGuessed = true;

        // Award points to drawer (50% of guesser's points)
        drawer.score += Math.floor(points / 2);

        // Emit correct guess
        io.to(room.code).emit('correct-guess', {
          username: player.username,
          points,
          drawer: drawer.username,
          drawerPoints: Math.floor(points / 2)
        });

        // Check if all players guessed
        const allGuessed = room.gameState.players
          .filter(p => p.id !== drawer.id)
          .every(p => p.hasGuessed);

        if (allGuessed) {
          // End round early
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



