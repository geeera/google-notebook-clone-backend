import mongoose from 'mongoose';

const Sender = {
    AI_BOT: 0,
    USER: 1
};

const MessageSchema = new mongoose.Schema({
    chatId: { type: String, required: true },
    text: { type: String, required: true },
    pages: [
        {
            page: { type: Number },
            label: { type: String }
        }
    ],
    sender: { type: Number, enum: [Sender.AI_BOT, Sender.USER], required: true }
}, { timestamps: true });

export default mongoose.model('Message', MessageSchema);
