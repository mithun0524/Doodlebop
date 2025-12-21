import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Home({ socket, username, setUsername, setRoomCode }) {
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (data) => {
      setRoomCode(data.roomCode);
      setIsCreating(false);
      navigate(`/game/${data.roomCode}`);
    };

    const handleRoomJoined = (data) => {
      setRoomCode(data.roomCode);
      setIsJoining(false);
      navigate(`/game/${data.roomCode}`);
    };

    const handleRoomError = (data) => {
      setError(data.message);
      setIsCreating(false);
      setIsJoining(false);
      setTimeout(() => setError(''), 5000);
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
      setTimeout(() => setError(''), 5000);
      return;
    }
    setError('');
    setIsCreating(true);
    socket.emit('create-room', { username: username.trim() });
  };

  const handleJoinRoom = () => {
    if (!username.trim() || username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      setTimeout(() => setError(''), 5000);
      return;
    }
    if (!joinCode.trim() || joinCode.trim().length !== 6) {
      setError('Room code must be 6 characters');
      setTimeout(() => setError(''), 5000);
      return;
    }
    setError('');
    setIsJoining(true);
    socket.emit('join-room', { 
      roomCode: joinCode.trim().toUpperCase(), 
      username: username.trim() 
    });
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <h1 className="text-7xl font-black text-white mb-3 tracking-tight">
            Doodlebop
          </h1>
          <p className="text-neutral-400 text-sm uppercase tracking-widest">Draw · Guess · Win</p>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="username" className="sr-only">Your name</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, handleCreateRoom)}
              placeholder="Your name"
              className="w-full px-5 py-4 bg-neutral-900 text-white border-2 border-white rounded-lg focus:outline-none focus:ring-4 focus:ring-white/50 transition-all placeholder-neutral-500"
              maxLength={20}
              autoComplete="username"
              aria-label="Enter your username"
              aria-required="true"
              aria-invalid={error.includes('Username') ? 'true' : 'false'}
            />
          </div>

          {error && (
            <div 
              className="bg-white text-black px-4 py-3 rounded-lg text-sm font-medium animate-shake"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          <button
            onClick={handleCreateRoom}
            disabled={isCreating || !username.trim()}
            className="w-full bg-white hover:bg-neutral-200 text-black font-medium py-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-white/50"
            aria-label="Create a new room"
          >
            {isCreating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                Creating...
              </span>
            ) : 'Create Room'}
          </button>

          <div className="flex items-center gap-3" role="separator">
            <div className="flex-1 border-t border-neutral-700"></div>
            <span className="text-neutral-500 text-xs uppercase tracking-wide">or</span>
            <div className="flex-1 border-t border-neutral-700"></div>
          </div>

          {!showJoinInput ? (
            <button
              onClick={() => setShowJoinInput(true)}
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium py-4 rounded-lg border-2 border-white transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-white/50"
              aria-label="Show join room form"
            >
              Join Room
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="roomCode" className="sr-only">Room code</label>
                <input
                  id="roomCode"
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => handleKeyPress(e, handleJoinRoom)}
                  placeholder="CODE"
                  className="w-full px-4 py-4 bg-neutral-900 text-white text-center text-2xl font-bold tracking-[0.5em] rounded-lg border-2 border-white focus:outline-none focus:ring-4 focus:ring-white/50 uppercase placeholder-neutral-600 transition-all"
                  maxLength={6}
                  autoComplete="off"
                  autoFocus
                  aria-label="Enter 6-character room code"
                  aria-required="true"
                  aria-invalid={error.includes('code') ? 'true' : 'false'}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleJoinRoom}
                  disabled={isJoining || joinCode.length !== 6}
                  className="flex-1 bg-white hover:bg-neutral-200 text-black font-medium py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-white/50"
                  aria-label="Join the room"
                >
                  {isJoining ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                      Joining...
                    </span>
                  ) : 'Join'}
                </button>
                <button
                  onClick={() => {
                    setShowJoinInput(false);
                    setJoinCode('');
                    setError('');
                  }}
                  disabled={isJoining}
                  className="px-6 bg-neutral-900 hover:bg-neutral-800 text-white font-medium py-3 rounded-lg border-2 border-white transition-all duration-200 disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-white/50"
                  aria-label="Cancel and go back"
                >
                  Back
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



