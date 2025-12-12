import React, { useState } from 'react';
import { UserProfile, ExperimentEntry, PotId, PotData, PotImages } from '../types';
import { POT_DEFINITIONS, STATUS_OPTIONS } from '../constants';
import { Save, X, Camera, AlertTriangle, Trash2 } from 'lucide-react';
import { api } from '../services/api';

interface EntryFormProps {
    user: UserProfile;
    onSave: (entry: ExperimentEntry) => void;
    onCancel: () => void;
    initialEntry?: ExperimentEntry;
}

const EntryForm: React.FC<EntryFormProps> = ({ user, onSave, onCancel, initialEntry }) => {
    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(initialEntry ? initialEntry.date : today);
    const [activeTab, setActiveTab] = useState<PotId>('1');
    const [generalNotes, setGeneralNotes] = useState(initialEntry ? initialEntry.generalNotes : '');

    const initialPotData: PotData = {
        weight: '',
        height: '',
        visualStatus: 'Germinación',
        ph: '',
        notes: '',
        images: {}
    };

    const getInitialPots = () => {
        if (!initialEntry) {
            return {
                '1': { ...initialPotData },
                '2': { ...initialPotData },
                '3': { ...initialPotData },
                '4': { ...initialPotData },
            };
        }
        // Merge initialEntry pots with default structure (in case missing pots? unlikely)
        // Ensure all 4 keys exist
        return {
            '1': initialEntry.pots['1'] || { ...initialPotData },
            '2': initialEntry.pots['2'] || { ...initialPotData },
            '3': initialEntry.pots['3'] || { ...initialPotData },
            '4': initialEntry.pots['4'] || { ...initialPotData },
        };
    };

    const [pots, setPots] = useState<{ [key in PotId]: PotData }>(getInitialPots());

    const calculateDayNumber = (entryDate: string) => {
        const start = new Date(user.startDate);
        const current = new Date(entryDate);
        const diff = current.getTime() - start.getTime();
        return Math.floor(diff / (1000 * 3600 * 24));
    };

    const dayNumber = calculateDayNumber(date);

    const handlePotChange = (id: PotId, field: keyof PotData, value: any) => {
        setPots(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    };

    const handleImageUpload = async (id: PotId, type: keyof PotImages, file: File | null) => {
        if (!file) return;

        try {
            const timestamp = Date.now();
            const path = `${user.id}/${timestamp}_${id}_${type}.${file.name.split('.').pop()}`;

            // Ideally show a spinner here
            const publicUrl = await api.uploadImage(file, path);

            setPots(prev => ({
                ...prev,
                [id]: {
                    ...prev[id],
                    images: {
                        ...prev[id].images,
                        [type]: publicUrl
                    }
                }
            }));
        } catch (error) {
            console.error("Error uploading image", error);
            alert("Error al subir imagen");
        }
    };

    const removeImage = (id: PotId, type: keyof PotImages) => {
        setPots(prev => {
            const newImages = { ...prev[id].images };
            delete newImages[type];
            return {
                ...prev,
                [id]: {
                    ...prev[id],
                    images: newImages
                }
            };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation Logic
        const errors: string[] = [];
        const potIds: PotId[] = ['1', '2', '3', '4'];

        potIds.forEach(id => {
            const pot = pots[id];
            const label = POT_DEFINITIONS.find(p => p.id === id)?.label || `Maceta ${id}`;

            // Check mandatory fields
            if (pot.weight === '' || pot.weight === null || isNaN(Number(pot.weight))) {
                errors.push(`${label}: Peso es obligatorio.`);
            }
            if (pot.height === '' || pot.height === null || isNaN(Number(pot.height))) {
                errors.push(`${label}: Altura es obligatoria.`);
            }
            if (!pot.images.front) {
                errors.push(`${label}: Foto de Frente es obligatoria.`);
            }
            // Visual status is always set due to default, but ensures it's valid
            if (!pot.visualStatus) {
                errors.push(`${label}: Estado Visual es obligatorio.`);
            }
        });

        if (errors.length > 0) {
            alert("Por favor completa los campos obligatorios:\n\n" + errors.join('\n'));
            return;
        }

        const entry: ExperimentEntry = {
            id: initialEntry ? initialEntry.id : Date.now().toString(),
            userId: user.id,
            date,
            dayNumber,
            pots,
            generalNotes,
        };
        onSave(entry);
    };

    const renderPhotoSlot = (potId: PotId, type: keyof PotImages, label: string) => {
        const hasImage = !!pots[potId].images[type];

        return (
            <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wide">{label}</span>
                <div className={`relative w-full aspect-square rounded-lg border-2 border-dashed flex items-center justify-center transition-all ${hasImage ? 'border-primary bg-white' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
                    {hasImage ? (
                        <>
                            <img src={pots[potId].images[type]} alt={label} className="w-full h-full object-cover rounded-lg" />
                            <button
                                type="button"
                                onClick={() => removeImage(potId, type)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                            >
                                <Trash2 size={12} />
                            </button>
                        </>
                    ) : (
                        <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center text-gray-400">
                            <Camera size={24} />
                            <span className="text-[10px] mt-1">Subir</span>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleImageUpload(potId, type, e.target.files?.[0] || null)}
                            />
                        </label>
                    )}
                </div>
            </div>
        );
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full bg-gray-50">
            {/* Top Controls */}
            <div className="bg-white p-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
                <button type="button" onClick={onCancel} className="text-gray-500 hover:text-gray-700">
                    <X size={24} />
                </button>
                <h2 className="font-bold text-gray-800">{initialEntry ? `Editar Registro (Día ${dayNumber})` : `Nuevo Registro (Día ${dayNumber})`}</h2>
                <button type="submit" className="text-primary font-bold flex items-center gap-1 hover:text-green-700">
                    <Save size={20} />
                    <span className="hidden sm:inline">Guardar</span>
                </button>
            </div>

            <div className="p-4 space-y-6">
                {/* Date Picker */}
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Medición</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary p-2 border"
                    />
                </div>

                {/* Pot Tabs */}
                <div>
                    <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
                        {POT_DEFINITIONS.map(def => (
                            <button
                                key={def.id}
                                type="button"
                                onClick={() => setActiveTab(def.id as PotId)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border ${activeTab === def.id
                                    ? 'bg-primary text-white border-primary shadow-md'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                {def.label}
                            </button>
                        ))}
                    </div>

                    {/* Active Pot Form */}
                    <div className={`mt-2 bg-white rounded-xl shadow-sm border p-5 ${POT_DEFINITIONS.find(p => p.id === activeTab)?.color}`}>
                        <div className="mb-4">
                            <h3 className="font-bold text-lg text-gray-800">{POT_DEFINITIONS.find(p => p.id === activeTab)?.label}</h3>
                            <p className="text-xs text-gray-600">{POT_DEFINITIONS.find(p => p.id === activeTab)?.desc}</p>
                        </div>

                        <div className="space-y-6">
                            {/* Measurements */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Peso (g) <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        placeholder="0.0"
                                        step="0.1"
                                        required
                                        value={pots[activeTab].weight}
                                        onChange={(e) => handlePotChange(activeTab, 'weight', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Altura (cm) <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        placeholder="0.0"
                                        step="0.1"
                                        required
                                        value={pots[activeTab].height}
                                        onChange={(e) => handlePotChange(activeTab, 'height', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Estado Visual <span className="text-red-500">*</span></label>
                                <select
                                    value={pots[activeTab].visualStatus}
                                    onChange={(e) => handlePotChange(activeTab, 'visualStatus', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
                                >
                                    {STATUS_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Photo Evidence Section */}
                            <div className="bg-white bg-opacity-50 p-3 rounded-lg border border-gray-200">
                                <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Camera size={14} />
                                    Evidencia Fotográfica <span className="text-red-500 text-[10px]">(Frente obligatorio)</span>
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {renderPhotoSlot(activeTab, 'front', 'Frente')}
                                    {renderPhotoSlot(activeTab, 'top', 'Arriba')}
                                    {renderPhotoSlot(activeTab, 'profile', 'Perfil')}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Observaciones</label>
                                <textarea
                                    rows={2}
                                    value={pots[activeTab].notes}
                                    onChange={(e) => handlePotChange(activeTab, 'notes', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="¿Hojas amarillas? ¿Sustrato seco?"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* General Notes */}
                <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notas Generales</label>
                        <textarea
                            rows={3}
                            value={generalNotes}
                            onChange={(e) => setGeneralNotes(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Comentarios sobre el clima, temperatura, o cualquier evento inusual."
                        />
                    </div>
                </div>

                {/* Alerts based on Logic */}
                {dayNumber < 21 && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="h-5 w-5 text-blue-500" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-blue-700">
                                    Estás en la <strong>Fase de Crecimiento (Día 0-21)</strong>.
                                    Recuerda: Riego normal para TODOS y SIN fertilizante aún.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </form>
    );
};

export default EntryForm;