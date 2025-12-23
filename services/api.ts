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

    async updateEntry(entry: ExperimentEntry) {
        // 1. Update Entry Details
        const { error: entryError } = await supabase
            .from('experiment_entries')
            .update({
                date: entry.date,
                day_number: entry.dayNumber,
                general_notes: entry.generalNotes
            })
            .eq('id', entry.id);

        if (entryError) throw entryError;

        // 2. Update Pots (Upsert)
        // We assume we can identify pots by entry_id + pot_id. 
        // We first need to check if we can upsert based on constraint.
        // Assuming pots table has a unique constraint on (entry_id, pot_id).

        const potRows = Object.entries(entry.pots).map(([potId, potData]) => ({
            entry_id: entry.id,
            pot_id: potId,
            weight: parseFloat(String(potData.weight)) || 0,
            height: parseFloat(String(potData.height)) || 0,
            visual_status: potData.visualStatus,
            ph: parseFloat(String(potData.ph)) || 0,
            notes: potData.notes,
            images: potData.images // JSONB
        }));

        // We use upsert. The conflict target should be inferred if there's a unique constraint.
        // If not, we might need to rely on 'id' if we had it, but we don't store pot row id in frontend.
        // Alternatively, delete all pots for this entry and re-insert logic? Safer for data integrity but heavier.
        // Let's try upsert. If it fails, we know we need a constraint.
        const { error: potsError } = await supabase
            .from('pots')
            .upsert(potRows, { onConflict: 'entry_id,pot_id' }); // Explicitly trying to use this constraint

        if (potsError) throw potsError;

        return this.updateScore(entry.userId);
    },

    async deleteEntry(entryId: string, userId: string) {
        // Cascade delete should handle pots if configured in DB.
        const { error } = await supabase
            .from('experiment_entries')
            .delete()
            .eq('id', entryId);

        if (error) throw error;

        return this.updateScore(userId);
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
        const { data, error } = await supabase.rpc('get_landing_stats');

        if (error) {
            console.error("Error fetching global stats via RPC:", error);
            return {
                totalUsers: 0,
                activeExperiments: 0,
                totalEntries: 0,
                totalPhotos: 0,
                leaderboard: []
            };
        }

        return {
            totalUsers: data.totalUsers || 0,
            activeExperiments: data.activeExperiments || 0,
            totalEntries: data.totalEntries || 0,
            totalPhotos: data.totalPhotos || 0,
            leaderboard: data.leaderboard || []
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

    async checkKitAvailability(code: string): Promise<{ available: boolean, kit?: any, error?: any }> {
        console.log("Checking availability for:", code);
        const { data, error } = await supabase
            .from('allowed_kits')
            .select('*')
            .eq('code', code)
            .single();

        if (error) {
            console.error("Supabase Error checkKitAvailability:", error);
            // If code not found (code is unique), error.code is PGRST116
            if (error.code === 'PGRST116') {
                return { available: false, error: 'NOT_FOUND' };
            }
            // Other errors (RLS, Connection)
            return { available: false, error: error };
        }

        return {
            available: data.status === 'available',
            kit: data
        };
    },

    async claimKit(code: string, userId: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('allowed_kits')
            .update({
                status: 'claimed',
                claimed_by: userId,
                claimed_at: new Date().toISOString()
            })
            .eq('code', code)
            .eq('status', 'available')
            .select(); // Return updated rows

        if (error) {
            console.error("Error claiming kit", error);
            return false;
        }

        // Check if any row was actually updated
        if (!data || data.length === 0) {
            console.warn("Claim failed: Kit not available or check conditions failed.");
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
