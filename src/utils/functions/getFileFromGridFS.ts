import mongoose from 'mongoose';
import {GridFSBucket, ObjectId} from 'mongodb';

export async function getFileFromGridFS(fileId: string, bucketName: string): Promise<Buffer> {
    const db = mongoose.connection.db;
    if (!db) {
        throw new Error('MongoDB connection failed');
    }
    const bucket = new GridFSBucket(db, {
        bucketName: bucketName
    });

    return new Promise((resolve, reject) => {
        const chunks: any[] = [];
        const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));

        downloadStream.on('data', (chunk) => {
            chunks.push(chunk);
        });

        downloadStream.on('error', (err) => {
            reject(err);
        });

        downloadStream.on('end', () => {
            const fileBuffer = Buffer.concat(chunks);
            resolve(fileBuffer);
        });
    });
}
