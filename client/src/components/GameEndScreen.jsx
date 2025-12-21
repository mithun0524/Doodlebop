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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-8 max-w-2xl w-full border border-gray-700">
        <h1 className="text-5xl font-bold text-center mb-8 text-white">Game Over!</h1>

        {/* Winner */}
        {winner && (
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">👑</div>
            <h2 className="text-3xl font-bold text-yellow-400 mb-2">{winner.username}</h2>
            <p className="text-xl text-gray-300">Wins with {winner.score} points!</p>
          </div>
        )}

        {/* Scoreboard */}
        <div className="mb-8">
          <h3 className="text-2xl font-semibold text-white mb-4 text-center">Final Scores</h3>
          <div className="space-y-3">
            {scores.map((player, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  idx === 0
                    ? 'bg-yellow-900/30 border-2 border-yellow-600'
                    : 'bg-gray-700 border border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-gray-400 w-8">#{idx + 1}</span>
                  <span className="text-xl font-semibold text-white">{player.username}</span>
                  {idx === 0 && <span className="text-2xl">👑</span>}
                </div>
                <span className="text-xl font-bold text-white">{player.score} pts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handlePlayAgain}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-lg transition-colors"
          >
            Play Again
          </button>
          <button
            onClick={onLeave}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-lg transition-colors"
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}

export default GameEndScreen;



