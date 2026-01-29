import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { formatPrice, formatDuration, parseDuration } from '../utils/format';

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    userRole: 'admin' | 'professional' | 'client';
    userProfile: any;
    initialDate?: Date;
    initialProfessionalId?: number;
}

const BookingModal: React.FC<BookingModalProps> = ({
    isOpen,
    onClose,
    userRole,
    userProfile,
    initialDate,
    initialProfessionalId
}) => {
    const defaultSchedule = [
        { day: 'Lunes', enabled: true, start: '09:00', end: '19:00' },
        { day: 'Martes', enabled: true, start: '09:00', end: '19:00' },
        { day: 'Miércoles', enabled: true, start: '09:00', end: '19:00' },
        { day: 'Jueves', enabled: true, start: '09:00', end: '19:00' },
        { day: 'Viernes', enabled: true, start: '09:00', end: '19:00' },
        { day: 'Sábado', enabled: true, start: '09:00', end: '17:00' },
        { day: 'Domingo', enabled: false, start: '09:00', end: '14:00' }
    ];

    const {
        services,
        professionals,
        appointments,
        addAppointment,
        clients,
        addClient
    } = useData();

    // --- FORM STATE ---
    const [clientPhone, setClientPhone] = useState(userRole === 'client' ? userProfile.phone || '' : '');
    const [clientEmail, setClientEmail] = useState(userRole === 'client' ? userProfile.email || '' : '');
    const [clientName, setClientName] = useState(userRole === 'client' ? userProfile.name || '' : '');
    const [service, setService] = useState('');
    const [removalType, setRemovalType] = useState('');
    const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | ''>(
        userRole === 'professional' ? userProfile.id : (initialProfessionalId || '')
    );
    const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate || null);
    const [selectedTime, setSelectedTime] = useState('');

    // --- APP STATE ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [successLink, setSuccessLink] = useState('');
    const [bookedApptDetails, setBookedApptDetails] = useState<any>(null);

    // Reset when modal opens with new initial data
    useEffect(() => {
        if (isOpen) {
            if (initialDate) setSelectedDate(initialDate);
            if (initialProfessionalId) setSelectedProfessionalId(initialProfessionalId);
            if (userRole === 'professional') setSelectedProfessionalId(userProfile.id);
            if (userRole === 'client') {
                setClientPhone(userProfile.phone || '');
                setClientEmail(userProfile.email || '');
                setClientName(userProfile.name || '');
            }
        }
    }, [isOpen, initialDate, initialProfessionalId, userRole, userProfile]);

    const resetModal = () => {
        setService('');
        setRemovalType('');
        if (userRole !== 'professional') setSelectedProfessionalId('');
        setSelectedDate(null);
        setSelectedTime('');
        setSuccessLink('');
        setFormError('');
        setBookedApptDetails(null);
        if (userRole !== 'client') {
            setClientPhone('');
            setClientEmail('');
            setClientName('');
        }
        onClose();
    };

    // --- LOGIC HELPERS ---
    const existingClient = useMemo(() => {
        if (!clientPhone || clientPhone.length < 10) return null;
        return clients.find(c => c.phone === clientPhone);
    }, [clientPhone, clients]);

    useEffect(() => {
        if (existingClient && userRole !== 'client') {
            setClientName(existingClient.name);
            setClientEmail(existingClient.email);
        }
    }, [existingClient, userRole]);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
        setClientPhone(val);
    };

    const getServiceBasePrice = (name: string) => {
        const found = services.find(s => s.name === name);
        return found ? found.price : 0;
    };

    const getServiceBaseMinutes = (name: string) => {
        const found = services.find(s => s.name === name);
        return found ? found.duration : 60;
    };

    const currentTotalPrice = useMemo(() => {
        let price = getServiceBasePrice(service);
        if (removalType === 'semi') price += 10000;
        if (removalType === 'acrylic') price += 15000;
        if (removalType === 'feet') price += 8000;
        return price;
    }, [service, removalType, services]);

    const currentDurationMinutes = useMemo(() => {
        let minutes = getServiceBaseMinutes(service);
        if (removalType && service && !service.includes('Retiro') && !service.includes('Corte') && !service.includes('Masaje') && !service.includes('Depilación') && !service.includes('Epilación')) {
            minutes += 30;
        }
        return minutes;
    }, [service, removalType, services]);

    const availableProfessionals = useMemo(() => {
        if (!service) return professionals;
        return professionals.filter(p => p.specialties && Array.isArray(p.specialties) && p.specialties.includes(service));
    }, [service, professionals]);

    const availableDays = useMemo(() => {
        if (!selectedProfessionalId) return [];
        const pro = professionals.find(p => p.id === Number(selectedProfessionalId));
        const schedule = pro?.schedule || defaultSchedule;

        const days = [];
        const today = new Date();
        for (let i = 0; i < 14; i++) {
            const d = new Date();
            d.setDate(today.getDate() + i);
            const dayName = d.toLocaleDateString('es-ES', { weekday: 'long' });
            const scheduleDay = schedule.find((s: any) => s.day.toLowerCase() === dayName.toLowerCase());
            if (scheduleDay && scheduleDay.enabled) {
                days.push(d);
            }
        }
        return days;
    }, [selectedProfessionalId, professionals]);

    const timeSlots = useMemo(() => {
        if (!selectedDate || !selectedProfessionalId) return [];
        const pro = professionals.find(p => p.id === Number(selectedProfessionalId));
        const schedule = pro?.schedule || defaultSchedule;

        const dayName = selectedDate.toLocaleDateString('es-ES', { weekday: 'long' });
        const scheduleDay = schedule.find((s: any) => s.day.toLowerCase() === dayName.toLowerCase());
        if (!scheduleDay || !scheduleDay.enabled) return [];

        const [startHour, startMin] = scheduleDay.start.split(':').map(Number);
        const [endHour, endMin] = scheduleDay.end.split(':').map(Number);

        const slots = [];
        let current = startHour * 60 + startMin;
        const end = endHour * 60 + endMin;

        while (current + currentDurationMinutes <= end) {
            const h = Math.floor(current / 60);
            const m = current % 60;
            const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

            // Filter out past times for today
            const isToday = selectedDate.toDateString() === new Date().toDateString();
            if (isToday) {
                const now = new Date();
                const nowMin = now.getHours() * 60 + now.getMinutes();
                if (current > nowMin + 30) {
                    slots.push(timeStr);
                }
            } else {
                slots.push(timeStr);
            }
            current += 30;
        }
        return slots;
    }, [selectedDate, selectedProfessionalId, currentDurationMinutes, professionals]);

    const isSlotOccupied = (time: string) => {
        if (!selectedDate || !selectedProfessionalId) return false;
        const startMin = time.split(':').reduce((acc, curr, i) => acc + Number(curr) * (i === 0 ? 60 : 1), 0);
        const endMin = startMin + currentDurationMinutes;

        return appointments.some(appt => {
            if (appt.status === 'cancelled') return false;
            if (Number(appt.professionalId) !== Number(selectedProfessionalId)) return false;
            if (appt.date?.toDateString() !== selectedDate.toDateString()) return false;

            const apptStart = appt.time.split(':').reduce((acc, curr, i) => acc + Number(curr) * (i === 0 ? 60 : 1), 0);
            const apptDuration = parseDuration(appt.duration);
            const apptEnd = apptStart + apptDuration;

            return (startMin < apptEnd && endMin > apptStart);
        });
    };

    const handleCreateAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!service || !selectedProfessionalId || !selectedDate || !selectedTime || !clientPhone || !clientName) {
            setFormError('Por favor completa todos los campos obligatorios.');
            return;
        }

        setIsSubmitting(true);
        setFormError('');

        try {
            if (!existingClient && userRole !== 'client') {
                await addClient({
                    name: clientName,
                    phone: clientPhone,
                    email: clientEmail,
                    notes: 'Registrado desde el sistema de reserva',
                    totalAppointments: 0,
                    lastVisit: '',
                    status: 'active',
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(clientName)}&background=random&color=fff`
                });
            }

            const pro = professionals.find(p => p.id === Number(selectedProfessionalId));

            const newAppt = {
                client: clientName,
                clientPhone: clientPhone,
                clientEmail: clientEmail,
                service: service + (removalType ? ` (+Retiro ${removalType})` : ''),
                date: selectedDate,
                time: selectedTime,
                duration: formatDuration(currentDurationMinutes),
                price: formatPrice(currentTotalPrice),
                status: (userRole === 'client' ? 'pending' : 'confirmed') as 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'in_progress',
                professionalId: Number(selectedProfessionalId),
                professionalName: pro?.name || 'Especialista',
                avatar: existingClient?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(clientName)}&background=random`
            };

            await addAppointment(newAppt);

            const gCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(newAppt.service)}&dates=${selectedDate.toISOString().replace(/-|:|\.\d\d\d/g, '')}/${selectedDate.toISOString().replace(/-|:|\.\d\d\d/g, '')}&details=${encodeURIComponent('Cita en Beauty Manager con ' + newAppt.professionalName)}&location=Beauty+Manager+Studio`;

            setBookedApptDetails(newAppt);
            setSuccessLink(gCalUrl);
        } catch (err) {
            setFormError('Error al crear la cita. Por favor intenta de nuevo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white dark:bg-card-dark rounded-[24px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20">
                {/* --- HEADER BONITO (uploaded_media_1) --- */}
                <div className="p-5 bg-primary text-white flex justify-between items-center shrink-0 shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                            <span className="material-symbols-outlined text-[24px]">{successLink ? 'task_alt' : 'calendar_add_on'}</span>
                        </div>
                        <div>
                            <h3 className="font-black text-xl leading-none">{successLink ? '¡Todo Listo!' : 'Nueva Cita'}</h3>
                            <p className="text-[10px] font-bold text-white/70 uppercase tracking-[0.2em] mt-1">Gestión de Agenda</p>
                        </div>
                    </div>
                    <button onClick={resetModal} className="hover:bg-white/20 p-2 rounded-full transition-all active:scale-90">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {successLink ? (
                        /* --- SUCCESS SCREEN --- */
                        <div className="p-8 flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in duration-500">
                            <div className="relative">
                                <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 animate-pulse"></div>
                                <div className="size-24 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center relative border-4 border-white dark:border-card-dark shadow-xl">
                                    <span className="material-symbols-outlined text-6xl">check_circle</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h4 className="text-3xl font-black text-slate-800 dark:text-white">¡Reserva Exitosa!</h4>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">La cita ha sido agendada y sincronizada.</p>
                            </div>

                            <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 flex flex-col gap-5 text-left shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Servicio</p>
                                        <p className="font-bold text-lg text-slate-800 dark:text-white leading-tight">{bookedApptDetails?.service}</p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio</p>
                                        <p className="font-black text-2xl text-green-600 dark:text-green-400">{bookedApptDetails?.price}</p>
                                    </div>
                                </div>
                                <div className="h-px bg-slate-200 dark:bg-slate-700 w-full"></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha y Hora</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 capitalize">
                                            {bookedApptDetails?.date?.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} <br />
                                            <span className="text-primary text-lg">{bookedApptDetails?.time}</span>
                                        </p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Especialista</p>
                                        <p className="text-sm font-bold text-primary">{bookedApptDetails?.professionalName}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 w-full mt-2">
                                <a
                                    href={successLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-card-dark border-2 border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group w-full justify-center active:scale-95"
                                >
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google Calendar" className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                    <div className="text-left font-bold">
                                        <p className="text-slate-800 dark:text-slate-100 leading-tight">Agregar a Mi Calendario</p>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Sincronización automática</p>
                                    </div>
                                </a>
                                <button onClick={resetModal} className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg border-b-4 border-black/20 active:border-b-0 active:translate-y-1 transition-all">
                                    LISTO, CONTINUAR
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* --- FORM SCREEN --- */
                        <form onSubmit={handleCreateAppointment} className="p-6 flex flex-col gap-6">

                            {/* PRICE BANNER UNIFICADO (uploaded_media_1) */}
                            <div className="flex items-center justify-center bg-green-50 dark:bg-green-900/10 border-2 border-green-100 dark:border-green-800/50 rounded-3xl p-6 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-green-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-700"></div>
                                <div className="text-center relative z-10">
                                    <span className="block text-[10px] font-black text-green-600/60 dark:text-green-400/60 uppercase tracking-[0.3em] mb-2">Valor Estimado del Servicio</span>
                                    <span className="block text-4xl md:text-6xl font-black text-green-600 dark:text-green-500 tracking-tighter leading-none">{formatPrice(currentTotalPrice)}</span>
                                </div>
                            </div>

                            {userRole !== 'client' && (
                                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl flex items-start gap-3 border border-blue-100 dark:border-blue-900/30">
                                    <span className="material-symbols-outlined text-blue-500">verified_user</span>
                                    <p className="text-xs text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
                                        Se registrará automáticamente el cliente si es nuevo y se enviará la invitación de calendario profesional.
                                    </p>
                                </div>
                            )}

                            {formError && (
                                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-2xl flex gap-3 animate-bounce shadow-sm">
                                    <span className="material-symbols-outlined shrink-0">warning</span>
                                    <div className="flex flex-col">
                                        <span className="font-black text-sm uppercase tracking-tight">¡Atención!</span>
                                        <span className="text-xs font-bold opacity-80">{formError}</span>
                                    </div>
                                </div>
                            )}

                            {/* --- CLIENT DATA --- */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Celular del Cliente</label>
                                        <div className="relative group">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">smartphone</span>
                                            <input
                                                required
                                                type="tel"
                                                pattern="[0-9]{10}"
                                                maxLength={10}
                                                value={clientPhone}
                                                onChange={handlePhoneChange}
                                                readOnly={userRole === 'client'}
                                                placeholder="Ej: 3001234567"
                                                className={`w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 pl-11 pr-3 md:pl-12 md:pr-4 h-14 text-sm md:text-base font-bold outline-none transition-all dark:text-white ${userRole === 'client' ? 'opacity-70 grayscale bg-slate-200' : 'focus:border-primary focus:bg-white dark:focus:border-primary/50'}`}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Correo Electrónico</label>
                                        <div className="relative group">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">mail</span>
                                            <input
                                                required
                                                type="email"
                                                value={clientEmail}
                                                onChange={(e) => setClientEmail(e.target.value)}
                                                readOnly={userRole === 'client'}
                                                placeholder="cliente@correo.com"
                                                className={`w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 pl-11 pr-3 md:pl-12 md:pr-4 h-14 text-sm md:text-base font-bold outline-none transition-all dark:text-white ${userRole === 'client' ? 'opacity-70 grayscale bg-slate-200' : 'focus:border-primary focus:bg-white dark:focus:border-primary/50'}`}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nombre Completo</label>
                                    <div className="relative group">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">person</span>
                                        <input
                                            required
                                            type="text"
                                            value={clientName}
                                            onChange={(e) => setClientName(e.target.value)}
                                            readOnly={userRole === 'client' || !!existingClient}
                                            placeholder="Nombre del cliente"
                                            className={`w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 pl-12 pr-4 h-14 text-base font-bold outline-none transition-all dark:text-white ${userRole === 'client' || !!existingClient ? 'opacity-70 grayscale bg-slate-200' : 'focus:border-primary focus:bg-white dark:focus:border-primary/50'}`}
                                        />
                                        {existingClient && userRole !== 'client' && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary bg-primary/10 px-3 py-1.5 rounded-full uppercase tracking-widest">Cliente Frecuente</span>}
                                    </div>
                                </div>
                            </div>

                            {/* --- SERVICE SELECTION --- */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Tratamiento o Servicio</label>
                                    <div className="relative group">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">spa</span>
                                        <select
                                            value={service}
                                            onChange={(e) => setService(e.target.value)}
                                            required
                                            className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 pl-12 pr-10 h-14 text-base font-bold outline-none transition-all appearance-none dark:text-white truncate focus:border-primary focus:bg-white"
                                        >
                                            <option value="" disabled>Selecciona un servicio...</option>
                                            {Array.from(new Set(services.map(s => s.category))).map(cat => (
                                                <optgroup key={cat} label={cat} className="font-black text-primary bg-white dark:bg-card-dark">
                                                    {services.filter(s => s.category === cat).map(s => (
                                                        <option key={s.id} value={s.name} className="font-bold text-slate-700 dark:text-white">{s.name}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">unfold_more</span>
                                    </div>

                                    {/* --- REMOVAL AD-ONS --- */}
                                    {service && service.includes && !service.includes('Retiro') && !service.includes('Corte') && !service.includes('Masaje') && !service.includes('Depilación') && !service.includes('Epilación') && (
                                        <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-slate-100 dark:border-slate-800 border-dashed">
                                            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">¿Incluir Retiro? (+30m)</span>
                                            <div className="grid grid-cols-2 gap-2">
                                                {[
                                                    { id: '', label: 'No', color: 'slate' },
                                                    { id: 'semi', label: 'Semi (+$10k)', color: 'primary' },
                                                    { id: 'acrylic', label: 'Acrílico (+$15k)', color: 'purple' },
                                                    { id: 'feet', label: 'Pies (+$8k)', color: 'teal' }
                                                ].map(opt => (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => setRemovalType(opt.id)}
                                                        className={`px-3 py-2.5 text-xs rounded-xl font-black border-2 transition-all truncate ${removalType === opt.id
                                                            ? `bg-${opt.color === 'primary' ? 'primary' : opt.color + '-500'} text-white border-transparent shadow-md transform scale-[1.02]`
                                                            : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-50 dark:border-slate-800 hover:border-slate-200'}`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* --- PROFESSIONAL SELECTION --- */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Especialista</label>
                                    <div className="relative group">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">badge</span>
                                        <select
                                            value={selectedProfessionalId}
                                            onChange={(e) => setSelectedProfessionalId(Number(e.target.value))}
                                            required
                                            disabled={userRole === 'professional'}
                                            className={`w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 pl-12 pr-10 h-14 text-base font-bold outline-none transition-all appearance-none dark:text-white focus:border-primary focus:bg-white ${userRole === 'professional' ? 'opacity-80' : ''}`}
                                        >
                                            <option value="" disabled>Seleccionar...</option>
                                            {availableProfessionals.map(pro => (
                                                <option key={pro.id} value={pro.id}>{pro.name}</option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                                    </div>
                                    {userRole === 'professional' && <p className="text-[10px] text-primary/70 font-bold uppercase ml-1">Agendando como tú (Solo lectura)</p>}
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 dark:bg-slate-800 w-full my-2"></div>

                            {/* --- DATE SELECTION --- */}
                            <div className="flex flex-col gap-3">
                                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-sm">event</span>
                                    Fecha Disponible
                                </label>
                                <div className="flex overflow-x-auto gap-3 pb-2 px-1 scrollbar-hide snap-x">
                                    {availableDays.length > 0 ? (
                                        availableDays.map((date, idx) => {
                                            const isSel = selectedDate?.toDateString() === date.toDateString();
                                            return (
                                                <button
                                                    type="button"
                                                    key={idx}
                                                    onClick={() => {
                                                        setSelectedDate(date);
                                                        setSelectedTime('');
                                                    }}
                                                    className={`snap-start shrink-0 flex flex-col items-center justify-center w-[72px] h-[88px] rounded-[20px] border-2 transition-all duration-300 transform ${isSel
                                                        ? 'bg-primary border-primary text-white shadow-xl shadow-primary/30 -translate-y-1 scale-105'
                                                        : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 hover:border-primary/30 text-slate-400 hover:bg-primary/5'}`}
                                                >
                                                    <span className="text-[10px] font-black uppercase tracking-tighter opacity-70">{date.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                                                    <span className="text-2xl font-black mt-0.5">{date.getDate()}</span>
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="w-full text-center py-6 text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                                            {selectedProfessionalId ? 'No hay fechas disponibles próximas' : 'Elige un especialista primero'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* --- TIME SELECTION --- */}
                            <div className={`flex flex-col gap-4 transition-all duration-500 ${selectedDate ? 'opacity-100 translate-y-0' : 'opacity-30 blur-sm pointer-events-none translate-y-4'}`}>
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-sm">schedule</span>
                                        Escoge tu Horario
                                    </label>
                                    <div className="bg-primary/5 px-3 py-1 rounded-full text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5 shadow-sm border border-primary/10">
                                        <span className="material-symbols-outlined text-sm">timer</span>
                                        {formatDuration(currentDurationMinutes)}
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                    {timeSlots.length > 0 ? (
                                        timeSlots.map((time) => {
                                            const isOccupied = isSlotOccupied(time);
                                            const isSel = selectedTime === time;
                                            return (
                                                <button
                                                    type="button"
                                                    key={time}
                                                    disabled={isOccupied}
                                                    onClick={() => !isOccupied && setSelectedTime(time)}
                                                    className={`py-3 rounded-xl text-[13px] font-black border-2 transition-all duration-200 relative overflow-hidden ${isSel
                                                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105 z-10'
                                                        : isOccupied
                                                            ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-50 dark:border-slate-800 text-slate-200 dark:text-slate-600 cursor-not-allowed grayscale'
                                                            : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-primary hover:bg-primary/5 hover:text-primary'}`}
                                                >
                                                    {time}
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-4 text-center py-6 text-[11px] font-black text-orange-500 bg-orange-50/50 dark:bg-orange-900/10 rounded-2xl border-2 border-orange-100/50 dark:border-orange-900/20 uppercase tracking-widest">
                                            Sin horarios disponibles para este día
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* --- SUBMIT BUTTON --- */}
                            <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 shrink-0">
                                <button
                                    type="submit"
                                    disabled={!selectedDate || !selectedTime || !service || !selectedProfessionalId || isSubmitting}
                                    className="w-full bg-primary hover:bg-primary/90 text-white py-5 rounded-[20px] font-black text-xl shadow-xl shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-3 relative overflow-hidden group"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span className="uppercase tracking-widest">Procesando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-[28px] group-hover:rotate-12 transition-transform">send</span>
                                            <span className="uppercase tracking-widest">AGENDAR Y ENVIAR CITA</span>
                                            <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mt-4">Beauty Manager • Studio de Belleza Profesional</p>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookingModal;
