import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

import cors from 'cors';
import {Settings} from "llamaindex";
import { HuggingFaceEmbedding } from '@llamaindex/huggingface';
import * as mongoose from "mongoose";

import chatRoutes from "./routes/chat";
import messageRoutes from "./routes/message";
import http from "http";
import { Server } from 'socket.io';
import Message from "./models/Message";
import Chat from "./models/Chat";
import {loadIndex, queryWithMetadata} from "./llama/loader";
import {OpenAI} from "@llamaindex/openai";

Settings.embedModel = new HuggingFaceEmbedding({
// @ts-ignore
    modelName: 'sentence-transformers/all-MiniLM-L6-v2'
});
Settings.llm = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    model: "gpt-4o-mini",
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors({
    origin: process.env.CORS_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

app.use((req, res, next) => {
    // console.log('--- Incoming request ---');
    req.on('data', chunk => {
        // console.log(chunk.toString());
    });
    next();
});

app.use(express.json());

app.use("/chat", chatRoutes);
app.use("/chat", messageRoutes);

const PORT = 3000;
const MONGO_DB_URI = process.env.MONGO_DB_URI;

if (MONGO_DB_URI) {
    mongoose.connect(MONGO_DB_URI).then((db) => {
        console.log("MongoDB connected");

        server.listen(PORT, () => {
            io.on('connection', (socket) => {
                console.log('User is connected with ID:', socket.id);

                socket.on('send_message', async ({ chatId, text }) => {
                    console.log(`Message in ${chatId}: ${text}`);

                    await Message.create({ chatId, text, sender: 0 });

                    io.to(chatId).emit('new_message', { chatId, text, sender: 0 });

                    const chat = await Chat.findOne({ chatId });
                    if (!chat) return io.to(chatId).emit('error', { error: 'chat not found' });

                    const index = await loadIndex(chat.get('fileId'));
                    if (!index) return io.to(chatId).emit('error', { error: 'index load failed' });
                    const result = await queryWithMetadata(text, index);
                    const entity = {
                        chatId: chatId,
                        sender: 1,
                        text: result.answer,
                        pages: result?.pages || []
                    }
                    await Message.create(entity);

                    io.to(chatId).emit('new_message', entity);
                });

                socket.on('join_chat', (chatId) => {
                    socket.join(chatId);
                    console.log(`User ${socket.id} join to chat with ID: ${chatId}`);
                });

                socket.on('disconnect', () => {
                    console.log('User was disconnected', socket.id);
                });
            });
        })

        app.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
        });
    });
}
