import express from 'express';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment';
import winston from 'winston';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3500;

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const expressServer = app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'chatterbox' },
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'chatterbox.log' }),
    ],
});

const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5500', 'http://127.0.0.1:5500'],
    },
});

const authenticatedUsers = [];

cron.schedule('*/10 * * * *', () => {
    io.sockets.sockets.forEach((socket) => {
        const currentTime = moment();
        const lastActivityTime = moment(socket.lastActivity || 0);
        const inactiveDuration = moment.duration(currentTime.diff(lastActivityTime)).asMinutes();

        if (inactiveDuration >= 10) {
            socket.emit('popUpMessage', 'You have been inactive for too long.');
        }
    });

    console.log('Checking user activity...');
    logger.info('Checking user activity...');
});

import i18next from 'i18next';
import Backend from 'i18next-node-fs-backend';
import i18nextMiddleware from 'i18next-express-middleware';

i18next
    .use(Backend)
    .use(i18nextMiddleware.LanguageDetector)
    .init({
        backend: {
            loadPath: path.join(__dirname, 'locales/{{lng}}/{{ns}}.json'),
        },
        supportedLngs: ['en', 'fr', 'es'],
        fallbackLng: 'en',
        preload: ['en'],
        ns: ['common'],
        defaultNS: 'common',
        debug: false,
    });

app.use(i18nextMiddleware.handle(i18next));

io.on('connection', (socket) => {
    const formattedConnectionTime = moment().format('HH:mm:ss');

    console.log(`User ${socket.id} connected at ${formattedConnectionTime}`);

    socket.on('authenticate', (username) => {
        if (authenticatedUsers.includes(username)) {
            socket.emit('authenticationError', 'Username is already taken. Please choose another.');
        } else {
            authenticatedUsers.push(username);
            socket.emit('authenticationSuccess', `Welcome, ${username}!`);
            io.emit('username', `Hello and welcome to Chatterbox, ${username}!`);
            
            socket.broadcast.emit('message', `User ${username} connected.`);
        }
    });

    socket.on('message', (data) => {
        const formattedTime = moment().format('YYYY-MM-DD HH:mm:ss');
        const messageWithTime = `${formattedTime} - ${data.username}: ${data.message}`;
        io.emit('message', { username: data.username, message: messageWithTime });
    });

    socket.on('disconnect', () => {
        const username = authenticatedUsers.find((user) => {
            const userSocket = io.sockets.sockets.get(user);
            return userSocket && userSocket.id === socket.id;
        });

        if (username) {
            socket.broadcast.emit('message', `User ${username} disconnected.`);
            const index = authenticatedUsers.indexOf(username);
            if (index !== -1) {
                authenticatedUsers.splice(index, 1);
            }
        }
    });

    socket.on('activity', (name) => {
        socket.broadcast.emit('activity', name);
    });
});
