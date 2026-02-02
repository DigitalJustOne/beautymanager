import React from 'react';

interface ClientDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: any;
    isAdmin: boolean;
    onDelete?: (clientId: number) => void;
    completedServicesCount?: number;
}

const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({ isOpen, onClose, client, isAdmin, onDelete, completedServicesCount = 0 }) => {
    if (!isOpen || !client) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 relative flex flex-col" onClick={(e) => e.stopPropagation()}>

                {/* Header with Close Button */}
                <div className="h-28 bg-primary relative flex justify-center items-center shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full p-1.5 transition-colors backdrop-blur-sm"
                    >
                        <span className="material-symbols-outlined text-lg font-bold">close</span>
                    </button>
                    <span className="text-white/20 font-black text-5xl select-none absolute bottom-[-10px]">CLIENTE</span>
                </div>


                {/* Fixed Avatar - Outside Scroll View */}
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                    <div className="size-24 rounded-full border-[5px] border-white dark:border-[#1e293b] bg-cover bg-center bg-gray-200 shadow-md flex items-center justify-center overflow-hidden" style={{ backgroundImage: `url("${client.avatar}")` }}>
                        {!client.avatar && <span className="material-symbols-outlined text-4xl text-slate-400">person</span>}
                    </div>
                </div>

                <div className="px-6 pb-8 pt-20 relative bg-white dark:bg-[#1e293b] overflow-y-auto">{/* Increased top padding */}

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

                        {/* Puntos Acumulados (Formerly Last Visit) */}
                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="size-11 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                                <span className="material-symbols-outlined">loyalty</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Puntos Acumulados</p>
                                <p className="font-bold text-sm text-slate-700 dark:text-slate-200">{completedServicesCount} pts</p>
                            </div>
                        </div>
                    </div>

                    {/* Contact Buttons */}
                    <div className="mb-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Contactar Cliente</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => window.location.href = `tel:${client.phone}`}
                                className="flex items-center justify-center gap-2 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-400 rounded-2xl font-bold transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-lg">call</span>
                                <span className="text-sm">Llamar</span>
                            </button>
                            <button
                                onClick={() => {
                                    const message = encodeURIComponent(`Hola ${client.name}, te contacto desde Beauty Manager.`);
                                    window.open(`https://wa.me/57${client.phone}?text=${message}`, '_blank');
                                }}
                                className="flex items-center justify-center gap-2 py-3 bg-green-50 hover:bg-green-100 text-green-600 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:text-green-400 rounded-2xl font-bold transition-all active:scale-95"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                                <span className="text-sm">WhatsApp</span>
                            </button>
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
