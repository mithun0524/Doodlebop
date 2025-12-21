import { useState, useEffect, useRef } from 'react';
import { playSound } from '../utils/sounds';

function Chat({ socket, isDrawer, currentWord, wordLength }) {
  const [messages, setMessages] = useState([]);
  const [guess, setGuess] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      // Play sound for wrong guesses (non-system messages)
      if (data.type === 'message') {
        playSound('wrongGuess');
      }
      setMessages((prev) => [...prev, data]);
    };

    const handleCorrectGuess = (data) => {
      playSound('correctGuess');
      setMessages((prev) => [
        ...prev,
        {
          username: 'System',
          message: `${data.username} guessed it! (+${data.points} points)`,
          type: 'correct'
        }
      ]);
    };

    const handleWordSelected = (data) => {
      setMessages((prev) => [
        ...prev,
        {
          username: 'System',
          message: `Word selected! It has ${data.wordLength} letters: ${data.underscores}`,
          type: 'system'
        }
      ]);
    };

    socket.on('new-message', handleNewMessage);
    socket.on('correct-guess', handleCorrectGuess);
    socket.on('word-selected', handleWordSelected);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('correct-guess', handleCorrectGuess);
      socket.off('word-selected', handleWordSelected);
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!guess.trim() || isDrawer) return;
    
    socket.emit('send-guess', { guess: guess.trim() });
    // Sound will play from server response (correct-guess or new-message)
    setGuess('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-white font-semibold mb-2">Chat / Guesses</h3>
        {isDrawer ? (
          <div className="bg-blue-900/50 border border-blue-700 text-blue-200 px-3 py-2 rounded text-sm">
            You're drawing: <span className="font-bold">{currentWord}</span>
          </div>
        ) : wordLength > 0 ? (
          <div className="text-gray-300 text-sm">
            Word: {Array(wordLength).fill('_').join(' ')}
          </div>
        ) : (
          <div className="text-gray-400 text-sm">Waiting for word selection...</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-2 rounded ${
              msg.type === 'correct'
                ? 'bg-green-900/50 border border-green-700 text-green-200'
                : msg.type === 'system'
                ? 'bg-gray-700/50 text-gray-300 text-sm'
                : 'bg-gray-700 text-gray-200'
            }`}
          >
            <span className="font-semibold">{msg.username}:</span> {msg.message}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {!isDrawer && (
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Guess the word..."
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default Chat;

