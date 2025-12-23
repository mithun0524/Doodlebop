import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

function GameLobby({ socket, username, roomCode, players, setPlayers, onLeave }) {
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [settings, setSettings] = useState({
    roundTime: 90,
    maxRounds: 3,
    maxPlayers: 8,
    hintsEnabled: true
  });
  const { theme } = useTheme();

  const isHost = players.length > 0 && players[0]?.username === username;

  useEffect(() => {
    if (!socket) return;

    const handleRoomJoined = (data) => {
      console.log('GameLobby: Received room-joined', data);
      setPlayers(data.players || []);
      if (data.settings) {
        setSettings(data.settings);
      }
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
      setIsStarting(false);
    };

    const handleSettingsUpdated = (data) => {
      setSettings(data.settings);
    };

    const handleSettingsError = (data) => {
      setError(data.message);
      setTimeout(() => setError(''), 5000);
    };

    socket.on('room-joined', handleRoomJoined);
    socket.on('player-joined', handlePlayerJoined);
    socket.on('player-left', handlePlayerLeft);
    socket.on('game-error', handleGameError);
    socket.on('settings-updated', handleSettingsUpdated);
    socket.on('settings-error', handleSettingsError);

    return () => {
      socket.off('room-joined', handleRoomJoined);
      socket.off('player-joined', handlePlayerJoined);
      socket.off('player-left', handlePlayerLeft);
      socket.off('game-error', handleGameError);
      socket.off('settings-updated', handleSettingsUpdated);
      socket.off('settings-error', handleSettingsError);
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
    socket.emit('start-game');
  };

  const handleSettingChange = (key, value) => {
    if (!isHost) return;
    
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    socket.emit('update-settings', { settings: newSettings });
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
    <div
      className="min-h-screen w-full p-4 sm:p-8 flex items-center justify-center"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      <div className="w-full max-w-3xl space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <div className="w-full">
            <h1 className="text-3xl sm:text-5xl font-black mb-1" style={{ color: theme.text }}>Lobby</h1>
            <p className="text-sm uppercase tracking-wide" style={{ color: theme.text, opacity: 0.7 }}>
              Room <span className="font-mono font-bold" style={{ color: theme.text }}>{roomCode}</span>
              {isHost && <span className="ml-2 text-xs px-2 py-1 rounded font-bold" style={{ backgroundColor: theme.text, color: theme.bg }}>HOST</span>}
            </p>
          </div>
          <button
            onClick={onLeave}
            className="px-5 py-2 font-medium rounded-lg border-2 transition-all duration-200 text-sm focus:outline-none focus:ring-4 focus:ring-white/50"
            style={{ backgroundColor: theme.accent, color: theme.text, borderColor: theme.text }}
            aria-label="Leave the lobby"
          >
            Leave
          </button>
        </div>

        {error && (
          <div 
            className="mb-6 px-4 py-3 rounded-lg text-sm font-medium"
            style={{ backgroundColor: theme.text, color: theme.bg }}
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        {/* Game Settings - Only visible to host */}
        {isHost && (
          <div 
            className="p-6 rounded-lg border-2 space-y-4"
            style={{ backgroundColor: theme.accent, borderColor: theme.text }}
          >
            <h2 className="text-lg font-bold mb-4" style={{ color: theme.text }}>
              Game Settings
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Round Time */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                  Round Time: {settings.roundTime}s
                </label>
                <input
                  type="range"
                  min="30"
                  max="180"
                  step="15"
                  value={settings.roundTime}
                  onChange={(e) => handleSettingChange('roundTime', parseInt(e.target.value))}
                  className="w-full h-2 bg-neutral-700 rounded-full appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: theme.text, opacity: 0.6 }}>
                  <span>30s</span>
                  <span>180s</span>
                </div>
              </div>

              {/* Max Rounds */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                  Max Rounds: {settings.maxRounds}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={settings.maxRounds}
                  onChange={(e) => handleSettingChange('maxRounds', parseInt(e.target.value))}
                  className="w-full h-2 bg-neutral-700 rounded-full appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: theme.text, opacity: 0.6 }}>
                  <span>1</span>
                  <span>10</span>
                </div>
              </div>

              {/* Max Players */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                  Max Players: {settings.maxPlayers}
                </label>
                <input
                  type="range"
                  min="2"
                  max="12"
                  step="1"
                  value={settings.maxPlayers}
                  onChange={(e) => handleSettingChange('maxPlayers', parseInt(e.target.value))}
                  className="w-full h-2 bg-neutral-700 rounded-full appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: theme.text, opacity: 0.6 }}>
                  <span>2</span>
                  <span>12</span>
                </div>
              </div>

              {/* Hints Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium" style={{ color: theme.text }}>
                  Enable Hints
                </label>
                <button
                  onClick={() => handleSettingChange('hintsEnabled', !settings.hintsEnabled)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    settings.hintsEnabled ? 'bg-white' : 'bg-neutral-600'
                  }`}
                  aria-pressed={settings.hintsEnabled}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-neutral-900 transition-transform ${
                      settings.hintsEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Display for Non-Host Players */}
        {!isHost && (
          <div 
            className="p-4 rounded-lg border-2"
            style={{ backgroundColor: theme.accent, borderColor: theme.text, opacity: 0.8 }}
          >
            <h3 className="text-sm font-medium mb-2 uppercase tracking-wide" style={{ color: theme.text }}>
              Game Settings
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Round Time: <span className="font-bold">{settings.roundTime}s</span></div>
              <div>Max Rounds: <span className="font-bold">{settings.maxRounds}</span></div>
              <div>Max Players: <span className="font-bold">{settings.maxPlayers}</span></div>
              <div>Hints: <span className="font-bold">{settings.hintsEnabled ? 'On' : 'Off'}</span></div>
            </div>
          </div>
        )}

        <div className="mb-2 sm:mb-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium uppercase tracking-wide" style={{ color: theme.text, opacity: 0.7 }}>
              Players ({players.length}/{settings.maxPlayers})
            </h2>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1 text-xs font-medium rounded transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-white/50"
              style={{ backgroundColor: theme.text, color: theme.bg }}
              aria-label="Copy room code to clipboard"
            >
              {copied ? '✓ Copied!' : 'Copy Code'}
            </button>
          </div>
          <div className="space-y-2">
            {players.map((player, index) => (
              <div
                key={player.id}
                className="p-4 rounded-lg border-2 transition-all duration-200 flex items-center gap-3"
                style={{ backgroundColor: theme.accent, borderColor: theme.text }}
                role="listitem"
                aria-label={`Player ${index + 1}: ${player.username}`}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ backgroundColor: theme.text, color: theme.bg }}>
                  {player.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <span className="font-medium" style={{ color: theme.text }}>{player.username}</span>
                  {player.id === socket.id && (
                    <span className="ml-2 text-xs" style={{ color: theme.text, opacity: 0.6 }}>(You)</span>
                  )}
                  {index === 0 && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded" style={{ backgroundColor: theme.text, color: theme.bg }}>Host</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

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
              className="w-full font-medium py-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-white/50"
              style={{ backgroundColor: theme.text, color: theme.bg }}
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
            <div className="w-3 h-3 rounded-full mb-3 mx-auto opacity-50 animate-pulse" style={{ backgroundColor: theme.text }}></div>
            <p className="text-sm" style={{ color: theme.text, opacity: 0.7 }}>Waiting for host to start the game...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GameLobby;

