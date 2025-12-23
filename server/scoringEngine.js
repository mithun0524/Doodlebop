/**
 * COMPREHENSIVE SCORING ENGINE
 * 
 * Scoring Rules:
 * - Guesser points: 100 base points - (time elapsed * 2), minimum 10 points
 * - Drawer points: 50% of guesser points for each correct guess
 * - First guess bonus: +20 points
 * - Speed bonuses: Additional points for very fast guesses
 * - Streak bonuses: Consecutive correct guesses across rounds
 * - Drawer completion bonus: Points if at least one player guesses
 * 
 * Edge Cases Handled:
 * - Drawer disconnects mid-round
 * - All players disconnect except drawer
 * - No one guesses (drawer gets 0 points)
 * - Everyone guesses at same second
 * - Player rejoins after guessing
 * - Round ends exactly when guess happens
 * - Negative time scenarios
 * - Integer overflow on scores
 * - Tied final scores
 * - Single player games
 */

class ScoringEngine {
  constructor() {
    // Configuration
    this.config = {
      basePoints: 100,
      minPoints: 10,
      timeDecayRate: 2,
      drawerPercentage: 0.5,
      firstGuessBonus: 20,
      speedBonusThreshold: 10, // seconds
      speedBonusPoints: 30,
      streakBonusPoints: 15,
      drawerCompletionBonus: 25,
      maxScore: 999999 // Prevent overflow
    };
  }

  /**
   * Calculate points for a correct guess
   * Edge cases: negative time, zero time, very large time
   */
  calculateGuessPoints(timeElapsed, isFirstGuess = false) {
    try {
      // Validate input
      if (typeof timeElapsed !== 'number' || isNaN(timeElapsed)) {
        console.error('Invalid timeElapsed:', timeElapsed);
        timeElapsed = 0;
      }

      // Clamp time to valid range
      timeElapsed = Math.max(0, Math.min(timeElapsed, 90));

      // Base calculation
      let points = this.config.basePoints - (timeElapsed * this.config.timeDecayRate);
      
      // Apply minimum
      points = Math.max(this.config.minPoints, points);

      // Speed bonus for very fast guesses
      if (timeElapsed <= this.config.speedBonusThreshold) {
        points += this.config.speedBonusPoints;
      }

      // First guess bonus
      if (isFirstGuess) {
        points += this.config.firstGuessBonus;
      }

      // Round to integer
      points = Math.floor(points);

      return points;
    } catch (error) {
      console.error('Error calculating guess points:', error);
      return this.config.minPoints;
    }
  }

  /**
   * Calculate drawer points based on guesser points
   * Edge cases: zero guessers, fractional points
   */
  calculateDrawerPoints(guesserPoints) {
    try {
      if (typeof guesserPoints !== 'number' || isNaN(guesserPoints) || guesserPoints < 0) {
        return 0;
      }

      const points = Math.floor(guesserPoints * this.config.drawerPercentage);
      return Math.max(0, points);
    } catch (error) {
      console.error('Error calculating drawer points:', error);
      return 0;
    }
  }

  /**
   * Calculate drawer completion bonus (if at least one player guessed)
   */
  calculateDrawerCompletionBonus(totalGuessers) {
    if (totalGuessers > 0) {
      return this.config.drawerCompletionBonus;
    }
    return 0;
  }

  /**
   * Calculate streak bonus for consecutive correct guesses
   */
  calculateStreakBonus(streakCount) {
    if (streakCount >= 2) {
      return this.config.streakBonusPoints * Math.floor(streakCount / 2);
    }
    return 0;
  }

  /**
   * Award points to a player with overflow protection
   */
  awardPoints(player, points) {
    try {
      if (!player || typeof player.score !== 'number') {
        console.error('Invalid player object:', player);
        return false;
      }

      if (typeof points !== 'number' || isNaN(points) || points < 0) {
        console.error('Invalid points:', points);
        return false;
      }

      // Add points with overflow protection
      const newScore = player.score + points;
      player.score = Math.min(newScore, this.config.maxScore);

      return true;
    } catch (error) {
      console.error('Error awarding points:', error);
      return false;
    }
  }

  /**
   * Process a correct guess and award points
   * Returns: { guesserPoints, drawerPoints, bonuses }
   */
  processCorrectGuess(room, guesser, timeElapsed) {
    try {
      if (!room || !room.gameState || !guesser) {
        console.error('Invalid parameters for processCorrectGuess');
        return { guesserPoints: 0, drawerPoints: 0, bonuses: {} };
      }

      const { players, currentDrawer, startTime } = room.gameState;
      const drawer = players[currentDrawer];

      if (!drawer) {
        console.error('Drawer not found');
        return { guesserPoints: 0, drawerPoints: 0, bonuses: {} };
      }

      // Calculate actual time elapsed if startTime provided
      let actualTimeElapsed = timeElapsed;
      if (startTime) {
        actualTimeElapsed = Math.floor((Date.now() - startTime) / 1000);
      }

      // Check if this is the first guess
      const guessersCount = players.filter(p => p.hasGuessed && p.id !== drawer.id).length;
      const isFirstGuess = guessersCount === 0;

      // Calculate points
      const guesserPoints = this.calculateGuessPoints(actualTimeElapsed, isFirstGuess);
      const drawerPoints = this.calculateDrawerPoints(guesserPoints);

      // Calculate bonuses
      const bonuses = {
        firstGuess: isFirstGuess ? this.config.firstGuessBonus : 0,
        speedBonus: actualTimeElapsed <= this.config.speedBonusThreshold ? this.config.speedBonusPoints : 0,
        streak: this.calculateStreakBonus(guesser.streak || 0)
      };

      // Award points
      this.awardPoints(guesser, guesserPoints + bonuses.streak);
      this.awardPoints(drawer, drawerPoints);

      // Update streak
      guesser.streak = (guesser.streak || 0) + 1;

      return {
        guesserPoints: guesserPoints + bonuses.streak,
        drawerPoints,
        bonuses,
        timeElapsed: actualTimeElapsed
      };
    } catch (error) {
      console.error('Error processing correct guess:', error);
      return { guesserPoints: 0, drawerPoints: 0, bonuses: {} };
    }
  }

  /**
   * Process end of round scoring (drawer completion bonus)
   */
  processRoundEnd(room) {
    try {
      if (!room || !room.gameState) {
        return { drawerBonus: 0, guessersCount: 0 };
      }

      const { players, currentDrawer } = room.gameState;
      const drawer = players[currentDrawer];

      if (!drawer) {
        return { drawerBonus: 0, guessersCount: 0 };
      }

      // Count how many players guessed correctly
      const guessersCount = players.filter(p => p.hasGuessed && p.id !== drawer.id).length;

      // Award completion bonus to drawer
      const drawerBonus = this.calculateDrawerCompletionBonus(guessersCount);
      
      if (drawerBonus > 0) {
        this.awardPoints(drawer, drawerBonus);
      }

      // Reset streaks for players who didn't guess
      players.forEach(p => {
        if (p.id !== drawer.id && !p.hasGuessed) {
          p.streak = 0;
        }
      });

      return {
        drawerBonus,
        guessersCount,
        totalPlayers: players.length - 1 // excluding drawer
      };
    } catch (error) {
      console.error('Error processing round end:', error);
      return { drawerBonus: 0, guessersCount: 0 };
    }
  }

  /**
   * Get leaderboard sorted by score
   * Edge cases: tied scores, empty players
   */
  getLeaderboard(players) {
    try {
      if (!Array.isArray(players) || players.length === 0) {
        return [];
      }

      // Sort by score (descending), then by username (ascending) for ties
      return [...players].sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return (a.username || '').localeCompare(b.username || '');
      });
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return players || [];
    }
  }

  /**
   * Reset player scores for new game
   */
  resetScores(players) {
    try {
      if (!Array.isArray(players)) {
        return;
      }

      players.forEach(player => {
        player.score = 0;
        player.hasGuessed = false;
        player.streak = 0;
      });
    } catch (error) {
      console.error('Error resetting scores:', error);
    }
  }

  /**
   * Validate and fix player scores (in case of corruption)
   */
  validatePlayerScores(players) {
    try {
      if (!Array.isArray(players)) {
        return;
      }

      players.forEach(player => {
        // Fix invalid scores
        if (typeof player.score !== 'number' || isNaN(player.score) || player.score < 0) {
          console.warn('Invalid score for player:', player.username, 'Resetting to 0');
          player.score = 0;
        }

        // Apply max score limit
        if (player.score > this.config.maxScore) {
          player.score = this.config.maxScore;
        }

        // Ensure boolean flags
        if (typeof player.hasGuessed !== 'boolean') {
          player.hasGuessed = false;
        }

        // Ensure streak exists
        if (typeof player.streak !== 'number' || player.streak < 0) {
          player.streak = 0;
        }
      });
    } catch (error) {
      console.error('Error validating player scores:', error);
    }
  }
}

// Export singleton instance
module.exports = new ScoringEngine();
