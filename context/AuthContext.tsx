
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: string | null;
    profile: any | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Set a timeout to prevent infinite loading state
        const loadingTimeout = setTimeout(() => {
            console.log("Auth loading timeout - forcing loading to false");
            setLoading(false);
        }, 10000); // 10 second max wait

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth Event:", event, session?.user?.email);

            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                // Pass user email directly to avoid race conditions
                await fetchProfile(session.user.id, session.user.email || '');
            } else {
                setRole(null);
                setProfile(null);
                setLoading(false);
            }

            clearTimeout(loadingTimeout);
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(loadingTimeout);
        };
    }, []);

    const fetchProfile = async (userId: string, userEmail: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code === 'PGRST116') {
                // Profile doesn't exist, try to sync with existing records
                console.log("Creating default profile for", userId);

                let assignedRole = 'client';
                let fullName = userEmail?.split('@')[0] || 'Usuario';
                let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail || 'User')}&background=random`;

                // 1. Check if user exists in professionals (Priority)
                const { data: proData } = await supabase
                    .from('professionals')
                    .select('role, name, avatar')
                    .eq('email', userEmail)
                    .single();

                if (proData) {
                    console.log("Found existing professional record:", proData);
                    assignedRole = proData.role || 'professional';
                    fullName = proData.name || fullName;
                    avatarUrl = proData.avatar || avatarUrl;

                    // Link professional to this user
                    await supabase.from('professionals').update({ profile_id: userId }).eq('email', userEmail);
                } else {
                    // 2. Check if user exists in clients
                    const { data: clientData } = await supabase
                        .from('clients')
                        .select('role, name, avatar')
                        .eq('email', userEmail)
                        .single();

                    if (clientData) {
                        console.log("Found existing client record:", clientData);
                        assignedRole = 'client'; // Clients are always clients unless specified
                        fullName = clientData.name || fullName;
                        avatarUrl = clientData.avatar || avatarUrl;

                        // Link client to this user
                        await supabase.from('clients').update({ profile_id: userId }).eq('email', userEmail);
                    }
                }

                const newProfile = {
                    id: userId,
                    email: userEmail,
                    full_name: fullName,
                    role: assignedRole,
                    avatar_url: avatarUrl
                };

                const { data: created, error: createError } = await supabase
                    .from('profiles')
                    .insert(newProfile)
                    .select()
                    .single();

                if (createError) {
                    console.error("Error creating profile:", createError);
                    // Still set a default role so user isn't stuck
                    setRole('client');
                    setProfile(null);
                } else if (created) {
                    console.log("Profile created:", created.role);
                    setRole(created.role);
                    setProfile(created);
                }
            } else if (error) {
                // Some other error occurred
                console.error("Error fetching profile:", error);
                setRole(null);
                setProfile(null);
            } else if (data) {
                console.log("Profile loaded:", data.role);
                setRole(data.role);
                setProfile(data);
            }
        } catch (e) {
            console.error("fetchProfile exception", e);
            // Ensure we don't leave user stuck
            setRole(null);
            setProfile(null);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        console.log("AuthContext: signOut iniciado");
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Error signing out:", error);
        } finally {
            setSession(null);
            setUser(null);
            setRole(null);
            setProfile(null);
            localStorage.clear();
        }
    };

    return (
        <AuthContext.Provider value={{ session, user, role, loading, signOut, profile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
