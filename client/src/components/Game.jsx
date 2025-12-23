import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GameLobby from './GameLobby';
import GameView from './GameView';
import GameEndScreen from './GameEndScreen';

function Game({ socket, username, roomCode: propRoomCode }) {
  const { roomCode: urlRoomCode } = useParams();
  const roomCode = propRoomCode || urlRoomCode;
  const navigate = useNavigate();
  
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [showGame, setShowGame] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [finalScores, setFinalScores] = useState(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Handle session token storage
  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (data) => {
      if (data.sessionToken) {
        localStorage.setItem('sessionToken', data.sessionToken);
        localStorage.setItem('roomCode', data.roomCode);
        localStorage.setItem('username', username);
      }
    };

    const handleRoomJoined = (data) => {
      setPlayers(data.players || []);
      if (data.sessionToken) {
        localStorage.setItem('sessionToken', data.sessionToken);
        localStorage.setItem('roomCode', roomCode);
        localStorage.setItem('username', username);
      }
    };

    socket.on('room-created', handleRoomCreated);
    socket.on('room-joined', handleRoomJoined);

    return () => {
      socket.off('room-created', handleRoomCreated);
      socket.off('room-joined', handleRoomJoined);
    };
  }, [socket, roomCode, username]);

  useEffect(() => {
    if (!socket || !roomCode) return;

    const handlePlayerJoined = (data) => {
      setPlayers(data.players || []);
    };

    const handlePlayerLeft = (data) => {
      setPlayers(data.players || []);
    };

    const handleGameStarted = (data) => {
      console.log('Game: Received game-started', data);
      setGameState({
        ...data,
        currentRound: data.round,
        maxRounds: data.maxRounds,
        currentDrawer: data.currentDrawer,
        drawerId: data.drawerId,
        players: data.players || []
      });
      setShowGame(true);
      setGameEnded(false);
      setPlayers(data.players || []);
    };

    const handleGameEnded = (data) => {
      setGameEnded(true);
      setFinalScores(data);
      setShowGame(false);
    };

    const handleGameReset = () => {
      setGameState(null);
      setShowGame(false);
      setGameEnded(false);
      setFinalScores(null);
    };

    socket.on('player-joined', handlePlayerJoined);
    socket.on('player-left', handlePlayerLeft);
    socket.on('game-started', handleGameStarted);
    socket.on('game-ended', handleGameEnded);
    socket.on('game-reset', handleGameReset);

    return () => {
      socket.off('player-joined', handlePlayerJoined);
      socket.off('player-left', handlePlayerLeft);
      socket.off('game-started', handleGameStarted);
      socket.off('game-ended', handleGameEnded);
      socket.off('game-reset', handleGameReset);
    };
  }, [socket, roomCode]);

  const handleLeaveRoom = () => {
    socket.emit('leave-room');
    navigate('/');
  };

  if (gameEnded && finalScores) {
    return (
      <GameEndScreen
        socket={socket}
        finalScores={finalScores}
        onLeave={handleLeaveRoom}
      />
    );
  }

  if (showGame && gameState) {
    return (
      <GameView
        socket={socket}
        username={username}
        roomCode={roomCode}
        gameState={gameState}
        onLeave={handleLeaveRoom}
      />
    );
  }

  return (
    <GameLobby
      socket={socket}
      username={username}
      roomCode={roomCode}
      players={players}
      setPlayers={setPlayers}
      onLeave={handleLeaveRoom}
    />
  );
}

export default Game;

