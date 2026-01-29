
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import AppointmentDetailsModal from '../components/AppointmentDetailsModal';
import BookingModal from '../components/BookingModal';

const ClientDashboard: React.FC = () => {
    const { appointments, userProfile, updateUserProfile } = useData();

    // RLS filters appointments for us (DataContext logic)
    // For clients: appointments contains OWN (full) + OTHERS (masked)
    // We filter 'myAppointments' to show only confirmed/pending own appointments AND SORT THEM
    const myAppointments = useMemo(() => {
        return appointments
            .filter(a => a.client !== 'Reservado' && a.service !== 'Ocupado')
            .sort((a, b) => {
                // Ordenar por fecha descendente
                const dateA = new Date(a.date || 0);
                const dateB = new Date(b.date || 0);
                const timeDiff = dateB.getTime() - dateA.getTime();
                if (timeDiff !== 0) return timeDiff;

                // Si es el mismo día, ordenar por hora descendente
                const [aH, aM] = a.time.split(':').map(Number);
                const [bH, bM] = b.time.split(':').map(Number);
                return (bH * 60 + bM) - (aH * 60 + aM);
            });
    }, [appointments]);

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(userProfile.name);
    const [editPhone, setEditPhone] = useState(userProfile.phone);

    // --- STATES FOR BOOKING ---
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [selectedAppt, setSelectedAppt] = useState<any | null>(null);

    // Initialize edit fields when profile loads
    useEffect(() => {
        setEditName(userProfile.name);
        setEditPhone(userProfile.phone);
    }, [userProfile]);


    // const formatPrice = (price: number) => `$${ price.toLocaleString('es-CO') } `; // Moved to utils/format

    const getAppointmentStatus = (appt: any) => {
        if (appt.status === 'cancelled') {
            return { label: 'Cancelado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
        }
        if (appt.date) {
            const now = new Date();
            const apptDate = new Date(appt.date);
            const [hours, minutes] = appt.time.split(':').map(Number);
            apptDate.setHours(hours, minutes, 0, 0);

            let durationMinutes = 60;
            const hMatch = appt.duration.match(/(\d+)h/);
            const mMatch = appt.duration.match(/(\d+)m/);
            if (hMatch) durationMinutes = parseInt(hMatch[1]) * 60;
            if (mMatch) durationMinutes += parseInt(mMatch[1]);
            else if (!hMatch && !mMatch) durationMinutes = 60;

            const endTime = new Date(apptDate.getTime() + durationMinutes * 60000);

            if (now >= apptDate && now < endTime && appt.status === 'confirmed') {
                return { label: 'En Servicio', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' };
            }
            if (now >= endTime) {
                return { label: 'Finalizado', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
            }
        }
        if (appt.status === 'confirmed') {
            return { label: 'Confirmado', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
        }
        return { label: 'Pendiente', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
    };


    const handleSaveProfile = async () => {
        await updateUserProfile({
            name: editName,
            phone: editPhone
        });
        setIsEditing(false);
    };


    return (
        <div className="p-8 max-w-4xl mx-auto">
            <header className="mb-8 text-center">
                <div className="inline-block relative">
                    <img
                        src={userProfile.avatar}
                        alt={userProfile.name}
                        className="w-24 h-24 rounded-full border-4 border-primary/20 mb-4 mx-auto"
                    />
                    <button onClick={() => setIsEditing(true)} className="absolute bottom-4 right-0 p-1 bg-primary text-white rounded-full text-xs">
                        <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                </div>
                <h1 className="text-3xl font-bold text-text-main-light dark:text-text-main-dark">
                    Hola, {userProfile.name}
                </h1>
                <p className="text-text-sec-light dark:text-text-sec-dark font-medium">
                    Bienvenido a tu espacio personal.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Card */}
                <div className="bg-card-light dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-border-light dark:border-border-dark">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">Mis Datos</h2>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="text-primary text-sm font-bold hover:underline"
                        >
                            {isEditing ? 'Cancelar' : 'Editar'}
                        </button>
                    </div>

                    {isEditing ? (
                        <div className="space-y-4 font-bold">
                            <div>
                                <label className="block text-sm text-text-sec-light">Nombre</label>
                                <input
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="w-full mt-1 p-2 rounded border border-border-light dark:bg-background-dark font-bold text-text-main-light dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-text-sec-light">WhatsApp / Celular</label>
                                <input
                                    value={editPhone}
                                    onChange={e => setEditPhone(e.target.value)}
                                    className="w-full mt-1 p-2 rounded border border-border-light dark:bg-background-dark font-bold text-text-main-light dark:text-white"
                                />
                            </div>
                            <button
                                onClick={handleSaveProfile}
                                className="w-full py-2 bg-primary text-white rounded-lg font-bold"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3 font-bold">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-text-sec-light">mail</span>
                                <span>{userProfile.email}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-text-sec-light">call</span>
                                <span>{userProfile.phone || 'Sin número'}</span>
                            </div>
                            {userProfile.city && (
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-text-sec-light">location_on</span>
                                    <span>{userProfile.city}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Appointments Card */}
                <div className="bg-card-light dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-border-light dark:border-border-dark flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">Mis Citas</h2>
                        <button
                            onClick={() => setIsBookingModalOpen(true)}
                            className="bg-primary hover:bg-sky-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-primary/30 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[20px]">add</span>
                            Agendar Cita
                        </button>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {myAppointments.length === 0 ? (
                            <p className="text-center py-8 text-text-sec-light font-medium">No tienes citas agendadas.</p>
                        ) : (
                            myAppointments.map(appt => {
                                const status = getAppointmentStatus(appt);
                                return (
                                    <div
                                        key={appt.id}
                                        onClick={() => setSelectedAppt(appt)}
                                        className="p-4 bg-background-light dark:bg-background-dark rounded-xl border border-border-light dark:border-border-dark border-l-4 border-l-primary hover:border-primary transition-all cursor-pointer group animate-in slide-in-from-right duration-300"
                                    >
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                                    <p className="font-bold text-text-main-light dark:text-text-main-dark group-hover:text-primary transition-colors truncate">{appt.service}</p>
                                                    <span className={`self-start sm:self-auto text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${status.color} whitespace-nowrap`}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-sec-light dark:text-text-sec-dark font-medium">
                                                    <span className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                                        {appt.date?.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} • {appt.time}
                                                    </span>
                                                    {appt.professionalName && (
                                                        <span className="flex items-center gap-1 text-primary">
                                                            <span className="material-symbols-outlined text-[14px]">person</span>
                                                            {appt.professionalName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1 shrink-0">
                                                <p className="text-sm font-black text-green-600 dark:text-green-400">{appt.price || '$0'}</p>
                                                <p className="text-[10px] text-text-sec-light font-bold flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px] text-slate-400">schedule</span>
                                                    {appt.duration}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* NEW APPOINTMENT MODAL */}
            <BookingModal
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
                userRole={userProfile.role}
                userProfile={userProfile}
            />

            {/* --- MODAL DETALLES UNIFICADO --- */}
            <AppointmentDetailsModal
                isOpen={!!selectedAppt}
                onClose={() => setSelectedAppt(null)}
                appointment={selectedAppt}
                userRole={'client'}
            />
        </div>
    );
};

export default ClientDashboard;
