import React, { useState, useEffect } from 'react';
import { UserProfile, ExperimentEntry } from '../types';
import { api } from '../services/api';
import { ArrowLeft, Edit2, Trash2, Calendar, Sprout, Image as ImageIcon } from 'lucide-react';
import EntryForm from './EntryForm';

interface AdminUserDetailProps {
    user: UserProfile;
    onBack: () => void;
}

const AdminUserDetail: React.FC<AdminUserDetailProps> = ({ user, onBack }) => {
    const [entries, setEntries] = useState<ExperimentEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'entries' | 'photos'>('entries');
    const [editingEntry, setEditingEntry] = useState<ExperimentEntry | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await api.getUserEntries(user.id);
            setEntries(data);
        } catch (error) {
            console.error("Error loading user entries", error);
            alert("Error cargando registros del usuario");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user.id]);

    const handleEdit = (entry: ExperimentEntry) => {
        setEditingEntry(entry);
    };

    const handleDelete = async (entryId: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este registro? Esta acción es irreversible.")) return;

        try {
            await api.deleteEntry(entryId, user.id);
            await loadData();
        } catch (error) {
            console.error("Error deleting entry", error);
            alert("Error al eliminar el registro");
        }
    };

    const handleSaveEdit = async (updatedEntry: ExperimentEntry) => {
        try {
            await api.updateEntry(updatedEntry);
            await loadData();
            setEditingEntry(null);
        } catch (error) {
            console.error("Error updating entry", error);
            alert("Error al actualizar el registro");
        }
    };

    if (editingEntry) {
        return (
            <EntryForm
                user={user}
                initialEntry={editingEntry}
                onSave={handleSaveEdit}
                onCancel={() => setEditingEntry(null)}
            />
        );
    }

    // Helper to extract all photos
    const allPhotos = entries.flatMap(e =>
        Object.entries(e.pots).flatMap(([potId, potData]) =>
            Object.entries(potData.images).map(([type, url]) => ({
                date: e.date,
                day: e.dayNumber,
                potId,
                type,
                url
            }))
        )
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
                    <div className="flex items-center gap-2 text-sm text-gray-400 font-mono">
                        <span className="bg-gray-100 px-2 py-0.5 rounded">{user.kitCode}</span>
                        <span>•</span>
                        <span>{user.email}</span>
                        <span>•</span>
                        <span>Inicio: {user.startDate}</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveTab('entries')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'entries' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                >
                    <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        Registros ({entries.length})
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('photos')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'photos' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                >
                    <div className="flex items-center gap-2">
                        <ImageIcon size={16} />
                        Galería ({allPhotos.length})
                    </div>
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-400">Cargando datos...</div>
            ) : (
                <>
                    {activeTab === 'entries' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Día</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {entries.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-sm">
                                                No hay registros aún.
                                            </td>
                                        </tr>
                                    ) : (
                                        entries.map(entry => (
                                            <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-sm font-medium text-gray-800">{entry.date}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">Día {entry.dayNumber}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-1">
                                                        {['1', '2', '3', '4'].map(potId => {
                                                            const p = entry.pots[potId as any];
                                                            const hasData = p && (p.weight || p.height);
                                                            return (
                                                                <div
                                                                    key={potId}
                                                                    className={`w-2 h-8 rounded-sm ${hasData ? 'bg-green-400' : 'bg-gray-100'}`}
                                                                    title={`Maceta ${potId}: ${hasData ? 'Datos registrados' : 'Sin datos'}`}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleEdit(entry)}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(entry.id)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'photos' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {allPhotos.map((photo, idx) => (
                                <div key={idx} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                    <img src={photo.url} alt="Evidence" className="w-full h-full object-cover" />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-white text-xs font-bold">Día {photo.day}</p>
                                        <p className="text-gray-300 text-[10px] uppercase">Maceta {photo.potId} • {photo.type}</p>
                                    </div>
                                </div>
                            ))}
                            {allPhotos.length === 0 && (
                                <div className="col-span-full py-10 text-center text-gray-400">
                                    <ImageIcon className="mx-auto mb-2 opacity-50" size={32} />
                                    No hay fotos subidas.
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AdminUserDetail;
