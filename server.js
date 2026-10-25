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

app.use(express.static(path.join(__dirname, 'public')));

// Store room occupancy
const rooms = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join a room with maximum 4 people limit
  socket.on('join-room', (roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    const numClients = room ? room.size : 0;

    // Room limit check (max 4 people)
    if (numClients >= 4) {
      socket.emit('room-full', { message: 'Room is full (Maximum 4 participants).' });
      return;
    }

    // Get list of existing users in the room BEFORE joining
    const existingUsers = Array.from(room || []);

    socket.join(roomId);
    socket.roomId = roomId;

    // Send the list of current participants to the newly joined user
    socket.emit('all-users', existingUsers);

    // Relay WebRTC Offer to target peer
    socket.on('offer', (data) => {
      io.to(data.target).emit('offer', {
        sdp: data.sdp,
        caller: socket.id
      });
    });

    // Relay WebRTC Answer to target peer
    socket.on('answer', (data) => {
      io.to(data.target).emit('answer', {
        sdp: data.sdp,
        responder: socket.id
      });
    });

    // Relay ICE Candidates to target peer
    socket.on('ice-candidate', (data) => {
      io.to(data.target).emit('ice-candidate', {
        candidate: data.candidate,
        from: socket.id
      });
    });

    // Handle disconnection
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
