import { useState, useEffect } from 'react';

function GameLobby({ socket, username, roomCode, players, setPlayers, onLeave }) {
  const [error, setError] = useState('');

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
      return;
    }
    setError('');
    socket.emit('start-game');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-2xl p-8 border border-gray-700">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">Game Lobby</h1>
            <button
              onClick={onLeave}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Leave Room
            </button>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Room Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomCode}
                readOnly
                className="flex-1 px-4 py-3 bg-gray-700 text-white text-2xl font-bold text-center rounded-lg border border-gray-600 uppercase tracking-widest"
              />
              <button
                onClick={handleCopyCode}
                className="px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Copy
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              Players ({players.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="bg-gray-700 p-4 rounded-lg border border-gray-600"
                >
                  <div className="text-white font-medium">{player.username}</div>
                  {player.id === socket.id && (
                    <div className="text-xs text-blue-400 mt-1">(You)</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {players.length < 2 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg">Waiting for players...</p>
              <p className="text-gray-500 text-sm mt-2">
                Need at least 2 players to start
              </p>
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={handleStartGame}
                className="bg-green-600 hover:bg-green-700 text-white font-bold text-xl py-4 px-8 rounded-lg transition-colors"
              >
                Start Game
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GameLobby;

