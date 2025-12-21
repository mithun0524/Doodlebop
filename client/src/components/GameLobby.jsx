import { useState, useEffect } from 'react';

function GameLobby({ socket, username, roomCode, players, setPlayers, onLeave }) {
  const [error, setError] = useState('');
  const [roundsPerPlayer, setRoundsPerPlayer] = useState(2);
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const isHost = players.length > 0 && players[0]?.username === username;

  useEffect(() => {
    if (!socket) return;

    const handleRoomJoined = (data) => {
      console.log('GameLobby: Received room-joined', data);
      setPlayers(data.players || []);
    };

    const handlePlayerJoined = (data) => {
      console.log('GameLobby: Received player-joined', data);
      setPlayers(data.players || []);
    };

    const handlePlayerLeft = (data) => {
      console.log('GameLobby: Received player-left', data);
      setPlayers(data.players || []);
    };

    const handleGameError = (data) => {
      setError(data.message);
    };

    socket.on('room-joined', handleRoomJoined);
    socket.on('player-joined', handlePlayerJoined);
    socket.on('player-left', handlePlayerLeft);
    socket.on('game-error', handleGameError);

    return () => {
      socket.off('room-joined', handleRoomJoined);
      socket.off('player-joined', handlePlayerJoined);
      socket.off('player-left', handlePlayerLeft);
      socket.off('game-error', handleGameError);
    };
  }, [socket, setPlayers]);

  const handleStartGame = () => {
    if (players.length < 2) {
      setError('Need at least 2 players to start');
      setTimeout(() => setError(''), 5000);
      return;
    }
    setError('');
    setIsStarting(true);
    socket.emit('start-game', { roundsPerPlayer });
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
          <div className="text-center sm:text-left">
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-1">Lobby</h1>
            <p className="text-neutral-400 text-sm uppercase tracking-wide">
              Room <span className="font-mono font-bold text-white">{roomCode}</span>
              {isHost && <span className="ml-2 text-xs bg-white text-black px-2 py-1 rounded font-bold">HOST</span>}
            </p>
          </div>
          <button
            onClick={onLeave}
            className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-lg border-2 border-white transition-all duration-200 text-sm focus:outline-none focus:ring-4 focus:ring-white/50"
            aria-label="Leave the lobby"
          >
            Leave
          </button>
        </div>

        {error && (
          <div 
            className="mb-6 bg-white text-black px-4 py-3 rounded-lg text-sm font-medium"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">
              Players ({players.length})
            </h2>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1 bg-white hover:bg-neutral-200 text-black text-xs font-medium rounded transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-white/50"
              aria-label="Copy room code to clipboard"
            >
              {copied ? '✓ Copied!' : 'Copy Code'}
            </button>
          </div>
          <div className="space-y-2">
            {players.map((player, index) => (
              <div
                key={player.id}
                className="bg-neutral-900 p-4 rounded-lg border-2 border-neutral-800 hover:border-white transition-all duration-200 flex items-center gap-3"
                role="listitem"
                aria-label={`Player ${index + 1}: ${player.username}`}
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                  {player.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <span className="text-white font-medium">{player.username}</span>
                  {player.id === socket.id && (
                    <span className="ml-2 text-xs text-neutral-400">(You)</span>
                  )}
                  {index === 0 && (
                    <span className="ml-2 text-xs bg-neutral-700 text-white px-2 py-0.5 rounded">Host</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {isHost && (
          <div className="mb-8 bg-neutral-900 p-5 rounded-lg border-2 border-neutral-800">
            <label htmlFor="rounds-slider" className="block text-white font-medium mb-4">
              Rounds per player: <span className="font-bold">{roundsPerPlayer}</span>
            </label>
            <input
              id="rounds-slider"
              type="range"
              min="1"
              max="5"
              value={roundsPerPlayer}
              onChange={(e) => setRoundsPerPlayer(parseInt(e.target.value))}
              className="w-full h-2 bg-neutral-700 rounded-full appearance-none cursor-pointer accent-white focus:outline-none focus:ring-4 focus:ring-white/50"
              aria-label="Select rounds per player"
              aria-valuemin="1"
              aria-valuemax="5"
              aria-valuenow={roundsPerPlayer}
            />
            <div className="flex justify-between text-neutral-500 text-xs mt-2">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
            <p className="text-sm text-neutral-400 mt-3">
              Total: <span className="font-bold text-white">{players.length * roundsPerPlayer}</span> rounds
            </p>
          </div>
        )}

        {isHost ? (
          players.length < 2 ? (
            <div className="text-center py-8">
              <div className="w-3 h-3 bg-white rounded-full mb-3 mx-auto opacity-50 animate-pulse"></div>
              <p className="text-neutral-400 text-sm">Waiting for players to join...</p>
              <p className="text-neutral-500 text-xs mt-2">Need at least 2 players</p>
            </div>
          ) : (
            <button
              onClick={handleStartGame}
              disabled={isStarting}
              className="w-full bg-white hover:bg-neutral-200 text-black font-medium py-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-white/50"
              aria-label="Start the game"
            >
              {isStarting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                  Starting...
                </span>
              ) : 'Start Game'}
            </button>
          )
        ) : (
          <div className="text-center py-8">
            <div className="w-3 h-3 bg-white rounded-full mb-3 mx-auto opacity-50 animate-pulse"></div>
            <p className="text-neutral-400 text-sm">Waiting for host to start the game...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GameLobby;

