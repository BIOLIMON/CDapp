
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { api } from '../services/api';
import { QrCode, X, ChevronRight, Sprout } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface CompleteRegistrationProps {
    user: UserProfile;
    onComplete: (updatedProfile: UserProfile) => void;
}

const CompleteRegistration: React.FC<CompleteRegistrationProps> = ({ user, onComplete }) => {
    const [kitCode, setKitCode] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [isScanning, setIsScanning] = useState(false);
    const [loading, setLoading] = useState(false);

    const scannerRef = useRef<Html5Qrcode | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!kitCode || !startDate) return;

        setLoading(true);
        try {
            const normalizedCode = kitCode.trim().toUpperCase();
            // 1. Validate Kit
            const { available } = await api.checkKitAvailability(normalizedCode);
            if (!available) {
                alert("El código del kit no es válido o ya ha sido utilizado.");
                setLoading(false);
                return;
            }

            // 2. Claim Kit
            const claimed = await api.claimKit(normalizedCode, user.id);
            if (!claimed) {
                alert("Error: El kit no pudo ser asignado (posiblemente ya fue tomado).");
                setLoading(false);
                return;
            }

            // 3. Update Profile
            const updatedProfile: UserProfile = {
                ...user,
                kitCode: normalizedCode,
                startDate: startDate
            };

            await api.createProfile(updatedProfile);

            // 4. Notify Parent
            alert("¡Kit vinculado correctamente!");
            onComplete(updatedProfile);

        } catch (error) {
            console.error("Error linking kit", error);
            alert("Hubo un error al vincular el kit. Inténtalo de nuevo.");
            setLoading(false);
        }
    };

    // QR Logic
    useEffect(() => {
        if (isScanning) {
            const startScanner = async () => {
                try {
                    const html5QrCode = new Html5Qrcode("reader-cr"); // unique ID
                    scannerRef.current = html5QrCode;
                    await html5QrCode.start(
                        { facingMode: "environment" },
                        { fps: 10, qrbox: { width: 250, height: 250 } },
                        (decodedText) => {
                            setKitCode(decodedText);
                            stopScanner();
                        },
                        () => { }
                    );
                } catch (err) {
                    console.error("Error scanner", err);
                    setIsScanning(false);
                }
            };
            startScanner();
        } else {
            stopScanner();
        }
        return () => { if (isScanning) stopScanner(); };
    }, [isScanning]);

    const stopScanner = async () => {
        if (scannerRef.current) {
            try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch (_) { }
            scannerRef.current = null;
        }
        setIsScanning(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100 relative">
                <div className="text-center mb-8">
                    <div className="inline-block p-3 bg-red-100 rounded-full text-red-500 mb-3">
                        <Sprout size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Casi listo...</h2>
                    <p className="text-gray-500 text-sm">Necesitamos vincular tu Kit para continuar.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Código Único del Kit</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                required
                                value={kitCode}
                                onChange={(e) => setKitCode(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition uppercase"
                                placeholder="CD-XXXX-XX"
                            />
                            <button
                                type="button"
                                onClick={() => setIsScanning(true)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 rounded-lg border border-gray-300 transition flex items-center justify-center"
                                title="Escanear QR"
                            >
                                <QrCode size={24} />
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha de Inicio (Siembra)</label>
                        <input
                            type="date"
                            required
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full bg-primary text-white font-bold py-4 rounded-lg hover:bg-green-700 transition-colors shadow-lg mt-2 flex justify-center items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Vinculando...' : 'Completar Registro'} <ChevronRight size={18} />
                    </button>
                </form>
            </div>

            {/* --- QR MODAL --- */}
            {isScanning && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col items-center justify-center p-4">
                    <div className="bg-white rounded-xl overflow-hidden w-full max-w-sm relative shadow-2xl">
                        <button
                            onClick={() => setIsScanning(false)}
                            className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                        >
                            <X size={24} />
                        </button>
                        <div className="p-4 text-center bg-gray-100 border-b">
                            <h3 className="font-bold text-gray-800">Escanear Código QR</h3>
                        </div>
                        <div id="reader-cr" className="w-full h-64 bg-black"></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompleteRegistration;
