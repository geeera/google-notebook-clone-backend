import {Router} from 'express';
import {v4} from "uuid";
import {createAndPersistIndex} from "../llama/loader";
import multer from "multer";

import Chat from '../models/Chat';
import mongoose from "mongoose";
import {Db, GridFSBucket} from "mongodb";
import {getFileFromGridFS} from "../utils/functions/getFileFromGridFS";
import fs from "fs-extra";
import path from "path";

const storage = multer.memoryStorage();
const upload = multer({ dest: 'src/uploads/', storage: storage });
const router = Router();

const FILES_BUCKET_NAME = 'pdfs';
const UPLOADS = path.resolve('./src/uploads');
await fs.ensureDir(UPLOADS);

router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req?.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const chatId = v4();
        const file = req.file;
        const fileName = file.filename || file.originalname || `file-${Date.now()}.pdf`
        const filePath = path.join(UPLOADS, fileName);
        fs.writeFileSync(filePath, file.buffer);

        let bucket: GridFSBucket | null = null;
        if (mongoose.connection.db instanceof Db) {
            bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
                bucketName: FILES_BUCKET_NAME
            });
        }

        if (bucket === null) {
            throw new Error("GridFSBucket is not connected");
        }

        const uploadStream = bucket.openUploadStream(file.originalname);
        console.time('Upload started')
        const fileId = uploadStream.id.toString();
        console.log('fileId', fileId);

        uploadStream.on('finish', async () => {
            console.timeEnd('Upload finished');
            console.time('Start safe file');
            const savedFile = await Chat.create({
                chatId,
                filePersistDirPath: fileId,
                fileId,
            });
            console.timeEnd('End safe file');
            res.json(savedFile);
        });

        uploadStream.on('error', (err) => {
            console.error(err);
            res.status(500).json({ error: err.message });
        });

        console.log('Calling uploadStream.end()');
        uploadStream.end(file.buffer);
        await createAndPersistIndex(filePath, fileId);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err });
    }
});

router.get('/:chatId/file', async (req, res) => {
    const chat = await Chat.findOne({ chatId: req.params.chatId });
    if (!chat) {
        return res.status(400).json({ error: 'No chat found with chatId' });
    }
    const file = await getFileFromGridFS(chat.get('fileId'), FILES_BUCKET_NAME);
    if (!file) {
        return res.status(400).json({ error: 'No file found' });
    }
    const fileSizeInBytes = file.length;
    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="document.pdf"`,
        'Content-Length': fileSizeInBytes
    });

    res.send(file);
});

export default router;
