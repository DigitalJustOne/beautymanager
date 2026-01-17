import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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

// Constants for localStorage keys
const PROFILE_CACHE_KEY = 'bm_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const isMounted = useRef(true);

    // Cache helpers - simple and safe
    const getCache = (): any | null => {
        try {
            const data = localStorage.getItem(PROFILE_CACHE_KEY);
            return data ? JSON.parse(data) : null;
        } catch {
            localStorage.removeItem(PROFILE_CACHE_KEY);
            return null;
        }
    };

    const setCache = (data: any) => {
        try {
            localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data));
        } catch { /* ignore */ }
    };

    const clearCache = () => {
        try {
            localStorage.removeItem(PROFILE_CACHE_KEY);
        } catch { /* ignore */ }
    };

    // Fetch profile from database
    const fetchProfile = async (userId: string, userEmail: string): Promise<boolean> => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (data && !error) {
                if (isMounted.current) {
                    setRole(data.role);
                    setProfile(data);
                    setCache(data);
                }
                return true;
            }

            // Profile doesn't exist - create it
            if (error?.code === 'PGRST116') {
                let assignedRole = 'client';
                let fullName = userEmail?.split('@')[0] || 'Usuario';
                let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail || 'User')}&background=random`;

                // Check professionals table
                const { data: proData } = await supabase
                    .from('professionals')
                    .select('role, name, avatar')
                    .eq('email', userEmail)
                    .single();

                if (proData) {
                    assignedRole = proData.role || 'professional';
                    fullName = proData.name || fullName;
                    avatarUrl = proData.avatar || avatarUrl;
                    await supabase.from('professionals').update({ profile_id: userId }).eq('email', userEmail);
                } else {
                    // Check clients table
                    const { data: clientData } = await supabase
                        .from('clients')
                        .select('role, name, avatar')
                        .eq('email', userEmail)
                        .single();

                    if (clientData) {
                        fullName = clientData.name || fullName;
                        avatarUrl = clientData.avatar || avatarUrl;
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

                const { data: created } = await supabase
                    .from('profiles')
                    .insert(newProfile)
                    .select()
                    .single();

                if (created && isMounted.current) {
                    setRole(created.role);
                    setProfile(created);
                    setCache(created);
                    return true;
                }
            }

            return false;
        } catch (e) {
            console.error("fetchProfile error:", e);
            return false;
        }
    };

    useEffect(() => {
        isMounted.current = true;

        const init = async () => {
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();

                if (!currentSession?.user) {
                    clearCache();
                    setLoading(false);
                    return;
                }

                setSession(currentSession);
                setUser(currentSession.user);

                // Try cache first for instant load
                const cached = getCache();
                if (cached && cached.id === currentSession.user.id && cached.role) {
                    setRole(cached.role);
                    setProfile(cached);
                    setLoading(false);
                    // Refresh in background
                    fetchProfile(currentSession.user.id, currentSession.user.email || '');
                } else {
                    // No valid cache, fetch from DB
                    await fetchProfile(currentSession.user.id, currentSession.user.email || '');
                    setLoading(false);
                }
            } catch (error) {
                console.error("Auth init error:", error);
                clearCache();
                setLoading(false);
            }
        };

        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            console.log("Auth Event:", event, newSession?.user?.email);

            if (event === 'SIGNED_OUT') {
                clearCache();
                setSession(null);
                setUser(null);
                setRole(null);
                setProfile(null);
                setLoading(false);
                return;
            }

            if (event === 'INITIAL_SESSION') return;

            if (newSession?.user) {
                setSession(newSession);
                setUser(newSession.user);

                // Only show loading for new sign-ins
                if (event === 'SIGNED_IN') {
                    setLoading(true);
                    await fetchProfile(newSession.user.id, newSession.user.email || '');
                    setLoading(false);
                }
            }
        });

        return () => {
            isMounted.current = false;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        try {
            clearCache();
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Sign out error:", error);
        } finally {
            setSession(null);
            setUser(null);
            setRole(null);
            setProfile(null);
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
