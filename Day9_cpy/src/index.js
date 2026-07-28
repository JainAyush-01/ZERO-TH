const express = require('express');
const app = express();
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
require('dotenv').config();
const main = require('./config/db');
const cookieParser = require('cookie-parser');
const authRouter = require('./routes/userAuth');
const redisClient = require('./config/redis');
const problemRouter = require('./routes/problemCreator');
const submitRouter = require('./routes/submit');
const discussionRouter = require('./routes/discussion'); 
const forumRouter = require('./routes/forum');
const Discussion = require('./models/discussion');
const interviewRouter = require('./routes/interview');
const adminRouter = require('./routes/admin');
const contestRouter = require('./routes/contest');
const aiRouter = require('./routes/ai');
const masteryRouter = require('./routes/mastery');

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:3000",
            "https://zero-th.vercel.app"
        ],
        methods: ["GET", "POST"],
        credentials: true
    }
});

const allowedOrigins = [
  "http://localhost:3000", 
  "https://zero-th.vercel.app" 
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) { 
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true 
}));

app.use(express.json());
app.use(cookieParser());

app.use("/user", authRouter);
app.use("/problem", problemRouter);
app.use("/submission", submitRouter);
app.use("/discussion", discussionRouter); 
app.use("/forum", forumRouter);
app.use("/interview", interviewRouter);
app.use("/admin-api", adminRouter);
app.use("/contest", contestRouter);
app.use("/ai", aiRouter);
app.use("/mastery", masteryRouter);

io.on('connection', (socket) => {
    console.log('User Connected:', socket.id);
    
    // --- DISCUSSION ROOM LOGIC ---
    socket.on('join_room', (problemId) => {
        socket.join(problemId);
    });

    socket.on('send_message', async (data) => {
        try {
            const newMsg = await Discussion.create({
                problemId: data.problemId,
                userId: data.userId,
                message: data.message
            });
            const fullMsg = await newMsg.populate('userId', 'firstName role');
            io.to(data.problemId).emit('receive_message', fullMsg);
        } catch (err) {
            console.error("Socket Error:", err);
        }
    });

    // --- INTERVIEW ROOM LOGIC (SECURE) ---
    socket.on('join_interview', async ({ roomId, userId }) => {
        const room = io.sockets.adapter.rooms.get(roomId);
        const size = room ? room.size : 0;
        
        // MAANG FIX: Strict block for 3rd person to prevent WebRTC crashes
        if (size >= 2) {
             socket.emit('room_full'); 
             socket.disconnect(); // Force disconnect the 3rd user so they can't send WebRTC signals
             return;
        }

        socket.join(roomId);
        
        const ownerId = await redisClient.get(`interview_room:${roomId}`);
        const isHost = (ownerId === userId);
        
        socket.emit('role_assigned', { isHost });
        socket.to(roomId).emit('user_joined', socket.id);
    });

    socket.on('layout_change', async (data) => {
        const ownerId = await redisClient.get(`interview_room:${data.roomId}`);
        if (ownerId === data.userId) {
            io.to(data.roomId).emit('layout_update', data.mode);
        }
    });

    // WebRTC Signaling
    socket.on('offer', (data) => socket.to(data.roomId).emit('offer', data.payload));
    socket.on('answer', (data) => socket.to(data.roomId).emit('answer', data.payload));
    socket.on('ice_candidate', (data) => socket.to(data.roomId).emit('ice_candidate', data.payload));

    // MAANG FIX: Removed the duplicate stdin_change event!
    socket.on('stdin_change', (data) => {
        socket.to(data.roomId).emit('stdin_update', data.stdin);
    });
    
    socket.on('code_change', (data) => socket.to(data.roomId).emit('code_update', data.code));

    socket.on('language_change', (data) => {
        socket.to(data.roomId).emit('language_update', data.language);
    });

    socket.on('output_sync', (data) => {
        socket.to(data.roomId).emit('output_update', data.output);
    });

    socket.on('disconnecting', () => {
        const rooms = Array.from(socket.rooms);
        rooms.forEach(roomId => socket.to(roomId).emit('user_disconnected', socket.id));
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected', socket.id);
    });
});

const InitializeConnection = async () => {
    try {
        await Promise.all([main(), redisClient.connect()]);
        console.log("DB & Redis Connected");

        const PORT = process.env.PORT || 5000;
        server.listen(PORT, "0.0.0.0", () => {
             console.log(`Server running on Port ${PORT}`);
        });
    } catch (err) {
        console.error("Startup Error:", err);
    }
}

InitializeConnection();