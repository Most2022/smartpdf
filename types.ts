
export enum Subject {
    Physics = 'Physics',
    Chemistry = 'Chemistry',
    Math = 'Math',
    PCM = 'PCM',
    Custom = 'Custom'
}

export interface PDFPage {
    id: string;
    pdfId: string;
    pageIndex: number;
    thumbnail: string;
    width: number;
    height: number;
    isStarred?: boolean;
}

export interface Project {
    id: string;
    name: string;
    subject: Subject;
    createdAt: number;
    pages: PDFPage[];
    pageCount: number;
}

export interface FileRecord {
    id: string;
    projectId: string;
    data: ArrayBuffer;
}
