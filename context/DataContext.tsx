
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
    const [appointments, setAppointments] = useState<Appointment[]>(() => safeParse('beautymanager_appts', []));
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
    // Helper to safe set localStorage
    const safeSetItem = (key: string, value: any) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn(`LocalStorage quota exceeded for ${key}. Clearing cache.`);
            try {
                localStorage.clear(); // Emergency clear
                localStorage.setItem(key, JSON.stringify(value));
            } catch (retryError) {
                console.error("Failed to save to localStorage even after clear:", retryError);
            }
        }
    };

    // Update LocalStorage when state changes
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
            console.log("Fetching data started...");
            const startTime = performance.now();

            // --- Optimized Parallel Fetching ---

            // 1. Queries that don't depend on others
            const servicesPromise = supabase.from('services').select('*').order('category', { ascending: true });
            const prosPromise = supabase.from('professionals').select('*');

            // If client, we need our own ID. If admin/pro, we can optimize.
            const myClientIdPromise = role === 'client'
                ? supabase.from('clients').select('id').eq('email', session.user.email).limit(1).single()
                : Promise.resolve({ data: null });

            // Prepare Appointments Query
            let apptsQuery = supabase.from('appointments').select(`
                *,
                clients (name, avatar),
                professionals (name)
            `);

            // If Professional, filter at DB level immediately? 
            // We fetch ALL for now to handle overlaps properly, but we could filter by date range if too slow.
            // For now, fetching all is fine for < 1000 records.
            const apptsPromise = apptsQuery;

            // Prepare Clients Query
            // Admin: All clients
            // Pro: Clients linked to them? Or all clients (policy allows)? 
            // Policy "Admins and Pros see all clients" allows fetching all.
            // fetching all is faster than waterfall logic "fetch appts -> extract IDs -> fetch clients".
            const clientsPromise = (role === 'admin' || role === 'professional')
                ? supabase.from('clients').select('*').order('created_at', { ascending: false })
                : Promise.resolve({ data: null });

            try {
                const [servicesRes, prosRes, myClientRes, apptsRes, clientsRes] = await Promise.all([
                    servicesPromise,
                    prosPromise,
                    myClientIdPromise,
                    apptsPromise,
                    clientsPromise
                ]);

                // --- PROCESS SERVICES ---
                if (servicesRes.data) {
                    setServices(servicesRes.data.map((s: any) => ({
                        id: s.id,
                        name: s.name,
                        price: s.price,
                        duration: s.duration,
                        category: s.category
                    })));
                }

                // --- PROCESS PROFESSIONALS ---
                let mappedPros: Professional[] = [];
                if (prosRes.data) {
                    mappedPros = prosRes.data.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        role: p.role,
                        avatar: p.avatar || p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`,
                        email: p.email,
                        specialties: p.specialties || [],
                        profileId: p.profile_id
                    }));
                    setProfessionals(mappedPros);
                }

                // --- PROCESS APPOINTMENTS ---
                let currentClientId: number | undefined;
                if (role === 'client' && myClientRes.data) {
                    currentClientId = myClientRes.data.id;
                }

                if (apptsRes.data) {
                    const finalAppts = apptsRes.data.map((a: any) => {
                        // Logic for obfuscation
                        let isOwn = true;
                        if (role === 'client') {
                            isOwn = currentClientId !== undefined && a.client_id === currentClientId;
                        }

                        // Filter Process: If professional, we typically only show THEIR schedule in the view, 
                        // but the context stores ALL for overlap checking (if needed) OR we filter here.
                        // The previous logic filtered "myAppts" in state? No, it fetched by ID.
                        // However, seeing "status" of other pros is useful for admin.
                        // Admin sees all. Pro sees mostly theirs but maybe others for conflict? 
                        // Current requirement: "Professional solo puede visualizar sus clientes".
                        // This usually applies to the Clients List. appointments often need to be known for overlaps.

                        // Obfuscation for Clients seeing other slots
                        if (role === 'client' && !isOwn) {
                            return {
                                id: a.id,
                                time: a.time || (a.date ? new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
                                ampm: a.time ? (parseInt(a.time.split(':')[0]) >= 12 ? 'PM' : 'AM') : '',
                                client: 'Reservado', // Obfuscated
                                service: 'Ocupado',
                                duration: a.duration_minutes ? `${Math.floor(a.duration_minutes / 60)}h ${a.duration_minutes % 60}m` : '0m',
                                avatar: 'https://ui-avatars.com/api/?name=X&background=dddddd',
                                status: a.status,
                                date: new Date(a.date),
                                professionalId: a.professional_id,
                                professionalName: a.professionals?.name,
                                price: undefined
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
                    });

                    // Professional Filtering:
                    // Requirement: "profesional solo puede visualizar los clientes de el mismo y solo sus clientes que han agendado con él mismo"
                    // BUT for the agenda (checking overlaps), we often need all appointments? 
                    // Let's keep all appointments in state, but Views (Agenda/Clients) should filter.
                    // HOWEVER, if we want to be strict with data loaded:
                    // If Pro, maybe valid to keep all appointments to see blocked slots if working in same salon?
                    // Assuming yes for Appts.
                    setAppointments(finalAppts);
                }

                // --- PROCESS CLIENTS ---
                if (clientsRes.data) {
                    const allClients = clientsRes.data.map((c: any) => ({
                        id: c.id,
                        name: c.name,
                        email: c.email,
                        phone: c.phone,
                        avatar: c.avatar || c.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random`,
                        lastVisit: c.last_visit ? new Date(c.last_visit).toLocaleDateString() : 'Nuevo',
                        isNew: false,
                        role: c.role,
                        profileId: c.profile_id
                    }));

                    if (role === 'admin') {
                        setClients(allClients);
                    } else if (role === 'professional' && apptsRes.data) {
                        // Filter Clients: Verify strict Requirement: "Professional only sees THEIR clients"
                        // Logic: Clients who have at least one appointment with this professional.

                        // Find this professional's ID
                        const myProId = mappedPros.find(p => p.email?.toLowerCase() === session.user.email?.toLowerCase())?.id;

                        if (myProId) {
                            // Get client IDs from appointments with this pro
                            const myClientIds = new Set(
                                apptsRes.data
                                    .filter((a: any) => a.professional_id === myProId)
                                    .map((a: any) => a.client_id)
                            );

                            // Also include clients created by this pro? Supabase policy lets them see all, 
                            // but UI should filter. 
                            // Current requirement: "solo sus clientes que han agendado con él mismo".
                            const myClients = allClients.filter(c => myClientIds.has(c.id));
                            setClients(myClients);
                        } else {
                            setClients([]);
                        }
                    } else {
                        setClients([]);
                    }
                }

                console.log(`Fetch completed in ${performance.now() - startTime}ms`);
            } catch (err) {
                console.error("Error fetching data:", err);
            }
        };

        fetchData();
    }, [session, role]);

    // Helper to check for overlapping appointments
    const checkOverlap = (proId: number, dateIso: string, time: string, durationText: string, currentApptId?: number): boolean => {
        const targetDateObj = new Date(dateIso);
        // Normalizar a timestamp del inicio del día local
        const targetDate = new Date(targetDateObj.getFullYear(), targetDateObj.getMonth(), targetDateObj.getDate()).getTime();

        const [checkH, checkM] = time.split(':').map(Number);
        const newStart = checkH * 60 + checkM;

        let newDuration = 60;
        const hMatch = durationText.match(/(\d+)h/);
        const mMatch = durationText.match(/(\d+)m/);
        if (hMatch) newDuration = parseInt(hMatch[1]) * 60;
        if (mMatch) newDuration += parseInt(mMatch[1]);
        else if (!hMatch && !mMatch && durationText.includes('m')) newDuration = parseInt(durationText.replace('m', ''));

        const newEnd = newStart + newDuration;

        return appointments.some(appt => {
            if (appt.id === currentApptId) return false;
            if (appt.status === 'cancelled') return false;

            if (appt.professionalId !== proId || !appt.date) return false;

            const apptDateObj = new Date(appt.date);
            const apptDate = new Date(apptDateObj.getFullYear(), apptDateObj.getMonth(), apptDateObj.getDate()).getTime();

            if (apptDate !== targetDate) return false;

            const [existH, existM] = appt.time.split(':').map(Number);
            const existStart = existH * 60 + existM;
            let existDuration = 60;
            const ehMatch = appt.duration.match(/(\d+)h/);
            const emMatch = appt.duration.match(/(\d+)m/);
            if (ehMatch) existDuration = parseInt(ehMatch[1]) * 60;
            if (emMatch) existDuration += parseInt(emMatch[1]);
            else if (!ehMatch && !emMatch && appt.duration.includes('m')) existDuration = parseInt(appt.duration.replace('m', ''));

            const existEnd = existStart + existDuration;
            return (newStart < existEnd && newEnd > existStart);
        });
    };

    const addAppointment = async (appt: Appointment) => {
        // Calculate minutes duration
        let durationMinutes = 60;
        const hMatch = appt.duration.match(/(\d+)h/);
        const mMatch = appt.duration.match(/(\d+)m/);
        if (hMatch) durationMinutes = parseInt(hMatch[1]) * 60;
        if (mMatch) durationMinutes += parseInt(mMatch[1]);
        if (!hMatch && !mMatch && appt.duration.includes('m')) durationMinutes = parseInt(appt.duration.replace('m', ''));

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

        // --- OVERLAP VALIDATION ---
        if (appt.professionalId && finalDateIso && checkOverlap(appt.professionalId, finalDateIso, appt.time, appt.duration)) {
            const proName = professionals.find(p => p.id === appt.professionalId)?.name || 'el profesional';
            alert(`Conflicto Detectado: ${proName} ya tiene una cita agendada en ese horario. Por favor elige otro.`);
            throw new Error("Overlap detected");
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
        const target = appointments.find(a => a.id === id);

        // --- OVERLAP VALIDATION FOR CONFIRMATION ---
        if (status === 'confirmed' && target && target.professionalId && target.date) {
            if (checkOverlap(target.professionalId, target.date.toISOString(), target.time, target.duration, id)) {
                alert(`Error: No se puede confirmar. El profesional ya tiene otra cita en este horario.`);
                return;
            }
        }

        const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
        if (error) {
            alert("Error al actualizar estado: " + error.message);
            return;
        }
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
            // SYNC: Update clients/professionals table if linked
            if (role === 'admin' || role === 'professional') {
                await supabase.from('professionals').update({
                    name: data.name,
                    avatar: data.avatar,
                    role: data.role
                }).eq('profile_id', session.user.id);
            }
            if (role === 'client') {
                await supabase.from('clients').update({
                    name: data.name,
                    avatar: data.avatar,
                    phone: data.phone,
                    role: data.role
                }).eq('profile_id', session.user.id);
            }

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

        // SYNC: Update profile if connected
        const targetPro = professionals.find(p => p.id === id);
        if (targetPro?.profileId) {
            await supabase.from('profiles').update({
                full_name: data.name,
                avatar_url: data.avatar,
                role: data.role
            }).eq('id', targetPro.profileId);
        }

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
            // SYNC: Update profile if connected
            const targetClient = clients.find(c => c.id === id);
            if (targetClient?.profileId) {
                await supabase.from('profiles').update({
                    full_name: data.name,
                    avatar_url: data.avatar,
                    phone: data.phone,
                    role: data.role
                }).eq('id', targetClient.profileId);
            }
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

    const addService = async (service: Omit<Service, 'id'>) => {
        const { data, error } = await supabase.from('services').insert(service).select().single();
        if (error) {
            console.error("Error adding service:", error);
            alert("Error al agregar servicio: " + error.message);
        } else if (data) {
            setServices(prev => [...prev, data]);
        }
    };

    const updateService = async (id: number, data: Partial<Service>) => {
        const { error } = await supabase.from('services').update(data).eq('id', id);
        if (error) {
            console.error("Error updating service:", error);
            alert("Error al actualizar servicio: " + error.message);
        } else {
            setServices(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
        }
    };

    const deleteService = async (id: number) => {
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (error) {
            console.error("Error deleting service:", error);
            alert("Error al eliminar servicio: " + error.message);
        } else {
            setServices(prev => prev.filter(s => s.id !== id));
        }
    };

    return (
        <DataContext.Provider value={{
            appointments,
            clients,
            userProfile,
            professionals,
            services,
            addAppointment,
            addClient,
            updateAppointmentStatus,
            deleteAppointment,
            updateUserProfile,
            addProfessional,
            updateProfessional,
            deleteProfessional,
            updateClient,
            deleteClient,
            addService,
            updateService,
            deleteService
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