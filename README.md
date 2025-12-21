# Pictionary Party

A real-time multiplayer Pictionary game built with React, Socket.io, and Node.js.

## Features

- 🎨 Real-time collaborative drawing canvas
- 👥 Support for 2-4+ players
- 🎯 Word guessing with scoring system
- ⏱️ 90-second rounds with timer
- 🏆 Score tracking and winner display
- 🎵 Sound effects for game events
- 📱 Responsive design (mobile-friendly)

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Socket.io Client
- **Backend**: Node.js, Express, Socket.io
- **Deployment**: Vercel (frontend), Render (backend)

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd drawdotio
```

2. Install backend dependencies:
```bash
cd server
npm install
```

3. Install frontend dependencies:
```bash
cd ../client
npm install
```

### Running Locally

1. Start the backend server:
```bash
cd server
npm start
```
Server will run on `http://localhost:3001`

2. Start the frontend dev server:
```bash
cd client
npm run dev
```
Frontend will run on `http://localhost:5173`

3. Open `http://localhost:5173` in your browser

### Environment Variables

**Server** (`server/.env`):
```
PORT=3001
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

**Client** (`client/.env`):
```
VITE_SOCKET_URL=http://localhost:3001
```

## How to Play

1. Enter your username
2. Create a room or join an existing room with a 6-character code
3. Wait for at least 2 players to join
4. Click "Start Game" when ready
5. Drawer selects a word from 3 options
6. Draw the word while others guess
7. Earn points by guessing correctly (faster = more points)
8. Play 3 rounds, highest score wins!

## Deployment

### Backend (Render)

1. Push your code to GitHub
2. Create a new Web Service on Render
3. Connect your GitHub repository
4. Set build command: `npm install`
5. Set start command: `node index.js`
6. Add environment variables:
   - `PORT`: 3001
   - `CLIENT_URL`: (your frontend URL)
   - `NODE_ENV`: production

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set root directory to `client`
3. Set framework preset to Vite
4. Add environment variable:
   - `VITE_SOCKET_URL`: (your backend URL from Render)
5. Deploy

## Project Structure

```
drawdotio/
├── server/
│   ├── index.js              # Express server & Socket.io setup
│   ├── roomManager.js        # Room management logic
│   ├── gameLogic.js          # Game state & round management
│   ├── timerManager.js       # Round timer handling
│   ├── words.json            # Word list for the game
│   ├── socketHandlers/       # Socket event handlers
│   │   ├── roomHandler.js
│   │   ├── gameHandler.js
│   │   ├── drawingHandler.js
│   │   └── guessHandler.js
│   └── middleware/
│       └── validation.js     # Input validation
└── client/
    ├── src/
    │   ├── components/       # React components
    │   │   ├── Home.jsx
    │   │   ├── Game.jsx
    │   │   ├── GameLobby.jsx
    │   │   ├── GameView.jsx
    │   │   ├── Canvas.jsx
    │   │   ├── Chat.jsx
    │   │   ├── PlayerList.jsx
    │   │   ├── WordSelection.jsx
    │   │   ├── RoundTransition.jsx
    │   │   ├── GameEndScreen.jsx
    │   │   └── Confetti.jsx
    │   ├── hooks/
    │   │   └── useSocket.js  # Socket.io hook
    │   ├── utils/
    │   │   └── sounds.js     # Sound effects
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── config.js
    └── package.json
```

## License

MIT



