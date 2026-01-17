
import { openDB, IDBPDatabase } from 'idb';
import { Project, FileRecord } from '../types';

const DB_NAME = 'SmartPDFDB_v2';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export async function getDB() {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
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
    return dbPromise;
}

export const dbService = {
    async getAllProjects(): Promise<Project[]> {
        try {
            const db = await getDB();
            return await db.getAll('projects');
        } catch (e) {
            console.error("Failed to get projects", e);
            return [];
        }
    },
    async saveProject(project: Project): Promise<void> {
        const db = await getDB();
        await db.put('projects', project);
    },
    async deleteProject(id: string): Promise<void> {
        const db = await getDB();
        await db.delete('projects', id);
        
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
        const db = await getDB();
        await db.put('files', fileRecord);
    },
    async getFile(id: string): Promise<FileRecord | undefined> {
        const db = await getDB();
        return await db.get('files', id);
    }
};
