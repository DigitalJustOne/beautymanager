import React from 'react';

interface ClientDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: any;
    isAdmin: boolean;
    onDelete?: (clientId: number) => void;
}

const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({ isOpen, onClose, client, isAdmin, onDelete }) => {
    if (!isOpen || !client) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 relative" onClick={(e) => e.stopPropagation()}>

                {/* Header with Close Button */}
                <div className="h-28 bg-primary relative flex justify-center items-center">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full p-1.5 transition-colors backdrop-blur-sm"
                    >
                        <span className="material-symbols-outlined text-lg font-bold">close</span>
                    </button>
                    <span className="text-white/20 font-black text-5xl select-none absolute bottom-[-10px]">CLIENTE</span>
                </div>

                <div className="px-6 pb-8 relative bg-white dark:bg-[#1e293b]">
                    {/* Avatar */}
                    <div className="flex flex-col items-center -mt-12 mb-4 relative z-10">
                        <div className="size-24 rounded-full border-[5px] border-white dark:border-[#1e293b] bg-cover bg-center bg-gray-200 shadow-md" style={{ backgroundImage: `url("${client.avatar}")` }}></div>
                    </div>

                    {/* Basic Info */}
                    <div className="text-center mb-6">
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white capitalize leading-tight">{client.name}</h3>
                        <div className="flex items-center justify-center gap-2 mt-2">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${client.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                    client.role === 'professional' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                }`}>
                                {client.role === 'admin' ? 'Administrador' : client.role === 'professional' ? 'Profesional' : 'Cliente'}
                            </span>
                        </div>
                    </div>

                    {/* Details List */}
                    <div className="space-y-4 mb-8">
                        {/* Email */}
                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="size-11 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                                <span className="material-symbols-outlined">mail</span>
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Correo Electrónico</p>
                                <p className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate" title={client.email}>{client.email}</p>
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="size-11 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                <span className="material-symbols-outlined">smartphone</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Celular</p>
                                <p className="font-black text-lg text-slate-700 dark:text-slate-200 tracking-wide">{client.phone}</p>
                            </div>
                        </div>

                        {/* Last Visit */}
                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="size-11 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                                <span className="material-symbols-outlined">event_available</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Última Visita</p>
                                <p className="font-bold text-sm text-slate-700 dark:text-slate-200">{client.lastVisit || 'Sin registros'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Admin Actions */}
                    {isAdmin && onDelete && (
                        <button
                            onClick={() => {
                                if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
                                    onDelete(client.id);
                                    onClose(); // Switch order if needed, but usually closing after action is fine
                                }
                            }}
                            className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/10 dark:hover:bg-red-900/20 dark:text-red-400 rounded-2xl font-black transition-all active:scale-95 flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
                        >
                            <span className="material-symbols-outlined text-lg">delete</span>
                            Eliminar Cliente
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientDetailsModal;
