import React from 'react';
import { Mail, ArrowRight } from 'lucide-react';
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

                <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Todo listo!</h2>
                <p className="text-gray-500 mb-6">
                    Tu cuenta ha sido creada. Hemos enviado un enlace de confirmación a <span className="font-semibold text-gray-800">{user.email}</span>.
                </p>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8 text-sm text-blue-800 text-left">
                    <p className="font-bold mb-1">Pasos Siguientes:</p>
                    <ol className="list-decimal ml-4 space-y-1">
                        <li>Ve a tu correo y haz clic en "Confirmar".</li>
                        <li>Vuelve aquí e inicia sesión.</li>
                        <li>¡Tu kit se vinculará automáticamente!</li>
                    </ol>
                </div>

                <button
                    onClick={onConfirm}
                    className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-sm"
                >
                    <ArrowRight size={20} />
                    Ir al Inicio de Sesión
                </button>

                <p className="mt-6 text-sm text-gray-400">
                    ¿No recibiste el correo? <span className="text-primary font-medium cursor-pointer hover:underline">Reenviar</span>
                </p>
            </div>
        </div>
    );
};

export default VerifyEmail;