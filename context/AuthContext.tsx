
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
        // Initial session check
        const initializeAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                console.log("Initial session check:", session?.user?.email);

                if (session?.user) {
                    setSession(session);
                    setUser(session.user);
                    // Fetch profile immediately for initial load
                    await fetchProfile(session.user.id, session.user.email || '');
                } else {
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error checking initial session:", error);
                setLoading(false);
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth Event:", event, session?.user?.email);

            if (event === 'SIGNED_OUT') {
                setSession(null);
                setUser(null);
                setRole(null);
                setProfile(null);
                setLoading(false);
                return;
            }

            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                // If it's a TOKEN_REFRESHED event, we probably already have the profile. 
                // Only fetch if we don't have it or if the user changed.
                const isTokenRefresh = event === 'TOKEN_REFRESHED';
                const alreadyLoaded = profile && profile.id === session.user.id;

                if (isTokenRefresh && alreadyLoaded) {
                    // Do nothing, just updated session token
                    console.log("Token refreshed, profile already loaded. Skipping fetch.");
                    return;
                }

                // If it's SIGNED_IN or other events, fetch profile.
                // Pass false for showLoading if it's a refresh or if we want to be subtle.
                // However, on SIGNED_IN we usually want to show loading to ensure Role is ready.
                // On INITIAL_SESSION (which we handled manually above), we want loading.
                // If the event arrives LATER for some reason, we handle it too.

                const shouldShowLoading = !alreadyLoaded && event !== 'TOKEN_REFRESHED';
                await fetchProfile(session.user.id, session.user.email || '', shouldShowLoading);
            } else {
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []); // Removed profile dependency to avoid loops, though it wasn't there before.

    const fetchProfile = async (userId: string, userEmail: string, showLoading = true) => {
        if (showLoading) setLoading(true);

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
            if (showLoading) setLoading(false);
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
