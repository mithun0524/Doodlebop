# Scoring Engine Documentation

## Overview
The scoring engine handles all point calculations and awards with comprehensive edge case handling to ensure fair and consistent gameplay.

## Scoring Rules

### Base Points (Guessers)
- **Formula**: `100 - (timeElapsed × 2)`
- **Minimum**: 10 points (guaranteed even at 90 seconds)
- **Maximum**: 100 points (instant guess)

### Bonuses

#### First Guess Bonus
- **Amount**: +20 points
- **Condition**: First player to guess correctly in the round
- **Purpose**: Rewards speed and encourages quick thinking

#### Speed Bonus
- **Amount**: +30 points
- **Condition**: Correct guess within 10 seconds
- **Purpose**: Extra reward for very fast guesses

#### Streak Bonus
- **Amount**: 15 points per 2-round streak
- **Condition**: Consecutive correct guesses across multiple rounds
- **Example**: 2-round streak = +15, 4-round streak = +30
- **Reset**: Streak resets to 0 if player doesn't guess in a round

### Drawer Points

#### Per-Guess Points
- **Formula**: `50% of each guesser's base points`
- **Calculation**: `Math.floor(guesserPoints × 0.5)`
- **Purpose**: Rewards drawer for clear drawing

#### Completion Bonus
- **Amount**: +25 points
- **Condition**: At least one player guessed correctly
- **Timing**: Awarded at end of round
- **Purpose**: Encourages drawer to try even if struggling

## Edge Cases Handled

### Input Validation
✓ **Invalid time values**: Clamps to 0-90 range, defaults to 0 if NaN  
✓ **Negative scores**: Prevents negative points, enforces 0 minimum  
✓ **Fractional points**: Always rounds down to integers  
✓ **Invalid player objects**: Validates before processing, returns 0 on error  

### Game State Issues
✓ **Drawer disconnects mid-round**: Round continues, drawer gets 0 points  
✓ **No players guess**: Drawer gets 0 points (no completion bonus)  
✓ **Single player game**: Detected and handled (only drawer in room)  
✓ **All players disconnect**: Room cleanup prevents scoring errors  

### Timing Edge Cases
✓ **Negative time**: Clamped to 0, gives maximum points  
✓ **Time > 90 seconds**: Clamped to 90, gives minimum points  
✓ **Round ends exactly when guess arrives**: Time calculated from startTime  
✓ **Multiple simultaneous guesses**: First processed gets first-guess bonus  

### Score Management
✓ **Integer overflow**: Maximum score capped at 999,999  
✓ **Score corruption**: Validation fixes invalid scores to 0  
✓ **Tied final scores**: Leaderboard sorts by username alphabetically  
✓ **Race conditions**: hasGuessed flag set before scoring  

### Player State
✓ **Player rejoins after guessing**: hasGuessed flag prevents re-guessing  
✓ **Duplicate guess attempts**: Silently ignored if already guessed  
✓ **Missing hasGuessed flag**: Initialized to false on validation  
✓ **Missing streak counter**: Initialized to 0 on validation  

## API Methods

### `calculateGuessPoints(timeElapsed, isFirstGuess)`
Calculates points for a correct guess with bonuses.

**Parameters:**
- `timeElapsed` (number): Seconds elapsed since round start
- `isFirstGuess` (boolean): Whether this is the first correct guess

**Returns:** Integer points (min 10, includes speed bonus if applicable)

**Edge cases handled:** Invalid time, NaN, negative values

---

### `calculateDrawerPoints(guesserPoints)`
Calculates drawer points based on guesser's score.

**Parameters:**
- `guesserPoints` (number): Points awarded to the guesser

**Returns:** Integer drawer points (50% of guesser, rounded down)

**Edge cases handled:** Negative points, NaN, fractional values

---

### `processCorrectGuess(room, guesser, timeElapsed)`
Complete guess processing with all bonuses and validations.

**Parameters:**
- `room` (object): Room object with gameState
- `guesser` (object): Player who guessed correctly
- `timeElapsed` (number): Time since round start

**Returns:** Object with `{ guesserPoints, drawerPoints, bonuses, timeElapsed }`

**Edge cases handled:** Missing drawer, invalid time, first guess detection, streak calculation

---

### `processRoundEnd(room)`
Awards completion bonus and resets streaks at round end.

**Parameters:**
- `room` (object): Room object with gameState

**Returns:** Object with `{ drawerBonus, guessersCount, totalPlayers }`

**Edge cases handled:** No guessers, missing drawer, streak resets

---

### `validatePlayerScores(players)`
Validates and fixes corrupted player scores.

**Parameters:**
- `players` (array): Array of player objects

**Returns:** void (modifies players in-place)

**Fixes applied:**
- Invalid scores → 0
- Scores > 999,999 → 999,999
- Missing hasGuessed → false
- Invalid streak → 0

---

### `getLeaderboard(players)`
Sorts players by score with tie-breaking.

**Parameters:**
- `players` (array): Array of player objects

**Returns:** Sorted array (descending score, ascending username for ties)

**Edge cases handled:** Empty array, tied scores, missing usernames

---

### `resetScores(players)`
Resets all player scores for new game.

**Parameters:**
- `players` (array): Array of player objects

**Returns:** void (modifies players in-place)

**Resets:** score → 0, hasGuessed → false, streak → 0

## Example Scoring Scenarios

### Scenario 1: Fast Guess with First Bonus
- Time elapsed: 5 seconds
- Is first guess: Yes
- **Calculation:**
  - Base: 100 - (5 × 2) = 90
  - Speed bonus: +30 (< 10 seconds)
  - First guess bonus: +20
  - **Total: 140 points**
- Drawer gets: 45 points (50% of 90 base)

### Scenario 2: Average Guess
- Time elapsed: 30 seconds
- Is first guess: No
- **Calculation:**
  - Base: 100 - (30 × 2) = 40
  - No bonuses
  - **Total: 40 points**
- Drawer gets: 20 points

### Scenario 3: Late Guess with Streak
- Time elapsed: 80 seconds
- Current streak: 3 rounds
- **Calculation:**
  - Base: max(10, 100 - 160) = 10 (minimum)
  - Streak bonus: 15 (3 rounds / 2)
  - **Total: 25 points**
- Drawer gets: 5 points

### Scenario 4: No One Guesses
- Guessers: 0
- **Result:**
  - All guessers: 0 points
  - Drawer: 0 points (no completion bonus)
  - All streaks reset to 0

## Configuration
The scoring engine configuration can be adjusted:

```javascript
{
  basePoints: 100,           // Starting points
  minPoints: 10,             // Minimum guaranteed
  timeDecayRate: 2,          // Points lost per second
  drawerPercentage: 0.5,     // 50% of guesser points
  firstGuessBonus: 20,       // Bonus for first correct guess
  speedBonusThreshold: 10,   // Seconds for speed bonus
  speedBonusPoints: 30,      // Speed bonus amount
  streakBonusPoints: 15,     // Per 2-round streak
  drawerCompletionBonus: 25, // Bonus if anyone guesses
  maxScore: 999999           // Overflow protection
}
```

## Error Handling
All methods include try-catch blocks with fallback values:
- Invalid calculations return minimum safe values
- Missing objects return 0 points
- Corrupted data is automatically repaired
- All errors are logged but don't crash the game

## Testing Recommendations

### Critical Test Cases
1. **Simultaneous guesses**: Ensure only one gets first-guess bonus
2. **Timer edge cases**: Test at 0s, 45s, 89s, 90s, >90s
3. **Drawer leaves**: Verify scoring continues without drawer
4. **Score overflow**: Test cumulative scores approaching 999,999
5. **Corrupted data**: Inject NaN/undefined scores and verify repair
6. **Single player**: Test with only drawer in room
7. **Network lag**: Simulate delayed guess packets
8. **Rapid restarts**: Test multiple games in quick succession

### Performance Tests
- 100+ simultaneous guesses
- 1000+ rounds cumulative
- Score validation on 50+ players
- Memory leaks from streak tracking
