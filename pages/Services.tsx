
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Service } from '../types';

const Services: React.FC = () => {
    const { services, addService, updateService, deleteService } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);

    // Form states
    const [name, setName] = useState('');
    const [price, setPrice] = useState<number | ''>('');
    const [duration, setDuration] = useState<number | ''>(60);
    const [category, setCategory] = useState('Servicios de Uñas');

    const categories = [
        'Cortes',
        'Servicios de Uñas',
        'Retiros',
        'Depilación y Epilación',
        'Bienestar',
        'Otros'
    ];

    const openCreateModal = () => {
        setEditingService(null);
        setName('');
        setPrice('');
        setDuration(60);
        setCategory('Servicios de Uñas');
        setIsModalOpen(true);
    };

    const openEditModal = (service: Service) => {
        setEditingService(service);
        setName(service.name);
        setPrice(service.price);
        setDuration(service.duration);
        setCategory(service.category);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || price === '' || duration === '') return;

        const serviceData = {
            name,
            price: Number(price),
            duration: Number(duration),
            category
        };

        if (editingService) {
            await updateService(editingService.id, serviceData);
        } else {
            await addService(serviceData);
        }
        setIsModalOpen(false);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este servicio?')) {
            setIsDeleting(id);
            await deleteService(id);
            setIsDeleting(null);
        }
    };

    const formatPrice = (price: number) => {
        return `$${price.toLocaleString('es-CO')}`;
    };

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto w-full flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex flex-col gap-2">
                    <h2 className="text-3xl md:text-4xl font-black text-text-main-light dark:text-text-main-dark tracking-tight leading-tight">Configuración de Servicios</h2>
                    <p className="text-text-sec-light dark:text-text-sec-dark text-lg font-normal">Gestiona los servicios, precios y duraciones de tu salón.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center justify-center gap-2 rounded-full h-12 px-6 bg-primary text-text-main-light dark:text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 group"
                >
                    <span className="material-symbols-outlined">add</span>
                    <span className="text-base font-bold tracking-wide">Nuevo Servicio</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                    <div key={service.id} className="bg-card-light dark:bg-card-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <button
                                onClick={() => openEditModal(service)}
                                className="size-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center hover:scale-110 transition-transform"
                                title="Editar"
                            >
                                <span className="material-symbols-outlined text-sm">edit</span>
                            </button>
                            <button
                                onClick={() => handleDelete(service.id)}
                                disabled={isDeleting === service.id}
                                className="size-8 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
                                title="Eliminar"
                            >
                                <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">{service.category}</span>
                                <h3 className="text-xl font-bold text-text-main-light dark:text-white leading-tight">{service.name}</h3>
                            </div>

                            <div className="flex items-end justify-between mt-2">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-text-sec-light dark:text-text-sec-dark uppercase tracking-widest">Precio</span>
                                    <span className="text-2xl font-black text-green-600 dark:text-green-400">{formatPrice(service.price)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-text-sec-light dark:text-text-sec-dark bg-background-light dark:bg-background-dark px-3 py-1.5 rounded-full border border-border-light dark:border-border-dark">
                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                    <span className="text-xs font-bold">{service.duration} min</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal de Creación/Edición */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-card-light dark:bg-card-dark rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 bg-primary text-white flex justify-between items-center">
                            <h3 className="text-xl font-bold">{editingService ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="hover:rotate-90 transition-transform">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold pl-1">Nombre del Servicio</label>
                                <input
                                    required
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej: Semipermanente Manos"
                                    className="w-full h-12 px-4 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark outline-none focus:border-primary transition-all font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold pl-1">Precio ($)</label>
                                    <input
                                        required
                                        type="number"
                                        step="500"
                                        min="0"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                        placeholder="55000"
                                        className="w-full h-12 px-4 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark outline-none focus:border-primary transition-all font-bold text-green-600"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold pl-1">Duración (min)</label>
                                    <input
                                        required
                                        type="number"
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value === '' ? '' : Number(e.target.value))}
                                        placeholder="60"
                                        className="w-full h-12 px-4 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark outline-none focus:border-primary transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold pl-1">Categoría</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full h-12 px-4 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark outline-none focus:border-primary transition-all font-medium appearance-none"
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-4 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 h-12 rounded-xl font-bold text-text-sec-light hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 h-12 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
                                >
                                    {editingService ? 'Guardar Cambios' : 'Crear Servicio'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Services;
