import { useState } from 'react';

const themes = [
  {
    id: 'classic',
    name: 'Classic',
    bg: '#000000',
    text: '#FFFFFF',
    accent: '#1A1A1A',
    preview1: '#000000',
    preview2: '#FFFFFF'
  },
  {
    id: 'ocean',
    name: 'Ocean',
    bg: '#0A192F',
    text: '#64FFDA',
    accent: '#172A45',
    preview1: '#0A192F',
    preview2: '#64FFDA'
  },
  {
    id: 'sunset',
    name: 'Sunset',
    bg: '#1A0B2E',
    text: '#FF6B9D',
    accent: '#2E1A47',
    preview1: '#1A0B2E',
    preview2: '#FF6B9D'
  },
  {
    id: 'forest',
    name: 'Forest',
    bg: '#0D1B1E',
    text: '#7DFF7D',
    accent: '#1C3738',
    preview1: '#0D1B1E',
    preview2: '#7DFF7D'
  },
  {
    id: 'mocha',
    name: 'Mocha',
    bg: '#2B1B17',
    text: '#E8C4A2',
    accent: '#3D2B23',
    preview1: '#2B1B17',
    preview2: '#E8C4A2'
  },
  {
    id: 'cyber',
    name: 'Cyber',
    bg: '#000D1A',
    text: '#00F0FF',
    accent: '#001A33',
    preview1: '#000D1A',
    preview2: '#00F0FF'
  },
  {
    id: 'lavender',
    name: 'Lavender',
    bg: '#1A0F29',
    text: '#D4ADFC',
    accent: '#2E1F47',
    preview1: '#1A0F29',
    preview2: '#D4ADFC'
  },
  {
    id: 'neon',
    name: 'Neon',
    bg: '#0A0A0A',
    text: '#39FF14',
    accent: '#1A1A1A',
    preview1: '#0A0A0A',
    preview2: '#39FF14'
  }
];

function ThemeSelector({ onThemeSelect }) {
  const [selectedTheme, setSelectedTheme] = useState('classic');

  const handleConfirm = () => {
    const theme = themes.find(t => t.id === selectedTheme);
    onThemeSelect(theme);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-labelledby="theme-selector-title"
      aria-modal="true"
    >
      <div className="bg-neutral-900 rounded-lg p-6 sm:p-8 border-2 border-white max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h1 
          id="theme-selector-title"
          className="text-3xl sm:text-4xl font-black text-white mb-2 text-center"
        >
          Choose Your Theme
        </h1>
        <p className="text-neutral-400 text-sm text-center mb-6 sm:mb-8 uppercase tracking-wide">
          Select a color scheme for your game
        </p>

        {/* Theme Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setSelectedTheme(theme.id)}
              className={`relative rounded-lg border-2 transition-all duration-200 overflow-hidden group ${
                selectedTheme === theme.id 
                  ? 'border-white ring-4 ring-white/50 scale-105' 
                  : 'border-neutral-700 hover:border-white hover:scale-105'
              }`}
              aria-label={`Select ${theme.name} theme`}
              aria-pressed={selectedTheme === theme.id}
            >
              {/* Theme Preview */}
              <div className="aspect-square flex flex-col">
                <div 
                  className="flex-1"
                  style={{ backgroundColor: theme.preview1 }}
                />
                <div 
                  className="flex-1"
                  style={{ backgroundColor: theme.preview2 }}
                />
              </div>
              
              {/* Theme Name */}
              <div 
                className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <span className="text-white font-bold text-sm sm:text-base uppercase tracking-wide">
                  {theme.name}
                </span>
              </div>

              {/* Selected Indicator */}
              {selectedTheme === theme.id && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Selected Theme Info */}
        <div className="mb-6 p-4 bg-black rounded-lg border-2 border-neutral-800">
          <p className="text-neutral-400 text-xs uppercase tracking-wide mb-2">Selected Theme</p>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <div 
                className="w-8 h-8 rounded border-2 border-white"
                style={{ backgroundColor: themes.find(t => t.id === selectedTheme)?.preview1 }}
              />
              <div 
                className="w-8 h-8 rounded border-2 border-white"
                style={{ backgroundColor: themes.find(t => t.id === selectedTheme)?.preview2 }}
              />
            </div>
            <span className="text-white font-bold text-lg">
              {themes.find(t => t.id === selectedTheme)?.name}
            </span>
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          className="w-full bg-white hover:bg-neutral-200 text-black font-bold py-4 rounded-lg transition-all duration-200 uppercase tracking-wide focus:outline-none focus:ring-4 focus:ring-white/50"
          aria-label="Confirm theme selection"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default ThemeSelector;
