import mongoose  from 'mongoose';

const ChatSchema = new mongoose.Schema({
    chatId: { type: String, required: true, unique: true },
    fileId: { type: String, required: true },
    filePersistDirPath: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('Chat', ChatSchema);
