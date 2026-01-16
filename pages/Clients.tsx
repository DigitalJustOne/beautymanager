import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Client, Appointment } from '../types';

const Clients: React.FC = () => {
    const { clients, appointments, addClient } = useData();
    
    // Estados para Modales
    const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    // Estados para Formulario Nuevo Cliente
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');
    const [newClientEmail, setNewClientEmail] = useState('');
    const [formError, setFormError] = useState<string | null>(null); // Nuevo estado para errores

    // Estados para Búsqueda y Paginación
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // --- LÓGICA DE FILTRADO Y PAGINACIÓN ---
    const filteredClients = clients.filter(client => 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm)
    );

    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Resetear a página 1 cuando se busca
    };

    // --- LÓGICA NUEVO CLIENTE ---
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value.length <= 10) setNewClientPhone(value);
        if (formError) setFormError(null); // Limpiar error al escribir
    };

    const handleCreateClient = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!newClientName || !newClientEmail || newClientPhone.length !== 10) return;

        // Validaciones de Duplicados
        const emailExists = clients.some(c => c.email.toLowerCase() === newClientEmail.toLowerCase());
        const phoneExists = clients.some(c => c.phone === newClientPhone);

        if (emailExists) {
            setFormError('El correo electrónico ya está registrado con otro cliente.');
            return;
        }

        if (phoneExists) {
            setFormError('El número de celular ya está registrado con otro cliente.');
            return;
        }

        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(newClientName)}&background=random`;

        addClient({
            id: Date.now(),
            name: newClientName,
            email: newClientEmail,
            phone: newClientPhone,
            lastVisit: 'Nuevo', // Valor inicial
            avatar: avatarUrl,
            isNew: true
        });

        // Reset y cerrar
        setNewClientName('');
        setNewClientPhone('');
        setNewClientEmail('');
        setFormError(null);
        setIsNewClientModalOpen(false);
        // Ir a la primera página para ver el nuevo cliente (si aplica filtro)
        setSearchTerm('');
        setCurrentPage(1);
    };

    const openNewClientModal = () => {
        setFormError(null);
        setNewClientName('');
        setNewClientPhone('');
        setNewClientEmail('');
        setIsNewClientModalOpen(true);
    };

    // --- HELPER DE ESTADO ---
    const getAppointmentStatus = (appt: Appointment) => {
        if (appt.status === 'cancelled') {
            return { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: 'cancel' };
        }

        // Calcular si ya pasó la fecha y hora
        if (appt.date) {
            const now = new Date();
            const apptDate = new Date(appt.date);
            const [hours, minutes] = appt.time.split(':').map(Number);
            apptDate.setHours(hours, minutes, 0, 0);

            if (now > apptDate) {
                return { label: 'Completado', color: 'bg-blue-100 text-blue-700', icon: 'check_circle' };
            }
        }

        if (appt.status === 'confirmed') {
            return { label: 'Confirmado', color: 'bg-green-100 text-green-700', icon: 'verified' };
        }
        
        return { label: 'Pendiente', color: 'bg-orange-100 text-orange-700', icon: 'schedule' };
    };

    // --- LÓGICA VER FICHA ---
    const getClientHistory = (clientName: string): Appointment[] => {
        return appointments.filter(appt => appt.client.toLowerCase() === clientName.toLowerCase())
                           .sort((a, b) => {
                               // Ordenar por fecha (si existe) o ID descendente
                               if (a.date && b.date) return b.date.getTime() - a.date.getTime();
                               return b.id - a.id;
                           });
    };

    return (
        <div className="flex-1 flex flex-col items-center py-8 px-4 sm:px-6">
            <div className="w-full max-w-[1200px] flex flex-col gap-6">
                {/* Heading */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-[#111618] dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Gestión de Clientes</h1>
                        <p className="text-[#617c89] dark:text-slate-400 text-base font-normal">Administra tu base de datos de contactos y citas.</p>
                    </div>
                    <button 
                        onClick={openNewClientModal}
                        className="flex items-center gap-2 cursor-pointer overflow-hidden rounded-full h-12 px-6 bg-primary hover:bg-sky-600 text-white shadow-lg shadow-primary/30 transition-all active:scale-95 group"
                    >
                        <span className="material-symbols-outlined text-[20px] group-hover:rotate-90 transition-transform">add</span>
                        <span className="text-sm font-bold leading-normal tracking-[0.015em] truncate">Nuevo Cliente</span>
                    </button>
                </div>
                
                {/* Search */}
                <div className="bg-white dark:bg-card-dark p-2 rounded-xl border border-[#e5e7eb] dark:border-[#2a3c45] shadow-sm">
                    <label className="flex items-center w-full h-12">
                        <div className="flex items-center justify-center pl-4 text-[#617c89] dark:text-slate-400">
                            <span className="material-symbols-outlined">search</span>
                        </div>
                        <input 
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="w-full h-full bg-transparent border-none focus:ring-0 text-[#111618] dark:text-white placeholder:text-[#9aaeb8] px-4 text-base font-normal" 
                            placeholder="Buscar por nombre, teléfono o correo..."
                        />
                        {searchTerm && (
                            <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="pr-4 text-gray-400 hover:text-gray-600">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        )}
                    </label>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-card-dark rounded-xl border border-[#dbe2e6] dark:border-[#2a3c45] shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full min-w-[800px]">
                            <thead>
                                <tr className="bg-[#f8fafc] dark:bg-[#152229] border-b border-[#dbe2e6] dark:border-[#2a3c45]">
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#617c89] dark:text-slate-400 w-[35%]">Cliente</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#617c89] dark:text-slate-400 w-[25%]">Celular</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#617c89] dark:text-slate-400 w-[25%]">Email</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-[#617c89] dark:text-slate-400 w-[15%]">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#dbe2e6] dark:divide-[#2a3c45]">
                                {currentClients.map((client) => (
                                    <tr key={client.id} className="group hover:bg-[#fcfdfd] dark:hover:bg-[#1f3039] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="size-10 rounded-full bg-cover bg-center shrink-0 border border-gray-100 dark:border-gray-700" style={{backgroundImage: `url("${client.avatar}")`}}></div>
                                                <div>
                                                    <p className="text-[#111618] dark:text-white text-sm font-bold">{client.name}</p>
                                                    <p className="text-[#617c89] dark:text-slate-400 text-xs">
                                                        {client.isNew ? 'Nuevo Cliente' : `Última visita: ${client.lastVisit}`}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center gap-2 text-[#111618] dark:text-gray-200">
                                                <span className="text-sm font-medium">{client.phone}</span>
                                                <a href={`https://wa.me/${client.phone}`} target="_blank" rel="noreferrer" className="material-symbols-outlined text-[18px] text-green-500 hover:scale-110 transition-transform cursor-pointer" title="Enviar WhatsApp">chat</a>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4"><span className="text-[#617c89] dark:text-slate-300 text-sm">{client.email}</span></td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => setSelectedClient(client)}
                                                className="text-primary hover:text-[#1a8bc5] hover:bg-primary/10 rounded-full px-4 py-2 text-xs font-bold transition-colors"
                                            >
                                                Ver Ficha
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredClients.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-20 text-gray-500">
                                            {searchTerm ? 'No se encontraron resultados para tu búsqueda.' : 'No hay clientes registrados aún.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-[#dbe2e6] dark:border-[#2a3c45] bg-[#f8fafc] dark:bg-[#152229] flex items-center justify-between">
                        <span className="text-xs text-[#617c89] dark:text-slate-400">
                            Mostrando {filteredClients.length === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredClients.length)} de {filteredClients.length} resultados
                        </span>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="size-9 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-gray-200 dark:hover:border-slate-600 text-[#111618] dark:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm disabled:shadow-none"
                            >
                                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                            </button>
                            
                            <span className="text-xs font-bold px-3 py-1 bg-white dark:bg-card-dark rounded-md border border-gray-200 dark:border-slate-700">
                                {currentPage} / {totalPages || 1}
                            </span>

                            <button 
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="size-9 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-gray-200 dark:hover:border-slate-600 text-[#111618] dark:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm disabled:shadow-none"
                            >
                                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MODAL NUEVO CLIENTE --- */}
            {isNewClientModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-border-light dark:border-border-dark animate-in zoom-in-95 duration-200 flex flex-col">
                        <div className="p-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-primary text-white shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined">person_add</span>
                                <h3 className="font-bold text-lg">Nuevo Cliente</h3>
                            </div>
                            <button onClick={() => setIsNewClientModalOpen(false)} className="hover:bg-white/20 rounded-full p-1 transition-colors"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <form onSubmit={handleCreateClient} className="p-6 flex flex-col gap-5">
                            {formError && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                                    <span className="material-symbols-outlined fill">error</span>
                                    <span className="text-sm font-bold">{formError}</span>
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-text-main-light dark:text-text-main-dark">Nombre Completo</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-sec-light">person</span>
                                    <input 
                                        required 
                                        type="text" 
                                        value={newClientName} 
                                        onChange={(e) => { setNewClientName(e.target.value); setFormError(null); }} 
                                        placeholder="Ej: María Pérez" 
                                        className="w-full rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark pl-10 pr-4 h-12 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:text-white outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-text-main-light dark:text-text-main-dark">Celular</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-sec-light">smartphone</span>
                                        <input 
                                            required 
                                            type="tel" 
                                            maxLength={10} 
                                            value={newClientPhone} 
                                            onChange={handlePhoneChange} 
                                            placeholder="10 dígitos" 
                                            className={`w-full rounded-xl border ${formError?.includes('celular') ? 'border-red-500' : 'border-border-light dark:border-border-dark'} bg-background-light dark:bg-background-dark pl-10 pr-4 h-12 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:text-white outline-none transition-all`}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-text-main-light dark:text-text-main-dark">Email</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-sec-light">mail</span>
                                        <input 
                                            required 
                                            type="email" 
                                            value={newClientEmail} 
                                            onChange={(e) => { setNewClientEmail(e.target.value); setFormError(null); }} 
                                            placeholder="cliente@email.com" 
                                            className={`w-full rounded-xl border ${formError?.includes('correo') ? 'border-red-500' : 'border-border-light dark:border-border-dark'} bg-background-light dark:bg-background-dark pl-10 pr-4 h-12 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:text-white outline-none transition-all`}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-2 pt-4 border-t border-border-light dark:border-border-dark">
                                <button type="button" onClick={() => setIsNewClientModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-text-sec-light dark:text-text-sec-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors">Cancelar</button>
                                <button type="submit" disabled={!newClientName || !newClientEmail || newClientPhone.length !== 10} className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[20px]">save</span>
                                    Guardar Cliente
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL VER FICHA CLIENTE (REDSEÑADO) --- */}
            {selectedClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedClient(null)}>
                    <div className="bg-white dark:bg-card-dark rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col relative" onClick={(e) => e.stopPropagation()}>
                        
                        <div className="flex-1 overflow-y-auto scrollbar-hide relative flex flex-col">
                            
                            {/* Header Blue Background */}
                            <div className="h-24 bg-primary w-full shrink-0 relative">
                                {/* Close Button - Top Right */}
                                <button 
                                    onClick={() => setSelectedClient(null)} 
                                    className="absolute top-4 right-4 bg-black/20 hover:bg-black/30 text-white rounded-full p-1.5 transition-colors backdrop-blur-sm z-10"
                                >
                                    <span className="material-symbols-outlined text-lg font-bold">close</span>
                                </button>
                            </div>

                            {/* Content Container */}
                            <div className="px-6 pb-8 flex flex-col items-center bg-white dark:bg-card-dark min-h-full">
                                
                                {/* Avatar - Overlapping */}
                                <div className="-mt-12 mb-3 relative z-10">
                                    <div className="size-24 rounded-full border-[5px] border-white dark:border-card-dark bg-cover bg-center bg-gray-200 shadow-sm" style={{backgroundImage: `url("${selectedClient.avatar}")`}}></div>
                                </div>

                                {/* Name & Email */}
                                <h3 className="text-xl font-black text-[#111618] dark:text-white text-center leading-tight">{selectedClient.name}</h3>
                                <p className="text-[#617c89] dark:text-slate-400 text-sm text-center font-medium mt-1">{selectedClient.email}</p>

                                {/* Contact Actions Row */}
                                <div className="flex items-center gap-3 w-full mt-6 mb-6">
                                    {/* Phone Button (Wide) */}
                                    <a href={`tel:${selectedClient.phone}`} className="flex-1 flex items-center justify-center gap-2 bg-[#f6f8fa] dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 h-12 rounded-2xl transition-colors group">
                                        <span className="material-symbols-outlined text-green-500 fill text-[22px] group-hover:scale-110 transition-transform">call</span>
                                        <span className="text-[#111618] dark:text-white font-bold text-sm">{selectedClient.phone}</span>
                                    </a>
                                    
                                    {/* Email Button (Circle) */}
                                    <a href={`mailto:${selectedClient.email}`} className="size-12 flex items-center justify-center bg-[#f6f8fa] dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors group shrink-0">
                                        <span className="material-symbols-outlined text-[#3b82f6] text-[22px] group-hover:scale-110 transition-transform">mail</span>
                                    </a>
                                </div>

                                {/* Stats Cards Row */}
                                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                                    {/* Status Card */}
                                    <div className="flex flex-col items-center justify-center p-4 rounded-3xl border border-[#f0f2f5] dark:border-slate-800 shadow-sm">
                                        <span className="text-[10px] font-bold text-[#9aaeb8] uppercase tracking-wider mb-1">ESTADO</span>
                                        <div className="flex items-center gap-1.5">
                                            {selectedClient.isNew && <span className="text-lg">✨</span>}
                                            <span className="text-sm font-black text-[#111618] dark:text-white">{selectedClient.isNew ? 'Nuevo' : 'Recurrente'}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Last Visit Card */}
                                    <div className="flex flex-col items-center justify-center p-4 rounded-3xl border border-[#f0f2f5] dark:border-slate-800 shadow-sm">
                                        <span className="text-[10px] font-bold text-[#9aaeb8] uppercase tracking-wider mb-1">ÚLTIMA VISITA</span>
                                        <span className="text-sm font-black text-[#111618] dark:text-white">{selectedClient.lastVisit}</span>
                                    </div>
                                </div>

                                {/* History Section */}
                                <div className="w-full">
                                    <h4 className="flex items-center gap-2 font-bold text-[#111618] dark:text-white text-sm mb-4">
                                        <span className="material-symbols-outlined text-primary text-[20px]">history</span>
                                        Historial de Citas
                                    </h4>
                                    
                                    <div className="flex flex-col gap-3">
                                        {getClientHistory(selectedClient.name).length > 0 ? (
                                            getClientHistory(selectedClient.name).map(appt => {
                                                const status = getAppointmentStatus(appt);
                                                return (
                                                    <div key={appt.id} className="flex items-center justify-between p-4 rounded-2xl border border-[#f0f2f5] dark:border-slate-800 hover:border-primary/30 transition-colors bg-white dark:bg-card-dark shadow-sm">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-bold text-sm text-[#111618] dark:text-white">{appt.service}</span>
                                                            <span className="text-xs font-medium text-[#617c89] capitalize">
                                                                {appt.date ? appt.date.toLocaleDateString('es-ES', {weekday: 'short', day: 'numeric', month: 'short'}) : 'Fecha desconocida'} • {appt.time}
                                                            </span>
                                                        </div>
                                                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${status.color}`}>
                                                            {status.label}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="p-8 text-center bg-[#f6f8fa] dark:bg-slate-800/50 rounded-2xl border border-dashed border-[#dbe2e6] dark:border-slate-700">
                                                <p className="text-sm text-[#617c89] font-medium">No hay historial disponible</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clients;