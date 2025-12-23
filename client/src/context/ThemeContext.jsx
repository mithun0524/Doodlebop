import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

const defaultTheme = {
  id: 'classic',
  name: 'Classic',
  bg: '#000000',
  text: '#FFFFFF',
  accent: '#1A1A1A',
  preview1: '#000000',
  preview2: '#FFFFFF'
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('doodlebop-theme');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (theme) {
      localStorage.setItem('doodlebop-theme', JSON.stringify(theme));
      // Apply theme to document root
      document.documentElement.style.setProperty('--bg-color', theme.bg);
      document.documentElement.style.setProperty('--text-color', theme.text);
      document.documentElement.style.setProperty('--accent-color', theme.accent);
    }
  }, [theme]);

  const applyTheme = (newTheme) => {
    setTheme(newTheme);
  };

  const hasTheme = () => {
    return theme !== null;
  };

  return (
    <ThemeContext.Provider value={{ theme: theme || defaultTheme, applyTheme, hasTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
