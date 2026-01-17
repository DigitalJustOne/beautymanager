
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
    addClient: (client: Client) => Promise<Client | null>;
    updateAppointmentStatus: (id: number, status: 'confirmed' | 'pending' | 'cancelled') => Promise<void>;
    deleteAppointment: (id: number) => Promise<void>;
    updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
    addProfessional: (pro: Professional) => Promise<void>;
    updateProfessional: (id: number, data: Partial<Professional>) => Promise<void>;
    deleteProfessional: (id: number) => Promise<void>;
    updateClient: (id: number, data: Partial<Client>) => Promise<void>;
    deleteClient: (id: number) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { session, role, profile } = useAuth();
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

            // 1. Fetch Clients (Admin only)
            if (role === 'admin') {
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
            } else {
                setClients([]);
            }

            // 2. Fetch Professionals (Visible to all, needed for booking and team view)
            // Note provided requirement: "professional no puede ver ... citas de otros profesionales". 
            // Does not explicitly forbid seeing the list of professionals (useful for identifying colleagues or booking appointments).
            const { data: prosData } = await supabase.from('professionals').select('*');
            if (prosData) {
                setProfessionals(prosData.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    role: p.role,
                    avatar: p.avatar || p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`,
                    email: p.email,
                    specialties: p.specialties || []
                })));
            }

            // 3. Fetch Appointments (Role restricted)
            let apptsQuery = supabase.from('appointments').select(`
                *,
                clients (name, avatar),
                professionals (name)
            `);

            let currentClientId: number | undefined;

            if (role === 'professional') {
                // Determine Professional ID by email
                const { data: myPro } = await supabase.from('professionals').select('id').eq('email', session.user.email).limit(1).single();
                if (myPro) {
                    apptsQuery = apptsQuery.eq('professional_id', myPro.id);
                } else {
                    apptsQuery = apptsQuery.eq('id', -1); // Block access if not linked
                }
            } else if (role === 'client') {
                // Determine Client ID by email to identify "own" appointments
                const { data: myClient } = await supabase.from('clients').select('id').eq('email', session.user.email).limit(1).single();
                if (myClient) {
                    currentClientId = myClient.id;
                    // Clients need ALL appointments to check availability, but must be anonymized.
                    // So we DO NOT filter by client_id in the query.
                } else {
                    // If client not found (e.g. new user), they see nothing or all?
                    // They need to see availability to book. So allow all.
                    // But strictly anonymized.
                }
            }

            const { data: apptsData } = await apptsQuery;

            if (apptsData) {
                setAppointments(apptsData.map((a: any) => {
                    // Logic to anonymize for Client
                    let isOwn = true;
                    if (role === 'client') {
                        isOwn = currentClientId !== undefined && a.client_id === currentClientId;
                    }

                    if (role === 'client' && !isOwn) {
                        return {
                            id: a.id,
                            time: a.time || (a.date ? new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
                            ampm: a.time ? (parseInt(a.time.split(':')[0]) >= 12 ? 'PM' : 'AM') : '',
                            client: 'Reservado', // Masked
                            service: 'Ocupado', // Masked
                            duration: a.duration_minutes ? `${Math.floor(a.duration_minutes / 60)}h ${a.duration_minutes % 60}m` : '0m',
                            avatar: 'https://ui-avatars.com/api/?name=X&background=dddddd', // Masked
                            status: a.status, // Preserve status so cancelled apps don't block slots
                            date: new Date(a.date),
                            professionalId: a.professional_id,
                            professionalName: a.professionals?.name,
                            price: undefined // Hide price
                        };
                    }

                    return {
                        id: a.id,
                        time: a.time || (a.date ? new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
                        ampm: a.time ? (parseInt(a.time.split(':')[0]) >= 12 ? 'PM' : 'AM') : '',
                        client: a.clients?.name || 'Desconocido',
                        service: a.service,
                        duration: a.duration_minutes ? `${Math.floor(a.duration_minutes / 60)}h ${a.duration_minutes % 60}m` : '0m',
                        avatar: a.clients?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.clients?.name || 'C')}&background=random`,
                        status: a.status,
                        date: new Date(a.date),
                        professionalId: a.professional_id,
                        professionalName: a.professionals?.name,
                        price: a.price ? `$${a.price}` : undefined
                    };
                }));
            }
        };

        fetchData();
    }, [session, role]);

    const addAppointment = async (appt: Appointment) => {
        // Calculate minutes duration
        let durationMinutes = 60;
        const hMatch = appt.duration.match(/(\d+)h/);
        const mMatch = appt.duration.match(/(\d+)m/);
        if (hMatch) durationMinutes = parseInt(hMatch[1]) * 60;
        if (mMatch) durationMinutes += parseInt(mMatch[1]);
        if (!hMatch && !mMatch && appt.duration.includes('m')) durationMinutes = parseInt(appt.duration.replace('m', ''));

        // Resolve Client ID if not provided but client email/name is available in 'clients' state
        // Resolve Client ID
        let finalClientId = appt.clientId;

        // If no ID provided and we are a client, try to identify self
        if (!finalClientId && role === 'client' && session?.user?.email) {
            const { data: myClient } = await supabase.from('clients').select('id').eq('email', session.user.email).single();
            if (myClient) finalClientId = myClient.id;
        }

        if (!finalClientId) {
            // Try to find client by name (Not exact but fallback)
            const foundClient = clients.find(c => c.name === appt.client);
            if (foundClient) finalClientId = foundClient.id;
        }

        // If STILL no client ID and we are a client, we might need to create a `clients` record 
        // OR rely on the trigger? But trigger is on auth.users.
        // Let's create a client record if missing for this user to ensure integrity.
        if (!finalClientId && role === 'client' && session?.user?.email) {
            const { data: newClient, error: createError } = await supabase.from('clients').insert({
                name: userProfile.name || 'Cliente',
                email: session.user.email,
                phone: userProfile.phone,
                avatar: userProfile.avatar,
                profile_id: session.user.id,
                role: 'client'
            }).select().single();

            if (newClient) finalClientId = newClient.id;
        }

        // CORRECT TIME LOGIC: Combine Date + selected Time
        let finalDateIso = appt.date?.toISOString();
        if (appt.date && appt.time) {
            const d = new Date(appt.date);
            const [hours, minutes] = appt.time.split(':').map(Number);
            d.setHours(hours, minutes, 0, 0); // Set correct time
            finalDateIso = d.toISOString();
        }

        const { data, error } = await supabase.from('appointments').insert({
            service: appt.service,
            client_id: finalClientId,
            professional_id: appt.professionalId,
            status: appt.status,
            date: finalDateIso, // Insert CORRECTED date (timestamp)
            time: appt.time, // IMPORTANT: Insert time string as DB expects
            duration: appt.duration, // Insert duration text
            duration_minutes: durationMinutes, // Insert numeric duration if column exists (optional but good)
            price: appt.price ? parseFloat(appt.price.replace(/[^0-9]/g, '')) : 0
        }).select().single();

        if (error) {
            console.error("Error creating appointment:", error);
            alert("Error al crear la cita: " + error.message);
        }

        if (data && !error) {
            // Refetch or update local state
            setAppointments(prev => [...prev, { ...appt, id: data.id, clientId: finalClientId }]);
        }
    };

    const addClient = async (client: Client): Promise<Client | null> => {
        const { data, error } = await supabase.from('clients').insert({
            name: client.name,
            email: client.email,
            phone: client.phone,
            avatar: client.avatar,
            role: client.role || 'client'
        }).select().single();

        if (error) {
            console.error("Error creating client in DB:", error);
            alert(`Error al guardar cliente: ${error.message}`);
            return null;
        }

        if (data && !error) {
            console.log("Client created successfully:", data);
            const newClient = { ...client, id: data.id };
            setClients(prev => [newClient, ...prev]);
            return newClient;
        }
        return null;
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
        if (data.city !== undefined) updateData.city = data.city;
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
            specialties: pro.specialties,
            email: pro.email // Ensure this is passed
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

    const updateClient = async (id: number, data: Partial<Client>) => {
        const { error } = await supabase.from('clients').update({
            name: data.name,
            email: data.email,
            phone: data.phone,
            avatar: data.avatar,
            role: data.role
        }).eq('id', id);

        if (error) {
            console.error("Error updating client:", error);
            alert("Error al actualizar cliente: " + error.message);
        } else {
            setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
        }
    };

    const deleteClient = async (id: number) => {
        const { error } = await supabase.from('clients').delete().eq('id', id);

        if (error) {
            console.error("Error deleting client:", error);
            alert("Error al eliminar cliente: " + error.message);
        } else {
            setClients(prev => prev.filter(c => c.id !== id));
        }
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
            deleteProfessional,
            updateClient,
            deleteClient
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