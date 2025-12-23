import { useState, useEffect, useRef } from 'react';
import { playSound } from '../utils/sounds';
import { useTheme } from '../context/ThemeContext';

function WordSelection({ socket, isDrawer, onWordSelected }) {
  const [words, setWords] = useState([]);
  const [selected, setSelected] = useState(false);
  const hasReceivedWordsRef = useRef(false);
  const { theme } = useTheme();

  useEffect(() => {
    if (!socket || !isDrawer) return;

    const handleYourTurn = (data) => {
      console.log('Received your-turn event:', data, 'isDrawer:', isDrawer, 'socket.id:', socket?.id);
      // Only accept words if we're the drawer (if drawerId is provided, check it matches)
      if (data.drawerId && data.drawerId !== socket?.id) {
        console.log('Ignoring your-turn: not for this player');
        return;
      }
      if (data.words && data.words.length > 0) {
        console.log('Setting words:', data.words);
        setWords(data.words);
        setSelected(false);
        hasReceivedWordsRef.current = true;
        playSound('yourTurn');
      }
    };

    socket.on('your-turn', handleYourTurn);
    
    // Debug: Check if socket is connected
    console.log('WordSelection: Socket connected?', socket.connected, 'Socket ID:', socket.id, 'isDrawer:', isDrawer);

    // If we're the drawer but haven't received words after 1 second, request them
    const timeoutId = setTimeout(() => {
      if (!hasReceivedWordsRef.current && words.length === 0) {
        console.log('WordSelection: No words received yet, requesting from server');
        socket.emit('request-words');
      }
    }, 1000);

    return () => {
      socket.off('your-turn', handleYourTurn);
      clearTimeout(timeoutId);
    };
  }, [socket, isDrawer]);

  // Debug: log current state
  useEffect(() => {
    console.log('WordSelection render - words:', words, 'selected:', selected, 'isDrawer:', isDrawer);
  }, [words, selected, isDrawer]);

  if (selected || words.length === 0) {
    return null;
  }

  const handleSelectWord = (word) => {
    setSelected(true);
    socket.emit('select-word', { word });
    if (onWordSelected) {
      onWordSelected(word);
    }
    // Clear words after selection
    setTimeout(() => setWords([]), 500);
  };

  const handleKeyPress = (e, word) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelectWord(word);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4" style={{ backgroundColor: `${theme.bg}E6` }}>
      <div className="rounded-lg p-4 sm:p-6 border-2 max-w-lg w-full" style={{ backgroundColor: theme.accent, borderColor: theme.text, color: theme.text }}>
        <h2 className="text-xl sm:text-3xl font-black text-white mb-2 text-center">
          Choose Your Word
        </h2>
        <p className="text-neutral-400 text-xs sm:text-sm text-center mb-4 sm:mb-6 uppercase tracking-wide">
          Select one to draw
        </p>
        <div className="space-y-2 sm:space-y-3">
          {words.map((word, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectWord(word)}
              onKeyPress={(e) => handleKeyPress(e, word)}
              disabled={selected}
              className="w-full font-bold text-sm sm:text-lg py-3 sm:py-4 px-4 sm:px-6 rounded-lg transition-all duration-200 uppercase tracking-wide focus:outline-none focus:ring-4 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: theme.text, color: theme.bg }}
              autoFocus={idx === 0}
              aria-label={`Choose word: ${word}`}
            >
              {word}
            </button>
          ))}
        </div>
        <p className="text-neutral-500 text-xs text-center mt-3 sm:mt-4">
          Choose wisely! Others will try to guess your drawing.
        </p>
      </div>
    </div>
  );
}

export default WordSelection;

