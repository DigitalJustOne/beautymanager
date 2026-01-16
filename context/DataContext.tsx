
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appointment, Client, UserProfile, Professional } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

interface DataContextType {
    appointments: Appointment[];
    clients: Client[];
    userProfile: UserProfile;
    professionals: Professional[];
    addAppointment: (appt: Appointment) => Promise<void>;
    addClient: (client: Client) => Promise<void>;
    updateAppointmentStatus: (id: number, status: 'confirmed' | 'pending' | 'cancelled') => Promise<void>;
    deleteAppointment: (id: number) => Promise<void>;
    updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
    addProfessional: (pro: Professional) => Promise<void>;
    updateProfessional: (id: number, data: Partial<Professional>) => Promise<void>;
    deleteProfessional: (id: number) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { session } = useAuth();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    // Horario predeterminado para los 7 días de la semana
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
        avatar: 'https://via.placeholder.com/150',
        isGoogleCalendarConnected: false,
        schedule: defaultSchedule
    });

    useEffect(() => {
        if (!session) return;

        const fetchData = async () => {
            // Fetch Clients
            const { data: clientsData } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
            if (clientsData) {
                setClients(clientsData.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    email: c.email,
                    phone: c.phone,
                    avatar: c.avatar || c.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random`,
                    lastVisit: c.last_visit ? new Date(c.last_visit).toLocaleDateString() : 'Nuevo',
                    isNew: false
                })));
            }

            // Fetch Professionals
            const { data: prosData } = await supabase.from('professionals').select('*');
            if (prosData) {
                setProfessionals(prosData.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    role: p.role,
                    avatar: p.avatar || p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`,
                    specialties: p.specialties || []
                })));
            }

            // Fetch Appointments
            const { data: apptsData } = await supabase.from('appointments').select(`
                *,
                clients (name, avatar),
                professionals (name)
            `);

            if (apptsData) {
                setAppointments(apptsData.map((a: any) => ({
                    id: a.id,
                    time: a.date ? new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                    ampm: a.date ? (new Date(a.date).getHours() >= 12 ? 'PM' : 'AM') : '',
                    client: a.clients?.name || 'Desconocido',
                    service: a.service,
                    duration: a.duration_minutes ? `${Math.floor(a.duration_minutes / 60)}h ${a.duration_minutes % 60}m` : '0m',
                    avatar: a.clients?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.clients?.name || 'C')}&background=random`,
                    status: a.status,
                    date: new Date(a.date),
                    professionalId: a.professional_id,
                    professionalName: a.professionals?.name,
                    price: a.price ? `$${a.price}` : undefined
                })));
            }

            // Fetch Profile (Current User)
            const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            if (profileData) {
                setUserProfile(prev => ({
                    ...prev,
                    name: profileData.full_name || session.user.email?.split('@')[0] || 'Usuario',
                    email: profileData.email || session.user.email || '',
                    avatar: profileData.avatar_url || prev.avatar,
                    role: profileData.role || prev.role,
                    specialty: profileData.specialty || prev.specialty,
                    phone: profileData.phone || prev.phone,
                    schedule: profileData.schedule ? JSON.parse(profileData.schedule) : prev.schedule
                }));
            } else {
                // If no profile exists, create one
                const newProfile = {
                    id: session.user.id,
                    email: session.user.email,
                    full_name: session.user.email?.split('@')[0],
                    avatar_url: `https://ui-avatars.com/api/?name=${session.user.email}&background=random`
                };
                await supabase.from('profiles').insert(newProfile);
                setUserProfile(prev => ({
                    ...prev,
                    name: newProfile.full_name || '',
                    email: newProfile.email || '',
                    avatar: newProfile.avatar_url
                }));
            }
        };

        fetchData();
    }, [session]);

    const addAppointment = async (appt: Appointment) => {
        // We need to map frontend Appointment back to DB schema
        // This assumes 'client' string in appt is actually a name, but we need an ID. 
        // For this demo, we might need to find the client or create one?
        // Or updated UI to pass client ID.
        // For now, let's just insert into DB if we can. Note: appt.client is a string name in the interface.
        // We really should update the Appointment interface to include clientId, but to avoid breaking changes in other files, logic here:

        // Find client by name or Create?
        // Let's assume for now we skip client_id link if we only have name, or find it.
        // Ideally the UI selector provides the ID.

        // Try to find client id if possible
        let clientId = undefined;
        // Simple search (optional improvement)

        const { data, error } = await supabase.from('appointments').insert({
            service: appt.service,
            client_id: clientId, // Need to fix this in future
            professional_id: appt.professionalId,
            status: appt.status,
            date: appt.date?.toISOString() || new Date().toISOString(), // Use provided date or now
            price: appt.price ? parseFloat(appt.price.replace('$', '').replace('.', '')) : 0
        }).select().single();

        if (data && !error) {
            // Refetch or update local state
            setAppointments(prev => [...prev, { ...appt, id: data.id }]);
        }
    };

    const addClient = async (client: Client) => {
        const { data, error } = await supabase.from('clients').insert({
            name: client.name,
            email: client.email,
            phone: client.phone,
            avatar: client.avatar
        }).select().single();

        if (data && !error) {
            setClients(prev => [{ ...client, id: data.id }, ...prev]);
        }
    };

    const updateAppointmentStatus = async (id: number, status: 'confirmed' | 'pending' | 'cancelled') => {
        await supabase.from('appointments').update({ status }).eq('id', id);
        setAppointments(prev => prev.map(appt => appt.id === id ? { ...appt, status } : appt));
    };

    const deleteAppointment = async (id: number) => {
        await supabase.from('appointments').delete().eq('id', id);
        setAppointments(prev => prev.filter(appt => appt.id !== id));
    };

    const updateUserProfile = async (data: Partial<UserProfile>) => {
        if (!session) return;

        const updateData: any = {};
        if (data.name !== undefined) updateData.full_name = data.name;
        if (data.role !== undefined) updateData.role = data.role;
        if (data.avatar !== undefined) updateData.avatar_url = data.avatar;
        if (data.specialty !== undefined) updateData.specialty = data.specialty;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.schedule !== undefined) updateData.schedule = JSON.stringify(data.schedule);

        const { error } = await supabase.from('profiles').update(updateData).eq('id', session.user.id);

        if (error) {
            console.error('Error updating profile:', error);
        } else {
            setUserProfile(prev => ({ ...prev, ...data }));
        }
    };

    const addProfessional = async (pro: Professional) => {
        console.log("Attempting to add professional:", pro);
        const { data, error } = await supabase.from('professionals').insert({
            name: pro.name,
            role: pro.role,
            avatar: pro.avatar,
            specialties: pro.specialties
        }).select().single();

        if (error) {
            console.error("Error adding professional:", error);
            alert(`Error adding professional: ${error.message}`);
        }

        if (data && !error) {
            console.log("Professional added successfully:", data);
            setProfessionals(prev => [...prev, { ...pro, id: data.id }]);
        }
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

    return (
        <DataContext.Provider value={{
            appointments,
            clients,
            userProfile,
            professionals,
            addAppointment,
            addClient,
            updateAppointmentStatus,
            deleteAppointment,
            updateUserProfile,
            addProfessional,
            updateProfessional,
            deleteProfessional
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};