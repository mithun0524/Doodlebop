import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Home({ socket, username, setUsername, setRoomCode }) {
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (data) => {
      setRoomCode(data.roomCode);
      navigate(`/game/${data.roomCode}`);
    };

    const handleRoomJoined = (data) => {
      setRoomCode(data.roomCode);
      navigate(`/game/${data.roomCode}`);
    };

    const handleRoomError = (data) => {
      setError(data.message);
    };

    socket.on('room-created', handleRoomCreated);
    socket.on('room-joined', handleRoomJoined);
    socket.on('room-error', handleRoomError);

    return () => {
      socket.off('room-created', handleRoomCreated);
      socket.off('room-joined', handleRoomJoined);
      socket.off('room-error', handleRoomError);
    };
  }, [socket, navigate, setRoomCode]);

  const handleCreateRoom = () => {
    if (!username.trim() || username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    setError('');
    socket.emit('create-room', { username: username.trim() });
  };

  const handleJoinRoom = () => {
    if (!username.trim() || username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (!joinCode.trim() || joinCode.trim().length !== 6) {
      setError('Room code must be 6 characters');
      return;
    }
    setError('');
    socket.emit('join-room', { 
      roomCode: joinCode.trim().toUpperCase(), 
      username: username.trim() 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full border border-gray-700">
        <h1 className="text-4xl font-bold text-center mb-2 text-white">Pictionary Party</h1>
        <p className="text-center text-gray-400 mb-8">Draw, guess, and win!</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
              maxLength={20}
            />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={handleCreateRoom}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Create Room
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">OR</span>
            </div>
          </div>

          {!showJoinInput ? (
            <button
              onClick={() => setShowJoinInput(true)}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Join Room
            </button>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter room code"
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 uppercase"
                maxLength={6}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleJoinRoom}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Join
                </button>
                <button
                  onClick={() => {
                    setShowJoinInput(false);
                    setJoinCode('');
                  }}
                  className="px-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;



