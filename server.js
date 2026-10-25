const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Serve room.html for any 4-digit URL path (e.g. /1234)
app.get('/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  // Simple validation to ensure it's a 4-digit code route
  if (/^\d{4}$/.test(roomId)) {
    res.sendFile(path.join(__dirname, 'public', 'room.html'));
  } else {
    res.status(404).send('Invalid Room URL');
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-room', (roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    const numClients = room ? room.size : 0;

    if (numClients >= 4) {
      socket.emit('room-full', { message: 'Room is full (Maximum 4 participants).' });
      return;
    }

    const existingUsers = Array.from(room || []);
    socket.join(roomId);
    socket.roomId = roomId;

    socket.emit('all-users', existingUsers);

    socket.on('offer', (data) => {
      io.to(data.target).emit('offer', { sdp: data.sdp, caller: socket.id });
    });

    socket.on('answer', (data) => {
      io.to(data.target).emit('answer', { sdp: data.sdp, responder: socket.id });
    });

    socket.on('ice-candidate', (data) => {
      io.to(data.target).emit('ice-candidate', { candidate: data.candidate, from: socket.id });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      if (socket.roomId) {
        socket.to(socket.roomId).emit('user-disconnected', socket.id);
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
