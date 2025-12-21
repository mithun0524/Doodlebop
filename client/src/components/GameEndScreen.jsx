import { useState, useEffect } from 'react';

function GameEndScreen({ socket, finalScores, onLeave }) {
  const [countdown, setCountdown] = useState(5);

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
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-5xl sm:text-6xl font-black text-white mb-2">
            Game Over
          </h1>
          <p className="text-neutral-400 text-sm uppercase tracking-widest">Final Results</p>
        </div>

        {/* Winner */}
        {winner && (
          <div className="text-center mb-6 sm:mb-8" role="status" aria-live="polite">
            <div className="bg-white text-black rounded-lg p-6">
              <p className="text-xs uppercase tracking-wide text-neutral-600 mb-1">Winner</p>
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
                    isWinner
                      ? 'bg-white text-black'
                      : 'bg-neutral-900 text-white border-2 border-neutral-800 hover:border-white'
                  }`}
                  role="listitem"
                  aria-label={`${idx + 1}. ${player.username} - ${player.score} points`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      isWinner ? 'bg-black text-white' : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        isWinner ? 'bg-black text-white' : 'bg-white text-black'
                      }`}>
                        {player.username.charAt(0).toUpperCase()}
                      </div>
                      <span className={`text-base sm:text-lg font-medium ${isWinner ? 'text-black' : 'text-white'}`}>{player.username}</span>
                    </div>
                  </div>
                  <span className={`text-xl sm:text-2xl font-bold ${isWinner ? 'text-black' : 'text-white'}`}>
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
            className="flex-1 bg-white hover:bg-neutral-200 text-black font-medium py-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-white/50"
            aria-label="Start a new game"
          >
            Play Again
          </button>
          <button
            onClick={onLeave}
            className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white font-medium py-4 rounded-lg border-2 border-white transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-white/50"
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



