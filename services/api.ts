import { supabase } from '../lib/supabase';
import { ExperimentEntry, UserProfile, GlobalStats, Kit } from '../types';

export const api = {
    // --- User / Profile ---

    async getProfile(userId: string): Promise<UserProfile | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }

        // Map DB columns to camelCase types if needed, or rely on loose matching if types align.
        // Our DB uses snake_case, types use camelCase. We need mapping.
        return {
            id: data.id,
            email: data.email,
            role: data.role,
            name: data.name,
            kitCode: data.kit_code,
            startDate: data.start_date,
            score: data.score,
            password: '' // Not exposed
        };
    },

    async createProfile(profile: UserProfile) {
        // 1. Auth Signup is handled in the UI/Register component via supabase.auth.signUp()
        // 2. This function is for inserting the profile row if not done properly by triggers
        // Or updating an existing one.

        // Since we are using RLS policies where user inserts their own profile:
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: profile.id, // Must match auth.uid()
                email: profile.email,
                role: profile.role || 'user',
                name: profile.name,
                kit_code: profile.kitCode,
                start_date: profile.startDate,
                score: 0
            });

        if (error) throw error;
    },

    async promoteToAdmin(userId: string): Promise<boolean> {
        const { error } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', userId);

        if (error) {
            console.error("Error promoting user", error);
            return false;
        }
        return true;
    },

    async revokeAdmin(userId: string): Promise<boolean> {
        const { error } = await supabase
            .from('profiles')
            .update({ role: 'user' })
            .eq('id', userId);

        if (error) {
            console.error("Error revoking admin", error);
            return false;
        }
        return true;
    },

    // --- Entries ---

    async getUserEntries(userId: string): Promise<ExperimentEntry[]> {
        const { data, error } = await supabase
            .from('experiment_entries')
            .select(`
        *,
        pots (*)
      `)
            .eq('user_id', userId)
            .order('date', { ascending: false });

        if (error) throw error;

        // Transform to frontend structure
        return data.map((e: any) => ({
            id: e.id,
            userId: e.user_id,
            date: e.date,
            dayNumber: e.day_number,
            generalNotes: e.general_notes || '',
            pots: e.pots.reduce((acc: any, pot: any) => {
                acc[pot.pot_id] = {
                    weight: pot.weight?.toString() || '',
                    height: pot.height?.toString() || '',
                    visualStatus: pot.visual_status,
                    ph: pot.ph?.toString() || '',
                    notes: pot.notes || '',
                    images: pot.images || {}
                };
                return acc;
            }, {})
        }));
    },

    async addEntry(entry: ExperimentEntry) {
        // 1. Insert Entry
        const { data: entryData, error: entryError } = await supabase
            .from('experiment_entries')
            .insert({
                user_id: entry.userId,
                date: entry.date,
                day_number: entry.dayNumber,
                general_notes: entry.generalNotes
            })
            .select()
            .single();

        if (entryError) throw entryError;

        // 2. Insert Pots
        const potRows = Object.entries(entry.pots).map(([potId, potData]) => ({
            entry_id: entryData.id,
            pot_id: potId,
            weight: parseFloat(String(potData.weight)) || 0,
            height: parseFloat(String(potData.height)) || 0,
            visual_status: potData.visualStatus,
            ph: parseFloat(String(potData.ph)) || 0,
            notes: potData.notes,
            images: potData.images // JSONB
        }));

        const { error: potsError } = await supabase
            .from('pots')
            .insert(potRows);

        if (potsError) throw potsError;

        return this.updateScore(entry.userId); // Recalculate and return new score
    },

    // --- Stats / Admin ---

    // --- Stats / Admin ---

    calculateScore(entries: ExperimentEntry[]): number {
        let score = 0;

        // 1. Quantity Points
        score += entries.length * 100;

        // 2. Photo Points
        entries.forEach(entry => {
            Object.values(entry.pots).forEach(pot => {
                const img = pot.images || {};
                if (img.front) score += 50;
                if (img.top) score += 50;
                if (img.profile) score += 50;
            });
        });

        // 3. Consistency/Streak (Simplified)
        if (entries.length > 5) score += 200;
        if (entries.length > 10) score += 500;

        return score;
    },

    async updateScore(userId: string): Promise<number> {
        // Calculate score based on actual entries and photos
        const entries = await this.getUserEntries(userId);
        const newScore = this.calculateScore(entries);

        await supabase
            .from('profiles')
            .update({ score: newScore })
            .eq('id', userId);

        return newScore;
    },

    async getGlobalStats(): Promise<GlobalStats> {
        // 1. Total Users/Experiments
        const { count: totalUsers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        // 2. Total Entries
        const { count: totalEntries } = await supabase
            .from('experiment_entries')
            .select('*', { count: 'exact', head: true });

        // 3. Total Photos
        // Fetch only images column from pots to minimize data transfer
        const { data: potsData } = await supabase
            .from('pots')
            .select('images');

        let totalPhotos = 0;
        if (potsData) {
            potsData.forEach((p: any) => {
                if (p.images) {
                    // Count keys that correspond to valid photos
                    const img = p.images;
                    if (img.front) totalPhotos++;
                    if (img.top) totalPhotos++;
                    if (img.profile) totalPhotos++;
                }
            });
        }

        // 4. Leaderboard
        const { data: topUsers } = await supabase
            .from('profiles')
            .select('name, score')
            .order('score', { ascending: false })
            .limit(3);

        const leaderboard = topUsers
            ? topUsers.map((u: any) => ({ name: u.name, score: u.score }))
            : [];

        return {
            totalUsers: totalUsers || 0,
            activeExperiments: totalUsers || 0,
            totalEntries: totalEntries || 0,
            totalPhotos,
            leaderboard
        };
    },
    async getAllUsers(): Promise<UserProfile[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*');

        if (error) throw error;

        return data.map((d: any) => ({
            id: d.id,
            email: d.email,
            name: d.name,
            role: d.role,
            kitCode: d.kit_code,
            startDate: d.start_date,
            score: d.score,
            password: ''
        }));
    },

    async getAllEntries(): Promise<ExperimentEntry[]> {
        // Admin only function typically
        const { data, error } = await supabase
            .from('experiment_entries')
            .select(`*, pots(*)`)
            .order('date', { ascending: false });

        if (error) throw error;

        return data.map((e: any) => ({
            id: e.id,
            userId: e.user_id,
            date: e.date,
            dayNumber: e.day_number,
            generalNotes: e.general_notes,
            pots: e.pots.reduce((acc: any, pot: any) => {
                acc[pot.pot_id] = {
                    weight: pot.weight?.toString() || '',
                    height: pot.height?.toString() || '',
                    visualStatus: pot.visual_status,
                    ph: pot.ph?.toString() || '',
                    notes: pot.notes || '',
                    images: pot.images || {}
                };
                return acc;
            }, {})
        }));
    },

    async uploadImage(file: File, path: string) {
        const { data, error } = await supabase.storage
            .from('images') // Ensure bucket "images" exists
            .upload(path, file, { upsert: true });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(path);

        return publicUrl;
    },

    // --- Kit Management ---

    async checkKitAvailability(code: string): Promise<{ available: boolean, kit?: any }> {
        const { data, error } = await supabase
            .from('allowed_kits')
            .select('*')
            .eq('code', code)
            .single();

        if (error) {
            // If code not found (code is unique)
            return { available: false };
        }

        return {
            available: data.status === 'available',
            kit: data
        };
    },

    async claimKit(code: string, userId: string): Promise<boolean> {
        const { error } = await supabase
            .from('allowed_kits')
            .update({
                status: 'claimed',
                claimed_by: userId,
                claimed_at: new Date().toISOString()
            })
            .eq('code', code)
            .eq('status', 'available'); // Double check purely at DB level

        if (error) {
            console.error("Error claiming kit", error);
            return false;
        }
        return true;
    },

    async uploadKits(kits: { code: string, batch_id: string, kit_number?: string, variety?: string }[]): Promise<{ success: boolean, count?: number, error?: any }> {
        // Use the new v2 RPC which is SECURITY DEFINER and ignores RLS, 
        // while strictly checking for 'admin' role inside the DB.
        const { data, error } = await supabase.rpc('admin_upload_kits_v2', {
            kits_data: kits
        });

        if (error) {
            console.error("RPC Error:", error);
            return { success: false, error };
        }

        // Check application level error from RPC return
        if (data && !data.success) {
            return { success: false, error: { message: data.error } };
        }

        return { success: true, count: data.count || kits.length };
    },

    async getAllKits(): Promise<Kit[]> {
        const { data, error } = await supabase
            .from('allowed_kits')
            .select('*')
            .order('id', { ascending: true }); // Assuming 'id' exists, or order by 'code'

        if (error) throw error;
        return data as Kit[] || [];
    },

    async updateKit(id: number | string, updates: Partial<Kit>): Promise<boolean> {
        const { error } = await supabase
            .from('allowed_kits')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error("Error updating kit", error);
            return false;
        }
        return true;
    },

    async deleteKit(id: number | string): Promise<boolean> {
        const { error } = await supabase
            .from('allowed_kits')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting kit", error);
            return false;
        }
        return true;
    },

    async getKitsStats(): Promise<{ total: number, claimed: number, available: number }> {
        const { count: total } = await supabase.from('allowed_kits').select('*', { count: 'exact', head: true });
        const { count: claimed } = await supabase.from('allowed_kits').select('*', { count: 'exact', head: true }).eq('status', 'claimed');

        return {
            total: total || 0,
            claimed: claimed || 0,
            available: (total || 0) - (claimed || 0)
        };
    }
};
