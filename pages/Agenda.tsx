import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Appointment, Client } from '../types';
import { generateGoogleCalendarUrl } from '../services/calendarService';
import { formatPrice, formatDuration } from '../utils/format';
import AppointmentDetailsModal from '../components/AppointmentDetailsModal';

type ViewMode = 'day' | 'week' | 'month';

const Agenda: React.FC = () => {
    const navigate = useNavigate();
    const { appointments, clients, professionals, addAppointment, addClient, updateAppointmentStatus, deleteAppointment, userProfile, services } = useData();

    // --- ESTADOS DE VISTA Y NAVEGACIÓN ---
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentTime, setCurrentTime] = useState(new Date());

    // --- ESTADOS DE MODALES ---
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null); // Para ver detalles
    const [isModalOpen, setIsModalOpen] = useState(false); // Para crear nueva cita

    // --- ESTADOS DEL FORMULARIO (Igual que Dashboard) ---
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [service, setService] = useState('Semipermanente Manos');
    const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | ''>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    // NUEVO: Tipo de retiro
    const [removalType, setRemovalType] = useState<'' | 'semi' | 'acrylic' | 'feet'>('');

    // NUEVO: Estados para confirmación exitosa (Unificación con ClientDashboard)
    const [successLink, setSuccessLink] = useState<string | null>(null);
    const [bookedApptDetails, setBookedApptDetails] = useState<any | null>(null);

    // Actualizar reloj y resetear hora al cambiar fecha
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        setSelectedTime(null);
        setFormError(null);
    }, [selectedDate, selectedProfessionalId, removalType, service]);

    // Lock Professional Selection if user is a Professional
    useEffect(() => {
        if (userProfile.role === 'professional' && userProfile.email) {
            const myPro = professionals.find(p => p.email === userProfile.email);
            if (myPro) {
                setSelectedProfessionalId(myPro.id);
            }
        }
    }, [userProfile, professionals]);

    // Filtrar profesionales según el servicio seleccionado
    const availableProfessionals = useMemo(() => {
        return professionals.filter(p => p.specialties.includes(service));
    }, [professionals, service]);

    // Resetear profesional si cambia el servicio y el actual no lo soporta
    useEffect(() => {
        if (selectedProfessionalId) {
            const pro = professionals.find(p => p.id === selectedProfessionalId);
            if (pro && !pro.specialties.includes(service)) {
                setSelectedProfessionalId('');
            }
        }
    }, [service, professionals, selectedProfessionalId]);

    // --- HELPERS ---
    const getClientInfo = (clientName: string): Client | undefined => {
        return clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    // Helper de Estado (Igual que en Clients y Dashboard)
    const getAppointmentStatus = (appt: Appointment) => {
        if (appt.status === 'cancelled') {
            return { label: 'Cancelado', color: 'bg-red-100 text-red-700', bg: 'bg-red-500' };
        }

        if (appt.date) {
            const now = new Date();
            const apptDate = new Date(appt.date);
            const [hours, minutes] = appt.time.split(':').map(Number);
            apptDate.setHours(hours, minutes, 0, 0);

            // Calcular duración en minutos
            let durationMinutes = 60;
            const hMatch = appt.duration.match(/(\d+)h/);
            const mMatch = appt.duration.match(/(\d+)m/);
            if (hMatch) durationMinutes = parseInt(hMatch[1]) * 60;
            if (mMatch) durationMinutes += parseInt(mMatch[1]);
            else if (!hMatch && !mMatch) durationMinutes = 60;

            const endTime = new Date(apptDate.getTime() + durationMinutes * 60000);

            // Estado EN PROCESO (En Servicio)
            if (now >= apptDate && now < endTime && appt.status === 'confirmed') {
                return { label: 'En Servicio', color: 'bg-purple-100 text-purple-700', bg: 'bg-purple-500' };
            }

            // Estado FINALIZADO
            if (now >= endTime) {
                return { label: 'Finalizado', color: 'bg-blue-100 text-blue-700', bg: 'bg-blue-500' };
            }
        }

        if (appt.status === 'confirmed') {
            return { label: 'Confirmado', color: 'bg-green-100 text-green-700', bg: 'bg-green-500' };
        }
        return { label: 'Pendiente', color: 'bg-orange-100 text-orange-700', bg: 'bg-orange-500' };
    };

    // Helper para determinar duración EN MINUTOS (Dinámico desde DB)
    const getServiceBaseMinutes = (serviceName: string) => {
        const found = services.find(s => s.name === serviceName);
        return found ? found.duration : 60;
    };

    const currentDurationMinutes = useMemo(() => {
        let minutes = getServiceBaseMinutes(service);
        // Si hay algún tipo de retiro seleccionado (y no es el servicio principal), sumar 30 min
        if (removalType && !service.includes('Retiro') && !service.includes('Corte') && !service.includes('Masaje') && !service.includes('Depilación') && !service.includes('Epilación')) {
            minutes += 30;
        }
        return minutes;
    }, [service, removalType]);



    // Helper para obtener precio base (Dinámico desde DB)
    const getServiceBasePrice = (serviceName: string): number => {
        const found = services.find(s => s.name === serviceName);
        return found ? found.price : 0;
    };

    // Calcular precio TOTAL (Base + Retiro específico)
    const currentTotalPrice = useMemo(() => {
        let price = getServiceBasePrice(service);

        // Lógica de precios de retiro específicos
        if (removalType === 'semi') price += 10000;
        if (removalType === 'acrylic') price += 15000;
        if (removalType === 'feet') price += 8000;

        return price;
    }, [service, removalType]);



    // --- LÓGICA DE NAVEGACIÓN (Funcionalidad solicitada) ---
    const navigateDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        const modifier = direction === 'next' ? 1 : -1;

        if (viewMode === 'day') {
            newDate.setDate(currentDate.getDate() + modifier);
        } else if (viewMode === 'week') {
            newDate.setDate(currentDate.getDate() + (modifier * 7));
        } else {
            newDate.setMonth(currentDate.getMonth() + modifier);
        }
        setCurrentDate(newDate);
    };

    const goToToday = () => setCurrentDate(new Date());

    // --- CÁLCULO DE FECHAS PARA VISTAS ---
    const calendarDays = useMemo(() => {
        if (viewMode === 'day') {
            return [currentDate];
        }

        if (viewMode === 'week') {
            const date = new Date(currentDate);
            const day = date.getDay(); // 0 (Domingo) - 6 (Sábado)
            // Ajustar para que la semana empiece el Lunes (1)
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(date.setDate(diff));

            const days = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                days.push(d);
            }
            return days;
        }

        return []; // Month view se maneja separado
    }, [currentDate, viewMode]);

    // --- LÓGICA DE NUEVA CITA (Idéntica a Dashboard) ---

    // Días disponibles para el selector del formulario
    const availableDays = useMemo(() => {
        const days = [];
        const today = new Date();
        for (let i = 0; i < 14; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);

            // Obtener el nombre del día en Español (ej: "Lunes", "Martes")
            const dayName = d.toLocaleDateString('es-ES', { weekday: 'long' });

            // Buscar configuración en schedule (case-insensitive)
            const scheduleDay = userProfile.schedule.find(s => s.day.toLowerCase() === dayName.toLowerCase());

            // Solo agregar si el día existe en el horario y está habilitado
            if (scheduleDay && scheduleDay.enabled) {
                days.push(d);
            }
        }
        return days;
    }, [userProfile.schedule]);

    // Generar slots de tiempo dinámicamente según la fecha seleccionada Y el horario de apertura
    const timeSlots = useMemo(() => {
        if (!selectedDate) return [];

        const dayName = selectedDate.toLocaleDateString('es-ES', { weekday: 'long' });
        const scheduleDay = userProfile.schedule.find(s => s.day.toLowerCase() === dayName.toLowerCase());

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
            const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            slots.push(timeString);
            currentTotalMinutes += step;
        }

        const now = new Date();
        const isToday = selectedDate.getDate() === now.getDate() &&
            selectedDate.getMonth() === now.getMonth() &&
            selectedDate.getFullYear() === now.getFullYear();

        if (isToday) {
            const currentHourNow = now.getHours();
            const currentMinNow = now.getMinutes();
            return slots.filter(slot => {
                const [h, m] = slot.split(':').map(Number);
                return h > currentHourNow || (h === currentHourNow && m > currentMinNow);
            });
        }

        return slots;
    }, [selectedDate, userProfile.schedule, currentDurationMinutes]);

    const isDateSelected = (date: Date) => {
        return selectedDate?.getDate() === date.getDate() && selectedDate?.getMonth() === date.getMonth();
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value.length <= 10) setClientPhone(value);
    };

    // Detectar cliente existente
    const existingClient = useMemo(() => {
        if (clientPhone.length < 10) return null;
        return clients.find(c => c.phone === clientPhone);
    }, [clientPhone, clients]);

    // --- LÓGICA ROBUSTA DE VALIDACIÓN DE CONFLICTOS ---
    const normalizeDate = (d: Date) => {
        // Retorna timestamp de la fecha a medianoche (00:00:00) para comparaciones precisas
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    };

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

            // Estimación segura de duración existente
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
    // --------------------------------------------------

    // Auto-fill si existe el cliente
    useEffect(() => {
        if (existingClient) {
            setClientName(existingClient.name);
            setClientEmail(existingClient.email);
        }
    }, [existingClient]);

    const resetModal = () => {
        setIsModalOpen(false);
        setSuccessLink(null);
        setBookedApptDetails(null);
        setClientName('');
        setClientPhone('');
        setClientEmail('');
        setService('Semipermanente Manos');
        setRemovalType('');
        setSelectedProfessionalId('');
        setSelectedDate(null);
        setSelectedTime(null);
        setFormError(null);
    };

    const handleCreateAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!selectedDate || !selectedTime || !clientName || !clientEmail || clientPhone.length !== 10 || !selectedProfessionalId || isSubmitting) return;

        // Validación Final de Conflicto (Doble chequeo)
        if (isSlotOccupied(selectedTime)) {
            const proName = professionals.find(p => p.id === Number(selectedProfessionalId))?.name;
            setFormError(`El horario seleccionado (${selectedTime}) ya está ocupado para ${proName}. Por favor elige otro.`);
            return;
        }

        setIsSubmitting(true);

        try {
            // --- VALIDACIÓN ESTRICTA DE DUPLICADOS ---
            if (!existingClient) {
                const emailOwner = clients.find(c => c.email.toLowerCase() === clientEmail.toLowerCase());
                if (emailOwner) {
                    setFormError(`El correo electrónico ya está registrado con el cliente "${emailOwner.name}". No se puede crear un nuevo registro.`);
                    setIsSubmitting(false);
                    return;
                }
            } else {
                const emailOwner = clients.find(c => c.email.toLowerCase() === clientEmail.toLowerCase());
                if (emailOwner && emailOwner.id !== existingClient.id) {
                    setFormError(`El correo ingresado pertenece a otro cliente (${emailOwner.name}). Por favor verifique.`);
                    setIsSubmitting(false);
                    return;
                }
            }
            // ----------------------------------------

            const avatarUrl = existingClient ? existingClient.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(clientName)}&background=random`;
            const selectedPro = professionals.find(p => p.id === Number(selectedProfessionalId));

            // 1. Verificar/Crear Cliente
            let finalClientName = clientName;
            let finalClientId = existingClient?.id;

            if (!existingClient) {
                const newClient = await addClient({
                    id: Date.now(),
                    name: clientName,
                    email: clientEmail,
                    phone: clientPhone,
                    lastVisit: 'Nuevo',
                    avatar: avatarUrl,
                    isNew: true
                });
                if (newClient) finalClientId = newClient.id;
            } else {
                finalClientName = existingClient.name;
            }

            const finalDurationString = formatDuration(currentDurationMinutes);
            const finalPriceString = formatPrice(currentTotalPrice);

            // Construir string de servicio con el retiro específico
            let serviceString = service;
            if (removalType === 'semi') serviceString += ' + Retiro Semi';
            if (removalType === 'acrylic') serviceString += ' + Retiro Acrílico';
            if (removalType === 'feet') serviceString += ' + Retiro Pies';

            // 2. Crear Cita
            const newAppt: Appointment = {
                id: Date.now() + 1,
                time: selectedTime,
                ampm: parseInt(selectedTime.split(':')[0]) >= 12 ? 'PM' : 'AM',
                client: finalClientName,
                clientId: finalClientId,
                service: serviceString,
                duration: finalDurationString,
                price: finalPriceString,
                avatar: avatarUrl,
                status: 'pending',
                date: selectedDate,
                professionalId: selectedPro?.id,
                professionalName: selectedPro?.name
            };

            await addAppointment(newAppt);

            // Generar Link y Mostrar Éxito
            const calendarUrl = generateGoogleCalendarUrl(newAppt);
            setSuccessLink(calendarUrl);
            setBookedApptDetails(newAppt);

            // NO cerramos el modal, mostramos UI de éxito
        } catch (error) {
            console.error("Error creating appointment:", error);
            setFormError("Ocurrió un error al crear la cita.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- RENDERIZADO DE COMPONENTES ---

    const renderTimeGrid = () => {
        // Helpers para cálculo de geometría y colisiones
        const getMinutesFromTime = (timeStr: string) => {
            const [hours, mins] = timeStr.split(':').map(Number);
            return hours * 60 + mins;
        };

        const getDurationInMinutes = (dur: string) => {
            let total = 0;
            const h = dur.match(/(\d+)\s*h/);
            const m = dur.match(/(\d+)\s*m/);
            if (h) total += parseInt(h[1]) * 60;
            if (m) total += parseInt(m[1]);
            // Si no matchea nada pero hay solo numero, asumir minutos (ej "45m")
            if (!h && !m && dur.includes('m')) {
                total += parseInt(dur.replace('m', ''));
            }
            return total || 60;
        };

        const getCurrentTimePosition = () => {
            const h = currentTime.getHours();
            const m = currentTime.getMinutes();
            if (h < 8 || h > 20) return -1;
            return ((h - 8) * 100) + ((m / 60) * 100);
        };
        const timePos = getCurrentTimePosition();

        return (
            <div className="flex flex-1 overflow-y-auto relative scrollbar-hide bg-white dark:bg-[#101c22]">
                {/* Columna de Horas */}
                <div className="w-16 md:w-20 shrink-0 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-[#15232d] pt-14 z-20 sticky left-0">
                    <div className="relative h-[1300px]">
                        {[...Array(13)].map((_, i) => (
                            <div key={i} className="h-[100px] text-right pr-3 text-xs text-slate-400 font-medium -mt-2.5">{`${i + 8}:00`}</div>
                        ))}
                    </div>
                </div>

                {/* Grid Principal */}
                <div className="flex flex-1 flex-col min-w-[600px]">
                    {/* Cabecera Días */}
                    <div className="flex border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-[#101c22] z-30 h-14 shadow-sm">
                        {calendarDays.map((day, i) => {
                            const isToday = isSameDay(day, new Date());
                            return (
                                <div key={i} className={`flex-1 text-center py-2 border-r border-slate-100 dark:border-slate-800/50 ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                    <span className={`block text-xs uppercase font-semibold ${isToday ? 'text-primary' : 'text-slate-500'}`}>
                                        {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                                    </span>
                                    <div className={`mx-auto size-7 flex items-center justify-center text-sm font-bold rounded-full ${isToday ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-slate-900 dark:text-white'}`}>
                                        {day.getDate()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Área de Slots */}
                    <div className="relative flex flex-1 h-[1300px]">
                        {/* Líneas de fondo */}
                        <div className="absolute inset-0 flex flex-col pointer-events-none">
                            {[...Array(13)].map((_, i) => <div key={i} className="flex-1 border-b border-slate-100 dark:border-slate-800/50 border-dashed"></div>)}
                        </div>
                        {/* Columnas */}
                        <div className="absolute inset-0 flex pointer-events-none">
                            {calendarDays.map((day, i) => (
                                <div key={i} className={`flex-1 border-r border-slate-100 dark:border-slate-800 ${isSameDay(day, new Date()) ? 'bg-blue-50/20 dark:bg-blue-900/5' : ''}`}></div>
                            ))}
                        </div>

                        {/* Línea de Hora Actual */}
                        {timePos > 0 && calendarDays.some(d => isSameDay(d, new Date())) && (
                            <div className="absolute w-full flex items-center z-10 pointer-events-none" style={{ top: `${timePos}px` }}>
                                <div className="w-full border-t-2 border-red-500 shadow-sm opacity-50"></div>
                                <div className="absolute -left-1.5 bg-red-500 text-[10px] text-white px-1 rounded">
                                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        )}

                        {/* Citas con Algoritmo de Colisión */}
                        {calendarDays.map((day, colIndex) => {
                            const dayAppts = appointments.filter(a => a.date && isSameDay(new Date(a.date), day));

                            // --- ALGORITMO DE LAYOUT DE EVENTOS ---
                            // 1. Encontrar grupos de eventos que colisionan (Connected Components)
                            // 2. Asignar columnas dentro de cada grupo para evitar superposiciones

                            // Preparar eventos con geometría base
                            let items = dayAppts.map(appt => {
                                const startMin = getMinutesFromTime(appt.time);
                                const durationMin = getDurationInMinutes(appt.duration);
                                return {
                                    ...appt,
                                    _start: startMin,
                                    _end: startMin + durationMin,
                                    _duration: durationMin,
                                    _colIndex: 0, // Columna asignada
                                    _totalCols: 1 // Total de columnas en su grupo
                                };
                            }).sort((a, b) => a._start - b._start || b._duration - a._duration); // Ordenar por inicio, luego duración

                            // Resolver colisiones
                            const columns: typeof items[] = [];
                            let lastEventEnding: number | null = null;

                            items.forEach(ev => {
                                // Buscar primera columna donde quepa el evento
                                let placed = false;
                                for (let i = 0; i < columns.length; i++) {
                                    const col = columns[i];
                                    const lastInCol = col[col.length - 1];
                                    if (lastInCol._end <= ev._start) {
                                        col.push(ev);
                                        ev._colIndex = i;
                                        placed = true;
                                        break;
                                    }
                                }
                                if (!placed) {
                                    columns.push([ev]);
                                    ev._colIndex = columns.length - 1;
                                }
                            });

                            // Calcular ancho total basado en el número máximo de columnas en un "cluster"
                            // Un cluster es un conjunto de eventos que se solapan temporalmente
                            // Para simplificar: tomaremos el ancho de las columnas totales activas en ese momento
                            // Una heurística mejor: Expandir el ancho si no hay vecinos a la derecha
                            const totalColumns = columns.length;

                            return (
                                <div key={colIndex} className="absolute top-0 bottom-0" style={{ left: `${colIndex * (100 / calendarDays.length)}%`, width: `${100 / calendarDays.length}%` }}>
                                    {items.map(appt => {
                                        const status = getAppointmentStatus(appt);

                                        // Calcular ancho y posición
                                        // Estrategia simple: width = 100 / totalColumns
                                        // left = colIndex * width

                                        // Ajuste para móviles: si hay muchas columnas, scroll o minimo ancho?
                                        // Por ahora mantenemos porcentual

                                        const widthPercent = 100 / (totalColumns || 1);
                                        const leftPercent = appt._colIndex * widthPercent;
                                        const topPx = ((appt._start / 60) - 8) * 100;
                                        const heightPx = (appt._duration / 60) * 100;

                                        return (
                                            <div
                                                key={appt.id}
                                                onClick={() => setSelectedAppointment(appt)}
                                                className="absolute px-0.5 py-0 z-10 transition-all hover:scale-[1.02] hover:z-20 cursor-pointer"
                                                style={{
                                                    top: `${topPx}px`,
                                                    height: `${heightPx}px`,
                                                    width: `${widthPercent}%`,
                                                    left: `${leftPercent}%`
                                                }}
                                            >
                                                <div className={`h-full border-l-4 rounded-md p-1.5 shadow-sm flex flex-col justify-between overflow-hidden text-xs leading-tight ${status.color.includes('blue')
                                                    ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-500'
                                                    : appt.professionalId && appt.professionalId % 2 === 0
                                                        ? 'bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 border-purple-500'
                                                        : 'bg-primary/10 hover:bg-primary/20 border-primary'
                                                    }`}>
                                                    <div className="overflow-hidden">
                                                        <h4 className="font-bold text-slate-900 dark:text-white truncate text-[11px]">{appt.service}</h4>
                                                        <p className="text-slate-600 dark:text-slate-300 truncate text-[10px]">{appt.client}</p>
                                                        {appt.professionalName && (
                                                            <p className="text-primary text-[9px] mt-0.5 truncate">{appt.professionalName}</p>
                                                        )}
                                                    </div>
                                                    <span className="text-[9px] text-slate-500 font-medium block">{appt.time}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderMonthGrid = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let startDay = firstDayOfMonth.getDay() - 1;
        if (startDay === -1) startDay = 6;

        const days = [];
        for (let i = 0; i < startDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

        return (
            <div className="flex-1 flex flex-col bg-white dark:bg-[#101c22] overflow-y-auto p-4">
                <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 mb-2">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                        <div key={d} className="text-center py-2 text-sm font-bold text-slate-500 uppercase">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 auto-rows-[minmax(120px,1fr)] gap-2">
                    {days.map((day, idx) => {
                        if (!day) return <div key={idx} className="bg-slate-50/50 dark:bg-slate-800/20 rounded-lg"></div>;

                        const isToday = isSameDay(day, new Date());
                        const dayAppts = appointments
                            .filter(a => a.date && isSameDay(new Date(a.date), day))
                            .sort((a, b) => {
                                const [aH, aM] = a.time.split(':').map(Number);
                                const [bH, bM] = b.time.split(':').map(Number);
                                return (aH * 60 + aM) - (bH * 60 + bM);
                            });

                        return (
                            <div key={idx} className={`border border-slate-100 dark:border-slate-800 rounded-lg p-2 flex flex-col gap-1 transition-colors hover:border-primary/50 ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10 ring-1 ring-primary' : 'bg-white dark:bg-card-dark'}`}>
                                <div className="flex justify-between items-start">
                                    <span className={`text-sm font-bold size-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {day.getDate()}
                                    </span>
                                    {dayAppts.length > 0 && <span className="text-xs font-bold text-slate-400">{dayAppts.length} citas</span>}
                                </div>
                                <div className="flex-1 flex flex-col gap-1 overflow-y-auto scrollbar-hide mt-1">
                                    {dayAppts.slice(0, 3).map(appt => (
                                        <button
                                            key={appt.id}
                                            onClick={() => setSelectedAppointment(appt)}
                                            className="text-left text-[10px] px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary truncate border-l-2 border-primary"
                                        >
                                            {appt.time} {appt.client}
                                        </button>
                                    ))}
                                    {dayAppts.length > 3 && (
                                        <span className="text-[10px] text-center text-slate-400">+{dayAppts.length - 3} más</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // --- UI PRINCIPAL ---

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#0d1418] relative">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-[#15232d] z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1">
                        <button onClick={() => navigateDate('prev')} className="p-1.5 rounded-full hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all text-slate-600 dark:text-slate-300"><span className="material-symbols-outlined text-lg">chevron_left</span></button>
                        <button onClick={goToToday} className="px-3 py-1 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">Hoy</button>
                        <button onClick={() => navigateDate('next')} className="p-1.5 rounded-full hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all text-slate-600 dark:text-slate-300"><span className="material-symbols-outlined text-lg">chevron_right</span></button>
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-none capitalize">
                            {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                        </h2>
                        <span className="text-sm text-slate-500 dark:text-slate-400 capitalize">
                            {viewMode === 'day' ? currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' }) :
                                viewMode === 'month' ? 'Vista Mensual' :
                                    `Semana del ${calendarDays[0]?.getDate()} al ${calendarDays[6]?.getDate()}`}
                        </span>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 justify-end">
                    {/* Botón dinámico de Google Calendar */}
                    <button
                        onClick={() => navigate('/settings')}
                        title={userProfile.isGoogleCalendarConnected ? "Sincronizado correctamente. Clic para configurar." : "No sincronizado. Clic para conectar."}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${userProfile.isGoogleCalendarConnected
                            ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/40'
                            : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">
                            {userProfile.isGoogleCalendarConnected ? 'sync' : 'sync_disabled'}
                        </span>
                        <span className="text-xs font-semibold">
                            {userProfile.isGoogleCalendarConnected ? 'Google Calendar' : 'Sin Sincronizar'}
                        </span>
                        {userProfile.isGoogleCalendarConnected && <span className="size-2 bg-green-500 rounded-full animate-pulse ml-1"></span>}
                    </button>

                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-full flex">
                        <button onClick={() => setViewMode('day')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'day' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-white/50'}`}>Día</button>
                        <button onClick={() => setViewMode('week')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'week' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-white/50'}`}>Semana</button>
                        <button onClick={() => setViewMode('month')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'month' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-white/50'}`}>Mes</button>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-full font-bold shadow-lg shadow-primary/30 transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Nueva Cita
                    </button>
                </div>
            </div>

            {/* View Render */}
            {viewMode === 'month' ? renderMonthGrid() : renderTimeGrid()}

            {/* --- MODAL DETALLES UNIFICADO --- */}
            <AppointmentDetailsModal
                isOpen={!!selectedAppointment}
                onClose={() => setSelectedAppointment(null)}
                appointment={selectedAppointment}
                userRole={userProfile.role}
                onConfirm={selectedAppointment?.status === 'pending' ? () => {
                    updateAppointmentStatus(selectedAppointment.id, 'confirmed');
                    setSelectedAppointment(null);
                } : undefined}
                onCancel={(selectedAppointment?.status === 'pending' || selectedAppointment?.status === 'confirmed') ? () => {
                    if (window.confirm('¿Estás seguro de cancelar esta cita?')) {
                        updateAppointmentStatus(selectedAppointment.id, 'cancelled');
                        setSelectedAppointment(null);
                    }
                } : undefined}
            />

            {/* --- MODAL NUEVA CITA (Unificado) --- */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-border-light dark:border-border-dark animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                            <div className="p-4 bg-primary text-white flex justify-between items-center shrink-0">
                                <h3 className="font-bold text-lg">{successLink ? '¡Todo Listo!' : 'Nueva Cita'}</h3>
                                <button onClick={resetModal}><span className="material-symbols-outlined">close</span></button>
                            </div>

                            {successLink ? (
                                <div className="p-8 flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in duration-300 overflow-y-auto scrollbar-hide">
                                    <div className="size-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-2">
                                        <span className="material-symbols-outlined text-5xl">check_circle</span>
                                    </div>
                                    <div className="mb-2">
                                        <h4 className="text-2xl font-black mb-1">¡Cita Registrada!</h4>
                                        <p className="text-text-sec-light">El servicio ha sido agendado exitosamente.</p>
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

                                    <button onClick={resetModal} className="text-primary font-bold hover:underline py-2">Volver al Calendario</button>
                                </div>
                            ) : (
                                <form onSubmit={handleCreateAppointment} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 scrollbar-hide">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-start gap-3 border border-blue-100 dark:border-blue-900/30">
                                        <span className="material-symbols-outlined text-blue-500 mt-0.5">info</span>
                                        <p className="text-sm text-blue-800 dark:text-blue-200">
                                            Se registrará automáticamente el cliente si es nuevo y se enviará la invitación de calendario.
                                        </p>
                                    </div>

                                    {formError && (
                                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 p-4 rounded-xl flex gap-3 animate-in fade-in slide-in-from-top-1">
                                            <span className="material-symbols-outlined shrink-0">error</span>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm">No se pudo agendar la cita</span>
                                                <span className="text-xs">{formError}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Contacto: Teléfono y Email */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-bold text-text-main-light dark:text-text-main-dark">Celular </label>
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-sec-light">smartphone</span>
                                                <input
                                                    required
                                                    type="tel"
                                                    pattern="[0-9]{10}"
                                                    maxLength={10}
                                                    value={clientPhone}
                                                    onChange={handlePhoneChange}
                                                    placeholder="Ej: 5512345678"
                                                    className="w-full rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark pl-10 pr-4 h-12 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:text-white outline-none transition-all"
                                                />
                                            </div>
                                            {existingClient && (
                                                <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg mt-1 border border-blue-100 dark:border-blue-800">
                                                    <span className="material-symbols-outlined text-sm">verified</span>
                                                    <span>Este número es de <strong>{existingClient.name}</strong></span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-bold text-text-main-light dark:text-text-main-dark">Correo Electrónico</label>
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-sec-light">mail</span>
                                                <input
                                                    required
                                                    type="email"
                                                    value={clientEmail}
                                                    onChange={(e) => setClientEmail(e.target.value)}
                                                    placeholder="cliente@ejemplo.com"
                                                    className="w-full rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark pl-10 pr-4 h-12 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:text-white outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cliente */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-bold text-text-main-light dark:text-text-main-dark">Nombre del Cliente</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-sec-light">person</span>
                                            <input
                                                required
                                                type="text"
                                                value={clientName}
                                                onChange={(e) => setClientName(e.target.value)}
                                                placeholder="Nombre completo"
                                                className="w-full rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark pl-10 pr-4 h-12 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:text-white outline-none transition-all"
                                                readOnly={!!existingClient} // Bloquear si existe
                                            />
                                            {existingClient && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-500 font-bold bg-white dark:bg-card-dark px-1">Autocompletado</span>}
                                        </div>
                                    </div>

                                    {/* PRICE DISPLAY BANNER */}
                                    <div className="flex items-center justify-center bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-2xl p-4 my-2">
                                        <div className="text-center">
                                            <span className="block text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Valor Total del Servicio</span>
                                            <span className="block text-4xl font-black text-green-600 dark:text-green-400 tracking-tight">{formatPrice(currentTotalPrice)}</span>
                                        </div>
                                    </div>

                                    {/* Servicio y Profesional */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-bold text-text-main-light dark:text-text-main-dark">Servicio</label>
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-sec-light">spa</span>
                                                <select
                                                    value={service}
                                                    onChange={(e) => setService(e.target.value)}
                                                    className="w-full rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark pl-10 pr-4 h-12 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:text-white outline-none transition-all appearance-none truncate"
                                                >
                                                    {/* DYNAMIC OPTIONS */}
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
                                                <div className="mt-2 p-3 bg-gray-50 dark:bg-card-dark rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                                    <span className="block text-xs font-bold text-text-sec-light dark:text-text-sec-dark uppercase mb-2">¿Incluir Retiro? (+30m)</span>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setRemovalType('')}
                                                            className={`px-2 py-2 text-xs rounded-lg font-bold border transition-all ${removalType === ''
                                                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white border-gray-300 dark:border-gray-600'
                                                                : 'bg-white dark:bg-background-dark text-gray-500 border-transparent hover:border-gray-200'
                                                                }`}
                                                        >
                                                            No
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setRemovalType('semi')}
                                                            className={`px-2 py-2 text-xs rounded-lg font-bold border transition-all truncate ${removalType === 'semi'
                                                                ? 'bg-primary text-white border-primary shadow-sm'
                                                                : 'bg-white dark:bg-background-dark text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-primary/50'
                                                                }`}
                                                        >
                                                            Semi (+$10k)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setRemovalType('acrylic')}
                                                            className={`px-2 py-2 text-xs rounded-lg font-bold border transition-all truncate ${removalType === 'acrylic'
                                                                ? 'bg-purple-500 text-white border-purple-500 shadow-sm'
                                                                : 'bg-white dark:bg-background-dark text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-purple-500/50'
                                                                }`}
                                                        >
                                                            Acrílico (+$15k)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setRemovalType('feet')}
                                                            className={`px-2 py-2 text-xs rounded-lg font-bold border transition-all truncate ${removalType === 'feet'
                                                                ? 'bg-teal-500 text-white border-teal-500 shadow-sm'
                                                                : 'bg-white dark:bg-background-dark text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-teal-500/50'
                                                                }`}
                                                        >
                                                            Pies (+$8k)
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-bold text-text-main-light dark:text-text-main-dark">Profesional</label>
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-sec-light">badge</span>
                                                <select
                                                    value={selectedProfessionalId}
                                                    onChange={(e) => setSelectedProfessionalId(Number(e.target.value))}
                                                    required
                                                    disabled={userProfile.role === 'professional'}
                                                    className="w-full rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark pl-10 pr-4 h-12 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:text-white outline-none transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
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

                                    {/* Date Selection Grid */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-bold text-text-main-light dark:text-text-main-dark flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary text-[18px]">calendar_month</span>
                                            Selecciona Fecha Disponible
                                        </label>
                                        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide snap-x">
                                            {availableDays.length > 0 ? (
                                                availableDays.map((date, idx) => (
                                                    <button
                                                        type="button"
                                                        key={idx}
                                                        onClick={() => setSelectedDate(date)}
                                                        className={`snap-start shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-xl border transition-all duration-200 ${isDateSelected(date)
                                                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-105'
                                                            : 'bg-white dark:bg-card-dark border-border-light dark:border-border-dark hover:border-primary text-text-sec-light dark:text-text-sec-dark hover:bg-primary/5'
                                                            }`}
                                                    >
                                                        <span className="text-xs font-medium uppercase">{date.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                                                        <span className="text-xl font-black mt-1">{date.getDate()}</span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="w-full text-center py-4 text-sm text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                                    No hay fechas disponibles próximas según el horario de apertura.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Time Selection Grid */}
                                    <div className={`flex flex-col gap-2 transition-opacity duration-300 ${selectedDate ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-bold text-text-main-light dark:text-text-main-dark flex items-center gap-2">
                                                <span className="material-symbols-outlined text-primary text-[18px]">schedule</span>
                                                Selecciona Hora
                                                {!selectedDate && <span className="text-xs font-normal text-red-500 ml-2">(Elige una fecha primero)</span>}
                                                {/* Display Estimated Duration */}
                                                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded ml-2">Duración: {formatDuration(currentDurationMinutes)}</span>
                                            </label>

                                            {/* Leyenda de Disponibilidad */}
                                            <div className="flex gap-3 text-[10px] text-text-sec-light dark:text-text-sec-dark">
                                                <div className="flex items-center gap-1"><span className="size-2 rounded-full bg-white border border-gray-300"></span>Libre</div>
                                                <div className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary"></span>Elegido</div>
                                                <div className="flex items-center gap-1"><span className="size-2 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200"></span>Ocupado</div>
                                            </div>
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
                                                            onClick={() => {
                                                                if (!isOccupied) setSelectedTime(time);
                                                            }}
                                                            className={`py-2 rounded-lg text-sm font-bold border transition-all relative overflow-hidden ${selectedTime === time
                                                                ? 'bg-primary border-primary text-white shadow-md z-10'
                                                                : isOccupied
                                                                    ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                                                    : 'bg-white dark:bg-card-dark border-border-light dark:border-border-dark text-text-main-light dark:text-text-main-dark hover:bg-primary/10 hover:border-primary'
                                                                }`}
                                                        >
                                                            {time}
                                                            {isOccupied && <span className="absolute inset-0 flex items-center justify-center bg-gray-200/50 dark:bg-black/50"><span className="material-symbols-outlined text-xs">block</span></span>}
                                                        </button>
                                                    );
                                                })
                                            ) : (
                                                selectedDate && (
                                                    <div className="col-span-4 text-center py-4 text-sm text-orange-500 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                                        No hay horarios disponibles para este día con la duración requerida ({formatDuration(currentDurationMinutes)}).
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-4 pt-4 border-t border-border-light dark:border-border-dark">
                                        <button
                                            type="button"
                                            onClick={resetModal}
                                            disabled={isSubmitting}
                                            className="flex-1 py-3 rounded-xl font-bold text-text-sec-light dark:text-text-sec-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors disabled:opacity-50"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!selectedDate || !selectedTime || !clientName || !clientEmail || clientPhone.length < 10 || !selectedProfessionalId || isSubmitting}
                                            className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                                    <span>Procesando...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-[20px]">send</span>
                                                    <span>Agendar y Enviar</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default Agenda;