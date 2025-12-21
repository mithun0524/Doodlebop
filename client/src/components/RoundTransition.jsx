import { useState, useEffect } from 'react';
import { playSound } from '../utils/sounds';
import Confetti from './Confetti';

function RoundTransition({ roundEndData, onClose }) {
  const [countdown, setCountdown] = useState(5);
  const [showConfetti, setShowConfetti] = useState(false);

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

  const { word, scores, drawer, round } = roundEndData;

  return (
    <>
      <Confetti active={showConfetti} />
      <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
        <div className="bg-neutral-900 rounded-lg p-6 sm:p-8 max-w-2xl w-full border-2 border-white">
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-4 sm:mb-6 text-white">
            Round {round} Complete
          </h2>

          <div className="text-center mb-6 sm:mb-8">
            <p className="text-neutral-400 mb-2 text-xs sm:text-sm uppercase tracking-wide">The word was</p>
            <div className="bg-white text-black px-4 py-2 sm:py-3 rounded-lg inline-block">
              <p className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase">{word}</p>
            </div>
            <p className="text-neutral-400 text-xs sm:text-sm mt-3 sm:mt-4">
              Drawn by <span className="text-white font-bold">{drawer}</span>
            </p>
          </div>

          {/* Scores */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-sm sm:text-lg font-bold text-white mb-3 sm:mb-4 text-center uppercase tracking-wide">
              Leaderboard
            </h3>
            <div className="space-y-2" role="list" aria-label="Round scores">
              {scores.map((player, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 sm:p-4 bg-black rounded-lg border-2 border-neutral-800 hover:border-white transition-all duration-200"
                  role="listitem"
                  aria-label={`${player.username}: ${player.score} points`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white text-black flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-neutral-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {player.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white font-medium text-sm sm:text-base truncate">{player.username}</span>
                  </div>
                  <span className="text-white font-bold text-base sm:text-lg flex-shrink-0">{player.score}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <p className="text-base sm:text-xl font-bold text-white">
              Next round in <span className="text-2xl sm:text-3xl">{countdown}</span>s
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default RoundTransition;

