import { Server } from "socket.io";
import express from "express";
import http from 'http';
import Redis from 'ioredis';


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',  // Allow all origins
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
    },
});
const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT as string, 10) || 6379,  // Convert to integer
});

redis.on('connect', () => {
    console.log('Connected to Redis');
});

redis.on('error', (error) => {
    console.error('Error connecting to Redis:', error);
    process.exit(1);  // Exit the process with a failure code
});

const clearRedisDatabase = async () => {
    try {
        await redis.flushdb();
        console.log('Redis database has been cleared.');
    } catch (err) {
        console.error('Error clearing Redis database:', err);
    }
};
clearRedisDatabase();

io.on('connection', async (socket) => {
    console.log('Number of connected clients:', io.engine.clientsCount);
    console.log('A USER IS CONNECTED', socket.id, "userId:", socket.handshake.query.userId);
    const userId = socket.handshake.query.userId as string;
    if (userId) {
        await redis.hset('userSocketMap', userId, socket.id);
    }
    const users = await redis.hkeys('userSocketMap');

    io.emit('getOnlineUsers', users);

    socket.on("disconnect", async () => {
        console.log('USER DISCONNECTED', socket.id);
        await redis.hdel('userSocketMap', userId);
        const otherUsers = await redis.hkeys('userSocketMap');
        io.emit('getOnlineUsers', otherUsers);

    })
})

export const getRecieverSocketId = async (recieverId: string) => {

    return await redis.hget('userSocketMap', recieverId);

};
export { server, io, app, redis };