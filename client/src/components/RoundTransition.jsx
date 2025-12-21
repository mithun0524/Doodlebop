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
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-8 max-w-2xl w-full mx-4 border border-gray-700">
        <h2 className="text-4xl font-bold text-center mb-6 text-white">
          Round {round} Complete!
        </h2>

        <div className="text-center mb-8">
          <p className="text-gray-400 mb-2">The word was:</p>
          <p className="text-5xl font-bold text-blue-400 mb-4">{word.toUpperCase()}</p>
          <p className="text-gray-400">Drawn by: <span className="text-white font-semibold">{drawer}</span></p>
        </div>

        {/* Scores */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-white mb-4 text-center">Round Scores</h3>
          <div className="space-y-2">
            {scores.map((player, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
              >
                <span className="text-white font-medium">{player.username}</span>
                <span className="text-white font-bold">{player.score} pts</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <p className="text-2xl font-bold text-white mb-2">
            Next round in {countdown}...
          </p>
        </div>
      </div>
      </div>
    </>
  );
}

export default RoundTransition;

