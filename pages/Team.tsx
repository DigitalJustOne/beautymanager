import React, { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import { Professional } from '../types';

const Team: React.FC = () => {
    const { professionals, addProfessional, updateProfessional, deleteProfessional } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProId, setEditingProId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Lista de servicios disponibles para asignar
    const availableServices = [
        'Corte de Cabello',
        'Esmaltado Tradicional',
        'Semipermanente Hombre',
        'Semipermanente Pies',
        'Semipermanente Manos',
        'Nivelación Base Ruber',
        'Builder Gel',
        'Dipping',
        'Soft Gel',
        'Retiro (Solo Retiro)',
        'Depilación de Axilas',
        'Epilación de Cejas',
        'Epilación y Sombreado de Cejas en Henna',
        'Masaje Relajante'
    ];

    // Estado del formulario
    const [formData, setFormData] = useState({
        name: '',
        role: '',
        avatar: '',
        specialties: [] as string[]
    });

    const resetForm = () => {
        setFormData({ name: '', role: '', avatar: '', specialties: [] });
        setEditingProId(null);
    };

    const handleOpenModal = (pro?: Professional) => {
        if (pro) {
            setEditingProId(pro.id);
            setFormData({
                name: pro.name,
                role: pro.role,
                avatar: pro.avatar,
                specialties: pro.specialties
            });
        } else {
            resetForm();
            setFormData(prev => ({ ...prev, avatar: `https://ui-avatars.com/api/?name=New+Pro&background=random` }));
        }
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.role) return;

        if (editingProId) {
            updateProfessional(editingProId, formData);
        } else {
            addProfessional({
                id: Date.now(),
                ...formData
            });
        }
        setIsModalOpen(false);
        resetForm();
    };

    const handleDelete = (id: number) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar a este profesional del equipo?')) {
            deleteProfessional(id);
        }
    };

    const toggleSpecialty = (service: string) => {
        setFormData(prev => {
            const exists = prev.specialties.includes(service);
            if (exists) {
                return { ...prev, specialties: prev.specialties.filter(s => s !== service) };
            } else {
                return { ...prev, specialties: [...prev.specialties, service] };
            }
        });
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, avatar: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center py-8 px-4 sm:px-6">
            <div className="w-full max-w-[1200px] flex flex-col gap-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-[#111618] dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Mi Equipo</h1>
                        <p className="text-[#617c89] dark:text-slate-400 text-base font-normal">Gestiona los profesionales y sus permisos en el salón.</p>
                    </div>
                    <button 
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 cursor-pointer overflow-hidden rounded-full h-12 px-6 bg-primary hover:bg-sky-600 text-white shadow-lg shadow-primary/30 transition-all active:scale-95 group"
                    >
                        <span className="material-symbols-outlined text-[20px] group-hover:rotate-90 transition-transform">add</span>
                        <span className="text-sm font-bold leading-normal tracking-[0.015em] truncate">Agregar Profesional</span>
                    </button>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {professionals.map(pro => (
                        <div key={pro.id} className="bg-white dark:bg-card-dark rounded-2xl p-6 border border-[#dbe2e6] dark:border-[#2a3c45] shadow-sm hover:shadow-md transition-shadow relative group">
                            {/* Actions */}
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenModal(pro)} className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-primary hover:text-white rounded-full transition-colors text-gray-600">
                                    <span className="material-symbols-outlined text-lg">edit</span>
                                </button>
                                <button onClick={() => handleDelete(pro.id)} className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-red-500 hover:text-white rounded-full transition-colors text-gray-600">
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                            </div>

                            <div className="flex flex-col items-center mb-4">
                                <div className="size-20 rounded-full bg-cover bg-center border-4 border-gray-50 dark:border-gray-800 shadow-sm mb-3" style={{backgroundImage: `url("${pro.avatar}")`}}></div>
                                <h3 className="text-lg font-bold text-[#111618] dark:text-white">{pro.name}</h3>
                                <p className="text-sm text-primary font-medium">{pro.role}</p>
                            </div>

                            <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-4"></div>

                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase mb-3">Servicios Asignados</p>
                                <div className="flex flex-wrap gap-2">
                                    {pro.specialties.length > 0 ? (
                                        pro.specialties.map(spec => (
                                            <span key={spec} className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[11px] font-bold border border-gray-200 dark:border-gray-700">
                                                {spec}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">Sin servicios asignados</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {/* Add Card (Empty State) */}
                    <button 
                        onClick={() => handleOpenModal()}
                        className="flex flex-col items-center justify-center min-h-[300px] rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5 transition-all group"
                    >
                        <div className="size-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:scale-110 transition-transform mb-4">
                            <span className="material-symbols-outlined text-3xl text-gray-400 group-hover:text-primary">add</span>
                        </div>
                        <span className="font-bold text-gray-500 group-hover:text-primary">Agregar Nuevo Miembro</span>
                    </button>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white dark:bg-card-dark rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-primary text-white">
                            <h3 className="font-bold text-lg">{editingProId ? 'Editar Profesional' : 'Nuevo Profesional'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 rounded-full p-1"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                            {/* Avatar Upload */}
                            <div className="flex justify-center">
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="size-24 rounded-full bg-cover bg-center border-4 border-gray-100 dark:border-gray-700" style={{backgroundImage: `url("${formData.avatar}")`}}></div>
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="material-symbols-outlined text-white">camera_alt</span>
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <label className="flex flex-col gap-2">
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Nombre Completo</span>
                                    <input 
                                        required
                                        value={formData.name} 
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        className="form-input w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 h-12 text-sm focus:border-primary focus:ring-primary dark:text-white"
                                        placeholder="Ej: Laura Méndez"
                                    />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Cargo / Rol</span>
                                    <input 
                                        required
                                        value={formData.role} 
                                        onChange={e => setFormData({...formData, role: e.target.value})}
                                        className="form-input w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 h-12 text-sm focus:border-primary focus:ring-primary dark:text-white"
                                        placeholder="Ej: Manicurista Senior"
                                    />
                                </label>
                            </div>

                            <div>
                                <span className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Habilidades y Servicios</span>
                                <div className="flex flex-wrap gap-2">
                                    {availableServices.map(service => {
                                        const isSelected = formData.specialties.includes(service);
                                        return (
                                            <button
                                                type="button"
                                                key={service}
                                                onClick={() => toggleSpecialty(service)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                    isSelected 
                                                    ? 'bg-primary text-white border-primary shadow-sm' 
                                                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                                }`}
                                            >
                                                {isSelected && <span className="mr-1">✓</span>}
                                                {service}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Team;