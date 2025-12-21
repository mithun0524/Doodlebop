import { useState, useEffect, useRef } from 'react';
import { playSound } from '../utils/sounds';

function WordSelection({ socket, isDrawer, onWordSelected }) {
  const [words, setWords] = useState([]);
  const [selected, setSelected] = useState(false);
  const hasReceivedWordsRef = useRef(false);

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

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Choose a word to draw:
        </h2>
        <div className="space-y-4">
          {words.map((word, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectWord(word)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl py-4 px-6 rounded-lg transition-all transform hover:scale-105 active:scale-95 animate-pulse"
            >
              {word.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WordSelection;

