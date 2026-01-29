import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Client } from '../types';
import ClientModal from '../components/ClientModal';
import ClientDetailsModal from '../components/ClientDetailsModal';

const Clients: React.FC = () => {
    const { clients, addClient, updateClient, deleteClient, userProfile } = useData();
    const isAdmin = userProfile.role === 'admin';

    // Modal States
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null); // For Create/Edit Modal
    const [selectedClient, setSelectedClient] = useState<Client | null>(null); // For Details Modal

    // Search & Pagination States
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Filter Logic
    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm)
    );

    // Pagination Logic
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
        setCurrentPage(1);
    };

    // Actions
    const openCreateModal = () => {
        setClientToEdit(null);
        setIsClientModalOpen(true);
    };

    const openEditModal = (client: Client) => {
        setClientToEdit(client);
        setIsClientModalOpen(true);
    };

    const handleSaveClient = async (data: any) => {
        // Validation logic
        if (!data.name || !data.email || data.phone.length !== 10) {
            throw new Error("Datos incompletos.");
        }

        // Check duplicates
        const emailExists = clients.some(c => c.email.toLowerCase() === data.email.toLowerCase() && c.id !== data.id);
        const phoneExists = clients.some(c => c.phone === data.phone && c.id !== data.id);

        if (emailExists) throw new Error('El correo electrónico ya está registrado con otro cliente.');
        if (phoneExists) throw new Error('El número de celular ya está registrado con otro cliente.');

        const avatarUrl = data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`;

        if (data.id) {
            // Update
            await updateClient(data.id, {
                name: data.name,
                email: data.email,
                phone: data.phone,
                role: data.role,
                avatar: avatarUrl,
                // Password update handled separately ideally
            });
        } else {
            // Create
            await addClient({
                id: Date.now(),
                name: data.name,
                email: data.email,
                phone: data.phone,
                lastVisit: 'Nuevo',
                avatar: avatarUrl,
                isNew: true,
                role: data.role
            });
        }

        // Reset and close is handled by the modal component call effectively or here
        // The modal stays open until success, so this logic is fine.
        // We actually need to close it here if successful? 
        // ClientModal calls onSave and then onClose if successful. 
        // But onSave expects a Promise.
    };

    return (
        <div className="flex-1 flex flex-col items-center py-8 px-4 sm:px-6">
            <div className="w-full max-w-[1200px] flex flex-col gap-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-[#111618] dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Gestión de Clientes</h1>
                        <p className="text-[#617c89] dark:text-slate-400 text-base font-normal">Administra tu base de datos de contactos y citas.</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 cursor-pointer overflow-hidden rounded-full h-12 px-6 bg-primary hover:bg-sky-600 text-white shadow-lg shadow-primary/30 transition-all active:scale-95 group"
                    >
                        <span className="material-symbols-outlined text-[20px] group-hover:rotate-90 transition-transform">add</span>
                        <span className="text-sm font-bold leading-normal tracking-[0.015em] truncate">Nuevo Cliente</span>
                    </button>
                </div>

                {/* Search Bar */}
                <div className="bg-white dark:bg-card-dark p-2 rounded-xl border border-[#e5e7eb] dark:border-[#2a3c45] shadow-sm">
                    <label className="flex items-center w-full h-12">
                        <div className="flex items-center justify-center pl-4 text-[#617c89] dark:text-slate-400">
                            <span className="material-symbols-outlined">search</span>
                        </div>
                        <input
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="w-full h-full bg-transparent border-none focus:ring-0 text-[#111618] dark:text-white placeholder:text-[#9aaeb8] px-4 text-base font-normal outline-none"
                            placeholder="Buscar por nombre, teléfono o correo..."
                        />
                        {searchTerm && (
                            <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="pr-4 text-gray-400 hover:text-gray-600">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        )}
                    </label>
                </div>

                {/* Table Container */}
                <div className="bg-white dark:bg-card-dark rounded-xl border border-[#dbe2e6] dark:border-[#2a3c45] shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full min-w-[800px]">
                            <thead>
                                <tr className="bg-[#f8fafc] dark:bg-[#152229] border-b border-[#dbe2e6] dark:border-[#2a3c45]">
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#617c89] dark:text-slate-400 w-[30%]">Cliente</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#617c89] dark:text-slate-400 w-[20%]">Celular</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#617c89] dark:text-slate-400 w-[25%]">Email</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-[#617c89] dark:text-slate-400 w-[25%]">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#dbe2e6] dark:divide-[#2a3c45]">
                                {currentClients.map((client) => (
                                    <tr key={client.id} className="group hover:bg-[#fcfdfd] dark:hover:bg-[#1f3039] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="size-10 rounded-full bg-cover bg-center shrink-0 border border-gray-100 dark:border-gray-700" style={{ backgroundImage: `url("${client.avatar}")` }}></div>
                                                <div>
                                                    <p className="text-[#111618] dark:text-white text-sm font-bold">{client.name}</p>
                                                    <p className="text-[#617c89] dark:text-slate-400 text-xs font-medium bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded mt-0.5 inline-block capitalize">
                                                        {client.role === 'admin' ? 'Admin' : client.role === 'professional' ? 'Profesional' : 'Cliente'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center gap-2 text-[#111618] dark:text-gray-200">
                                                <span className="text-sm font-medium">{client.phone}</span>
                                                <a href={`https://wa.me/57${client.phone}`} target="_blank" rel="noreferrer" className="material-symbols-outlined text-[18px] text-green-500 hover:scale-110 transition-transform cursor-pointer" title="Enviar WhatsApp">chat</a>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4"><span className="text-[#617c89] dark:text-slate-300 text-sm">{client.email}</span></td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setSelectedClient(client)}
                                                    className="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 rounded-full p-2 transition-colors"
                                                    title="Ver Ficha y Historial"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">visibility</span>
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(client)}
                                                    className="bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 hover:bg-orange-100 rounded-full p-2 transition-colors"
                                                    title="Editar Cliente"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                </button>
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
                                                                deleteClient(client.id);
                                                            }
                                                        }}
                                                        className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 rounded-full p-2 transition-colors"
                                                        title="Eliminar Cliente"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">delete</span>
                                                    </button>
                                                )}
                                            </div>
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

            {/* Modals */}
            <ClientModal
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
                clientToEdit={clientToEdit}
                onSave={handleSaveClient}
            />

            <ClientDetailsModal
                isOpen={!!selectedClient}
                onClose={() => setSelectedClient(null)}
                client={selectedClient}
                isAdmin={isAdmin}
                onDelete={deleteClient}
            />
        </div>
    );
};

export default Clients;