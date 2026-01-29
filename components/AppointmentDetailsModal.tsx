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
            case 'en proceso': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    // Helper to get status label if it's not directly in appointment object
    // Adapting to different data structures if necessary
    const statusLabel = appointment.status === 'confirmed' ? 'Confirmado' :
        appointment.status === 'pending' ? 'Pendiente' :
            appointment.status === 'cancelled' ? 'Cancelado' :
                appointment.status === 'completed' ? 'Completado' :
                    appointment.status === 'in_progress' ? 'En Proceso' : 'Pendiente'; // Default

    const statusStyle = getStatusStyle(statusLabel);

    // Determine avatar/icon logic
    // If Admin/Pro viewing -> Show Client Avatar if available
    // If Client viewing -> Show Pro Avatar if available (or generic)
    const avatarUrl = userRole === 'client' ? null : appointment.avatar;

    // Phone number for contact actions (only for admin/professional viewing client data)
    // Extract phone from client name if it contains it, or use a default format
    // Note: The phone should ideally come from the client data, not the appointment
    // For now, we'll try to extract it from the appointment object or use client name
    const clientPhone = userRole !== 'client' ? (appointment.clientPhone || appointment.phone) : null;

    const handleCall = () => {
        if (clientPhone) {
            window.location.href = `tel:${clientPhone}`;
        }
    };

    const handleWhatsApp = () => {
        if (clientPhone) {
            const message = encodeURIComponent(`Hola ${appointment.client}, te contacto sobre tu cita de ${appointment.service} programada para el ${appointment.date ? new Date(appointment.date).toLocaleDateString('es-ES') : 'próximamente'}.`);
            window.open(`https://wa.me/57${clientPhone}?text=${message}`, '_blank');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col relative" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="h-24 bg-primary w-full shrink-0 relative flex items-center justify-center">
                    <button onClick={onClose} className="absolute top-4 right-4 bg-black/20 hover:bg-black/30 text-white rounded-full p-1.5 transition-colors backdrop-blur-sm z-10"><span className="material-symbols-outlined text-lg font-bold">close</span></button>
                    <span className="text-white/20 font-black text-4xl select-none">AGENDA</span>
                </div>

                {/* Fixed Avatar - Moved outside scroll view to prevent clipping */}
                <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                    <div className="size-24 rounded-full border-[5px] border-white dark:border-[#1e293b] bg-white dark:bg-slate-800 shadow-md flex items-center justify-center text-primary overflow-hidden">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Client" className="w-full h-full object-cover" />
                        ) : (
                            <span className="material-symbols-outlined text-5xl">spa</span>
                        )}
                    </div>
                </div>

                <div className="px-6 pb-8 pt-20 flex flex-col bg-white dark:bg-[#1e293b] text-center overflow-y-auto">

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

                    {/* Contact Actions - Only for Admin/Professional */}
                    {userRole !== 'client' && clientPhone && (
                        <div className="mb-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-left">Contactar Cliente</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleCall}
                                    className="flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-4 rounded-2xl border-2 border-blue-100 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all active:scale-95 group"
                                >
                                    <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">call</span>
                                    <span className="font-black text-sm">Llamar</span>
                                </button>
                                <button
                                    onClick={handleWhatsApp}
                                    className="flex items-center justify-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-2xl border-2 border-green-100 dark:border-green-800/50 hover:bg-green-100 dark:hover:bg-green-900/30 transition-all active:scale-95 group"
                                >
                                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                    <span className="font-black text-sm">WhatsApp</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        {/* Approve/Reject for Pending - Admin/Professional only */}
                        {userRole !== 'client' && statusLabel === 'Pendiente' && (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={onConfirm}
                                    className="py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black shadow-lg shadow-green-500/30 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-lg">check_circle</span>
                                    Aprobar
                                </button>
                                <button
                                    onClick={onCancel}
                                    className="py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-500/30 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-lg">cancel</span>
                                    Rechazar
                                </button>
                            </div>
                        )}

                        {/* Cancel for Confirmed appointments */}
                        {onCancel && statusLabel === 'Confirmado' && (
                            <button
                                onClick={onCancel}
                                className="w-full py-3.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-2xl font-black active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 border-2 border-red-100 dark:border-red-800/50"
                            >
                                <span className="material-symbols-outlined">cancel</span>
                                Cancelar Cita
                            </button>
                        )}

                        {/* Close button when no actions available or for completed/cancelled */}
                        {(statusLabel === 'Completado' || statusLabel === 'Cancelado' || statusLabel === 'En Proceso' || (!onConfirm && !onCancel)) && (
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all text-sm uppercase tracking-widest"
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
