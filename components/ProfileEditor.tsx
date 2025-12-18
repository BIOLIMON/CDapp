import React, { useState, useRef } from 'react';
import { X, Camera, Save, User, Loader } from 'lucide-react';
import { UserProfile } from '../types';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';

interface ProfileEditorProps {
    user: UserProfile;
    onClose: () => void;
    onUpdate: () => void; // Trigger a reload of the user profile in parent
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ user, onClose, onUpdate }) => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Direct upload to 'avatars' bucket (Storage RLS configured for this)

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl: avatarUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Update Profile immediately
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar: avatarUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            onUpdate(); // Refresh context
        } catch (error) {
            console.error("Error uploading avatar:", error);
            alert("Error al subir la imagen. Intenta nuevamente.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="bg-primary px-6 py-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg">Perfil</h3>
                    <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 flex flex-col items-center gap-6">
                    {/* Avatar Section */}
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center relative">
                            {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                <User size={48} className="text-gray-400" />
                            )}

                            {uploading && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                                    <Loader size={24} className="animate-spin" />
                                </div>
                            )}
                        </div>

                        <button
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-0 right-0 bg-accent text-gray-800 p-2 rounded-full shadow-md hover:bg-yellow-400 transition transform group-hover:scale-110 active:scale-95"
                            title="Cambiar Foto"
                        >
                            <Camera size={16} />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* Info Section (Read Only) */}
                    <div className="w-full space-y-4">
                        <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-600 space-y-2 border border-gray-100">
                            <div className="flex justify-between border-b border-gray-200 pb-2">
                                <span className="font-semibold text-gray-700">Nombre:</span>
                                <span>{user.name}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-200 pb-2">
                                <span className="font-semibold text-gray-700">Email:</span>
                                <span className="truncate max-w-[180px]" title={user.email}>{user.email}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-200 pb-2">
                                <span className="font-semibold text-gray-700">Kit:</span>
                                <span className="font-mono bg-white px-2 rounded border border-gray-200 text-xs flex items-center">{user.kitCode}</span>
                            </div>
                            <div className="flex justify-between pt-1">
                                <span className="font-semibold text-gray-700">Rol:</span>
                                <span className="capitalize text-primary font-bold">{user.role === 'god' ? 'Administrador' : 'Participante'}</span>
                            </div>
                        </div>
                    </div>

                    {/* No Actions needed anymore, auto-save */}
                </div>
            </div>
        </div>
    );
};

export default ProfileEditor;
