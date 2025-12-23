import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useSocket } from './hooks/useSocket';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ThemeSelector from './components/ThemeSelector';
import Home from './components/Home';
import Game from './components/Game';

function AppContent() {
  const socket = useSocket();
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const { theme, applyTheme, hasTheme } = useTheme();
  const [showThemeSelector, setShowThemeSelector] = useState(!hasTheme());

  const location = useLocation();
  const handleThemeSelect = (selectedTheme) => {
    applyTheme(selectedTheme);
    setShowThemeSelector(false);
  };

  if (!socket) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ 
          backgroundColor: theme.bg,
          color: theme.text
        }}
      >
        <div className="text-xl">Connecting to server...</div>
      </div>
    );
  }

  return (
    <>
      {showThemeSelector && <ThemeSelector onThemeSelect={handleThemeSelect} />}
      
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

      {!showThemeSelector && !location.pathname.startsWith('/game') && (
        <button
          onClick={() => setShowThemeSelector(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 px-4 py-3 rounded-full font-semibold shadow-lg transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-4"
          style={{ backgroundColor: theme.text, color: theme.bg, boxShadow: '0 10px 25px rgba(0,0,0,0.25)' }}
          aria-label="Change theme"
        >
          Theme
        </button>
      )}
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;



