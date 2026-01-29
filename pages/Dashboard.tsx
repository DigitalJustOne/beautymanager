import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Appointment, Client } from '../types';
import AppointmentDetailsModal from '../components/AppointmentDetailsModal';
import BookingModal from '../components/BookingModal';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { appointments, clients, updateAppointmentStatus, deleteAppointment, userProfile } = useData();

    // Estados Modales
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

    // Estado para el menú desplegable de cada cita
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    // --- HELPERS PARA CITAS ---
    const pendingAppointments = useMemo(() =>
        appointments.filter(a => a.status === 'pending'),
        [appointments]
    );

    const handleUpdateStatus = async (id: number, status: 'confirmed' | 'pending' | 'cancelled') => {
        await updateAppointmentStatus(id, status);
        setOpenMenuId(null);
    };

    const handleDeleteForever = async (id: number) => {
        if (confirm('¿Estás seguro de eliminar esta cita permanentemente?')) {
            await deleteAppointment(id);
            setOpenMenuId(null);
        }
    };

    const getAppointmentStatus = (appt: Appointment) => {
        if (appt.status === 'cancelled') {
            return { label: 'Cancelado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: 'cancel' };
        }
        if (appt.date) {
            const now = new Date();
            const apptDate = new Date(appt.date);
            const [hours, minutes] = appt.time.split(':').map(Number);
            apptDate.setHours(hours, minutes, 0, 0);

            // Calcular duración
            let durationMinutes = 60;
            const hMatch = appt.duration.match(/(\d+)h/);
            const mMatch = appt.duration.match(/(\d+)m/);
            if (hMatch) durationMinutes = parseInt(hMatch[1]) * 60;
            if (mMatch) durationMinutes += parseInt(mMatch[1]);
            else if (!hMatch && !mMatch) durationMinutes = 60;

            const endTime = new Date(apptDate.getTime() + durationMinutes * 60000);

            if (now >= apptDate && now < endTime && appt.status === 'confirmed') {
                return { label: 'En Servicio', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: 'timelapse' };
            }
            if (now >= endTime) {
                return { label: 'Finalizado', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: 'check_circle' };
            }
        }
        if (appt.status === 'confirmed') {
            return { label: 'Confirmado', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: 'verified' };
        }
        return { label: 'Pendiente', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: 'schedule' };
    };

    const toggleMenu = (id: number) => {
        setOpenMenuId(openMenuId === id ? null : id);
    };

    const todayUpcomingAppointments = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayEnd = todayStart + 24 * 60 * 60 * 1000;

        return appointments
            .filter(appt => {
                if (appt.status === 'cancelled') return false;
                if (!appt.date) return false;
                const apptDate = new Date(appt.date).getTime();
                if (apptDate < todayStart || apptDate >= todayEnd) return false;

                const [hours, minutes] = appt.time.split(':').map(Number);
                const startDateTime = new Date(appt.date);
                startDateTime.setHours(hours, minutes, 0, 0);

                let durationMinutes = 60;
                const hMatch = appt.duration.match(/(\d+)h/);
                const mMatch = appt.duration.match(/(\d+)m/);
                if (hMatch) durationMinutes = parseInt(hMatch[1]) * 60;
                if (mMatch) durationMinutes += parseInt(mMatch[1]);
                else if (!hMatch && !mMatch) durationMinutes = 60;

                const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);
                return now < endDateTime;
            })
            .sort((a, b) => {
                const [aH, aM] = a.time.split(':').map(Number);
                const [bH, bM] = b.time.split(':').map(Number);
                return (aH * 60 + aM) - (bH * 60 + bM);
            });
    }, [appointments]);

    const pastAppointments = useMemo(() => {
        const now = new Date();
        return appointments
            .filter(appt => {
                if (appt.status === 'cancelled') return true;
                if (!appt.date) return false;

                const [hours, minutes] = appt.time.split(':').map(Number);
                const startDateTime = new Date(appt.date);
                startDateTime.setHours(hours, minutes, 0, 0);

                let durationMinutes = 60;
                const hMatch = appt.duration.match(/(\d+)h/);
                const mMatch = appt.duration.match(/(\d+)m/);
                if (hMatch) durationMinutes = parseInt(hMatch[1]) * 60;
                if (mMatch) durationMinutes += parseInt(mMatch[1]);
                else if (!hMatch && !mMatch) durationMinutes = 60;

                const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);
                return now >= endDateTime;
            })
            .sort((a, b) => {
                const dateA = new Date(a.date || 0);
                const dateB = new Date(b.date || 0);
                if (dateA.getTime() !== dateB.getTime()) return dateB.getTime() - dateA.getTime();
                const [aH, aM] = a.time.split(':').map(Number);
                const [bH, bM] = b.time.split(':').map(Number);
                return (bH * 60 + bM) - (aH * 60 + aM);
            })
            .slice(0, 10);
    }, [appointments]);

    const todayCount = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
        return appointments.filter(a => {
            if (a.status === 'cancelled') return false;
            if (!a.date) return false;
            const aDate = new Date(a.date).getTime();
            return aDate >= startOfDay && aDate < endOfDay;
        }).length;
    }, [appointments]);

    const futureConfirmedCount = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        return appointments.filter(a => {
            if (a.status !== 'confirmed') return false;
            if (!a.date) return false;
            const aDate = new Date(a.date).getTime();
            return aDate >= startOfDay;
        }).length;
    }, [appointments]);

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto w-full flex flex-col gap-8 pb-20" onClick={() => setOpenMenuId(null)}>
            {/* Page Heading */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex flex-col gap-2">
                    <h2 className="text-3xl md:text-4xl font-black text-text-main-light dark:text-text-main-dark tracking-tight leading-tight">Hola, {userProfile.name.split(' ')[0]}</h2>
                    <p className="text-text-sec-light dark:text-text-sec-dark text-lg font-normal">Aquí tienes el resumen de tu agenda.</p>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); setIsBookingModalOpen(true); }}
                    className="flex items-center justify-center gap-2 rounded-full h-12 px-6 bg-primary text-text-main-light dark:text-white shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 active:scale-95 group"
                >
                    <span className="material-symbols-outlined group-hover:rotate-90 transition-transform">add</span>
                    <span className="text-base font-bold tracking-wide">Nueva Cita</span>
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div
                    onClick={() => document.getElementById('upcoming-list')?.scrollIntoView({ behavior: 'smooth' })}
                    className="bg-card-light dark:bg-card-dark p-6 rounded-xl border border-border-light dark:border-border-dark flex flex-col gap-4 shadow-sm hover:shadow-md hover:border-primary/30 cursor-pointer transition-all group"
                >
                    <div className="flex items-center justify-between">
                        <div className="bg-primary/10 p-2.5 rounded-full text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined">event_available</span>
                        </div>
                        <span className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-full">+{futureConfirmedCount} por atender</span>
                    </div>
                    <div>
                        <p className="text-text-sec-light dark:text-text-sec-dark text-sm font-medium mb-1 group-hover:text-primary transition-colors">Total Citas Hoy</p>
                        <p className="text-3xl font-bold text-text-main-light dark:text-text-main-dark tracking-tight">{todayCount}</p>
                    </div>
                </div>
                <div
                    onClick={() => setIsPendingModalOpen(true)}
                    className="bg-card-light dark:bg-card-dark p-6 rounded-xl border border-border-light dark:border-border-dark flex flex-col gap-4 shadow-sm hover:shadow-md hover:border-orange-500/30 cursor-pointer transition-all group"
                >
                    <div className="flex items-center justify-between">
                        <div className="bg-orange-500/10 p-2.5 rounded-full text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined">pending_actions</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-text-sec-light dark:text-text-sec-dark text-sm font-medium mb-1 group-hover:text-orange-500 transition-colors">Pendientes de confirmar</p>
                        <p className="text-3xl font-bold text-text-main-light dark:text-text-main-dark tracking-tight">{pendingAppointments.length}</p>
                    </div>
                </div>
                <div
                    onClick={() => navigate('/clients')}
                    className="bg-card-light dark:bg-card-dark p-6 rounded-xl border border-border-light dark:border-border-dark flex flex-col gap-4 shadow-sm relative overflow-hidden group cursor-pointer hover:shadow-md hover:border-blue-500/30 transition-all"
                >
                    <div className="absolute -top-2 -right-2 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-[100px] text-blue-500">group</span>
                    </div>
                    <div className="flex items-center justify-between relative z-10">
                        <div className="bg-blue-500/10 p-2.5 rounded-full text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined">group</span>
                        </div>
                        <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-1 rounded-full">
                            Total
                        </span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-text-sec-light dark:text-text-sec-dark text-sm font-medium mb-1 group-hover:text-blue-500 transition-colors">Clientes Registrados</p>
                        <div className="flex items-end gap-2">
                            <p className="text-3xl font-bold text-text-main-light dark:text-text-main-dark">{clients.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upcoming Appointments List */}
            <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between px-1" id="upcoming-list">
                    <h3 className="text-xl font-bold text-text-main-light dark:text-text-main-dark tracking-tight">Próximas Citas</h3>
                    <Link to="/agenda" className="text-sm font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                        Ver calendario completo
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </Link>
                </div>
                <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                    {todayUpcomingAppointments.length === 0 ? (
                        <div className="p-10 text-center text-text-sec-light dark:text-text-sec-dark">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">event_available</span>
                            <p>No tienes más citas para hoy.</p>
                            <p className="text-xs mt-1 text-primary">Las citas de mañana aparecerán al día siguiente.</p>
                        </div>
                    ) : (
                        todayUpcomingAppointments.map((appt) => {
                            const status = getAppointmentStatus(appt);
                            return (
                                <div
                                    key={appt.id}
                                    onClick={() => setSelectedAppointment(appt)}
                                    className="group flex flex-col sm:flex-row items-start sm:items-center gap-5 p-5 border-b border-border-light dark:border-border-dark hover:bg-background-light dark:hover:bg-background-dark/30 transition-colors last:border-0 relative first:rounded-t-xl last:rounded-b-xl cursor-pointer"
                                >
                                    <div className="flex flex-col items-center justify-center min-w-[70px] text-center bg-background-light dark:bg-background-dark/50 rounded-lg py-2 px-3 self-start sm:self-center">
                                        <span className="text-lg font-bold text-text-main-light dark:text-text-main-dark leading-none">{appt.time}</span>
                                        <span className="text-xs font-medium text-text-sec-light dark:text-text-sec-dark uppercase mt-0.5">{appt.ampm}</span>
                                    </div>
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="relative shrink-0">
                                            {appt.avatar ? (
                                                <img
                                                    src={appt.avatar}
                                                    className="rounded-full h-12 w-12 object-cover ring-2 ring-white dark:ring-card-dark"
                                                    alt={appt.client}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(appt.client)}&background=random`;
                                                    }}
                                                />
                                            ) : (
                                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary ring-2 ring-white dark:ring-card-dark">
                                                    <span className="material-symbols-outlined">person</span>
                                                </div>
                                            )}
                                            <div className="absolute -bottom-0.5 -right-0.5 bg-card-light dark:bg-card-dark rounded-full p-0.5">
                                                <div className={`h-2.5 w-2.5 rounded-full ${status.color.includes('green') ? 'bg-green-500' : status.color.includes('orange') ? 'bg-orange-500' : status.color.includes('blue') ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-base font-bold text-text-main-light dark:text-text-main-dark">{appt.client}</span>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                                <span className="text-sm text-text-sec-light dark:text-text-sec-dark">{appt.service} • {appt.duration}</span>
                                                {appt.professionalName && (
                                                    <span className="hidden sm:inline text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">con {appt.professionalName}</span>
                                                )}
                                                {appt.price && <span className="hidden sm:inline text-xs text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-bold ml-1">{appt.price}</span>}
                                            </div>
                                            {appt.professionalName && <span className="sm:hidden text-xs text-primary mt-0.5">con {appt.professionalName}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end pl-[90px] sm:pl-0">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${status.color}`}>
                                            <span className="material-symbols-outlined text-[16px] fill">{status.icon}</span>
                                            {status.label}
                                        </span>

                                        <div className="relative">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleMenu(appt.id); }}
                                                className={`text-text-sec-light dark:text-text-sec-dark hover:text-primary p-2 rounded-full hover:bg-primary/10 transition-colors ${openMenuId === appt.id ? 'bg-primary/10 text-primary' : ''}`}
                                            >
                                                <span className="material-symbols-outlined">more_vert</span>
                                            </button>

                                            {openMenuId === appt.id && (
                                                <div className="absolute right-0 top-full mt-1 w-48 bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                                    {appt.status === 'pending' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(appt.id, 'confirmed'); }}
                                                            className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-background-light dark:hover:bg-background-dark/50 flex items-center gap-2 text-green-600 dark:text-green-400"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">check</span>
                                                            Confirmar Cita
                                                        </button>
                                                    )}
                                                    {appt.status === 'confirmed' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(appt.id, 'pending'); }}
                                                            className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-background-light dark:hover:bg-background-dark/50 flex items-center gap-2 text-orange-600 dark:text-orange-400"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">undo</span>
                                                            Marcar Pendiente
                                                        </button>
                                                    )}

                                                    {appt.status !== 'cancelled' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(appt.id, 'cancelled'); }}
                                                            className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 text-red-500"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">block</span>
                                                            Cancelar Cita
                                                        </button>
                                                    )}

                                                    {appt.status === 'cancelled' && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                handleDeleteForever(appt.id);
                                                            }}
                                                            className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 text-red-500"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                            Eliminar Registro
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Past/Cancelled Appointments History */}
            <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400 tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined">history</span>
                        Historial Reciente
                    </h3>
                </div>
                <div className="bg-gray-50 dark:bg-card-dark/50 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm opacity-90">
                    {pastAppointments.length === 0 ? (
                        <div className="p-8 text-center text-text-sec-light dark:text-text-sec-dark bg-white/50 dark:bg-transparent rounded-xl">
                            <p className="text-sm">No hay actividad reciente.</p>
                        </div>
                    ) : (
                        pastAppointments.map((appt) => {
                            const status = getAppointmentStatus(appt);
                            const isCancelled = appt.status === 'cancelled';

                            return (
                                <div
                                    key={appt.id}
                                    onClick={() => setSelectedAppointment(appt)}
                                    className="group flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 border-b border-gray-100 dark:border-border-dark last:border-0 hover:bg-white dark:hover:bg-card-dark transition-colors relative cursor-pointer"
                                >
                                    <div className="flex flex-col items-center justify-center min-w-[70px] text-center bg-white dark:bg-black/20 rounded-lg py-2 px-3 self-start sm:self-center grayscale opacity-70">
                                        <span className="text-sm font-bold text-gray-600 dark:text-gray-400 leading-none">{appt.date?.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                                        <span className="text-lg font-black text-gray-800 dark:text-gray-300 leading-tight mt-1">{appt.time}</span>
                                    </div>
                                    <div className="flex items-center gap-4 flex-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                        <div className="relative shrink-0 grayscale">
                                            {appt.avatar ? (
                                                <img
                                                    src={appt.avatar}
                                                    className="rounded-full h-10 w-10 object-cover"
                                                    alt={appt.client}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(appt.client)}&background=random`;
                                                    }}
                                                />
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                                                    <span className="material-symbols-outlined text-xl">person</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`text-base font-bold text-gray-700 dark:text-gray-300 ${isCancelled ? 'line-through decoration-red-400' : ''}`}>{appt.client}</span>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                                <span className="text-xs text-gray-500 dark:text-gray-500">{appt.service}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end pl-[90px] sm:pl-0">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide
                                            ${status.color} bg-opacity-20`}
                                        >
                                            {status.label}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm('¿Eliminar este registro del historial?')) {
                                                    deleteAppointment(appt.id);
                                                }
                                            }}
                                            className="text-gray-300 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Eliminar registro"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* --- MODAL DETALLES UNIFICADO --- */}
            <AppointmentDetailsModal
                isOpen={!!selectedAppointment}
                onClose={() => setSelectedAppointment(null)}
                appointment={selectedAppointment}
                userRole="admin"
                onConfirm={selectedAppointment?.status === 'pending' ? () => {
                    if (selectedAppointment) {
                        handleUpdateStatus(selectedAppointment.id, 'confirmed');
                        setSelectedAppointment(null);
                    }
                } : undefined}
                onCancel={(selectedAppointment?.status === 'pending' || selectedAppointment?.status === 'confirmed') ? () => {
                    if (selectedAppointment && window.confirm('¿Estás seguro de cancelar esta cita?')) {
                        handleUpdateStatus(selectedAppointment.id, 'cancelled');
                        setSelectedAppointment(null);
                    }
                } : undefined}
            />

            {/* SOLICITUDES PENDIENTES MODAL */}
            {isPendingModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-border-light dark:border-border-dark animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                        {/* Header */}
                        <div className="p-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-orange-500 text-white shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined">notifications_active</span>
                                <h3 className="font-bold text-lg">Solicitudes Pendientes</h3>
                            </div>
                            <button
                                onClick={() => setIsPendingModalOpen(false)}
                                className="hover:bg-white/20 rounded-full p-1 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-2 bg-background-light dark:bg-background-dark/50">
                            {pendingAppointments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                                    <div className="size-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-500">
                                        <span className="material-symbols-outlined text-3xl">check</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <h4 className="font-bold text-text-main-light dark:text-white">¡Todo al día!</h4>
                                        <p className="text-sm text-text-sec-light dark:text-text-sec-dark">No hay citas pendientes de confirmación.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {pendingAppointments.map(appt => (
                                        <div key={appt.id} className="bg-white dark:bg-card-dark p-4 rounded-xl border border-border-light dark:border-border-dark shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                            <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => setSelectedAppointment(appt)}>
                                                <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 p-2.5 rounded-lg text-center min-w-[60px]">
                                                    <span className="block text-xs font-bold uppercase">{appt.date?.toLocaleDateString('es-ES', { weekday: 'short' }) || 'Hoy'}</span>
                                                    <span className="block text-sm font-black">{appt.time}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-sm text-text-main-light dark:text-white hover:text-primary transition-colors underline decoration-dotted decoration-gray-300">{appt.client}</h4>
                                                    <p className="text-xs text-text-sec-light dark:text-text-sec-dark">{appt.service}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUpdateStatus(appt.id, 'confirmed'); }}
                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">check</span>
                                                    Confirmar
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUpdateStatus(appt.id, 'cancelled'); }}
                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                                    Rechazar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL NUEVA CITA (Unificado) */}
            <BookingModal
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
                userRole="admin"
                userProfile={userProfile}
            />
        </div>
    );
};

export default Dashboard;