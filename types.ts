
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
    clientId?: number;
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
    role?: string;
    profileId?: string; // ID vinculado al perfil de Supabase Auth
}

export interface Professional {
    id: number;
    name: string;
    role: string;
    avatar: string;
    email?: string; // Contacto / Login
    specialties: string[]; // Lista de servicios que puede realizar
    profileId?: string; // ID vinculado al perfil de Supabase Auth
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
    city?: string; // New field
    isGoogleCalendarConnected: boolean;
    schedule: DaySchedule[];
}

export interface Service {
    id: number;
    name: string;
    price: number;
    duration: number; // minutes
    category: string;
}