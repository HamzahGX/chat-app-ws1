import express from 'express';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3500;

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const expressServer = app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
});

const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5500', 'http://127.0.0.1:5500'],
    },
});

// Create an array to store authenticated usernames
const authenticatedUsers = [];

io.on('connection', (socket) => {
    console.log(`User ${socket.id} connected`);

    // Handle username authentication
    socket.on('authenticate', (username) => {
        if (authenticatedUsers.includes(username)) {
            // Username is already taken
            socket.emit('authenticationError', 'Username is already taken. Please choose another.');
        } else {
            // Store the authenticated username and inform the client
            authenticatedUsers.push(username);
            socket.emit('authenticationSuccess', `Welcome, ${username}!`);
        }
    });

    // Upon connection - only to user
    socket.emit('username', 'Hello and welcome to Chatterbox!');

    // Upon connection - to all others
    socket.broadcast.emit('message', `User ${socket.id.substring(0, 5)} connected`);

    // Listening for a message event
    socket.on('message', (data) => {
        console.log(data);
        io.emit('message', { username: data.username, message: data.message }); // Include username
    });

    // When a user disconnects - to all others
    socket.on('disconnect', () => {
        socket.broadcast.emit('message', `User ${socket.id.substring(0, 5)} disconnected`);
    });

    // Listen for activity
    socket.on('activity', (name) => {
        socket.broadcast.emit('activity', name);
    });
});
