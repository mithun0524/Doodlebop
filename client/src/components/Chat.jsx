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
    <div className="flex flex-col h-full bg-neutral-900 rounded-lg border-2 border-white">
      <div className="p-4 border-b-2 border-white flex-shrink-0">
        <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wide">Word Info</h3>
        {isDrawer ? (
          <div className="bg-white text-black px-4 py-3 rounded-lg text-sm font-bold" role="status">
            Drawing: {currentWord}
          </div>
        ) : wordLength > 0 ? (
          <div className="bg-neutral-800 text-white px-4 py-3 rounded-lg text-lg font-mono tracking-[0.5em]" role="status" aria-label={`Word has ${wordLength} letters`}>
            {Array(wordLength).fill('_').join(' ')}
          </div>
        ) : (
          <div className="bg-neutral-800 text-neutral-400 px-4 py-3 rounded-lg text-sm">Waiting for word selection...</div>
        )}
      </div>

      <div 
        className="flex-1 overflow-y-auto p-4 space-y-2"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded text-sm transition-all duration-200 ${
              msg.type === 'correct'
                ? 'bg-white text-black font-medium border border-white'
                : msg.type === 'system'
                ? 'bg-neutral-800 text-neutral-400 text-xs italic border border-neutral-700'
                : 'bg-neutral-800 text-white border border-neutral-700'
            }`}
            role="article"
          >
            <span className="font-bold">{msg.username}</span>
            <span className="opacity-80">: {msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {!isDrawer && (
        <form onSubmit={handleSubmit} className="p-3 lg:p-4 border-t-2 border-white flex-shrink-0">
          <div className="flex gap-2">
            <label htmlFor="guess-input" className="sr-only">Type your guess</label>
            <input
              id="guess-input"
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Type guess..."
              className="flex-1 px-3 py-2 lg:py-3 bg-black text-white rounded-lg border-2 border-white focus:outline-none focus:ring-4 focus:ring-white/50 placeholder-neutral-500 transition-all text-sm min-w-0"
              autoComplete="off"
              aria-label="Enter your guess"
              maxLength={50}
            />
            <button
              type="submit"
              disabled={!guess.trim()}
              className="px-3 lg:px-5 py-2 lg:py-3 bg-white hover:bg-neutral-200 text-black font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-white/50 uppercase text-xs tracking-wide flex-shrink-0"
              aria-label="Send guess"
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

