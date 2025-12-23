import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';
import { UserProfile } from '../types';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: UserProfile | null;
    session: Session | null;
    loading: boolean;
    signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
    signInWithGoogle: () => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string, metadata: any) => Promise<{ data: any; error: Error | null }>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signInWithEmail: async () => ({ error: null }),
    signInWithGoogle: async () => ({ error: null }),
    signUp: async () => ({ data: null, error: null }),
    signOut: async () => { },
    refreshProfile: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    // We use refs to avoid stale closures in onAuthStateChange
    const userRef = React.useRef<UserProfile | null>(null);
    const sessionRef = React.useRef<Session | null>(null);

    // Core Profile Fetcher
    const fetchProfile = async (userId: string, userEmail?: string): Promise<UserProfile | null> => {
        try {
            console.log(`[Auth] Fetching profile for ${userId}...`);
            // 1. Try to get existing profile
            let { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error("[Auth] Error fetching profile:", error);
            }

            // 2. Handle Pending Registration (Local Storage)
            const pendingReg = localStorage.getItem('pending_registration');
            let pendingProfile = pendingReg ? JSON.parse(pendingReg) : null;

            if (data) {
                // ... (Keep existing logic for merging pending kit code)
                if (!data.kit_code && pendingProfile && pendingProfile.kitCode) {
                    const normalizedCode = pendingProfile.kitCode.trim().toUpperCase();
                    const claimed = await api.claimKit(normalizedCode, userId);
                    let shouldUpdateProfile = claimed;
                    if (!claimed) {
                        const { data: kit } = await supabase.from('allowed_kits').select('claimed_by').eq('code', normalizedCode).single();
                        if (kit && kit.claimed_by === userId) shouldUpdateProfile = true;
                    }
                    if (shouldUpdateProfile) {
                        await supabase.from('profiles').update({ kit_code: normalizedCode }).eq('id', userId);
                        data.kit_code = normalizedCode;
                        localStorage.removeItem('pending_registration');
                    }
                } else if (data.kit_code) {
                    api.claimKit(data.kit_code, userId).catch(e => console.error("[Auth] Background claim error:", e));
                }

                const profile: UserProfile = {
                    id: data.id,
                    name: data.name || 'Usuario',
                    email: data.email || userEmail || '',
                    kitCode: data.kit_code || '',
                    startDate: data.start_date || new Date().toISOString(),
                    role: data.role as 'user' | 'god',
                    score: data.score || 0,
                    avatar: data.avatar
                };
                return profile;
            } else if (pendingProfile) {
                console.log("[Auth] Creating profile from pending registration...");
                const normalizedCode = pendingProfile.kitCode ? pendingProfile.kitCode.trim().toUpperCase() : '';
                const newProfile: UserProfile = {
                    id: userId,
                    email: userEmail || '',
                    ...pendingProfile,
                    kitCode: normalizedCode,
                    startDate: new Date().toISOString(),
                    role: 'user',
                    score: 0
                };
                try {
                    await api.createProfile(newProfile);
                    if (newProfile.kitCode) await api.claimKit(newProfile.kitCode, userId);
                    localStorage.removeItem('pending_registration');
                    return newProfile;
                } catch (createErr) {
                    console.error("[Auth] Error creating profile:", createErr);
                    return newProfile;
                }
            }
            return null;
        } catch (err) {
            console.error("[Auth] Critical error in fetchProfile:", err);
            return null;
        }
    };

    const refreshProfile = async () => {
        if (!sessionRef.current?.user) return;
        const profile = await fetchProfile(sessionRef.current.user.id, sessionRef.current.user.email);
        userRef.current = profile;
        setUser(profile);
    };

    // Initial Load & Subscription
    useEffect(() => {
        let mounted = true;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (!mounted) return;
            console.log(`[Auth] Auth State Event: ${event}`);

            // Update refs immediately
            sessionRef.current = newSession;
            setSession(newSession);

            if (newSession?.user) {
                // If it's a token refresh and we already have a user, don't re-fetch/re-load
                if (event === 'TOKEN_REFRESHED' && userRef.current) {
                    console.log("[Auth] Token refreshed, skipping profile fetch.");
                    return;
                }

                setLoading(true);
                const profile = await fetchProfile(newSession.user.id, newSession.user.email);

                if (mounted) {
                    userRef.current = profile;
                    setUser(profile);
                    setLoading(false);
                }
            } else {
                userRef.current = null;
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);


    // --- Actions ---

    const signInWithEmail = async (email: string, password: string) => {
        setLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        // State update handled by onAuthStateChange
        if (error) setLoading(false);
        return { error };
    };

    const signInWithGoogle = async () => {
        // Redirects away, so no need to setLoading(false) really, but good practice
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) setLoading(false);
        return { error };
    };

    const signUp = async (email: string, password: string, metadata: any) => {
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: metadata }
        });

        // Always reset loading. 
        // If session was created, onAuthStateChange will trigger and might set it to true again briefly, which is fine.
        // If no session (email confirm), we MUST reset it so UI can show the "Verify Email" screen.
        setLoading(false);

        return { data, error };
    };

    const signOut = async () => {
        setLoading(true);
        await supabase.auth.signOut();
        // State update handled by onAuthStateChange
        setUser(null);
        setSession(null);
        setLoading(false);
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            loading,
            signInWithEmail,
            signInWithGoogle,
            signUp,
            signOut,
            refreshProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
};
