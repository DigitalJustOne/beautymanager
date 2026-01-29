import React from 'react';
import { formatPrice } from '../utils/format';

interface AppointmentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: any;
    userRole: 'admin' | 'professional' | 'client';
    onConfirm?: () => void;
    onCancel?: () => void;
}

const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({
    isOpen,
    onClose,
    appointment,
    userRole,
    onConfirm,
    onCancel
}) => {
    if (!isOpen || !appointment) return null;

    const getStatusStyle = (statusLabel: string) => {
        switch (statusLabel?.toLowerCase()) {
            case 'confirmado': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'pendiente': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'cancelado': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'completado': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    // Helper to get status label if it's not directly in appointment object
    // Adapting to different data structures if necessary
    const statusLabel = appointment.status === 'confirmed' ? 'Confirmado' :
        appointment.status === 'pending' ? 'Pendiente' :
            appointment.status === 'cancelled' ? 'Cancelado' :
                appointment.status === 'completed' ? 'Completado' : 'Pendiente'; // Default

    const statusStyle = getStatusStyle(statusLabel);

    // Determine avatar/icon logic
    // If Admin/Pro viewing -> Show Client Avatar if available
    // If Client viewing -> Show Pro Avatar if available (or generic)
    const avatarUrl = userRole === 'client' ? null : appointment.avatar;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col relative" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="h-24 bg-primary w-full shrink-0 relative flex items-center justify-center">
                    <button onClick={onClose} className="absolute top-4 right-4 bg-black/20 hover:bg-black/30 text-white rounded-full p-1.5 transition-colors backdrop-blur-sm z-10"><span className="material-symbols-outlined text-lg font-bold">close</span></button>
                    <span className="text-white/20 font-black text-4xl select-none">AGENDA</span>
                </div>

                <div className="px-6 pb-8 flex flex-col bg-white dark:bg-[#1e293b] text-center">
                    {/* Icon/Avatar Circle */}
                    <div className="-mt-12 mb-6 relative z-10 mx-auto">
                        <div className="size-24 rounded-full border-[5px] border-white dark:border-[#1e293b] bg-white dark:bg-slate-800 shadow-md flex items-center justify-center text-primary overflow-hidden">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Client" className="w-full h-full object-cover" />
                            ) : (
                                <span className="material-symbols-outlined text-5xl">spa</span>
                            )}
                        </div>
                    </div>

                    {/* Title & Status */}
                    <div className="mb-6">
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{appointment.service}</h3>
                        <div className="flex items-center justify-center gap-2 mt-2">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${statusStyle}`}>
                                {statusLabel}
                            </span>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="space-y-4 mb-8 text-left">
                        {/* Price */}
                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="size-11 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
                                <span className="material-symbols-outlined">payments</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</p>
                                <p className="font-black text-xl text-green-600 dark:text-green-400">
                                    {typeof appointment.price === 'number' ? formatPrice(appointment.price) : (appointment.price || '$0')}
                                </p>
                            </div>
                        </div>

                        {/* Date & Time */}
                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="size-11 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                <span className="material-symbols-outlined">event</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha y Hora</p>
                                <p className="font-black text-sm capitalize text-slate-700 dark:text-slate-200">
                                    {/* Handle Date object or string */}
                                    {appointment.date instanceof Date
                                        ? appointment.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
                                        : new Date(appointment.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </p>
                                <p className="text-xs font-bold text-slate-500">{appointment.time} {appointment.duration ? `(${appointment.duration})` : ''}</p>
                            </div>
                        </div>

                        {/* Professional / Client Display */}
                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="size-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <span className="material-symbols-outlined">{userRole === 'client' ? 'badge' : 'person'}</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {userRole === 'client' ? 'Profesional' : 'Cliente'}
                                </p>
                                <p className="font-black text-sm text-primary">
                                    {userRole === 'client' ? (appointment.professionalName || 'No asignado') : (appointment.client || 'Cliente')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        {onConfirm && statusLabel === 'Pendiente' && (
                            <button
                                onClick={onConfirm}
                                className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black shadow-lg shadow-green-500/30 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">check</span>
                                Confirmar Cita
                            </button>
                        )}

                        {onCancel && (statusLabel === 'Pendiente' || statusLabel === 'Confirmado') && (
                            <button
                                onClick={onCancel}
                                className="w-full py-3.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-2xl font-black active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">cancel</span>
                                Cancelar Cita
                            </button>
                        )}

                        {!onConfirm && !onCancel && (
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all text-sm uppercase tracking-widest"
                            >
                                Cerrar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppointmentDetailsModal;
