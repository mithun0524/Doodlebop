import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

function GameEndScreen({ socket, finalScores, onLeave }) {
  const [countdown, setCountdown] = useState(5);
  const { theme } = useTheme();

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handlePlayAgain = () => {
    socket.emit('restart-game');
  };

  const winner = finalScores?.winner;
  const scores = finalScores?.scores || [];

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: theme.bg, color: theme.text }}>
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-5xl sm:text-6xl font-black mb-2" style={{ color: theme.text }}>
            Game Over
          </h1>
          <p className="text-sm uppercase tracking-widest" style={{ color: theme.text, opacity: 0.6 }}>Final Results</p>
        </div>

        {/* Winner */}
        {winner && (
          <div className="text-center mb-6 sm:mb-8" role="status" aria-live="polite">
            <div className="rounded-lg p-6" style={{ backgroundColor: theme.text, color: theme.bg }}>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: theme.bg, opacity: 0.7 }}>Winner</p>
              <h2 className="text-2xl sm:text-3xl font-bold mb-1">{winner.username}</h2>
              <p className="text-lg">
                <span className="font-bold">{winner.score}</span> points
              </p>
            </div>
          </div>
        )}

        {/* Scoreboard */}
        <div className="mb-6 sm:mb-8">
          <h3 className="sr-only">Final Leaderboard</h3>
          <div className="space-y-2">
            {scores.map((player, idx) => {
              const isWinner = idx === 0;
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-4 sm:p-5 rounded-lg transition-all duration-200 ${
                    isWinner ? 'font-bold' : ''
                  }`}
                  style={{
                    backgroundColor: isWinner ? theme.text : theme.accent,
                    color: isWinner ? theme.bg : theme.text,
                    border: `2px solid ${theme.text}`
                  }}
                  role="listitem"
                  aria-label={`${idx + 1}. ${player.username} - ${player.score} points`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      isWinner ? '' : ''
                    }`} style={{ backgroundColor: isWinner ? theme.bg : theme.bg, color: isWinner ? theme.text : theme.text, opacity: isWinner ? 1 : 0.6 }}>
                      {idx + 1}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm`} style={{ backgroundColor: theme.bg, color: theme.text }}>
                        {player.username.charAt(0).toUpperCase()}
                      </div>
                      <span className={`text-base sm:text-lg font-medium`} style={{ color: isWinner ? theme.bg : theme.text }}>{player.username}</span>
                    </div>
                  </div>
                  <span className={`text-xl sm:text-2xl font-bold`} style={{ color: isWinner ? theme.bg : theme.text }}>
                    {player.score}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handlePlayAgain}
            className="flex-1 font-medium py-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-white/50"
            style={{ backgroundColor: theme.text, color: theme.bg }}
            aria-label="Start a new game"
          >
            Play Again
          </button>
          <button
            onClick={onLeave}
            className="flex-1 font-medium py-4 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-white/50"
            style={{ backgroundColor: theme.accent, color: theme.text, borderColor: theme.text }}
            aria-label="Leave the room"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}

export default GameEndScreen;



