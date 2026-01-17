
import React, { useState, useEffect } from 'react';
import { Project, Subject } from './types';
import { dbService } from './services/dbService';
import { Dashboard } from './components/Dashboard';
import { Workspace } from './components/Workspace';
import { Plus } from './components/Icons';

const App: React.FC = () => {
    const [view, setView] = useState<'dashboard' | 'workspace'>('dashboard');
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    const [newName, setNewName] = useState('');
    const [newSubject, setNewSubject] = useState<Subject>(Subject.Physics);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        const all = await dbService.getAllProjects();
        setProjects(all.sort((a, b) => b.createdAt - a.createdAt));
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        const newProject: Project = {
            id: crypto.randomUUID(),
            name: newName,
            subject: newSubject,
            createdAt: Date.now(),
            pages: [],
            pageCount: 0
        };

        await dbService.saveProject(newProject);
        setProjects([newProject, ...projects]);
        setActiveProjectId(newProject.id);
        setView('workspace');
        setIsCreateModalOpen(false);
        setNewName('');
    };

    const handleDeleteProject = async (id: string) => {
        if (!confirm("Are you sure you want to delete this notebook? This action is permanent.")) return;
        await dbService.deleteProject(id);
        setProjects(projects.filter(p => p.id !== id));
    };

    const handleSaveProject = async (updated: Project) => {
        await dbService.saveProject(updated);
        setProjects(projects.map(p => p.id === updated.id ? updated : p));
    };

    const activeProject = projects.find(p => p.id === activeProjectId);

    return (
        <div className="min-h-screen">
            {view === 'dashboard' ? (
                <Dashboard 
                    projects={projects} 
                    onCreate={() => setIsCreateModalOpen(true)} 
                    onOpen={(id) => { setActiveProjectId(id); setView('workspace'); }}
                    onDelete={handleDeleteProject}
                />
            ) : (
                activeProject && (
                    <Workspace 
                        project={activeProject} 
                        onBack={() => setView('dashboard')} 
                        onSave={handleSaveProject}
                    />
                )
            )}

            {/* Create Project Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">New PDF Notebook</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleCreateProject} className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Select Subject</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {Object.values(Subject).map(s => (
                                        <button 
                                            key={s} 
                                            type="button" 
                                            onClick={() => setNewSubject(s)}
                                            className={`py-2 text-xs font-bold rounded-lg border transition-all ${newSubject === s ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Notebook Title</label>
                                <input 
                                    type="text" 
                                    value={newName} 
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g., Physics Mechanics Notes" 
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
                                    autoFocus
                                />
                            </div>

                            <button 
                                type="submit" 
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-100 transition-all transform active:scale-[0.98]"
                            >
                                Start Workspace
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
