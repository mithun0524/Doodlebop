import { useEffect, useState } from 'react';

export function useReconnect(socket) {
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const attemptReconnect = () => {
      const sessionToken = localStorage.getItem('sessionToken');
      const savedRoomCode = localStorage.getItem('roomCode');
      const savedUsername = localStorage.getItem('username');

      if (sessionToken && savedRoomCode && savedUsername) {
        setIsReconnecting(true);
        socket.emit('reconnect-player', { sessionToken });
      }
    };

    const handleConnect = () => {
      attemptReconnect();
    };

    const handleReconnectSuccess = () => {
      setIsReconnecting(false);
    };

    const handleReconnectError = () => {
      setIsReconnecting(false);
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('roomCode');
      localStorage.removeItem('username');
    };

    // Try to reconnect on mount if we have a session
    if (socket.connected) {
      attemptReconnect();
    }

    socket.on('connect', handleConnect);
    socket.on('reconnect-success', handleReconnectSuccess);
    socket.on('reconnect-error', handleReconnectError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('reconnect-success', handleReconnectSuccess);
      socket.off('reconnect-error', handleReconnectError);
    };
  }, [socket]);

  return { isReconnecting };
}

export function saveSession(roomCode, username, sessionToken) {
  localStorage.setItem('sessionToken', sessionToken);
  localStorage.setItem('roomCode', roomCode);
  localStorage.setItem('username', username);
}

export function clearSession() {
  localStorage.removeItem('sessionToken');
  localStorage.removeItem('roomCode');
  localStorage.removeItem('username');
}

export function getSession() {
  return {
    sessionToken: localStorage.getItem('sessionToken'),
    roomCode: localStorage.getItem('roomCode'),
    username: localStorage.getItem('username')
  };
}
