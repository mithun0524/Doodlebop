import { useState, useEffect } from 'react';
import { playSound } from '../utils/sounds';
import Confetti from './Confetti';
import { useTheme } from '../context/ThemeContext';

function RoundTransition({ roundEndData, onClose }) {
  const [countdown, setCountdown] = useState(5);
  const [showConfetti, setShowConfetti] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    playSound('roundEnd');
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onClose]);

  if (!roundEndData) return null;

  const { word, scores, drawer, round, roundEndBonus } = roundEndData;

  return (
    <>
      <Confetti active={showConfetti} />
      <div
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        style={{ backgroundColor: `${theme.bg}e6` }}
      >
        <div
          className="rounded-lg p-6 sm:p-8 max-w-2xl w-full border-2"
          style={{ backgroundColor: theme.accent, borderColor: theme.text, color: theme.text }}
        >
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-4 sm:mb-6">
            Round {round} Complete
          </h2>

          <div className="text-center mb-6 sm:mb-8">
            <p className="mb-2 text-xs sm:text-sm uppercase tracking-wide" style={{ color: theme.text, opacity: 0.7 }}>
              The word was
            </p>
            <div
              className="px-4 py-2 sm:py-3 rounded-lg inline-block"
              style={{ backgroundColor: theme.text, color: theme.bg }}
            >
              <p className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase">{word}</p>
            </div>
            <p className="text-xs sm:text-sm mt-3 sm:mt-4" style={{ color: theme.text, opacity: 0.7 }}>
              Drawn by <span className="font-bold" style={{ color: theme.text }}>{drawer}</span>
            </p>
            
            {/* Show round end bonus info if available */}
            {roundEndBonus && (
              <div className="mt-4 text-xs sm:text-sm" style={{ color: theme.text, opacity: 0.8 }}>
                {roundEndBonus.guessersCount > 0 ? (
                  <p>
                    🎨 {roundEndBonus.guessersCount} of {roundEndBonus.totalPlayers} players guessed correctly!
                    {roundEndBonus.drawerBonus > 0 && (
                      <span className="font-bold"> Drawer earned +{roundEndBonus.drawerBonus} completion bonus!</span>
                    )}
                  </p>
                ) : (
                  <p className="italic">No one guessed the word this round 😅</p>
                )}
              </div>
            )}
          </div>

          {/* Scores */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-sm sm:text-lg font-bold mb-3 sm:mb-4 text-center uppercase tracking-wide" style={{ color: theme.text }}>
              Leaderboard
            </h3>
            <div className="space-y-2" role="list" aria-label="Round scores">
              {scores.map((player, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 sm:p-4 rounded-lg transition-all duration-200"
                  style={{
                    backgroundColor: theme.bg,
                    color: theme.text,
                    border: `2px solid ${theme.text}`
                  }}
                  role="listitem"
                  aria-label={`${player.username}: ${player.score} points`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: theme.text, color: theme.bg }}
                    >
                      {idx + 1}
                    </div>
                    <div
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: theme.accent, color: theme.text }}
                    >
                      {player.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium text-sm sm:text-base truncate" style={{ color: theme.text }}>
                        {player.username}
                      </span>
                      {player.streak > 0 && (
                        <span className="text-xs font-bold" style={{ color: theme.text, opacity: 0.7 }}>
                          🔥 {player.streak} streak
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="font-bold text-base sm:text-lg" style={{ color: theme.text }}>
                      {player.score}
                    </span>
                    {player.hasGuessed !== undefined && (
                      <span className="text-xs" style={{ color: theme.text, opacity: 0.6 }}>
                        {player.hasGuessed ? '✓ guessed' : '✗ missed'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <p className="text-base sm:text-xl font-bold" style={{ color: theme.text }}>
              Next round in <span className="text-2xl sm:text-3xl" style={{ color: theme.text }}>{countdown}</span>s
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default RoundTransition;

