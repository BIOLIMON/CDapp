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

    const [initializing, setInitializing] = useState(true);

    // Core Profile Fetcher
    const fetchProfile = async (userId: string, userEmail?: string): Promise<UserProfile | null> => {
        try {
            // 1. Try to get existing profile
            let { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error("Error fetching profile:", error);
            }

            // 2. Handle Pending Registration (Local Storage)
            // This is for the flow: Landing -> Kit Code -> Google Sign In -> Profile Creation
            const pendingReg = localStorage.getItem('pending_registration');
            let pendingProfile = pendingReg ? JSON.parse(pendingReg) : null;

            if (data) {
                // Profile exists. Use it.
                // Check if we need to backfill Kit Code from pending flow?
                if (!data.kit_code && pendingProfile && pendingProfile.kitCode) {
                    console.log("Merging pending Kit Code into existing profile...");
                    const normalizedCode = pendingProfile.kitCode.trim().toUpperCase();

                    // 1. Claim Kit
                    // We await this to ensure we don't update profile if claim fails (unless it's already ours)
                    const claimed = await api.claimKit(normalizedCode, userId);

                    // If claim failed, check if it was because WE already own it (idempotency)
                    // But api.claimKit returns boolean. We'd need to check ownership if false.
                    // For now, if claim fails, we might still want to link it if we are the owner?
                    // Let's trust the flow: if claim fails, maybe don't update profile to avoid bad state?
                    // But if the user stuck in the reported loop, they ARE the owner. 

                    // Robust fix: Update profile anyway if we have a code.
                    // If the code is invalid, the UI will just show it. 
                    // But better: Check if we are the claimer?

                    let shouldUpdateProfile = claimed;
                    if (!claimed) {
                        const { data: kit } = await supabase.from('allowed_kits').select('claimed_by').eq('code', normalizedCode).single();
                        if (kit && kit.claimed_by === userId) {
                            shouldUpdateProfile = true;
                        }
                    }

                    if (shouldUpdateProfile) {
                        await supabase.from('profiles').update({ kit_code: normalizedCode }).eq('id', userId);
                        data.kit_code = normalizedCode;
                        localStorage.removeItem('pending_registration');
                    }
                } else if (data.kit_code) {
                    // Profile HAS kit code (from Trigger metadata), but it might not be claimed in 'allowed_kits' yet
                    // because we deferred it until now (post-login).
                    // We optimistically try to claim it.
                    // If already claimed by THIS user, it's fine (idempotent-ish check needed or just ignore false)
                    // If claimed by ANOTHER user, user is in trouble (but trigger shouldn't have allowed duplicate kit usage ideally, 
                    // though we removed uniqueness there? No, allowed_kits is unique. Profile kit_code isn't.)
                    // Actually, if someone else stole the kit in between, this user has a kit code they can't use.
                    // UI should handle "Kit Error". But for now, we try to claim.

                    // We run this async so we don't block profile loading
                    api.claimKit(data.kit_code, userId).then(success => {
                        if (success) console.log("Kit successfully claimed (Deferred).");
                        else console.log("Kit claim verification checked (Already claimed or unavailable).");
                    }).catch(err => console.error("Error ensuring kit claim:", err));
                }

                const profile: UserProfile = {
                    id: data.id,
                    name: data.name || 'Usuario',
                    email: data.email || userEmail || '',
                    kitCode: data.kit_code || '',
                    startDate: data.start_date || new Date().toISOString(),
                    role: data.role as 'user' | 'god',
                    score: data.score || 0,
                    avatar: data.avatar // if exists
                };
                return profile;
            } else if (pendingProfile) {
                // 3. Profile does NOT exist, but we have Pending Data (e.g. fresh Google Sign Up)
                console.log("Creating new profile from pending registration...");
                const normalizedCode = pendingProfile.kitCode ? pendingProfile.kitCode.trim().toUpperCase() : '';
                const newProfile: UserProfile = {
                    id: userId,
                    email: userEmail || '',
                    ...pendingProfile,
                    kitCode: normalizedCode, // Ensure mapped correctly
                    startDate: new Date().toISOString(),
                    role: 'user',
                    score: 0
                };

                // Construct the object for DB
                // We delegate to API or Trigger. 
                // If Trigger failed or didn't run (e.g. race condition), we do it properly here.

                // For robustness, we try to create it via API (Upsert)
                try {
                    await api.createProfile(newProfile);
                    if (newProfile.kitCode) {
                        await api.claimKit(newProfile.kitCode, userId);
                    }
                    localStorage.removeItem('pending_registration');
                    return newProfile;
                } catch (createErr) {
                    console.error("Error creating profile:", createErr);
                    // Fallback: return the temp profile so UI works, but it might fail later?
                    return newProfile;
                }
            } else {
                // 4. No Profile, No Pending Data.
                // This is a "Zombie" user (Authenticated but no profile).
                // Return null, let the UI handle "Complete Registration".
                return null;
            }

        } catch (err) {
            console.error("Critical error in fetchProfile:", err);
            return null;
        }
    };

    const refreshProfile = async () => {
        if (!session?.user) return;
        const profile = await fetchProfile(session.user.id, session.user.email);
        setUser(profile);
    };

    // Initial Load & Subscription
    useEffect(() => {
        let mounted = true;

        const initialize = async () => {
            try {
                // Get initial session
                const { data: { session: initialSession } } = await supabase.auth.getSession();

                if (mounted) {
                    setSession(initialSession);
                    if (initialSession?.user) {
                        const profile = await fetchProfile(initialSession.user.id, initialSession.user.email);
                        setUser(profile);
                    }
                }
            } catch (error) {
                console.error("Initialization error:", error);
            } finally {
                if (mounted) {
                    setLoading(false);
                    setInitializing(false);
                }
            }
        };

        initialize();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (!mounted) return;
            console.log("Auth State Change:", event);

            // Update session immediately
            setSession(newSession);

            if (newSession?.user) {
                // If we switched users or just signed in, fetch profile
                // Optimization: if event is TOKEN_REFRESHED, maybe skip?
                if (event === 'TOKEN_REFRESHED' && user) return;

                setLoading(true); // Briefly show loading on swich
                const profile = await fetchProfile(newSession.user.id, newSession.user.email);
                setUser(profile);
                setLoading(false);
            } else {
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
