import { useState, useEffect, useRef } from 'react';
import { playSound } from '../utils/sounds';
import { useTheme } from '../context/ThemeContext';

function Chat({ socket, isDrawer, currentWord, wordLength }) {
  const [messages, setMessages] = useState([]);
  const [guess, setGuess] = useState('');
  const messagesEndRef = useRef(null);
  const { theme } = useTheme();

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
      
      // Build detailed message with bonuses
      let bonusText = '';
      if (data.bonuses) {
        const bonusParts = [];
        if (data.bonuses.firstGuess) bonusParts.push(`First! +${data.bonuses.firstGuess}`);
        if (data.bonuses.speedBonus) bonusParts.push(`Speed! +${data.bonuses.speedBonus}`);
        if (data.bonuses.streak) bonusParts.push(`Streak! +${data.bonuses.streak}`);
        
        if (bonusParts.length > 0) {
          bonusText = ` [${bonusParts.join(', ')}]`;
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          username: 'System',
          message: `${data.username} guessed it! +${data.points} points${bonusText}`,
          type: 'correct',
          drawerBonus: data.drawerPoints
        }
      ]);

      // If there's a drawer bonus, show it separately
      if (data.drawerPoints && data.drawer) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              username: 'System',
              message: `${data.drawer} earned +${data.drawerPoints} points for drawing!`,
              type: 'drawer-bonus'
            }
          ]);
        }, 500);
      }
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

    const handleHintRevealed = (data) => {
      playSound('correctGuess');
      setMessages((prev) => [
        ...prev,
        {
          username: 'System',
          message: data.hint,
          type: 'hint',
          icon: 'lightbulb'
        }
      ]);
    };

    const handleCloseGuess = (data) => {
      setMessages((prev) => [
        ...prev,
        {
          username: 'System',
          message: data.message,
          type: 'close-guess',
          icon: 'fire'
        }
      ]);
    };

    socket.on('new-message', handleNewMessage);
    socket.on('correct-guess', handleCorrectGuess);
    socket.on('word-selected', handleWordSelected);
    socket.on('hint-revealed', handleHintRevealed);
    socket.on('close-guess', handleCloseGuess);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('correct-guess', handleCorrectGuess);
      socket.off('word-selected', handleWordSelected);
      socket.off('hint-revealed', handleHintRevealed);
      socket.off('close-guess', handleCloseGuess);
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
    <div 
      className="flex flex-col h-full rounded-lg border-2"
      style={{ backgroundColor: theme.accent, borderColor: theme.text, color: theme.text }}
    >
      <div className="p-4 border-b-2 flex-shrink-0" style={{ borderColor: theme.text }}>
        <h3 className="font-bold mb-3 text-sm uppercase tracking-wide" style={{ color: theme.text }}>Word Info</h3>
        {isDrawer ? (
          <div className="px-4 py-3 rounded-lg text-sm font-bold" style={{ backgroundColor: theme.text, color: theme.bg }} role="status">
            Drawing: {currentWord}
          </div>
        ) : wordLength > 0 ? (
          <div className="px-4 py-3 rounded-lg text-lg font-mono tracking-[0.5em]" style={{ backgroundColor: theme.bg, color: theme.text }} role="status" aria-label={`Word has ${wordLength} letters`}>
            {Array(wordLength).fill('_').join(' ')}
          </div>
        ) : (
          <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: theme.bg, color: theme.text, opacity: 0.6 }}>Waiting for word selection...</div>
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
              msg.type === 'correct' || msg.type === 'drawer-bonus'
                ? 'font-medium'
                : msg.type === 'hint'
                ? 'font-medium border-2'
                : msg.type === 'close-guess'
                ? 'font-medium animate-pulse'
                : msg.type === 'system'
                ? 'text-xs italic'
                : ''
            }`}
            style={{
              backgroundColor: msg.type === 'correct' || msg.type === 'drawer-bonus' 
                ? theme.text 
                : msg.type === 'hint'
                ? `${theme.text}20`
                : msg.type === 'close-guess'
                ? '#fbbf2480'
                : theme.bg,
              color: msg.type === 'correct' || msg.type === 'drawer-bonus' ? theme.bg : theme.text,
              border: msg.type === 'hint' 
                ? `2px solid ${theme.text}` 
                : msg.type === 'close-guess'
                ? '2px solid #fbbf24'
                : `1px solid ${theme.text}`
            }}
            role="article"
          >
            <div className="flex items-start gap-2">
              {msg.icon && (
                <div className="flex-shrink-0 mt-0.5">
                  {msg.icon === 'lightbulb' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  )}
                  {msg.icon === 'fire' && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 23a7.5 7.5 0 0 1-5.138-12.963C8.204 8.774 11.5 6.5 11 1.5c6 4 9 8 3 14 1 0 2.5 0 5-2.47.27.773.5 1.604.5 2.47A7.5 7.5 0 0 1 12 23z"/>
                    </svg>
                  )}
                </div>
              )}
              <div className="flex-1">
                <span className="font-bold">{msg.username}</span>
                <span className="opacity-80">: {msg.message}</span>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {!isDrawer && (
        <form onSubmit={handleSubmit} className="p-3 lg:p-4 border-t-2 flex-shrink-0" style={{ borderColor: theme.text }}>
          <div className="flex gap-2">
            <label htmlFor="guess-input" className="sr-only">Type your guess</label>
            <input
              id="guess-input"
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Type guess..."
              className="flex-1 px-3 py-2 lg:py-3 rounded-lg border-2 focus:outline-none focus:ring-4 focus:ring-white/50 placeholder-neutral-500 transition-all text-sm min-w-0"
              style={{ backgroundColor: theme.bg, color: theme.text, borderColor: theme.text }}
              autoComplete="off"
              aria-label="Enter your guess"
              maxLength={50}
            />
            <button
              type="submit"
              disabled={!guess.trim()}
              className="px-3 lg:px-5 py-2 lg:py-3 font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-white/50 uppercase text-xs tracking-wide flex-shrink-0"
              style={{ backgroundColor: theme.text, color: theme.bg }}
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

