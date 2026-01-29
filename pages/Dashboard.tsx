import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Appointment, Client } from '../types';
import { generateGoogleCalendarUrl } from '../services/calendarService';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { appointments, clients, professionals, addAppointment, addClient, updateAppointmentStatus, deleteAppointment, userProfile } = useData();

    // Estados Modales
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null); // Para ver detalles desde el Dashboard

    // Estado para el menú desplegable de cada cita
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    // Estado del formulario
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [service, setService] = useState('Semipermanente Manos');
    const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | ''>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    // NUEVO: Estado para el tipo de retiro (string vacío = no retiro)
    const [removalType, setRemovalType] = useState<'' | 'semi' | 'acrylic' | 'feet'>('');

    // Resetear la hora seleccionada cuando cambia la fecha, servicio o retiro
    useEffect(() => {
        setSelectedTime(null);
        setFormError(null);
    }, [selectedDate, selectedProfessionalId, removalType, service]);

    // Filtrar profesionales
    const availableProfessionals = useMemo(() => {
        return professionals.filter(p => p.specialties.includes(service));
    }, [professionals, service]);

    // Resetear profesional si cambia el servicio
    useEffect(() => {
        if (selectedProfessionalId) {
            const pro = professionals.find(p => p.id === selectedProfessionalId);
            if (pro && !pro.specialties.includes(service)) {
                setSelectedProfessionalId('');
            }
        }
    }, [service, professionals, selectedProfessionalId]);


    // Generar días disponibles
    const availableDays = useMemo(() => {
        const days = [];
        const today = new Date();
        for (let i = 0; i < 14; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const dayName = d.toLocaleDateString('es-ES', { weekday: 'long' });
            const scheduleDay = userProfile.schedule.find(s => s.day.toLowerCase() === dayName.toLowerCase());
            if (scheduleDay && scheduleDay.enabled) {
                days.push(d);
            }
        }
        return days;
    }, [userProfile.schedule]);

    // Helper Precios (AUMENTADOS EN 10K SEGÚN SOLICITUD)
    const getServiceBasePrice = (serviceName: string): number => {
        const prices: { [key: string]: number } = {
            'Corte de Cabello': 35000,
            'Esmaltado Tradicional': 30000,
            'Semipermanente Hombre': 35000,
            'Semipermanente Pies': 48000,
            'Semipermanente Manos': 55000,
            'Nivelación Base Ruber': 70000,
            'Builder Gel': 80000,
            'Dipping': 80000,
            'Soft Gel': 85000,
            'Retiro (Solo Retiro)': 20000,
            'Depilación de Axilas': 25000,
            'Epilación de Cejas': 25000,
            'Epilación de Bozo': 18000,
            'Epilación y Sombreado de Cejas en Henna': 35000,
            'Masaje Relajante': 90000
        };
        return prices[serviceName] || 0;
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

    const formatPrice = (price: number) => {
        return `$${price.toLocaleString('es-CO')}`;
    };

    // Helper Duración
    const getServiceBaseMinutes = (serviceName: string) => {
        const durations: { [key: string]: number } = {
            'Corte de Cabello': 60,
            'Esmaltado Tradicional': 60,
            'Semipermanente Hombre': 60,
            'Semipermanente Pies': 60,
            'Semipermanente Manos': 120,
            'Nivelación Base Ruber': 120,
            'Builder Gel': 150,
            'Dipping': 120,
            'Soft Gel': 150,
            'Retiro (Solo Retiro)': 30,
            'Depilación de Axilas': 20,
            'Epilación de Cejas': 20,
            'Epilación de Bozo': 15,
            'Epilación y Sombreado de Cejas en Henna': 45,
            'Masaje Relajante': 60
        };
        return durations[serviceName] || 60;
    };

    const currentDurationMinutes = useMemo(() => {
        let minutes = getServiceBaseMinutes(service);
        // Si hay algún tipo de retiro seleccionado (y no es el servicio principal), sumar 30 min
        if (removalType && !service.includes('Retiro') && !service.includes('Corte') && !service.includes('Masaje') && !service.includes('Depilación') && !service.includes('Epilación')) {
            minutes += 30;
        }
        return minutes;
    }, [service, removalType]);

    const formatDuration = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
    };

    // Slots de tiempo
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

    // Detectar cliente
    const existingClient = useMemo(() => {
        if (clientPhone.length < 10) return null;
        return clients.find(c => c.phone === clientPhone);
    }, [clientPhone, clients]);

    // Recuperar info completa del cliente para el modal de detalles
    const getClientInfo = (clientName: string): Client | undefined => {
        return clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
    };

    // Validación Conflictos
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

    // Helper Estado
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

            // EN SERVICIO
            if (now >= apptDate && now < endTime && appt.status === 'confirmed') {
                return { label: 'En Servicio', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: 'timelapse' };
            }

            // FINALIZADO
            if (now >= endTime) {
                return { label: 'Finalizado', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: 'check_circle' };
            }
        }
        if (appt.status === 'confirmed') {
            return { label: 'Confirmado', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: 'verified' };
        }
        return { label: 'Pendiente', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: 'schedule' };
    };

    // Acciones de Citas
    const toggleMenu = (id: number) => {
        setOpenMenuId(openMenuId === id ? null : id);
    };

    const handleUpdateStatus = (id: number, newStatus: 'confirmed' | 'pending' | 'cancelled') => {
        updateAppointmentStatus(id, newStatus);
        setOpenMenuId(null);
    };

    const handleDeleteForever = (id: number) => {
        if (window.confirm('¿Estás seguro de eliminar este registro permanentemente? Esta acción no se puede deshacer.')) {
            deleteAppointment(id);
        }
        setOpenMenuId(null);
    };

    // Crear Cita
    const handleCreateAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!selectedDate || !selectedTime || !clientName || !clientEmail || !clientPhone || !selectedProfessionalId) return;

        if (clientPhone.length !== 10) {
            setFormError("Por favor ingresa un número de celular válido de 10 dígitos.");
            return;
        }

        if (isSlotOccupied(selectedTime)) {
            const proName = professionals.find(p => p.id === Number(selectedProfessionalId))?.name;
            setFormError(`El horario seleccionado (${selectedTime}) ya está ocupado para ${proName}. Por favor elige otro.`);
            return;
        }

        setIsSubmitting(true);

        try {
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

            const avatarUrl = existingClient ? existingClient.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(clientName)}&background=random`;
            const selectedPro = professionals.find(p => p.id === Number(selectedProfessionalId));

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

            const newAppt: Appointment = {
                id: Date.now() + 1,
                time: selectedTime,
                ampm: parseInt(selectedTime.split(':')[0]) >= 12 ? 'PM' : 'AM',
                client: finalClientName,
                clientId: finalClientId, // Pass ID
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

            // Preguntar si desea sincronizar con Google Calendar
            if (window.confirm(`¡Solicitud registrada!\nTotal a pagar: ${finalPriceString}\n\n¿Deseas agregar este evento a Google Calendar ahora?`)) {
                const calendarUrl = generateGoogleCalendarUrl(newAppt);
                if (calendarUrl) {
                    window.open(calendarUrl, '_blank');
                }
            } else {
                alert(`Cita registrada correctamente.`);
            }

            setIsModalOpen(false);
            setClientName('');
            setClientPhone('');
            setClientEmail('');
            setService('Semipermanente Manos');
            setRemovalType(''); // Reset retiro
            setSelectedProfessionalId('');
            setSelectedDate(null);
            setSelectedTime(null);
        } catch (error) {
            console.error("Error creating appointment:", error);
            setFormError("Ocurrió un error al crear la cita. Por favor intente nuevamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isDateSelected = (date: Date) => {
        return selectedDate?.getDate() === date.getDate() && selectedDate?.getMonth() === date.getMonth();
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value.length <= 10) setClientPhone(value);
    };

    useEffect(() => {
        if (existingClient) {
            setClientName(existingClient.name);
            setClientEmail(existingClient.email);
        }
    }, [existingClient]);

    const pendingAppointments = appointments.filter(a => a.status === 'pending');

    // Filtrar citas del día de hoy que estén pendientes o confirmadas (no canceladas ni completadas)
    const todayUpcomingAppointments = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayEnd = todayStart + 24 * 60 * 60 * 1000; // Fin del día

        return appointments
            .filter(appt => {
                // Solo mostrar citas pendientes o confirmadas
                if (appt.status === 'cancelled') return false;

                // Verificar que la cita sea del día de hoy
                if (!appt.date) return false;
                const apptDate = new Date(appt.date).getTime();
                if (apptDate < todayStart || apptDate >= todayEnd) return false;

                // Calcular hora de fin
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

                // Si AHORA es mayor que el FIN, ya pasó. Si es menor, está activa (En Servicio) o pendiente.
                if (now >= endDateTime) return false;

                return true;
            })
            .sort((a, b) => {
                // Ordenar por hora
                const [aH, aM] = a.time.split(':').map(Number);
                const [bH, bM] = b.time.split(':').map(Number);
                return (aH * 60 + aM) - (bH * 60 + bM);
            });
    }, [appointments]);

    // Filtrar citas pasadas (completadas) o canceladas
    const pastAppointments = useMemo(() => {
        const now = new Date();

        return appointments
            .filter(appt => {
                // Si está cancelada, incluirla
                if (appt.status === 'cancelled') return true;

                // Si no tiene fecha, ignorar
                if (!appt.date) return false;

                // Verificar si ya pasó la fecha/hora DE FINALIZACIÓN
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

                // Solo si YA TERMINÓ (now >= endDateTime) es historial
                return now >= endDateTime;
            })
            .sort((a, b) => {
                // Ordenar por fecha descendente (más recientes primero)
                const dateA = new Date(a.date || 0);
                const dateB = new Date(b.date || 0);

                // Comparar fechas completas (timestamp)
                if (dateA.getTime() !== dateB.getTime()) {
                    return dateB.getTime() - dateA.getTime();
                }

                // Si la fecha es igual, por hora descendente
                const [aH, aM] = a.time.split(':').map(Number);
                const [bH, bM] = b.time.split(':').map(Number);
                return (bH * 60 + bM) - (aH * 60 + aM);
            })
            .slice(0, 10); // Mostrar las últimas 10
    }, [appointments]);

    // Filtrar citas ACTIVAS (Pendientes/Confirmadas y FUTURAS) para el contador de Total Citas
    const activeAppointmentsCount = useMemo(() => {
        const now = new Date();
        return appointments.filter(appt => {
            if (appt.status === 'cancelled') return false;
            // No incluimos finalizadas (segun definicion de getAppointmentStatus)
            if (!appt.date) return false;

            const [hours, minutes] = appt.time.split(':').map(Number);
            const startTime = new Date(appt.date);
            startTime.setHours(hours, minutes, 0, 0);

            let durationMinutes = 60;
            const hMatch = appt.duration.match(/(\d+)h/);
            const mMatch = appt.duration.match(/(\d+)m/);
            if (hMatch) durationMinutes = parseInt(hMatch[1]) * 60;
            if (mMatch) durationMinutes += parseInt(mMatch[1]);
            else if (!hMatch && !mMatch) durationMinutes = 60;

            const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
            return now < endTime; // Solo las que no han terminado
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
                    onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
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
                        <span className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-full">+{appointments.filter(a => a.status === 'confirmed').length} activos</span>
                    </div>
                    <div>
                        <p className="text-text-sec-light dark:text-text-sec-dark text-sm font-medium mb-1 group-hover:text-primary transition-colors">Total Citas</p>
                        <p className="text-3xl font-bold text-text-main-light dark:text-text-main-dark tracking-tight">{activeAppointmentsCount}</p>
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
                                            <div className="bg-center bg-no-repeat bg-cover rounded-full h-12 w-12 bg-gray-200 ring-2 ring-white dark:ring-card-dark" style={{ backgroundImage: `url("${appt.avatar}")` }}></div>
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
                                                {/* Precio en lista */}
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

                                            {/* Dropdown Menu */}
                                            {openMenuId === appt.id && (
                                                <div className="absolute right-0 top-full mt-1 w-48 bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                                    {status.label === 'Pendiente' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(appt.id, 'confirmed'); }}
                                                            className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-background-light dark:hover:bg-background-dark/50 flex items-center gap-2 text-green-600 dark:text-green-400"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">check</span>
                                                            Confirmar Cita
                                                        </button>
                                                    )}
                                                    {status.label === 'Confirmado' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(appt.id, 'pending'); }}
                                                            className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-background-light dark:hover:bg-background-dark/50 flex items-center gap-2 text-orange-600 dark:text-orange-400"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">undo</span>
                                                            Marcar Pendiente
                                                        </button>
                                                    )}

                                                    {/* Opción para Cancelar (Cambiar estado) */}
                                                    {appt.status !== 'cancelled' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(appt.id, 'cancelled'); }}
                                                            className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 text-red-500"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">block</span>
                                                            Cancelar Cita
                                                        </button>
                                                    )}

                                                    {/* Opción para Eliminar Definitivamente (Solo si ya está cancelada) */}
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
                            // Override status visual for past history to look "greyed out" but keep label
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
                                            <div className="bg-center bg-no-repeat bg-cover rounded-full h-10 w-10 bg-gray-200" style={{ backgroundImage: `url("${appt.avatar}")` }}></div>
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
                                        {/* Botón para eliminar del historial si se desea, o ver detalle */}
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

            {/* --- DETALLE CITA DASHBOARD (NUEVO MODAL) --- */}
            {selectedAppointment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedAppointment(null)}>
                    <div className="bg-white dark:bg-card-dark rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-border-light dark:border-border-dark animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="h-24 bg-primary relative">
                            <button onClick={() => setSelectedAppointment(null)} className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full p-1 transition-colors"><span className="material-symbols-outlined text-lg">close</span></button>
                        </div>
                        <div className="px-6 pb-6 relative">
                            <div className="size-20 rounded-full border-4 border-white dark:border-card-dark bg-cover bg-center -mt-10 mb-4 bg-gray-200" style={{ backgroundImage: `url("${selectedAppointment.avatar}")` }}></div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white text-center">{selectedAppointment.client}</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 text-center">{selectedAppointment.service}</p>

                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 mb-6">
                                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3 mb-3">
                                    <span className="text-xs text-slate-500 uppercase font-bold">Fecha</span>
                                    <span className="text-sm font-medium dark:text-gray-200">{selectedAppointment.date?.toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3 mb-3">
                                    <span className="text-xs text-slate-500 uppercase font-bold">Horario</span>
                                    <span className="text-sm font-medium dark:text-gray-200">{selectedAppointment.time}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3 mb-3">
                                    <span className="text-xs text-slate-500 uppercase font-bold">Profesional</span>
                                    <span className="text-sm font-medium dark:text-gray-200">{selectedAppointment.professionalName || 'No asignado'}</span>
                                </div>
                                {/* PRECIO ROW */}
                                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3 mb-3">
                                    <span className="text-xs text-slate-500 uppercase font-bold">Precio Total</span>
                                    <span className="text-lg font-black text-green-600 dark:text-green-400">{selectedAppointment.price || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500 uppercase font-bold">Estado</span>
                                    {(() => {
                                        const status = getAppointmentStatus(selectedAppointment);
                                        return (
                                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${status.color}`}>
                                                {status.label}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* ACTION BUTTONS (Unified Design) */}
                            <div className="flex gap-3 mb-4">
                                {getAppointmentStatus(selectedAppointment).label === 'Pendiente' && (
                                    <button
                                        onClick={() => { updateAppointmentStatus(selectedAppointment.id, 'confirmed'); setSelectedAppointment(null); }}
                                        className="flex-1 py-2.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">check</span>
                                        Confirmar
                                    </button>
                                )}
                                {(getAppointmentStatus(selectedAppointment).label === 'Pendiente' || getAppointmentStatus(selectedAppointment).label === 'Confirmado') && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm('¿Estás seguro de cancelar esta cita?')) {
                                                deleteAppointment(selectedAppointment.id);
                                                setSelectedAppointment(null);
                                            }
                                        }}
                                        className="flex-1 py-2.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">cancel</span>
                                        Cancelar
                                    </button>
                                )}
                            </div>

                            {(() => {
                                const client = getClientInfo(selectedAppointment.client);
                                return client && (
                                    <div className="flex gap-3">
                                        <a href={`tel:${client.phone}`} className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-green-500/20"><span className="material-symbols-outlined text-[18px]">call</span>Llamar</a>
                                        <a href={`mailto:${client.email}`} className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20"><span className="material-symbols-outlined text-[18px]">mail</span>Email</a>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL DE PENDIENTES --- */}
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
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {appt.professionalName && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">con {appt.professionalName}</span>}
                                                        {appt.price && <span className="text-[10px] text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30 px-1.5 py-0.5 rounded font-bold">{appt.price}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUpdateStatus(appt.id, 'confirmed'); }}
                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                                                    title="Confirmar Cita"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">check</span>
                                                    Confirmar
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteForever(appt.id); }}
                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                                                    title="Rechazar Cita"
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

            {/* New Appointment Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-border-light dark:border-border-dark animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-primary text-white shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined">add_circle</span>
                                <h3 className="font-bold text-lg">Nueva Cita</h3>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="hover:bg-white/20 rounded-full p-1 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleCreateAppointment} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 scrollbar-hide">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-start gap-3 border border-blue-100 dark:border-blue-900/30">
                                <span className="material-symbols-outlined text-blue-500 mt-0.5">info</span>
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    Se registrará automáticamente el cliente si es nuevo y se enviará la invitación de calendario.
                                </p>
                            </div>

                            {/* ERROR NOTIFICATION BANNER */}
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
                                        readOnly={!!existingClient}
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
                                            <optgroup label="Cortes">
                                                <option>Corte de Cabello</option>
                                            </optgroup>
                                            <optgroup label="Servicios de Uñas">
                                                <option>Esmaltado Tradicional</option>
                                                <option>Semipermanente Hombre</option>
                                                <option>Semipermanente Pies</option>
                                                <option>Semipermanente Manos</option>
                                                <option>Nivelación Base Ruber</option>
                                                <option>Builder Gel</option>
                                                <option>Dipping</option>
                                                <option>Soft Gel</option>
                                            </optgroup>
                                            <optgroup label="Retiros">
                                                <option>Retiro (Solo Retiro)</option>
                                            </optgroup>
                                            <optgroup label="Depilación y Epilación">
                                                <option>Depilación de Axilas</option>
                                                <option>Epilación de Cejas</option>
                                                <option>Epilación de Bozo</option>
                                                <option>Epilación y Sombreado de Cejas en Henna</option>
                                            </optgroup>
                                            <optgroup label="Bienestar">
                                                <option>Masaje Relajante</option>
                                            </optgroup>
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-sec-light pointer-events-none">expand_more</span>
                                    </div>

                                    {/* NEW REMOVAL SELECTOR UI */}
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
                                                    Semi/Press (+$10k)
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
                                            className="w-full rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark pl-10 pr-4 h-12 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:text-white outline-none transition-all appearance-none"
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
                                    onClick={() => setIsModalOpen(false)}
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
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;