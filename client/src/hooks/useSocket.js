import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
      timeout: 20000
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      reconnectAttemptsRef.current = 0;
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      
      // If server closed the connection or transport closed, stop trying to reconnect
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log('Server disconnected, stopping reconnection attempts');
        newSocket.io.opts.reconnection = false;
      }
    });

    newSocket.on('connect_error', (error) => {
      reconnectAttemptsRef.current++;
      
      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        console.error('Max reconnection attempts reached. Please refresh the page or check if the server is running.');
        newSocket.io.opts.reconnection = false;
      } else {
        console.error(`Socket connection error (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}):`, error.message);
      }
    });

    newSocket.on('reconnect_failed', () => {
      console.error('Failed to reconnect to server. Please refresh the page.');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return socket;
}

