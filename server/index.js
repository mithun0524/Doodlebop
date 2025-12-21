const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const RoomManager = require('./roomManager');
const timerManager = require('./timerManager');
const { handleRoomEvents } = require('./socketHandlers/roomHandler');
const { handleGameEvents } = require('./socketHandlers/gameHandler');
const { handleDrawingEvents } = require('./socketHandlers/drawingHandler');
const { handleGuessEvents } = require('./socketHandlers/guessHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const roomManager = new RoomManager();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Draw.io server is running' });
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  try {
    // Handle all events
    handleRoomEvents(socket, io, roomManager);
    handleGameEvents(socket, io, roomManager);
    handleDrawingEvents(socket, io, roomManager);
    handleGuessEvents(socket, io, roomManager, timerManager);
  } catch (error) {
    console.error('Error setting up socket handlers:', error);
  }

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    try {
      const room = roomManager.getRoomBySocketId(socket.id);
      
      if (room) {
        roomManager.removePlayer(socket.id);
        
        // Notify other players
        io.to(room.code).emit('player-left', {
          players: room.players
        });
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
