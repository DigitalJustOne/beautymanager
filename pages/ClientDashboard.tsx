
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { formatPrice, formatDuration } from '../utils/format';
import AppointmentDetailsModal from '../components/AppointmentDetailsModal';
import { generateGoogleCalendarUrl } from '../services/calendarService';
import { supabase } from '../services/supabase';

const ClientDashboard: React.FC = () => {
    const { appointments, userProfile, updateUserProfile, professionals, addAppointment, services } = useData();

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

    // --- STATES FOR BOOKING DISCOVERY ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [service, setService] = useState('Semipermanente Manos');
    const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | ''>('');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [removalType, setRemovalType] = useState<'' | 'semi' | 'acrylic' | 'feet'>('');
    const [formError, setFormError] = useState<string | null>(null);
    const [successLink, setSuccessLink] = useState<string | null>(null);
    const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
    const [bookedApptDetails, setBookedApptDetails] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize edit fields when profile loads
    useEffect(() => {
        setEditName(userProfile.name);
        setEditPhone(userProfile.phone);
    }, [userProfile]);

    // --- HELPERS ---
    const getServiceBaseMinutes = (serviceName: string) => {
        const found = services.find(s => s.name === serviceName);
        return found ? found.duration : 60;
    };

    const currentDurationMinutes = useMemo(() => {
        let minutes = getServiceBaseMinutes(service);
        if (removalType && !service.includes('Retiro') && !service.includes('Corte') && !service.includes('Masaje') && !service.includes('Depilación') && !service.includes('Epilación')) {
            minutes += 30;
        }
        return minutes;
    }, [service, removalType]);

    // const formatDuration = (minutes: number) => { // Moved to utils/format
    //     const h = Math.floor(minutes / 60);
    //     const m = minutes % 60;
    //     if (h > 0 && m > 0) return `${ h }h ${ m } m`;
    //     if (h > 0) return `${ h } h`;
    //     return `${ m } m`;
    // };

    const getServiceBasePrice = (serviceName: string): number => {
        const found = services.find(s => s.name === serviceName);
        return found ? found.price : 0;
    };

    const currentTotalPrice = useMemo(() => {
        let price = getServiceBasePrice(service);
        if (removalType === 'semi') price += 10000;
        if (removalType === 'acrylic') price += 15000;
        if (removalType === 'feet') price += 8000;
        return price;
    }, [service, removalType]);

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

    // Filter professionals by service
    const availableProfessionals = useMemo(() => {
        return professionals.filter(p => p.specialties.includes(service));
    }, [professionals, service]);

    useEffect(() => {
        if (selectedProfessionalId) {
            const pro = professionals.find(p => p.id === selectedProfessionalId);
            if (pro && !pro.specialties.includes(service)) setSelectedProfessionalId('');
        }
    }, [service, professionals, selectedProfessionalId]);

    const businessSchedule = useMemo(() => {
        return [
            { day: 'Lunes', enabled: true, start: '09:00', end: '19:00' },
            { day: 'Martes', enabled: true, start: '09:00', end: '19:00' },
            { day: 'Miércoles', enabled: true, start: '09:00', end: '19:00' },
            { day: 'Jueves', enabled: true, start: '09:00', end: '19:00' },
            { day: 'Viernes', enabled: true, start: '09:00', end: '19:00' },
            { day: 'Sábado', enabled: true, start: '09:00', end: '18:00' },
            { day: 'Domingo', enabled: false, start: '09:00', end: '18:00' }
        ];
    }, []);

    const availableDays = useMemo(() => {
        const days = [];
        const today = new Date();
        for (let i = 0; i < 14; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const dayName = d.toLocaleDateString('es-ES', { weekday: 'long' });
            const scheduleDay = businessSchedule.find(s => s.day.toLowerCase() === dayName.toLowerCase());

            if (scheduleDay && scheduleDay.enabled) {
                days.push(d);
            }
        }
        return days;
    }, [businessSchedule]);

    const timeSlots = useMemo(() => {
        if (!selectedDate) return [];

        const dayName = selectedDate.toLocaleDateString('es-ES', { weekday: 'long' });
        const scheduleDay = businessSchedule.find(s => s.day.toLowerCase() === dayName.toLowerCase());

        if (!scheduleDay || !scheduleDay.enabled) return [];

        const [startHour, startMin] = scheduleDay.start.split(':').map(Number);
        const [endHour, endMin] = scheduleDay.end.split(':').map(Number);

        const slots = [];
        let currentTotalMinutes = startHour * 60 + startMin;
        const endTotalMinutes = endHour * 60 + endMin;
        const step = 30;

        while (currentTotalMinutes + currentDurationMinutes <= endTotalMinutes) {
            const h = Math.floor(currentTotalMinutes / 60);
            const m = currentTotalMinutes % 60;
            const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} `;
            slots.push(timeString);
            currentTotalMinutes += step;
        }

        const now = new Date();
        if (selectedDate.getDate() === now.getDate() && selectedDate.getMonth() === now.getMonth()) {
            const currentHourNow = now.getHours();
            const currentMinNow = now.getMinutes();
            return slots.filter(slot => {
                const [h, m] = slot.split(':').map(Number);
                return h > currentHourNow || (h === currentHourNow && m > currentMinNow);
            });
        }
        return slots;
    }, [selectedDate, currentDurationMinutes, businessSchedule]);

    const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    const isSlotOccupied = (timeToCheck: string) => {
        if (!selectedProfessionalId || !selectedDate) return false;
        const targetDate = normalizeDate(selectedDate);
        const targetProId = Number(selectedProfessionalId);
        const [checkH, checkM] = timeToCheck.split(':').map(Number);
        const newStart = checkH * 60 + checkM;
        const newEnd = newStart + currentDurationMinutes;

        return appointments.some(appt => {
            if (appt.status === 'cancelled') return false;
            if (appt.professionalId !== targetProId) return false;
            if (!appt.date) return false;

            const apptDate = normalizeDate(new Date(appt.date));
            if (apptDate !== targetDate) return false;

            const [existH, existM] = appt.time.split(':').map(Number);
            const existStart = existH * 60 + existM;
            let existDuration = 60;
            const hMatch = appt.duration.match(/(\d+)h/);
            const mMatch = appt.duration.match(/(\d+)m/);
            if (hMatch) existDuration = parseInt(hMatch[1]) * 60;
            if (mMatch) existDuration += parseInt(mMatch[1]);
            else if (!hMatch && !mMatch) existDuration = 60;

            const existEnd = existStart + existDuration;
            return (newStart < existEnd && newEnd > existStart);
        });
    };

    const isDateSelected = (date: Date) => {
        return selectedDate?.getDate() === date.getDate() && selectedDate?.getMonth() === date.getMonth();
    };

    const handleSaveProfile = async () => {
        await updateUserProfile({
            name: editName,
            phone: editPhone
        });
        setIsEditing(false);
    };

    const handleCreateAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        if (!selectedDate || !selectedTime || !selectedProfessionalId || isSubmitting) return;

        setIsSubmitting(true);

        if (isSlotOccupied(selectedTime)) {
            setFormError(`El horario ${selectedTime} ya está ocupado.`);
            setIsSubmitting(false);
            return;
        }

        const selectedPro = professionals.find(p => p.id === Number(selectedProfessionalId));
        const finalDurationString = formatDuration(currentDurationMinutes);
        const finalPriceString = formatPrice(currentTotalPrice);

        let serviceString = service;
        if (removalType === 'semi') serviceString += ' + Retiro Semi';
        if (removalType === 'acrylic') serviceString += ' + Retiro Acrílico';
        if (removalType === 'feet') serviceString += ' + Retiro Pies';

        const newAppt: any = {
            id: Date.now(),
            time: selectedTime,
            ampm: parseInt(selectedTime.split(':')[0]) >= 12 ? 'PM' : 'AM',
            client: userProfile.name,
            service: serviceString,
            duration: finalDurationString,
            price: finalPriceString,
            avatar: userProfile.avatar,
            status: 'pending',
            date: selectedDate,
            professionalId: selectedPro?.id,
            professionalName: selectedPro?.name
        };

        await addAppointment(newAppt);

        try {
            await supabase.functions.invoke('notify-professional', {
                body: {
                    professionalEmail: selectedPro?.email,
                    professionalName: selectedPro?.name,
                    clientName: userProfile.name,
                    service: serviceString,
                    date: selectedDate.toLocaleDateString(),
                    time: selectedTime,
                    appointmentId: newAppt.id
                }
            });
        } catch (emailErr) {
            console.warn("Error triggering notification:", emailErr);
        }

        const link = generateGoogleCalendarUrl(newAppt);

        setIsSubmitting(false);
        setSuccessLink(link);
        setBookedApptDetails(newAppt);
    };

    const resetModal = () => {
        setIsModalOpen(false);
        setSuccessLink(null);
        setSelectedDate(null);
        setSelectedTime(null);
        setRemovalType('');
        setSelectedProfessionalId('');
        setService('Semipermanente Manos');
        setBookedApptDetails(null);
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
                            onClick={() => setIsModalOpen(true)}
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
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 bg-primary text-white flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-lg">{successLink ? '¡Todo Listo!' : 'Nueva Solicitud'}</h3>
                            <button onClick={resetModal}><span className="material-symbols-outlined">close</span></button>
                        </div>

                        {successLink ? (
                            <div className="p-8 flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in duration-300">
                                <div className="size-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-2">
                                    <span className="material-symbols-outlined text-5xl">check_circle</span>
                                </div>
                                <div className="mb-2">
                                    <h4 className="text-2xl font-black mb-1">¡Cita Solicitada!</h4>
                                    <p className="text-text-sec-light">Tu servicio ha sido agendado exitosamente.</p>
                                </div>

                                <div className="w-full bg-background-light dark:bg-background-dark rounded-2xl p-6 border border-border-light dark:border-border-dark flex flex-col gap-4 text-left shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[10px] font-bold text-text-sec-light uppercase tracking-widest mb-1">Servicio</p>
                                            <p className="font-bold text-lg leading-tight">{bookedApptDetails?.service}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-text-sec-light uppercase tracking-widest mb-1">Precio</p>
                                            <p className="font-black text-xl text-green-600 dark:text-green-400">{bookedApptDetails?.price}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between border-t border-border-light dark:border-border-dark pt-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-text-sec-light uppercase tracking-widest mb-1">Fecha y Hora</p>
                                            <p className="text-sm font-bold capitalize">{bookedApptDetails?.date?.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} • {bookedApptDetails?.time}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-text-sec-light uppercase tracking-widest mb-1">Especialista</p>
                                            <p className="text-sm font-bold text-primary">{bookedApptDetails?.professionalName}</p>
                                        </div>
                                    </div>
                                </div>

                                <a
                                    href={successLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-card-dark border border-gray-200 dark:border-border-dark shadow-sm rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all group w-full justify-center"
                                >
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google Calendar" className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                    <div className="text-left font-bold">
                                        <p className="text-gray-800 dark:text-gray-200">Agregar a Google Calendar</p>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Recordatorio automático</p>
                                    </div>
                                </a>

                                <button onClick={resetModal} className="text-primary font-bold hover:underline py-2">Volver al Inicio</button>
                            </div>
                        ) : (
                            <form onSubmit={handleCreateAppointment} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 scrollbar-hide">
                                {formError && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 p-4 rounded-xl flex gap-3">
                                        <span className="material-symbols-outlined shrink-0">error</span>
                                        <span className="text-sm">{formError}</span>
                                    </div>
                                )}

                                {/* Datos - Locked for consistency */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-75 pointer-events-none">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-sec-light pl-1">WhatsApp</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-sec-light text-sm">smartphone</span>
                                            <input type="text" value={userProfile.phone || ''} readOnly className="w-full rounded-xl border bg-gray-50 dark:bg-slate-800/50 pl-10 pr-4 h-12 text-sm text-gray-500 font-bold" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-sec-light pl-1">Email</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-sec-light text-sm">mail</span>
                                            <input type="text" value={userProfile.email} readOnly className="w-full rounded-xl border bg-gray-50 dark:bg-slate-800/50 pl-10 pr-4 h-12 text-sm text-gray-500 font-bold truncate" />
                                        </div>
                                    </div>
                                </div>

                                {/* PRICE BANNER */}
                                <div className="flex items-center justify-center bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-2xl p-6 my-2 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-green-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                                    <div className="text-center relative z-10">
                                        <span className="block text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest mb-1">Inversión Final</span>
                                        <span className="block text-4xl font-black text-green-600 dark:text-green-400 tracking-tight leading-normal">{formatPrice(currentTotalPrice)}</span>
                                    </div>
                                </div>

                                {/* Selection Area */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-black">Servicio</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-sec-light">spa</span>
                                            <select
                                                value={service}
                                                onChange={e => setService(e.target.value)}
                                                className="w-full rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark pl-10 pr-4 h-12 text-sm font-bold focus:border-primary focus:ring-1 focus:ring-primary dark:text-white outline-none transition-all appearance-none truncate"
                                            >
                                                {Array.from(new Set(services.map(s => s.category))).map(cat => (
                                                    <optgroup key={cat} label={cat}>
                                                        {services.filter(s => s.category === cat).map(s => (
                                                            <option key={s.id} value={s.name}>{s.name}</option>
                                                        ))}
                                                    </optgroup>
                                                ))}
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-sec-light pointer-events-none">expand_more</span>
                                        </div>

                                        {!service.includes('Retiro') && !service.includes('Corte') && !service.includes('Masaje') && !service.includes('Depilación') && !service.includes('Epilación') && (
                                            <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                                <span className="block text-[10px] font-black text-text-sec-light dark:text-text-sec-dark uppercase tracking-widest mb-2">¿Necesitas Retiro? (+30m)</span>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button type="button" onClick={() => setRemovalType('')} className={`px - 2 py - 2 text - xs rounded - lg font - bold border transition - all ${removalType === '' ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white border-gray-300' : 'bg-white border-transparent'} `}>No</button>
                                                    <button type="button" onClick={() => setRemovalType('semi')} className={`px - 2 py - 2 text - xs rounded - lg font - bold border transition - all truncate ${removalType === 'semi' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white border-gray-200 text-text-sec-light'} `}>Semi (+$10k)</button>
                                                    <button type="button" onClick={() => setRemovalType('acrylic')} className={`px - 2 py - 2 text - xs rounded - lg font - bold border transition - all truncate ${removalType === 'acrylic' ? 'bg-purple-500 text-white border-purple-500 shadow-sm' : 'bg-white border-gray-200 text-text-sec-light'} `}>Acrílico (+$15k)</button>
                                                    <button type="button" onClick={() => setRemovalType('feet')} className={`px - 2 py - 2 text - xs rounded - lg font - bold border transition - all truncate ${removalType === 'feet' ? 'bg-teal-500 text-white border-teal-500 shadow-sm' : 'bg-white border-gray-200 text-text-sec-light'} `}>Pies (+$8k)</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-black">Profesional</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-sec-light">badge</span>
                                            <select
                                                value={selectedProfessionalId}
                                                onChange={(e) => setSelectedProfessionalId(Number(e.target.value))}
                                                required
                                                className="w-full rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark pl-10 pr-4 h-12 text-sm font-bold focus:border-primary focus:ring-1 focus:ring-primary dark:text-white outline-none transition-all appearance-none"
                                            >
                                                <option value="" disabled>Seleccionar...</option>
                                                {availableProfessionals.map(pro => (
                                                    <option key={pro.id} value={pro.id}>{pro.name}</option>
                                                ))}
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-sec-light pointer-events-none">expand_more</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-border-light dark:border-border-dark my-1"></div>

                                {/* Date Selection */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-black flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-[18px]">calendar_month</span>
                                        Fecha
                                    </label>
                                    <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide snap-x">
                                        {availableDays.map((date, idx) => (
                                            <button
                                                type="button"
                                                key={idx}
                                                onClick={() => setSelectedDate(date)}
                                                className={`snap - start shrink - 0 flex flex - col items - center justify - center w - 16 h - 20 rounded - xl border transition - all duration - 200 ${isDateSelected(date)
                                                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-105'
                                                    : 'bg-white dark:bg-card-dark border-border-light dark:border-border-dark hover:border-primary text-text-sec-light dark:text-text-sec-dark hover:bg-primary/5'
                                                    } `}
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-tighter">{date.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                                                <span className="text-xl font-black mt-1">{date.getDate()}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Time Selection */}
                                <div className={`flex flex - col gap - 2 transition - opacity duration - 300 ${selectedDate ? 'opacity-100' : 'opacity-50 pointer-events-none'} `}>
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-black flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary text-[18px]">schedule</span>
                                            Hora
                                            <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded ml-2 uppercase tracking-widest">Duración: {formatDuration(currentDurationMinutes)}</span>
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2">
                                        {timeSlots.length > 0 ? (
                                            timeSlots.map((time) => {
                                                const isOccupied = isSlotOccupied(time);
                                                return (
                                                    <button
                                                        type="button"
                                                        key={time}
                                                        disabled={isOccupied}
                                                        onClick={() => { if (!isOccupied) setSelectedTime(time); }}
                                                        className={`py - 2 rounded - lg text - sm font - black border transition - all relative overflow - hidden ${selectedTime === time
                                                            ? 'bg-primary border-primary text-white shadow-md z-10'
                                                            : isOccupied
                                                                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                                                                : 'bg-white border-border-light text-text-main-light hover:bg-primary/10 hover:border-primary'
                                                            } `}
                                                    >
                                                        {time}
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            selectedDate && (
                                                <div className="col-span-4 text-center py-4 text-xs font-bold text-orange-500 bg-orange-50 rounded-xl border border-orange-100">
                                                    No hay horarios disponibles.
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t flex gap-3">
                                    <button type="button" onClick={resetModal} className="flex-1 py-3 font-black text-gray-400 hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                                    <button
                                        type="submit"
                                        disabled={!selectedDate || !selectedTime || !selectedProfessionalId || isSubmitting}
                                        className="flex-1 py-3 bg-primary text-white rounded-xl font-black shadow-lg hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                                <span>Procesando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[20px]">send</span>
                                                Solicitar Cita
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

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
