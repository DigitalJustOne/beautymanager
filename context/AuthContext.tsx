
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
    // Track if we successfully loaded the profile to avoid timeout interference
    const profileLoadedRef = React.useRef(false);

    useEffect(() => {
        // Reset ref on mount
        profileLoadedRef.current = false;

        // SAFETY TIMEOUT: Only stops the loading spinner, does NOT invent user data
        // This prevents infinite loading but trusts that Supabase session is already persisted
        const safetyTimeout = setTimeout(() => {
            if (!profileLoadedRef.current) {
                console.warn("Auth safety timeout reached - stopping spinner only");
                // Just stop loading, don't assign fake roles or profiles
                // Supabase session is already in localStorage, ProtectedRoute will handle redirect
                setLoading(false);
            }
        }, 8000); // Extended to 8 seconds to give slow networks more time

        // Initial session check - this reads from Supabase's localStorage cache
        const initializeAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                console.log("Initial session check:", session?.user?.email);

                if (session?.user) {
                    setSession(session);
                    setUser(session.user);
                    // Fetch profile - this will set role from the REAL database
                    await fetchProfile(session.user.id, session.user.email || '');
                    profileLoadedRef.current = true;
                    clearTimeout(safetyTimeout); // Cancel timeout since we succeeded
                } else {
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error checking initial session:", error);
                // On error, just stop loading - don't invent data
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
                profileLoadedRef.current = false;
                return;
            }

            // For INITIAL_SESSION event, we already handled it in initializeAuth
            // Skip to avoid duplicate fetches
            if (event === 'INITIAL_SESSION') {
                return;
            }

            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                // Skip fetch if profile already loaded for this user (prevents reload issues)
                if (profileLoadedRef.current && profile && profile.id === session.user.id) {
                    console.log("Profile already loaded, skipping duplicate fetch");
                    return;
                }

                // For TOKEN_REFRESHED, don't show loading spinner
                const shouldShowLoading = event !== 'TOKEN_REFRESHED';
                await fetchProfile(session.user.id, session.user.email || '', shouldShowLoading);
                profileLoadedRef.current = true;
            } else {
                setLoading(false);
            }
        });

        return () => {
            clearTimeout(safetyTimeout);
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
