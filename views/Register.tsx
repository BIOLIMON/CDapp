import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Camera, User, Mail, Lock, ChevronRight, ArrowLeft, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';

interface RegisterProps {
    tempProfile: Partial<UserProfile>;
    onComplete: (fullProfile: UserProfile) => void;
    onBack: () => void;
}

const Register: React.FC<RegisterProps> = ({ tempProfile, onComplete, onBack }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [gender, setGender] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [avatar, setAvatar] = useState<string | undefined>(undefined);
    const [error, setError] = useState('');

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const validateEmail = (email: string) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!validateEmail(email)) {
            setError('Por favor ingresa un correo electrónico válido.');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        if (!gender) {
            setError('Por favor selecciona un género.');
            return;
        }

        setLoading(true);

        try {
            // 1. Sign Up con Metadata para el Trigger
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: tempProfile.name,
                        kitCode: tempProfile.kitCode,
                        gender: gender,
                        birthDate: birthDate,
                        startDate: new Date().toISOString()
                    }
                }
            });

            if (authError) throw authError;

            // Si el registro es exitoso, el Trigger en Supabase creará el perfil.
            // Solo notificamos al componente padre.

            if (authData.user) {
                // 1. Claim the Kit explicitely (Trigger usually only handles Profile creation)
                if (tempProfile.kitCode) {
                    const claimed = await api.claimKit(tempProfile.kitCode, authData.user.id);
                    if (!claimed) {
                        console.error("Warning: Kit could not be automatically claimed. Retrying later or manual intervention needed.");
                        // We don't block the flow, but it's an issue.
                    }
                }

                const fullProfile: UserProfile = {
                    ...tempProfile as UserProfile,
                    id: authData.user.id,
                    email,
                    password: '',
                    gender,
                    birthDate,
                    kitCode: tempProfile.kitCode || '',
                    startDate: new Date().toISOString(),
                    avatar,
                    score: 0,
                    role: 'user'
                };

                // No llamamos a api.createProfile manualmente para evitar error RLS (confiamos en el Trigger para Profile)
                onComplete(fullProfile);
            }
        } catch (err: any) {
            setError(err.message || 'Error al registrar usuario.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
                <div className="bg-primary px-6 py-4 flex items-center justify-between">
                    <button onClick={onBack} className="text-green-100 hover:text-white">
                        <ArrowLeft size={24} />
                    </button>
                    <h2 className="text-white font-bold text-lg">Crear Cuenta (2/3)</h2>
                    <div className="w-6"></div> {/* Spacer */}
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="text-center mb-6">
                        <div className="relative inline-block">
                            <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                                {avatar ? (
                                    <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={40} className="text-gray-400" />
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 bg-accent p-2 rounded-full cursor-pointer shadow-md hover:bg-yellow-400 transition">
                                <Camera size={16} className="text-gray-800" />
                                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                            </label>
                        </div>
                        <h3 className="mt-2 font-medium text-gray-900">{tempProfile.name}</h3>
                        <p className="text-sm text-gray-500">{tempProfile.kitCode}</p>
                    </div>

                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={() => {
                                localStorage.setItem('pending_registration', JSON.stringify(tempProfile));
                                supabase.auth.signInWithOAuth({
                                    provider: 'google',
                                    options: { redirectTo: window.location.origin }
                                });
                            }}
                            className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-all mb-4"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Registrarse con Google se vincula a este Kit
                        </button>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">O usa tu correo</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3 border"
                                    placeholder="correo@ejemplo.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3 border"
                                    placeholder="Mínimo 6 caracteres"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Confirmar Contraseña</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Check className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className={`focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border rounded-md py-3 ${confirmPassword && password !== confirmPassword ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'}`}
                                    placeholder="Repite tu contraseña"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Fecha Nacimiento</label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <input
                                        type="date"
                                        required
                                        className="focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md py-3 border px-3"
                                        value={birthDate}
                                        onChange={e => setBirthDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Género</label>
                                <select
                                    className="mt-1 block w-full py-3 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                    value={gender}
                                    onChange={e => setGender(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>Selecciona...</option>
                                    <option value="female">Femenino</option>
                                    <option value="male">Masculino</option>
                                    <option value="non-binary">No binario</option>
                                    <option value="prefer-not">Prefiero no decir</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded">{error}</p>}

                    <button
                        type="submit"
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-primary hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition"
                    >
                        Continuar <ChevronRight className="ml-2 h-5 w-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Register;