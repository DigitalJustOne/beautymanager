import { Appointment } from '../types';

export const generateGoogleCalendarUrl = (appointment: Appointment): string => {
    if (!appointment.date || !appointment.time) return '';

    // 1. Construir fecha y hora de inicio
    // appointment.date es un Date objeto (o string)
    const dateObj = new Date(appointment.date);
    const [hours, minutes] = appointment.time.split(':').map(Number);
    dateObj.setHours(hours, minutes, 0, 0);

    // 2. Calcular fecha y hora de fin
    // Parsear duración (ej: "1h 30m" o "45m")
    let durationMinutes = 60; // Default
    const hMatch = appointment.duration.match(/(\d+)h/);
    const mMatch = appointment.duration.match(/(\d+)m/);

    let durationH = hMatch ? parseInt(hMatch[1]) : 0;
    let durationM = mMatch ? parseInt(mMatch[1]) : 0;

    if (durationH === 0 && durationM === 0) {
        // Fallback si no hay formato correcto, asumimos 60 min
        durationMinutes = 60;
    } else {
        durationMinutes = durationH * 60 + durationM;
    }

    const endDateObj = new Date(dateObj.getTime() + durationMinutes * 60000);

    // 3. Formatear fechas a YYYYMMDDTHHmmSSZ (UTC para evitar líos de zona horaria, o local si preferimos)
    // Google Calendar acepta formato YYYYMMDDTHHMMSS
    const formatGoogleDate = (date: Date) => {
        return date.toISOString().replace(/-|:|\.\d+/g, '');
    };

    const start = formatGoogleDate(dateObj);
    const end = formatGoogleDate(endDateObj);

    // 4. Construir Texto (Priorizando al Profesional)
    const title = encodeURIComponent(`Cita: ${appointment.professionalName || 'Profesional'} - Cliente: ${appointment.client}`);
    const details = encodeURIComponent(
        `Servicio: ${appointment.service}\n` +
        `Cliente: ${appointment.client}\n` +
        `Profesional: ${appointment.professionalName || 'Sin asignar'}\n` +
        `Precio: ${appointment.price || 'N/A'}\n\n` +
        `Agendado desde BeautyManager Pro`
    );
    const location = encodeURIComponent("Salón de Belleza");

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
};
