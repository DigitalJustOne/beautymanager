
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Appointment, Client, UserProfile, Professional, Service } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

interface DataContextType {
    appointments: Appointment[];
    clients: Client[];
    userProfile: UserProfile;
    professionals: Professional[];
    addAppointment: (appt: Appointment) => Promise<void>;
    addClient: (client: Client) => Promise<Client | null>;
    updateAppointmentStatus: (id: number, status: 'confirmed' | 'pending' | 'cancelled') => Promise<void>;
    deleteAppointment: (id: number) => Promise<void>;
    updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
    addProfessional: (pro: Professional) => Promise<void>;
    updateProfessional: (id: number, data: Partial<Professional>) => Promise<void>;
    deleteProfessional: (id: number) => Promise<void>;
    updateClient: (id: number, data: Partial<Client>) => Promise<void>;
    deleteClient: (id: number) => Promise<void>;
    services: Service[];
    addService: (service: Omit<Service, 'id'>) => Promise<void>;
    updateService: (id: number, data: Partial<Service>) => Promise<void>;
    deleteService: (id: number) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper to safely parse JSON
const safeParse = <T,>(key: string, fallback: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch {
        return fallback;
    }
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { session, role, profile } = useAuth();

    // --- 1. Initialize State from Cache (Instant Load) ---
    const [appointments, setAppointments] = useState<Appointment[]>(() => {
        const cached = safeParse<any[]>('beautymanager_appts', []);
        return cached.map(a => ({
            ...a,
            date: a.date ? new Date(a.date) : undefined
        }));
    });
    const [clients, setClients] = useState<Client[]>(() => safeParse('beautymanager_clients', []));
    const [professionals, setProfessionals] = useState<Professional[]>(() => safeParse('beautymanager_pros', []));
    const [services, setServices] = useState<Service[]>(() => safeParse('beautymanager_services', []));

    // Horario predeterminado
    const defaultSchedule = [
        { day: 'Lunes', enabled: true, start: '09:00', end: '18:00' },
        { day: 'Martes', enabled: true, start: '09:00', end: '18:00' },
        { day: 'Miércoles', enabled: true, start: '09:00', end: '18:00' },
        { day: 'Jueves', enabled: true, start: '09:00', end: '18:00' },
        { day: 'Viernes', enabled: true, start: '09:00', end: '18:00' },
        { day: 'Sábado', enabled: false, start: '10:00', end: '14:00' },
        { day: 'Domingo', enabled: false, start: '10:00', end: '14:00' }
    ];

    const [userProfile, setUserProfile] = useState<UserProfile>({
        name: 'Usuario',
        role: 'Profesional',
        specialty: 'General',
        phone: '',
        email: '',
        avatar: 'https://ui-avatars.com/api/?name=User&background=random',
        isGoogleCalendarConnected: false,
        schedule: defaultSchedule
    });

    // Update LocalStorage when state changes
    const safeSetItem = (key: string, value: any) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn(`LocalStorage quota exceeded for ${key}. Clearing cache.`);
            try {
                localStorage.clear();
                localStorage.setItem(key, JSON.stringify(value));
            } catch (retryError) {
                console.error("Failed to save to localStorage even after clear:", retryError);
            }
        }
    };

    useEffect(() => safeSetItem('beautymanager_appts', appointments), [appointments]);
    useEffect(() => safeSetItem('beautymanager_clients', clients), [clients]);
    useEffect(() => safeSetItem('beautymanager_pros', professionals), [professionals]);
    useEffect(() => safeSetItem('beautymanager_services', services), [services]);

    useEffect(() => {
        if (!session || !role || !profile) return;

        setUserProfile(prev => ({
            ...prev,
            name: profile.full_name || session.user.email?.split('@')[0] || 'Usuario',
            email: profile.email || session.user.email || '',
            avatar: profile.avatar_url || prev.avatar,
            role: profile.role || role || prev.role,
            specialty: profile.specialty || prev.specialty,
            phone: profile.phone || prev.phone,
            city: profile.city || prev.city || '',
            schedule: profile.schedule ? (typeof profile.schedule === 'string' ? JSON.parse(profile.schedule) : profile.schedule) : prev.schedule
        }));

        const fetchData = async () => {
            try {
                const [servicesRes, prosRes, apptsRes, clientsRes] = await Promise.all([
                    supabase.from('services').select('*').order('category', { ascending: true }),
                    supabase.from('professionals').select('*'),
                    supabase.from('appointments').select(`*, clients (name, avatar, phone), professionals (name)`),
                    (role === 'admin' || role === 'professional') ? supabase.from('clients').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: null })
                ]);

                if (servicesRes.data) setServices(servicesRes.data);

                let mappedPros: Professional[] = [];
                if (prosRes.data) {
                    mappedPros = prosRes.data.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        role: p.role,
                        avatar: p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`,
                        email: p.email,
                        specialties: p.specialties || [],
                        profileId: p.profile_id
                    }));
                    setProfessionals(mappedPros);
                }

                if (apptsRes.data) {
                    const finalAppts = apptsRes.data.map((a: any) => ({
                        id: a.id,
                        time: a.time,
                        ampm: a.time ? (parseInt(a.time.split(':')[0]) >= 12 ? 'PM' : 'AM') : '',
                        client: a.clients?.name || 'Desconocido',
                        service: a.service,
                        duration: a.duration_minutes ? `${Math.floor(a.duration_minutes / 60)}h ${a.duration_minutes % 60}m` : '0m',
                        avatar: a.clients?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.clients?.name || 'C')}&background=random`,
                        status: a.status,
                        date: new Date(a.date),
                        professionalId: a.professional_id,
                        professionalName: a.professionals?.name,
                        price: a.price ? `$${a.price}` : undefined,
                        phone: a.clients?.phone,
                        clientId: a.client_id
                    }));
                    setAppointments(finalAppts);
                }

                if (clientsRes.data) {
                    const allClients = clientsRes.data.map((c: any) => ({
                        id: c.id,
                        name: c.name,
                        email: c.email,
                        phone: c.phone,
                        avatar: c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random`,
                        lastVisit: c.last_visit ? new Date(c.last_visit).toLocaleDateString() : 'Nuevo',
                        role: c.role,
                        profileId: c.profile_id
                    }));

                    if (role === 'admin') {
                        setClients(allClients);
                    } else if (role === 'professional') {
                        const myProId = mappedPros.find(p => p.email?.toLowerCase() === session.user.email?.toLowerCase())?.id;
                        if (myProId) {
                            const myClientIds = new Set(apptsRes.data.filter((a: any) => a.professional_id === myProId).map((a: any) => a.client_id));
                            setClients(allClients.filter(c => myClientIds.has(c.id)));
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching data:", err);
            }
        };

        fetchData();
    }, [session, role, profile]);

    const addAppointment = async (appt: Appointment) => {
        const { data, error } = await supabase.from('appointments').insert({
            date: appt.date,
            time: appt.time,
            client_id: appt.clientId,
            service: appt.service,
            status: appt.status,
            professional_id: appt.professionalId,
            price: appt.price?.replace('$', '')
        }).select().single();
        if (!error && data) setAppointments(prev => [...prev, { ...appt, id: data.id }]);
    };

    const addClient = async (client: Client) => {
        const { data, error } = await supabase.from('clients').insert({
            name: client.name,
            email: client.email,
            phone: client.phone,
            avatar: client.avatar
        }).select().single();
        if (!error && data) {
            const newClient = { ...client, id: data.id };
            setClients(prev => [...prev, newClient]);
            return newClient;
        }
        return null;
    };

    const updateAppointmentStatus = async (id: number, status: 'confirmed' | 'pending' | 'cancelled') => {
        await supabase.from('appointments').update({ status }).eq('id', id);
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    };

    const deleteAppointment = async (id: number) => {
        await supabase.from('appointments').delete().eq('id', id);
        setAppointments(prev => prev.filter(a => a.id !== id));
    };

    const updateUserProfile = async (data: Partial<UserProfile>) => {
        if (!session) return;
        const updateData: any = {};
        if (data.name !== undefined) updateData.full_name = data.name;
        if (data.role !== undefined) updateData.role = data.role;
        if (data.avatar !== undefined) updateData.avatar_url = data.avatar;
        if (data.specialty !== undefined) updateData.specialty = data.specialty;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.city !== undefined) updateData.city = data.city;
        if (data.schedule !== undefined) updateData.schedule = JSON.stringify(data.schedule);

        const { error } = await supabase.from('profiles').update(updateData).eq('id', session.user.id);
        if (!error) {
            if (role === 'admin' || role === 'professional') {
                await supabase.from('professionals').update({
                    name: data.name,
                    avatar: data.avatar,
                    role: data.role,
                    profile_id: session.user.id
                }).or(`profile_id.eq.${session.user.id},email.eq.${session.user.email}`);
                setProfessionals(prev => prev.map(p => (p.profileId === session.user.id || p.email === session.user.email) ? { ...p, ...data, profileId: session.user.id } : p));
            }
            if (role === 'client') {
                await supabase.from('clients').update({
                    name: data.name,
                    avatar: data.avatar,
                    phone: data.phone,
                    role: data.role,
                    profile_id: session.user.id
                }).or(`profile_id.eq.${session.user.id},email.eq.${session.user.email}`);
                setClients(prev => prev.map(c => (c.profileId === session.user.id || c.email === session.user.email) ? { ...c, ...data, profileId: session.user.id } : c));
            }
            setUserProfile(prev => ({ ...prev, ...data }));
        }
    };

    const addProfessional = async (pro: Professional) => {
        const { data, error } = await supabase.from('professionals').insert({
            name: pro.name,
            role: pro.role,
            avatar: pro.avatar,
            specialties: pro.specialties,
            email: pro.email
        }).select().single();
        if (!error && data) setProfessionals(prev => [...prev, { ...pro, id: data.id }]);
    };

    const updateProfessional = async (id: number, data: Partial<Professional>) => {
        await supabase.from('professionals').update({
            name: data.name,
            role: data.role,
            avatar: data.avatar,
            specialties: data.specialties
        }).eq('id', id);
        setProfessionals(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    };

    const deleteProfessional = async (id: number) => {
        await supabase.from('professionals').delete().eq('id', id);
        setProfessionals(prev => prev.filter(p => p.id !== id));
    };

    const updateClient = async (id: number, data: Partial<Client>) => {
        await supabase.from('clients').update({
            name: data.name,
            email: data.email,
            phone: data.phone,
            avatar: data.avatar
        }).eq('id', id);
        setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    };

    const deleteClient = async (id: number) => {
        await supabase.from('clients').delete().eq('id', id);
        setClients(prev => prev.filter(c => c.id !== id));
    };

    const addService = async (service: Omit<Service, 'id'>) => {
        const { data, error } = await supabase.from('services').insert(service).select().single();
        if (!error && data) setServices(prev => [...prev, data]);
    };

    const updateService = async (id: number, data: Partial<Service>) => {
        await supabase.from('services').update(data).eq('id', id);
        setServices(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    };

    const deleteService = async (id: number) => {
        await supabase.from('services').delete().eq('id', id);
        setServices(prev => prev.filter(s => s.id !== id));
    };

    return (
        <DataContext.Provider value={{
            appointments, clients, userProfile, professionals, services,
            addAppointment, addClient, updateAppointmentStatus, deleteAppointment,
            updateUserProfile, addProfessional, updateProfessional, deleteProfessional,
            updateClient, deleteClient, addService, updateService, deleteService
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within a DataProvider');
    return context;
};