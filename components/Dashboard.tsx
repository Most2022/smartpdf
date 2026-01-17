
import React from 'react';
import { Project, Subject } from '../types';
import { Plus, Trash2, BookOpen } from './Icons';

interface DashboardProps {
    projects: Project[];
    onCreate: () => void;
    onOpen: (id: string) => void;
    onDelete: (id: string) => void;
}

const subjectColors: Record<Subject, string> = {
    [Subject.Physics]: 'border-blue-500 text-blue-600 bg-blue-50',
    [Subject.Chemistry]: 'border-orange-500 text-orange-600 bg-orange-50',
    [Subject.Math]: 'border-red-500 text-red-600 bg-red-50',
    [Subject.PCM]: 'border-purple-500 text-purple-600 bg-purple-50',
    [Subject.Custom]: 'border-gray-500 text-gray-600 bg-gray-50',
};

export const Dashboard: React.FC<DashboardProps> = ({ projects, onCreate, onOpen, onDelete }) => {
    return (
        <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">My Smart Notebooks</h1>
                    <p className="text-slate-500 mt-2 text-lg">Organize and master your academic PDF collection.</p>
                </div>
                <button 
                    onClick={onCreate}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-200 transition-all transform active:scale-95"
                >
                    <Plus />
                    New Notebook
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {projects.map(project => (
                    <div 
                        key={project.id} 
                        className={`notebook-card group relative bg-white rounded-2xl p-6 border-l-[6px] shadow-sm flex flex-col justify-between h-56 cursor-pointer ${subjectColors[project.subject] || 'border-slate-300'}`}
                        onClick={() => onOpen(project.id)}
                    >
                        <div>
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-white/60 border border-current">
                                    {project.subject}
                                </span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 />
                                </button>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mt-4 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                                {project.name}
                            </h3>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                                <BookOpen />
                                <span>{project.pageCount} Pages</span>
                            </div>
                            <div className="text-slate-300 text-xs">
                                {new Date(project.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                ))}
                
                {projects.length === 0 && (
                    <div 
                        onClick={onCreate}
                        className="col-span-full h-56 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                    >
                        <div className="p-4 bg-slate-50 rounded-full group-hover:bg-indigo-100 transition-colors">
                            <Plus />
                        </div>
                        <p className="mt-4 font-medium">Create your first notebook to get started</p>
                    </div>
                )}
            </div>
        </div>
    );
};
