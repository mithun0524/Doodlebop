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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Top Bar */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-gray-400 text-sm">Room:</span>
              <span className="ml-2 font-mono font-bold text-lg">{roomCode}</span>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Round:</span>
              <span className="ml-2 font-semibold">
                {gameState?.currentRound}/{gameState?.maxRounds}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold">
              <span className={timer <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}>
                {timer}s
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sidebar - Players */}
          <div className="lg:col-span-2">
            <PlayerList
              players={gameState?.players || []}
              currentDrawerId={currentDrawerId}
              currentUserId={socket.id}
            />
          </div>

          {/* Center - Canvas */}
          <div className="lg:col-span-8 flex flex-col">
            <Canvas
              socket={socket}
              isDrawer={isDrawer}
              currentWord={currentWord}
            />
          </div>

          {/* Right Sidebar - Chat */}
          <div className="lg:col-span-2">
            <div className="h-[600px]">
              <Chat
                socket={socket}
                isDrawer={isDrawer}
                currentWord={currentWord}
                wordLength={wordLength}
              />
            </div>
          </div>
        </div>
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

