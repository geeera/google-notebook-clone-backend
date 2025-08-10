import {Document, storageContextFromDefaults, VectorStoreIndex} from "llamaindex";
import fs from "fs-extra";
import PDFParser from "pdf2json";
import path from "path";

const STORAGE_ROOT = path.resolve('./src/storage');
await fs.ensureDir(STORAGE_ROOT);

const indexCache = new Map<string, VectorStoreIndex>();


export async function createAndPersistIndex(filePath: string, fileId: string) {
    const index = await createIndexFromPDF(filePath, fileId);

    try {
        if (index) {
            indexCache.set(fileId, index);
            return { index, persistDirPath: fileId };
        }
        return { index, persistDirPath: fileId };
    } catch (err) {
        console.warn('persist failed (maybe automatic):', err);
    }
}

export async function loadIndex(fileIndex: string) {
    if (indexCache.has(fileIndex)) return indexCache.get(fileIndex)!;

    const persistDir = path.join(STORAGE_ROOT, fileIndex);
    if (!fs.existsSync(persistDir)) return null;

    const storageContext = await storageContextFromDefaults({ persistDir });
    const index = await VectorStoreIndex.init({ storageContext });
    indexCache.set(fileIndex, index);
    return index;
}

export async function createIndexFromPDF(filePath: string, persistDir: string): Promise<VectorStoreIndex | null> {
    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return null;
    }

    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser();

        pdfParser.on('pdfParser_dataError', errData => {
            console.error('Parsing error PDF:', errData.parserError);
            reject(null);
        });

        pdfParser.on('pdfParser_dataReady', async (pdfData: any) => {
            try {
                const docs = pdfData.Pages.map((page: any, pageIndex: number) => {
                    if (!page.Texts) return '';

                    const pageText = page.Texts.map((textObj: any) => {
                        if (!textObj.R) return '';

                        const text = textObj.R.map((r: any) => r.T).join('');
                        return decodeURIComponent(text);
                    }).join(' ');

                    return new Document({
                        text: pageText,
                        metadata: {
                            page: pageIndex + 1,
                        }
                    });
                });

                const persistDirPath = path.join(STORAGE_ROOT, persistDir);
                const storageContext = await storageContextFromDefaults({ persistDir: persistDirPath });
                const index = await VectorStoreIndex.fromDocuments(docs, { storageContext });
                resolve(index);
            } catch (err) {
                console.error('The error of index creation:', err);
                reject(null);
            }
        });

        pdfParser.loadPDF(filePath);
    });
}


export async function queryWithMetadata(query: string, index: VectorStoreIndex) {
    const qe = await index.asQueryEngine({ similarityTopK: 5 });
    const result = await qe.query({ query: query });
    if (result.sourceNodes) {
        const pages = result.sourceNodes.map(({ node }) => {
            // console.log('Relations:', node.relationships)
            // console.log('Metadata:', node.metadata)
            return {
                page: node.metadata.page,
                label: `Page ${node.metadata.page}`
            }
        });

        const uniquePages = Array.from(new Map(pages.map(l => [l.page, l])).values());

        return {
            answer: result.toString?.() ?? String(result),
            pages: uniquePages
        };
    }
    const answer = result.toString?.() ?? String(result);
    return {
        answer
    }
}
