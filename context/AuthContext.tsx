
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
    const profileLoadedRef = React.useRef(false);

    // Helper to load cached profile from localStorage
    const loadCachedProfile = (userId: string): any | null => {
        try {
            const cached = localStorage.getItem(`beautymanager_profile_${userId}`);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (e) {
            console.warn("Error reading cached profile:", e);
        }
        return null;
    };

    // Helper to save profile to localStorage
    const saveCachedProfile = (userId: string, profileData: any) => {
        try {
            localStorage.setItem(`beautymanager_profile_${userId}`, JSON.stringify(profileData));
        } catch (e) {
            console.warn("Error saving cached profile:", e);
        }
    };

    // Helper to clear cached profile
    const clearCachedProfile = (userId?: string) => {
        try {
            if (userId) {
                localStorage.removeItem(`beautymanager_profile_${userId}`);
            }
            // Clear any profile keys
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('beautymanager_profile_')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (e) {
            console.warn("Error clearing cached profile:", e);
        }
    };

    useEffect(() => {
        profileLoadedRef.current = false;

        const initializeAuth = async () => {
            try {
                // Step 1: Get session from Supabase (this is fast, it reads from localStorage)
                const { data: { session } } = await supabase.auth.getSession();
                console.log("Initial session check:", session?.user?.email);

                if (session?.user) {
                    setSession(session);
                    setUser(session.user);

                    // Step 2: Try to load cached profile IMMEDIATELY (instant, no network)
                    const cachedProfile = loadCachedProfile(session.user.id);
                    if (cachedProfile && cachedProfile.id === session.user.id) {
                        console.log("Using cached profile:", cachedProfile.role);
                        setRole(cachedProfile.role);
                        setProfile(cachedProfile);
                        setLoading(false);
                        profileLoadedRef.current = true;

                        // Step 3: Refresh from database in background (silent, no loading spinner)
                        fetchProfile(session.user.id, session.user.email || '', false);
                    } else {
                        // No cache, must wait for network
                        console.log("No cached profile, fetching from database...");
                        await fetchProfile(session.user.id, session.user.email || '', true);
                        profileLoadedRef.current = true;
                    }
                } else {
                    // No session
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
                clearCachedProfile();
                setSession(null);
                setUser(null);
                setRole(null);
                setProfile(null);
                setLoading(false);
                profileLoadedRef.current = false;
                return;
            }

            // Skip INITIAL_SESSION since we handled it in initializeAuth
            if (event === 'INITIAL_SESSION') {
                return;
            }

            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                // Skip if already loaded for this user
                if (profileLoadedRef.current && profile && profile.id === session.user.id) {
                    console.log("Profile already loaded, skipping duplicate fetch");
                    return;
                }

                const shouldShowLoading = event !== 'TOKEN_REFRESHED';
                await fetchProfile(session.user.id, session.user.email || '', shouldShowLoading);
                profileLoadedRef.current = true;
            } else {
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

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
                    saveCachedProfile(userId, created); // Cache for instant reload
                }
            } else if (error) {
                // Some other error occurred - don't invent roles, let ProtectedRoute redirect
                console.error("Error fetching profile:", error);
                setRole(null);
                setProfile(null);
            } else if (data) {
                console.log("Profile loaded:", data.role);
                setRole(data.role);
                setProfile(data);
                saveCachedProfile(userId, data); // Cache for instant reload
            }
        } catch (e) {
            console.error("fetchProfile exception", e);
            // On exception, don't invent roles - let ProtectedRoute handle redirect
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
