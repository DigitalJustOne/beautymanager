import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Appointment, Client } from '../types';
import AppointmentDetailsModal from '../components/AppointmentDetailsModal';
import BookingModal from '../components/BookingModal';

type ViewMode = 'day' | 'week' | 'month';

const Agenda: React.FC = () => {
    const navigate = useNavigate();
    const { appointments, clients, updateAppointmentStatus, deleteAppointment, userProfile } = useData();

    // --- ESTADOS DE VISTA Y NAVEGACIÓN ---
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentTime, setCurrentTime] = useState(new Date());

    // --- ESTADOS DE MODALES ---
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [initialBookingDate, setInitialBookingDate] = useState<Date | undefined>(undefined);
    const [initialProfessionalId, setInitialProfessionalId] = useState<number | undefined>(undefined);

    // Actualizar reloj y resetear hora al cambiar fecha
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Helper para abrir modal con datos iniciales
    const openBookingModal = (date?: Date, proId?: number) => {
        setInitialBookingDate(date);
        setInitialProfessionalId(proId);
        setIsBookingModalOpen(true);
    };

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
                        onClick={() => openBookingModal()}
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
            <BookingModal
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
                userRole={userProfile.role}
                userProfile={userProfile}
                initialDate={initialBookingDate}
                initialProfessionalId={initialProfessionalId}
            />
        </div>
    );
};

export default Agenda;