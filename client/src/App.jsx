import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useSocket } from './hooks/useSocket';
import Home from './components/Home';
import Game from './components/Game';

function App() {
  const socket = useSocket();
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');

  if (!socket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-xl">Connecting to server...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            <Home 
              socket={socket} 
              username={username}
              setUsername={setUsername}
              setRoomCode={setRoomCode}
            />
          } 
        />
        <Route 
          path="/game/:roomCode" 
          element={
            <Game 
              socket={socket} 
              username={username}
              roomCode={roomCode}
            />
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;



