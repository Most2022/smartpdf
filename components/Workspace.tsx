
import React, { useState, useRef, useEffect } from 'react';
import { Project, PDFPage, Subject } from '../types';
import { dbService } from '../services/dbService';
import { aiService } from '../services/geminiService';
import { ArrowLeft, Trash2, Download, Upload, Sparkles, Bot, Maximize, ExternalLink, ChevronLeft, ChevronRight, Star } from './Icons';

// Global PDF.js and PDF-Lib declarations
declare const pdfjsLib: any;
declare const PDFLib: any;

interface WorkspaceProps {
    project: Project;
    onBack: () => void;
    onSave: (project: Project) => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({ project, onBack, onSave }) => {
    const [pages, setPages] = useState<PDFPage[]>(project.pages || []);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState<string | null>(null);
    const [aiResult, setAiResult] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize PDF.js worker
    useEffect(() => {
        if (typeof pdfjsLib !== 'undefined') {
            // Using a specific CDN version to match the script in index.html (3.11.174)
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
        }
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') nextPage();
            if (e.key === 'ArrowLeft') prevPage();
            if (e.key === 'Escape') setIsFullscreen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pages.length, selectedIndex]);

    const nextPage = () => {
        setSelectedIndex(prev => (prev < pages.length - 1 ? prev + 1 : prev));
    };

    const prevPage = () => {
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        if (typeof pdfjsLib === 'undefined') {
            alert("PDF engine is still loading. Please try again in a moment.");
            return;
        }

        setLoading('Processing PDFs...');
        try {
            const newPages: PDFPage[] = [];
            for (const fileObj of files) {
                const file = fileObj as File;
                const buffer = await file.arrayBuffer();
                const pdfId = crypto.randomUUID();
                
                await dbService.saveFile({ id: pdfId, projectId: project.id, data: buffer });
                
                const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
                const pdf = await loadingTask.promise;
                
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d')!;
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    await page.render({ canvasContext: context, viewport }).promise;
                    
                    newPages.push({
                        id: crypto.randomUUID(),
                        pdfId,
                        pageIndex: i - 1,
                        thumbnail: canvas.toDataURL('image/png'),
                        width: viewport.width,
                        height: viewport.height,
                        isStarred: false
                    });
                }
            }
            
            const updatedPages = [...pages, ...newPages];
            setPages(updatedPages);
            onSave({ ...project, pages: updatedPages, pageCount: updatedPages.length });
        } catch (err) {
            console.error("PDF Processing Error:", err);
            alert("Failed to process PDF file. Make sure it's a valid document.");
        } finally {
            setLoading(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const toggleStar = (idx: number) => {
        const updated = pages.map((p, i) => i === idx ? { ...p, isStarred: !p.isStarred } : p);
        setPages(updated);
        onSave({ ...project, pages: updated });
    };

    const removePage = (idx: number) => {
        if (!confirm("Remove this page from the notebook?")) return;
        const updated = pages.filter((_, i) => i !== idx);
        setPages(updated);
        if (selectedIndex >= updated.length) setSelectedIndex(Math.max(0, updated.length - 1));
        onSave({ ...project, pages: updated, pageCount: updated.length });
    };

    const handleExport = async (onlyStarred: boolean = false) => {
        const pagesToExport = onlyStarred ? pages.filter(p => p.isStarred) : pages;
        if (pagesToExport.length === 0) {
            alert(onlyStarred ? "No starred pages to export!" : "No pages to export!");
            return;
        }

        if (typeof PDFLib === 'undefined') {
            alert("Export library is still loading...");
            return;
        }

        setLoading(onlyStarred ? 'Generating Starred PDF...' : 'Merging PDF...');
        try {
            const mergedPdf = await PDFLib.PDFDocument.create();
            const loadedFiles: Record<string, any> = {};

            for (let i = 0; i < pagesToExport.length; i++) {
                const p = pagesToExport[i];
                if (!loadedFiles[p.pdfId]) {
                    const fileRecord = await dbService.getFile(p.pdfId);
                    if (fileRecord) {
                        loadedFiles[p.pdfId] = await PDFLib.PDFDocument.load(fileRecord.data);
                    }
                }
                if (loadedFiles[p.pdfId]) {
                    const [copiedPage] = await mergedPdf.copyPages(loadedFiles[p.pdfId], [p.pageIndex]);
                    mergedPdf.addPage(copiedPage);
                }
            }

            const pdfBytes = await mergedPdf.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = onlyStarred ? `${project.name}_Starred_Collection.pdf` : `${project.name}_Full_Merged.pdf`;
            a.click();
            
            setTimeout(() => URL.revokeObjectURL(url), 100);
        } catch (err) {
            console.error("Export Error:", err);
            alert("Export failed.");
        } finally {
            setLoading(null);
        }
    };

    const handleOpenInBrowser = async () => {
        const p = pages[selectedIndex];
        if (!p) return;
        setLoading('Opening Source PDF...');
        try {
            const fileRecord = await dbService.getFile(p.pdfId);
            if (fileRecord) {
                const blob = new Blob([fileRecord.data], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
            }
        } catch (e) {
            alert("Could not open file.");
        } finally {
            setLoading(null);
        }
    };

    const runAnalyze = async () => {
        setLoading('AI is analyzing...');
        setAiResult(null);
        try {
            const res = await aiService.analyzeNotebook(project.name, project.subject, pages.length);
            setAiResult(res);
        } catch (e) {
            alert("AI Analysis failed.");
        } finally {
            setLoading(null);
        }
    };

    const runExplainPage = async () => {
        const currentPage = pages[selectedIndex];
        if (!currentPage) return;
        setLoading('AI explaining page...');
        setAiResult(null);
        try {
            const res = await aiService.explainPage(currentPage.thumbnail);
            setAiResult(res);
        } catch (e) {
            alert("AI explanation failed.");
        } finally {
            setLoading(null);
        }
    };

    const starredCount = pages.filter(p => p.isStarred).length;

    return (
        <div className="h-screen flex flex-col bg-slate-50 overflow-hidden relative">
            {!isFullscreen && (
                <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-30 shadow-sm">
                    <div className="flex items-center gap-6">
                        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                            <ArrowLeft />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 leading-none">{project.name}</h2>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">
                                {project.subject} • {pages.length} Pages • {starredCount} Starred
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={runAnalyze} 
                            disabled={!!loading || pages.length === 0}
                            className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-sm font-semibold transition-all border border-purple-200 disabled:opacity-50"
                        >
                            <Sparkles />
                            Analyze Notebook
                        </button>
                        
                        <button 
                            onClick={() => handleExport(true)} 
                            disabled={!!loading || starredCount === 0}
                            className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2 rounded-lg text-sm font-semibold transition-all border border-amber-200 disabled:opacity-50"
                        >
                            <Star fill="currentColor" />
                            Starred PDF
                        </button>

                        <label className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold transition-all border border-indigo-200 cursor-pointer disabled:opacity-50">
                            <Upload />
                            Add PDFs
                            <input type="file" multiple accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} disabled={!!loading} />
                        </label>
                        
                        <button 
                            onClick={() => handleExport(false)} 
                            disabled={!!loading || pages.length === 0}
                            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-md disabled:opacity-50"
                        >
                            <Download />
                            Full Export
                        </button>
                    </div>
                </header>
            )}

            {loading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-indigo-900 font-bold animate-pulse-soft">{loading}</p>
                </div>
            )}

            <main className={`flex-1 flex overflow-hidden ${isFullscreen ? 'bg-slate-950' : ''}`}>
                {!isFullscreen && (
                    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col z-20">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Page Thumbnails</h3>
                            {pages.length > 0 && (
                                <button onClick={runExplainPage} className="text-purple-600 p-1 hover:bg-purple-50 rounded" title="AI Explain Page">
                                    <Bot />
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {pages.map((p, i) => (
                                <div 
                                    key={p.id} 
                                    onClick={() => setSelectedIndex(i)}
                                    className={`relative group rounded-xl border-2 transition-all p-1 cursor-pointer overflow-hidden ${selectedIndex === i ? 'border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-100' : 'border-slate-100 hover:border-slate-300'} ${p.isStarred ? 'border-amber-400 bg-amber-50/50' : ''}`}
                                >
                                    <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[9px] px-1.5 py-0.5 rounded font-bold z-10 flex items-center gap-1">
                                        {i + 1}
                                        {p.isStarred && <Star fill="currentColor" />}
                                    </div>
                                    
                                    <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all z-10">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); removePage(i); }}
                                            className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-lg"
                                            title="Delete Page"
                                        >
                                            <Trash2 />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleStar(i); }}
                                            className={`p-1.5 rounded-lg shadow-lg ${p.isStarred ? 'bg-amber-400 text-white hover:bg-amber-500' : 'bg-white text-slate-400 hover:text-slate-600'}`}
                                            title={p.isStarred ? "Unstar Page" : "Star Page"}
                                        >
                                            <Star fill={p.isStarred ? "currentColor" : "none"} />
                                        </button>
                                    </div>
                                    <img src={p.thumbnail} className="w-full aspect-[1/1.41] object-contain rounded-lg bg-white" alt={`Page ${i + 1}`} />
                                </div>
                            ))}
                        </div>
                    </aside>
                )}

                <div className="flex-1 relative flex flex-col overflow-hidden">
                    <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
                        {pages[selectedIndex] && (
                            <>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); toggleStar(selectedIndex); }}
                                    className={`p-2 rounded-lg shadow-lg border flex items-center gap-2 text-sm font-bold transition-all ${pages[selectedIndex].isStarred ? 'bg-amber-400 border-amber-300 text-white hover:bg-amber-500' : isFullscreen ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    title={pages[selectedIndex].isStarred ? "Starred" : "Star This Page"}
                                >
                                    <Star fill={pages[selectedIndex].isStarred ? "currentColor" : "none"} />
                                </button>
                                <button 
                                    onClick={handleOpenInBrowser}
                                    className={`p-2 rounded-lg shadow-lg border flex items-center gap-2 text-sm font-bold transition-all ${isFullscreen ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    title="Open Source in Chrome Browser"
                                >
                                    <ExternalLink />
                                    Open in Browser
                                </button>
                                <button 
                                    onClick={() => setIsFullscreen(!isFullscreen)}
                                    className={`p-2 rounded-lg shadow-lg border transition-all ${isFullscreen ? 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    title={isFullscreen ? "Exit Full Scale" : "Full Scale View"}
                                >
                                    <Maximize />
                                </button>
                            </>
                        )}
                    </div>

                    {pages.length > 1 && (
                        <>
                            <button 
                                onClick={prevPage}
                                className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full z-40 shadow-xl transition-all ${selectedIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-110'} ${isFullscreen ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-800 hover:bg-slate-50'}`}
                            >
                                <ChevronLeft />
                            </button>
                            <button 
                                onClick={nextPage}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full z-40 shadow-xl transition-all ${selectedIndex === pages.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-110'} ${isFullscreen ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-800 hover:bg-slate-50'}`}
                            >
                                <ChevronRight />
                            </button>
                        </>
                    )}

                    <div className="flex-1 overflow-auto flex flex-col items-center justify-center p-4">
                        {pages[selectedIndex] ? (
                            <div 
                                className={`transition-all transform animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center ${isFullscreen ? 'w-full h-full justify-center p-8' : ''}`}
                            >
                                <div 
                                    className={`bg-white shadow-2xl rounded-sm border overflow-hidden relative ${pages[selectedIndex].isStarred ? 'ring-4 ring-amber-400' : ''} ${isFullscreen ? 'border-slate-800' : 'border-slate-200'}`}
                                    style={{ 
                                        width: isFullscreen ? 'auto' : 'min(850px, 95%)',
                                        height: isFullscreen ? '90vh' : 'auto',
                                        aspectRatio: isFullscreen ? 'unset' : `${pages[selectedIndex].width}/${pages[selectedIndex].height}`
                                    }}
                                >
                                    <img 
                                        src={pages[selectedIndex].thumbnail} 
                                        className={`w-full h-full object-contain ${isFullscreen ? 'p-2' : ''}`} 
                                        alt={`Page ${selectedIndex + 1}`} 
                                    />
                                </div>
                                
                                <div className={`mt-4 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 ${isFullscreen ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                                    Page {selectedIndex + 1} of {pages.length}
                                    {pages[selectedIndex].isStarred && <Star fill="currentColor" />}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                <p className="text-lg font-medium">Select a page or upload PDFs</p>
                            </div>
                        )}
                    </div>

                    {aiResult && !isFullscreen && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 max-w-3xl w-[90%] bg-white rounded-2xl shadow-2xl border-t-4 border-purple-500 overflow-hidden animate-in slide-in-from-bottom-8 duration-300 z-50">
                            <div className="flex items-center justify-between p-4 bg-purple-50/50 border-b border-purple-100">
                                <div className="flex items-center gap-3 text-purple-700">
                                    <Sparkles />
                                    <h4 className="font-bold">AI Insight</h4>
                                </div>
                                <button onClick={() => setAiResult(null)} className="text-slate-400 hover:text-slate-600 p-1">
                                    ✕
                                </button>
                            </div>
                            <div className="p-6 max-h-64 overflow-y-auto prose prose-slate prose-sm text-slate-700 custom-scrollbar">
                                <p className="whitespace-pre-wrap leading-relaxed">{aiResult}</p>
                            </div>
                            <div className="bg-slate-50 px-6 py-2 border-t border-slate-100">
                                <p className="text-[10px] text-slate-400 font-medium">Powered by Google Gemini 3 Flash • Real-time Academic analysis</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
