import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';
import { UserProfile } from '../types';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: UserProfile | null;
    session: Session | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // Safety timeout to prevent infinite loading
        const safetyTimer = setTimeout(() => {
            if (mounted) {
                setLoading(currentLoading => {
                    if (currentLoading) {
                        console.warn("Auth check timed out (8s), forcing completion.");
                        return false;
                    }
                    return currentLoading;
                });
            }
        }, 8000);

        // Check active session
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (!mounted) return;

            if (error) {
                console.error("Error checking session:", error);
                setLoading(false);
                return;
            }

            setSession(session);
            if (session?.user) {
                fetchProfile(session.user.id, session.user.email);
            } else {
                setLoading(false);
            }
        }).catch(err => {
            console.error("Unexpected auth error:", err);
            if (mounted) setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return;
            setSession(session);

            if (session?.user) {
                // If we already have the user loaded and it matches, don't refetch to avoid loops?
                // But profile might change. 
                await fetchProfile(session.user.id, session.user.email);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            clearTimeout(safetyTimer);
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (userId: string, email?: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (data) {
                const fullProfile: UserProfile = {
                    id: data.id,
                    name: data.name || '',
                    email: data.email || '',
                    kitCode: data.kit_code || '',
                    startDate: data.start_date || '',
                    role: data.role as 'user' | 'admin',
                    score: data.score || 0,
                    password: ''
                };
                setUser(fullProfile);
            } else {
                // Profile not found. Check if it's a new Google registration
                const pendingReg = localStorage.getItem('pending_registration');
                if (pendingReg) {
                    try {
                        console.log("Found pending registration, creating profile...");
                        const pendingProfile = JSON.parse(pendingReg);

                        const newProfile: UserProfile = {
                            ...pendingProfile,
                            id: userId,
                            email: email || '',
                            score: 0,
                            role: 'user'
                        };

                        // 1. Create Profile
                        await api.createProfile(newProfile);

                        // 2. Claim Kit
                        if (newProfile.kitCode) {
                            await api.claimKit(newProfile.kitCode, userId);
                        }

                        // 3. Set User
                        setUser(newProfile);

                        // 4. Clear Pending
                        localStorage.removeItem('pending_registration');
                        console.log("Profile created successfully via Google Sign-In");
                    } catch (createError) {
                        console.error("Error creating profile from pending registration", createError);
                    }
                } else {
                    console.warn('User authenticated but no profile found and no pending registration.');
                    // If no profile and no pending reg, we might want to sign them out or redirect to onboarding
                    // For now, leave user as null so App acts accordingly
                }
            }
        } catch (error) {
            console.error('Unexpected error fetching profile', error);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
