import { Router } from 'express';
import Message from '../models/Message';
const router = Router();

router.get('/:chatId/messages', async (req, res) => {
    const messages = await Message.find({ chatId: req.params.chatId }).sort({ createdAt: 1 });
    res.json(messages);
});

router.post('/:chatId/message', async (req, res) => {
    try {
        const { text, sender } = req.body;
        const message = new Message({ chatId: req.params.chatId, text, sender });
        await message.save();
        res.json(message);
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

export default router;
