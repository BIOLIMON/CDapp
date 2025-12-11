import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { UserProfile, ExperimentEntry, Kit } from '../types';
import { Download, Users, FileText, Search, Upload, CheckCircle, AlertTriangle, Edit, Trash2, Save, X } from 'lucide-react';
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

    // Kit Management State
    const [kits, setKits] = useState<Kit[]>([]);
    const [editingKitId, setEditingKitId] = useState<string | number | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [kitFilter, setKitFilter] = useState('');

    const { user: currentUser } = useAuth();
    const isGod = currentUser?.role === 'god';

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
            loadKits();
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

    const loadKits = async () => {
        try {
            const data = await api.getAllKits();
            setKits(data);
        } catch (error) {
            console.error("Error loading kits", error);
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

                // Indices based on User Request:
                // Col 0: Kit Number (label)
                // Col 1: Codygo Unico (code)
                // Col 2: Variedad (variety)
                const labelIndex = 0;
                const codeIndex = 1;
                const varietyIndex = 2;

                // Extract codes
                const kitsToUpload = data.slice(1) // Skip header
                    .filter(row => row[codeIndex] && (typeof row[codeIndex] === 'string' || typeof row[codeIndex] === 'number'))
                    .map(row => ({
                        code: String(row[codeIndex]).trim().toUpperCase(),
                        kit_number: row[labelIndex] ? String(row[labelIndex]).trim() : undefined,
                        variety: row[varietyIndex] ? String(row[varietyIndex]).trim() : undefined,
                        batch_id: `UPLOAD_${new Date().toISOString().split('T')[0]}`
                    }))
                    .filter(item => item.code.length > 2); // Basic filter

                if (kitsToUpload.length === 0) {
                    alert("No se encontraron códigos válidos en la columna 2.");
                    setIsUploading(false);
                    return;
                }

                if (confirm(`Se encontraron ${kitsToUpload.length} kits. ¿Desea importarlos a la base de datos?`)) {
                    // Force using standard authenticated upsert to ensure new columns (kit_number, variety) are handled
                    // effectively bypassing the potentially outdated RPC 'admin_upload_kits'
                    const result = await api.uploadKits(kitsToUpload);

                    if (result.success) {
                        alert(`Éxito: Se procesaron ${result.count || kitsToUpload.length} registros.`);
                        loadKitStats();
                        loadKits();
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

    // Editor Handlers
    const startEditing = (kit: any) => {
        setEditingKitId(kit.id);
        setEditForm({ ...kit });
    };

    const cancelEditing = () => {
        setEditingKitId(null);
        setEditForm({});
    };

    const saveKit = async () => {
        if (!editingKitId) return;
        try {
            const success = await api.updateKit(editingKitId, editForm);
            if (success) {
                setKits(kits.map(k => k.id === editingKitId ? { ...k, ...editForm } : k));
                setEditingKitId(null);
                setEditForm({});
            } else {
                alert("Error al actualizar el kit.");
            }
        } catch (error) {
            console.error("Error updating kit", error);
            alert("Error al actualizar el kit.");
        }
    };

    const deleteKit = async (id: number | string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este kit? Esta acción no se puede deshacer.")) return;
        try {
            const success = await api.deleteKit(id);
            if (success) {
                setKits(kits.filter(k => k.id !== id));
                loadKitStats();
            } else {
                alert("Error al eliminar el kit.");
            }
        } catch (error) {
            console.error("Error deleting kit", error);
        }
    };

    const toggleAdminRole = async (user: UserProfile) => {
        if (!isGod) return;

        const isPromoting = user.role === 'user';
        const action = isPromoting ? 'promover a Admin' : 'revocar permisos de Admin';

        if (!confirm(`¿Estás seguro de que deseas ${action} a ${user.name}?`)) return;

        try {
            const success = isPromoting
                ? await api.promoteToAdmin(user.id)
                : await api.revokeAdmin(user.id);

            if (success) {
                // Update local state
                setUsers(users.map(u => u.id === user.id ? { ...u, role: isPromoting ? 'admin' : 'user' } : u));
                alert(`Usuario ${isPromoting ? 'promovido' : 'degradado'} con éxito.`);
            } else {
                alert("Error al cambiar el rol del usuario.");
            }
        } catch (error) {
            console.error("Error toggling role", error);
            alert("Error al cambiar el rol.");
        }
    };

    const filteredKits = kits.filter(k =>
        (k.code || '').toLowerCase().includes(kitFilter.toLowerCase()) ||
        (k.kit_number || '').toLowerCase().includes(kitFilter.toLowerCase()) ||
        (k.variety || '').toLowerCase().includes(kitFilter.toLowerCase())
    );

    return (
        <div className="p-4 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        Panel de Administración
                        {isGod && (
                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full border border-yellow-300 font-extrabold shadow-sm">
                                GOD MODE
                            </span>
                        )}
                    </h2>
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
                                        {isGod && <th className="px-4 py-3 text-right">Acciones</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                                            <td className="px-4 py-3 font-mono text-gray-600">{u.kitCode}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.role === 'god' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                                                    u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                                        'bg-green-100 text-green-700'
                                                    }`}>
                                                    {u.role.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-orange-600">{u.score}</td>
                                            <td className="px-4 py-3 text-right text-gray-500">{new Date(u.startDate).toLocaleDateString()}</td>
                                            {isGod && (
                                                <td className="px-4 py-3 text-right">
                                                    {u.role !== 'god' && (
                                                        <button
                                                            onClick={() => toggleAdminRole(u)}
                                                            className={`text-xs px-3 py-1 rounded-full border ${u.role === 'admin'
                                                                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                                                                    : 'border-blue-200 text-blue-600 hover:bg-blue-50'
                                                                }`}
                                                        >
                                                            {u.role === 'admin' ? 'Revocar Admin' : 'Hacer Admin'}
                                                        </button>
                                                    )}
                                                </td>
                                            )}
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
                            El sistema buscará: <br />
                            <strong>Columna 1:</strong> Número de Kit (Etiqueta) <br />
                            <strong>Columna 2:</strong> Código Único (Obligatorio) <br />
                            <strong>Columna 3:</strong> Variedad de Tomate
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

                    {/* Kit Table Editor */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">Gestión de Kits</h3>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar kit, variedad o código..."
                                    className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={kitFilter}
                                    onChange={(e) => setKitFilter(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium">
                                    <tr>
                                        <th className="px-4 py-3">Código</th>
                                        <th className="px-4 py-3">Etiqueta/Num</th>
                                        <th className="px-4 py-3">Variedad</th>
                                        <th className="px-4 py-3">Estado</th>
                                        <th className="px-4 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredKits.map(kit => (
                                        <tr key={kit.id} className="hover:bg-gray-50">
                                            {editingKitId === kit.id ? (
                                                // Edit Mode
                                                <>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            className="w-full border rounded px-2 py-1"
                                                            value={editForm.code}
                                                            onChange={e => setEditForm({ ...editForm, code: e.target.value })}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            className="w-full border rounded px-2 py-1"
                                                            value={editForm.kit_number || ''}
                                                            onChange={e => setEditForm({ ...editForm, kit_number: e.target.value })}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            className="w-full border rounded px-2 py-1"
                                                            value={editForm.variety || ''}
                                                            onChange={e => setEditForm({ ...editForm, variety: e.target.value })}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <select
                                                            className="w-full border rounded px-2 py-1 bg-white"
                                                            value={editForm.status}
                                                            onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                                        >
                                                            <option value="available">Disponible</option>
                                                            <option value="claimed">Asignado</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                        <button
                                                            onClick={saveKit}
                                                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                            title="Guardar"
                                                        >
                                                            <Save size={18} />
                                                        </button>
                                                        <button
                                                            onClick={cancelEditing}
                                                            className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                                                            title="Cancelar"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </td>
                                                </>
                                            ) : (
                                                // View Mode
                                                <>
                                                    <td className="px-4 py-3 font-mono text-gray-600">{kit.code}</td>
                                                    <td className="px-4 py-3">{kit.kit_number || '-'}</td>
                                                    <td className="px-4 py-3">{kit.variety || '-'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${kit.status === 'claimed' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                                            {kit.status === 'claimed' ? 'ASIGNADO' : 'DISPONIBLE'}
                                                        </span>
                                                        {kit.claimed_by && <span className="text-xs text-gray-400 ml-2 block truncate max-w-[100px]">{kit.claimed_by}</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                        <button
                                                            onClick={() => startEditing(kit)}
                                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                            title="Editar"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteKit(kit.id)}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                    {filteredKits.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                                No se encontraron kits.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;