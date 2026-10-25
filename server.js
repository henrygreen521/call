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

// Serve static frontend files from "public" directory
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join a specific video room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', socket.id);

    // Relay WebRTC SDP Offer
    socket.on('offer', (data) => {
      socket.to(data.target).emit('offer', {
        sdp: data.sdp,
        caller: socket.id
      });
    });

    // Relay WebRTC SDP Answer
    socket.on('answer', (data) => {
      socket.to(data.target).emit('answer', {
        sdp: data.sdp,
        responder: socket.id
      });
    });

    // Relay ICE Candidates
    socket.on('ice-candidate', (data) => {
      socket.to(data.target).emit('ice-candidate', {
        candidate: data.candidate,
        from: socket.id
      });
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', socket.id);
    });
  });
});

// Render automatically sets PORT via environment variable
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
