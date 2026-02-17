
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, GlobalStats } from '../types';

import { api } from '../services/api';
import { Sprout, QrCode, X, Droplets, FlaskConical, Users, ArrowRight, Leaf, Trophy, Camera, LogIn, ChevronRight } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface OnboardingProps {
    onSave: (profile: Partial<UserProfile>) => void;
    onLoginRequest: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onSave, onLoginRequest }) => {
    const [name, setName] = useState('');
    const [kitCode, setKitCode] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [isScanning, setIsScanning] = useState(false);
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [leaderboard, setLeaderboard] = useState<{ name: string, score: number }[]>([]);

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const formRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const globalData = await api.getGlobalStats();
                setStats(globalData);
                setLeaderboard(globalData.leaderboard);
            } catch (error) {
                console.error("Error loading stats", error);
            }
        };
        fetchStats();
    }, []);

    const scrollToForm = () => {
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name && kitCode && startDate) {
            // Validate Kit Code with API
            const normalizedCode = kitCode.trim().toUpperCase();
            try {
                if (normalizedCode.length < 6 || !normalizedCode.startsWith('CVPL-')) {
                    alert("El código debe tener el formato CVPL-XXX (ej. CVPL-001)");
                    return;
                }

                const { available, error } = await api.checkKitAvailability(normalizedCode);

                if (error) {
                    console.error("API Error checking kit:", error);
                    if (error === 'NOT_FOUND' || error.message?.includes('PGRST116')) { // Catch 406/Not Found
                        alert("Código de kit no encontrado. Verifique que esté escrito correctamente (ej. CVPL-001).");
                    } else {
                        alert(`Error verificando kit: ${JSON.stringify(error.message || error)}`);
                    }
                    return;
                }

                if (!available) {
                    alert("El código del kit ya ha sido utilizado o no está disponible.");
                    return;
                }

                onSave({
                    name,
                    kitCode: normalizedCode,
                    startDate,
                    role: 'user',
                });
            } catch (error) {
                console.error("Unexpected error validando kit", error);
                alert(`Error inesperado: ${JSON.stringify(error)}`);
            }
        }
    };

    // QR Scanner Logic
    useEffect(() => {
        if (isScanning) {
            const startScanner = async () => {
                try {
                    const html5QrCode = new Html5Qrcode("reader");
                    scannerRef.current = html5QrCode;

                    await html5QrCode.start(
                        { facingMode: "environment" },
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 250 },
                        },
                        (decodedText) => {
                            setKitCode(decodedText);
                            stopScanner();
                        },
                        (errorMessage) => {
                        }
                    );
                } catch (err) {
                    console.error("Error starting scanner", err);
                    setIsScanning(false);
                }
            };
            startScanner();
        } else {
            stopScanner();
        }

        return () => {
            if (isScanning) stopScanner();
        };
    }, [isScanning]);

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (e) {
                console.log("Scanner stop error", e);
            }
            scannerRef.current = null;
        }
        setIsScanning(false);
    };

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">

            {/* --- HERO SECTION --- */}
            <div className="relative bg-gradient-to-br from-green-900 to-primary text-white overflow-hidden">
                <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                    <Sprout size={400} />
                </div>

                <div className="max-w-4xl mx-auto px-6 py-20 relative z-10">
                    <nav className="flex justify-between items-center mb-12">
                        <a
                            href="https://phytolearning.cl/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-green-800/50 backdrop-blur-sm px-4 py-1 rounded-full text-green-200 text-sm font-medium border border-green-700 hover:bg-green-700/50 transition-colors cursor-pointer"
                        >
                            <Leaf size={16} />
                            <span>PhytoLearning</span>
                        </a>
                        <button
                            onClick={onLoginRequest}
                            className="flex items-center gap-2 text-green-100 hover:text-white font-medium transition"
                        >
                            <LogIn size={18} />
                            Iniciar Sesión
                        </button>
                    </nav>

                    <div className="text-center md:text-left">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                            CultivaDatos: <br />
                            <span className="text-green-300">El Futuro de la Agricultura</span>
                        </h1>
                        <p className="text-lg md:text-xl text-green-100 mb-8 max-w-2xl leading-relaxed">
                            Únete al experimento ciudadano masivo para entender cómo el cambio climático y la fertilización afectan a nuestros cultivos de tomate.
                        </p>
                        <div className="flex flex-col md:flex-row gap-4 justify-center md:justify-start">
                            <button
                                onClick={scrollToForm}
                                className="bg-accent hover:bg-yellow-400 text-green-900 font-bold py-4 px-8 rounded-full shadow-lg transition transform hover:scale-105 flex items-center justify-center gap-2"
                            >
                                Comenzar Experimento
                                <ArrowRight size={20} />
                            </button>
                            <button
                                onClick={onLoginRequest}
                                className="bg-green-800/50 hover:bg-green-800/70 border border-green-400 text-white font-bold py-4 px-8 rounded-full shadow-lg transition flex items-center justify-center gap-2"
                            >
                                Ya tengo cuenta
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- IMPACT STATS --- */}
            {stats && (
                <div className="bg-green-50 border-y border-green-100">
                    <div className="max-w-4xl mx-auto px-6 py-8">
                        <h3 className="text-center text-green-800 font-bold mb-6 flex items-center justify-center gap-2">
                            <Users size={20} /> Impacto Comunitario
                        </h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-4 bg-white rounded-lg shadow-sm">
                                <div className="text-3xl font-bold text-primary">{stats.totalUsers}</div>
                                <div className="text-xs text-gray-500 uppercase tracking-wide">Agricultores</div>
                            </div>
                            <div className="p-4 bg-white rounded-lg shadow-sm">
                                <div className="text-3xl font-bold text-blue-600">{stats.totalEntries}</div>
                                <div className="text-xs text-gray-500 uppercase tracking-wide">Mediciones</div>
                            </div>
                            <div className="p-4 bg-white rounded-lg shadow-sm">
                                <div className="text-3xl font-bold text-orange-500">{stats.totalPhotos}</div>
                                <div className="text-xs text-gray-500 uppercase tracking-wide">Fotos</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- INFO SECTIONS --- */}
            <div className="max-w-4xl mx-auto px-6 py-16">
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-gray-800">¿De qué trata?</h2>

                        <div className="flex gap-4">
                            <div className="bg-blue-100 p-3 h-fit rounded-lg text-blue-600"><Droplets size={24} /></div>
                            <div>
                                <h3 className="font-bold text-gray-800">Sequía y Clima</h3>
                                <p className="text-sm text-gray-600">Investigamos cómo la falta de agua afecta el desarrollo para crear cultivos resilientes.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="bg-purple-100 p-3 h-fit rounded-lg text-purple-600"><FlaskConical size={24} /></div>
                            <div>
                                <h3 className="font-bold text-gray-800">Nutrición (KNO₃)</h3>
                                <p className="text-sm text-gray-600">Analizamos el efecto del Nitrato de Potasio en condiciones controladas.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="bg-orange-100 p-3 h-fit rounded-lg text-orange-600"><Camera size={24} /></div>
                            <div>
                                <h3 className="font-bold text-gray-800">Evidencia Visual</h3>
                                <p className="text-sm text-gray-600">Registra 3 fotos por maceta (Frente, Arriba, Perfil) para un análisis completo.</p>
                            </div>
                        </div>
                    </div>

                    {/* LEADERBOARD */}
                    <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-100">
                        <div className="flex items-center gap-2 mb-4">
                            <Trophy className="text-yellow-600" size={24} />
                            <h3 className="font-bold text-gray-800 text-lg">Top Agricultores</h3>
                        </div>
                        <div className="space-y-3">
                            {leaderboard.map((user, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <span className={`font-bold w-6 text-center ${idx === 0 ? 'text-yellow-500 text-xl' : 'text-gray-400'}`}>
                                            {idx + 1}
                                        </span>
                                        <span className="font-medium text-gray-700">{user.name}</span>
                                    </div>
                                    <span className="font-bold text-primary text-sm">{user.score} pts</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-center text-xs text-gray-500 mt-4">
                            ¡Sé constante y sube fotos para ganar puntos!
                        </p>
                    </div>
                </div>
            </div>

            {/* --- LOGIN / FORM SECTION --- */}
            <div ref={formRef} className="bg-gray-50 py-16 px-6">
                <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 border border-gray-100 relative">
                    <div className="text-center mb-8">
                        <div className="inline-block p-3 bg-green-100 rounded-full text-primary mb-3">
                            <Sprout size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Configura tu Kit</h2>
                        <p className="text-gray-500 text-sm">Paso 1 de 3: Identificación del Kit</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Participante</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                placeholder="Ej. Juan Pérez"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Código Único del Kit</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    required
                                    value={kitCode}
                                    onChange={(e) => setKitCode(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition uppercase"
                                    placeholder="CVPL-XXX"
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
                            <p className="text-xs text-gray-500 mt-1">Selecciona el día que plantaste tus semillas.</p>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-primary text-white font-bold py-4 rounded-lg hover:bg-green-700 transition-colors shadow-lg mt-2 flex justify-center items-center gap-2"
                        >
                            Siguiente Paso <ChevronRight size={18} />
                        </button>
                    </form>

                    <p className="mt-8 text-xs text-gray-400 text-center">
                        Proyecto desarrollado por PhytoLearning.<br />Apoyado por ANID e Iniciativa Científica Milenio.
                    </p>
                    <p className="text-[10px] text-gray-300 text-center mt-2">v1.1-debug</p>
                </div>
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
                            <p className="text-xs text-gray-500">Apunta la cámara al código de tu kit</p>
                        </div>
                        <div id="reader" className="w-full h-64 bg-black"></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Onboarding;