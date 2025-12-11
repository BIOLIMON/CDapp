import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { UserProfile, ExperimentEntry } from '../types';
import { Download, Users, FileText, Search, Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx';

const AdminPanel: React.FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [entries, setEntries] = useState<ExperimentEntry[]>([]);
    const [filter, setFilter] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'kits'>('users');
    const [kitStats, setKitStats] = useState({ total: 0, claimed: 0, available: 0 });
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const fetchedUsers = await api.getAllUsers();
                const fetchedEntries = await api.getAllEntries();
                setUsers(fetchedUsers);
                setEntries(fetchedEntries);
            } catch (error) {
                console.error("Error fetching admin data", error);
            }
        };
        fetchData();
    }, []);

    const exportCSV = () => {
        // Simple CSV generation
        const headers = ['Entry ID', 'User ID', 'Date', 'Day', 'Pot 1 Weight', 'Pot 2 Weight', 'Pot 3 Weight', 'Pot 4 Weight', 'Notes'];
        const rows = entries.map(e => [
            e.id,
            e.userId,
            e.date,
            e.dayNumber,
            e.pots['1'].weight,
            e.pots['2'].weight,
            e.pots['3'].weight,
            e.pots['4'].weight,
            `"${e.generalNotes.replace(/"/g, '""')}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "cultivadatos_export.csv");
        document.body.appendChild(link);
        link.click();
    };

    // Calculate chart data (Entries per day)
    const chartData = entries.reduce((acc: any[], entry) => {
        const date = entry.date;
        const existing = acc.find(item => item.date === date);
        if (existing) {
            existing.count += 1;
        } else {
            acc.push({ date, count: 1 });
        }
        return acc;
    }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-10); // Last 10 days

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(filter.toLowerCase()) ||
        u.kitCode.toLowerCase().includes(filter.toLowerCase())
    );

    useEffect(() => {
        if (activeTab === 'kits') {
            loadKitStats();
        }
    }, [activeTab]);

    const loadKitStats = async () => {
        try {
            const stats = await api.getKitsStats();
            setKitStats(stats);
        } catch (error) {
            console.error("Error loading kit stats", error);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];

                // Read as arrays to check headers
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                if (data.length < 2) {
                    alert("El archivo parece estar vacío.");
                    setIsUploading(false);
                    return;
                }

                // Find column index for 'Código'
                // User explicitly stated: 
                // Col 0: N Caja
                // Col 1: Codygo Unico
                // Col 2: Variedad
                const codeIndex = 1;
                console.log("Using fixed column index:", codeIndex);

                // Extract codes
                const codes = data.slice(1) // Skip header
                    .map(row => row[codeIndex])
                    .filter(cell => cell && (typeof cell === 'string' || typeof cell === 'number'))
                    .map(cell => ({
                        code: String(cell).trim().toUpperCase(),
                        batch_id: `UPLOAD_${new Date().toISOString().split('T')[0]}`
                    }))
                    .filter(item => item.code.length > 2); // Basic filter

                if (codes.length === 0) {
                    alert("No se encontraron códigos en la columna 2 (índice 1).");
                    setIsUploading(false);
                    return;
                }

                // Debug log
                console.log("Codes to upload:", codes.slice(0, 5));

                if (confirm(`Se encontraron ${codes.length} códigos. ¿Desea importarlos a la base de datos?`)) {
                    // Get secret if available (for System Admin mode)
                    const secret = localStorage.getItem('admin_secret') || undefined;

                    const result = await api.uploadKits(codes, secret);
                    if (result.success) {
                        alert(`Éxito: Se procesaron códigos.`);
                        loadKitStats();
                    } else {
                        console.error("Upload error details:", result.error);
                        alert(`Error al subir kits: ${result.error?.message || JSON.stringify(result.error)}`);
                    }
                }
            } catch (error: any) {
                console.error("Error parsing Excel", error);
                alert(`Error crítico al procesar archivo: ${error.message}`);
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="p-4 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Panel de Administración</h2>
                    <p className="text-gray-500 text-sm">Gestión de usuarios y datos del proyecto</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Usuarios
                    </button>
                    <button
                        onClick={() => setActiveTab('kits')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'kits' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Kits y Códigos
                    </button>
                </div>
            </div>

            {activeTab === 'users' ? (
                <>
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={exportCSV}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm"
                        >
                            <Download size={18} /> Exportar CSV
                        </button>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 text-gray-500 mb-1">
                                <Users size={16} />
                                <span className="text-xs font-bold uppercase">Usuarios Totales</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-800">{users.length}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 text-gray-500 mb-1">
                                <FileText size={16} />
                                <span className="text-xs font-bold uppercase">Registros Totales</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-800">{entries.length}</p>
                        </div>
                    </div>

                    {/* Activity Chart */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4">Actividad Reciente (Envíos por día)</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#2F855A" radius={[4, 4, 0, 0]} name="Registros" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* User Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">Base de Usuarios</h3>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar usuario..."
                                    className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium">
                                    <tr>
                                        <th className="px-4 py-3">Nombre</th>
                                        <th className="px-4 py-3">Kit Code</th>
                                        <th className="px-4 py-3">Rol</th>
                                        <th className="px-4 py-3 text-right">Puntaje</th>
                                        <th className="px-4 py-3 text-right">Fecha Inicio</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                                            <td className="px-4 py-3 font-mono text-gray-600">{u.kitCode}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                                    {u.role.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-orange-600">{u.score}</td>
                                            <td className="px-4 py-3 text-right text-gray-500">{new Date(u.startDate).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="space-y-6">
                    {/* Kit Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 text-gray-500 mb-2">
                                <FileText size={18} />
                                <span className="text-sm font-bold uppercase">Total Kits</span>
                            </div>
                            <p className="text-4xl font-bold text-gray-800">{kitStats.total}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 text-green-600 mb-2">
                                <CheckCircle size={18} />
                                <span className="text-sm font-bold uppercase">Disponibles</span>
                            </div>
                            <p className="text-4xl font-bold text-green-600">{kitStats.available}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 text-orange-500 mb-2">
                                <Users size={18} />
                                <span className="text-sm font-bold uppercase">Asignados</span>
                            </div>
                            <p className="text-4xl font-bold text-orange-500">{kitStats.claimed}</p>
                        </div>
                    </div>

                    {/* Upload Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Carga Masiva de Kits</h3>
                        <p className="text-gray-500 mb-6 max-w-lg mx-auto">
                            Sube el archivo Excel oficial (`.xlsx`) con los códigos de los kits.
                            El sistema buscará los códigos en la <strong>primera columna</strong>.
                            Los códigos duplicados serán ignorados.
                        </p>

                        <div className="flex justify-center">
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className={`flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-lg hover:bg-green-700 shadow-md transition-transform transform hover:scale-105 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isUploading ? (
                                    <>Procesando...</>
                                ) : (
                                    <><Upload size={24} /> Subir Archivo Excel</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;