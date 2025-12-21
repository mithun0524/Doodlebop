import { useState, useEffect } from 'react';
import Canvas from './Canvas';
import Chat from './Chat';
import PlayerList from './PlayerList';
import WordSelection from './WordSelection';
import RoundTransition from './RoundTransition';

function GameView({ socket, username, roomCode, gameState: initialGameState }) {
  const [gameState, setGameState] = useState(initialGameState);
  const [currentWord, setCurrentWord] = useState(null);
  const [wordLength, setWordLength] = useState(0);
  const [timer, setTimer] = useState(90);
  const [showRoundTransition, setShowRoundTransition] = useState(false);
  const [roundEndData, setRoundEndData] = useState(null);

  // Get drawer ID from gameState - try drawerId first, then fall back to array lookup
  const currentDrawerId = gameState?.drawerId || (gameState?.players && gameState?.players[gameState?.currentDrawer]?.id);
  const isDrawer = socket?.id && currentDrawerId && socket.id === currentDrawerId;
  
  // Debug logging
  useEffect(() => {
    if (gameState) {
      console.log('GameView: isDrawer?', isDrawer, 'socket.id:', socket?.id, 'currentDrawerId:', currentDrawerId, 'drawerId from state:', gameState?.drawerId, 'currentDrawer index:', gameState?.currentDrawer, 'players:', gameState?.players);
    }
  }, [isDrawer, socket?.id, currentDrawerId, gameState]);

  useEffect(() => {
    if (!socket) return;

    const handleDrawingStarted = () => {
      // Drawing has started
    };

    const handleWordSelected = (data) => {
      setWordLength(data.wordLength);
    };

    const handleTimerUpdate = (data) => {
      setTimer(data.timeLeft);
    };

    const handleCorrectGuess = (data) => {
      // Update game state with new scores
      setGameState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map(p => {
            if (p.username === data.username) {
              return { ...p, score: p.score + data.points, hasGuessed: true };
            }
            if (p.username === data.drawer) {
              return { ...p, score: p.score + data.drawerPoints };
            }
            return p;
          })
        };
      });
    };

    const handleRoundEnd = (data) => {
      setRoundEndData(data);
      setShowRoundTransition(true);
      setTimer(0);
      // Update game state with final scores for the round
      setGameState(prev => {
        if (!prev) return prev;
        const scoreMap = {};
        data.scores.forEach(s => {
          scoreMap[s.username] = s.score;
        });
        return {
          ...prev,
          players: prev.players.map(p => ({
            ...p,
            score: scoreMap[p.username] || p.score,
            hasGuessed: false
          }))
        };
      });
    };

    const handleRoundStarted = (data) => {
      setWordLength(0);
      setCurrentWord(null);
      setTimer(90);
      setShowRoundTransition(false);
      setRoundEndData(null);
      // Update game state with new drawer and players
      if (data.currentDrawer !== undefined && data.players) {
        setGameState(prev => ({
          ...prev,
          currentDrawer: data.currentDrawer,
          drawerId: data.drawerId,
          players: data.players,
          currentRound: data.round
        }));
      }
    };

    socket.on('drawing-started', handleDrawingStarted);
    socket.on('word-selected', handleWordSelected);
    socket.on('timer-update', handleTimerUpdate);
    socket.on('correct-guess', handleCorrectGuess);
    socket.on('round-end', handleRoundEnd);
    socket.on('round-started', handleRoundStarted);

    return () => {
      socket.off('drawing-started', handleDrawingStarted);
      socket.off('word-selected', handleWordSelected);
      socket.off('timer-update', handleTimerUpdate);
      socket.off('correct-guess', handleCorrectGuess);
      socket.off('round-end', handleRoundEnd);
      socket.off('round-started', handleRoundStarted);
    };
  }, [socket]);

  const handleWordSelected = (word) => {
    setCurrentWord(word);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col h-screen overflow-hidden">
      {/* Top Bar */}
      <div className="bg-neutral-900 border-b-2 border-white px-4 lg:px-6 py-2 lg:py-3 flex-shrink-0 z-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 lg:gap-8 text-sm lg:text-base">
            <div className="flex items-baseline gap-2">
              <span className="text-neutral-500 text-xs uppercase tracking-wide">Room</span>
              <span className="font-mono font-bold text-white">{roomCode}</span>
            </div>
            <div className="hidden sm:block w-px h-5 bg-neutral-700"></div>
            <div className="flex items-baseline gap-2">
              <span className="text-neutral-500 text-xs uppercase tracking-wide">Round</span>
              <span className="font-bold text-white">{gameState?.currentRound}/{gameState?.maxRounds}</span>
            </div>
          </div>
          <div 
            className="text-3xl lg:text-4xl font-black tabular-nums ml-auto"
            role="timer"
            aria-live="polite"
            aria-label={`${timer} seconds remaining`}
          >
            <span className={timer <= 10 ? 'text-white animate-pulse' : 'text-white'}>
              {String(timer).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex overflow-hidden flex-col lg:flex-row min-h-0">
        {/* Left Sidebar - Players (Desktop only) */}
        <div className="hidden lg:block w-64 border-r-2 border-white bg-black p-4 flex-shrink-0 overflow-y-auto">
          <PlayerList
            players={gameState?.players || []}
            currentDrawerId={currentDrawerId}
            currentUserId={socket.id}
          />
        </div>

        {/* Center - Canvas (Takes remaining space) */}
        <div className="flex-1 p-2 lg:p-4 flex flex-col overflow-hidden min-h-0">
          <Canvas
            socket={socket}
            isDrawer={isDrawer}
            currentWord={currentWord}
          />
        </div>

        {/* Right Sidebar - Chat (Desktop only) */}
        <div className="hidden lg:flex w-64 border-l-2 border-white bg-black p-4 flex-col flex-shrink-0">
          <Chat
            socket={socket}
            isDrawer={isDrawer}
            currentWord={currentWord}
            wordLength={wordLength}
          />
        </div>
      </div>

      {/* Mobile Chat Input - Always visible at bottom on mobile */}
      {!isDrawer && (
        <div className="lg:hidden border-t-2 border-white bg-neutral-900 p-3 flex-shrink-0">
          <form onSubmit={(e) => {
            e.preventDefault();
            const input = e.target.elements.mobileGuess;
            if (!input.value.trim()) return;
            socket.emit('send-guess', { guess: input.value.trim() });
            input.value = '';
          }} className="flex gap-2">
            <input
              name="mobileGuess"
              type="text"
              placeholder="Type your guess..."
              className="flex-1 px-3 py-2 bg-black text-white rounded-lg border-2 border-white focus:outline-none focus:ring-2 focus:ring-white/50 placeholder-neutral-500 text-sm min-w-0"
              autoComplete="off"
              maxLength={50}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-white hover:bg-neutral-200 text-black font-bold rounded-lg transition-all text-xs uppercase tracking-wide flex-shrink-0"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Mobile Word Display - Show current word or hint */}
      <div className="lg:hidden border-t-2 border-white bg-neutral-900 px-4 py-2 flex items-center justify-center gap-4 text-xs flex-shrink-0">
        {isDrawer && currentWord && (
          <div className="px-3 py-1 bg-white text-black rounded font-bold">
            Drawing: {currentWord}
          </div>
        )}
        {!isDrawer && wordLength > 0 && (
          <div className="font-mono tracking-[0.3em] text-white text-sm">{Array(wordLength).fill('_').join(' ')}</div>
        )}
      </div>

      {/* Word Selection Modal */}
      {isDrawer && <WordSelection socket={socket} isDrawer={isDrawer} onWordSelected={handleWordSelected} />}

      {/* Round Transition */}
      {showRoundTransition && roundEndData && (
        <RoundTransition
          roundEndData={roundEndData}
          onClose={() => setShowRoundTransition(false)}
        />
      )}
    </div>
  );
}

export default GameView;

