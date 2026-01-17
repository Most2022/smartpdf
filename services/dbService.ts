
import * as idb from 'idb';
import { Project, FileRecord } from '../types';

const DB_NAME = 'SmartPDFDB_v2';
const DB_VERSION = 1;

export async function initDB() {
    return idb.openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('projects')) {
                db.createObjectStore('projects', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('files')) {
                db.createObjectStore('files', { keyPath: 'id' });
            }
        },
    });
}

export const dbService = {
    async getAllProjects(): Promise<Project[]> {
        const db = await initDB();
        return db.getAll('projects');
    },
    async saveProject(project: Project): Promise<void> {
        const db = await initDB();
        await db.put('projects', project);
    },
    async deleteProject(id: string): Promise<void> {
        const db = await initDB();
        await db.delete('projects', id);
        // Clean up associated files (ideally using an index, but for simplicity here:)
        const tx = db.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        let cursor = await store.openCursor();
        while (cursor) {
            if (cursor.value.projectId === id) {
                await cursor.delete();
            }
            cursor = await cursor.continue();
        }
    },
    async saveFile(fileRecord: FileRecord): Promise<void> {
        const db = await initDB();
        await db.put('files', fileRecord);
    },
    async getFile(id: string): Promise<FileRecord | undefined> {
        const db = await initDB();
        return db.get('files', id);
    }
};
