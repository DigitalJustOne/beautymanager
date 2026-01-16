
export interface Appointment {
    id: number;
    time: string;
    ampm: string;
    client: string;
    service: string;
    duration: string;
    avatar: string;
    status: 'confirmed' | 'pending' | 'cancelled';
    date?: Date;
    professionalId?: number; // Nuevo campo
    professionalName?: string; // Nuevo campo
    price?: string; // Nuevo campo para el precio
}

export interface Client {
    id: number;
    name: string;
    lastVisit: string;
    phone: string;
    email: string;
    avatar: string;
    isNew?: boolean;
}

export interface Professional {
    id: number;
    name: string;
    role: string;
    avatar: string;
    specialties: string[]; // Lista de servicios que puede realizar
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
}

export interface MenuItem {
    path: string;
    icon: string;
    label: string;
}

export interface DaySchedule {
    day: string;
    enabled: boolean;
    start: string;
    end: string;
}

export interface UserProfile {
    name: string;
    role: string;
    specialty: string;
    phone: string;
    email: string;
    avatar: string;
    isGoogleCalendarConnected: boolean;
    schedule: DaySchedule[];
}