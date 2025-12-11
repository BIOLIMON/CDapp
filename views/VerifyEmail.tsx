import React from 'react';
import { Mail, CheckCircle, ArrowRight } from 'lucide-react';
import { UserProfile } from '../types';

interface VerifyEmailProps {
    user: UserProfile;
    onConfirm: () => void;
}

const VerifyEmail: React.FC<VerifyEmailProps> = ({ user, onConfirm }) => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                    <Mail size={40} />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Revisa tu correo!</h2>
                <p className="text-gray-500 mb-6">
                    Hemos enviado un enlace de confirmación a <span className="font-semibold text-gray-800">{user.email}</span>.
                </p>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8 text-sm text-blue-800 text-left">
                    <p className="font-bold mb-1">Importante:</p>
                    <p>Revisa tu bandeja de entrada (y spam). Debes hacer clic en el enlace que te enviamos para activar tu cuenta.</p>
                </div>

                <div className="text-xs text-gray-500 mb-4">
                    Una vez confirmado, la aplicación te redirigirá automáticamente o puedes iniciar sesión.
                </div>

                <button
                    onClick={onConfirm}
                    className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
                >
                    <CheckCircle size={20} />
                    Ya confirmé mi correo
                </button>

                <p className="mt-6 text-sm text-gray-400">
                    ¿No recibiste el correo? <span className="text-primary font-medium cursor-pointer hover:underline">Reenviar</span>
                </p>
            </div>
        </div>
    );
};

export default VerifyEmail;