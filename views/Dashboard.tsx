import React from 'react';
import { UserProfile, ExperimentEntry, PotId } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, Droplets, FlaskConical, Scale } from 'lucide-react';

interface DashboardProps {
  user: UserProfile;
  entries: ExperimentEntry[];
  onViewChange: (view: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, entries, onViewChange }) => {
  const calculateDays = () => {
    const start = new Date(user.startDate);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 3600 * 24));
  };

  const currentDay = calculateDays();
  const isExperimentPhase = currentDay >= 21;

  // Prepare chart data
  const chartData = [...entries].reverse().map(entry => ({
    day: entry.dayNumber,
    p1: Number(entry.pots['1'].weight) || null,
    p2: Number(entry.pots['2'].weight) || null,
    p3: Number(entry.pots['3'].weight) || null,
    p4: Number(entry.pots['4'].weight) || null,
  }));

  // Prepare height data
  const heightData = [...entries].reverse().map(entry => ({
    day: entry.dayNumber,
    p1: Number(entry.pots['1'].height) || null,
    p2: Number(entry.pots['2'].height) || null,
    p3: Number(entry.pots['3'].height) || null,
    p4: Number(entry.pots['4'].height) || null,
  }));

  return (
    <div className="p-4 space-y-6">
      {/* Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-24 h-24 transform translate-x-8 -translate-y-8 rounded-full opacity-10 ${isExperimentPhase ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
        
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Estado del Experimento</p>
            <h2 className="text-3xl font-bold text-gray-800">Día {currentDay}</h2>
            <p className={`text-sm font-medium mt-1 ${isExperimentPhase ? 'text-orange-600' : 'text-blue-600'}`}>
              {isExperimentPhase ? 'Fase Experimental (Tratamientos Activos)' : 'Fase de Crecimiento Inicial'}
            </p>
          </div>
          <Calendar className="text-gray-400" size={24} />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="bg-gray-50 p-3 rounded-lg flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                    <Droplets size={16} />
                </div>
                <div>
                    <p className="text-[10px] text-gray-500">Riego</p>
                    <p className="text-xs font-bold">{isExperimentPhase ? 'Diferenciado' : 'Normal'}</p>
                </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-full text-purple-600">
                    <FlaskConical size={16} />
                </div>
                <div>
                    <p className="text-[10px] text-gray-500">Fertilizante</p>
                    <p className="text-xs font-bold">{isExperimentPhase ? 'Semanal (Macetas F)' : 'Ninguno'}</p>
                </div>
            </div>
        </div>
      </div>

      {/* Quick Actions */}
      {entries.length === 0 ? (
         <div className="text-center p-8 bg-white rounded-xl border-2 border-dashed border-gray-200">
            <Scale className="mx-auto text-gray-300 mb-3" size={48} />
            <h3 className="text-lg font-medium text-gray-700">Sin registros aún</h3>
            <p className="text-sm text-gray-500 mb-4">Comienza registrando el peso inicial de tus macetas.</p>
            <button 
                onClick={() => onViewChange('form')}
                className="bg-primary text-white px-6 py-2 rounded-full font-medium hover:bg-green-700 transition"
            >
                Crear primer registro
            </button>
         </div>
      ) : (
        <>
            {/* Weight Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Scale size={20} className="text-primary" />
                    Historial de Peso (g)
                </h3>
                <div className="h-64 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                        <CartesianGrid stroke="#f3f4f6" vertical={false} />
                        <XAxis dataKey="day" stroke="#9ca3af" tick={{fontSize: 10}} tickFormatter={(val) => `Día ${val}`} />
                        <YAxis stroke="#9ca3af" tick={{fontSize: 10}} domain={['auto', 'auto']} />
                        <Tooltip 
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} 
                            labelStyle={{color: '#6b7280', marginBottom: '4px'}}
                        />
                        <Legend wrapperStyle={{paddingTop: '10px'}} />
                        <Line type="monotone" dataKey="p1" name="M1 (RF)" stroke="#10B981" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} />
                        <Line type="monotone" dataKey="p2" name="M2 (SF)" stroke="#F59E0B" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} />
                        <Line type="monotone" dataKey="p3" name="M3 (R)" stroke="#3B82F6" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} />
                        <Line type="monotone" dataKey="p4" name="M4 (S)" stroke="#F97316" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} />
                    </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Height Chart - Only show if data exists */}
            {heightData.some(d => d.p1 || d.p2 || d.p3 || d.p4) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="text-primary text-xl">📏</span>
                        Historial de Altura (cm)
                    </h3>
                    <div className="h-64 w-full text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={heightData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                            <CartesianGrid stroke="#f3f4f6" vertical={false} />
                            <XAxis dataKey="day" stroke="#9ca3af" tick={{fontSize: 10}} tickFormatter={(val) => `Día ${val}`} />
                            <YAxis stroke="#9ca3af" tick={{fontSize: 10}} domain={['auto', 'auto']} />
                            <Tooltip 
                                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} 
                                labelStyle={{color: '#6b7280', marginBottom: '4px'}}
                            />
                            <Line type="monotone" dataKey="p1" name="M1 (RF)" stroke="#10B981" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="p2" name="M2 (SF)" stroke="#F59E0B" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="p3" name="M3 (R)" stroke="#3B82F6" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="p4" name="M4 (S)" stroke="#F97316" strokeWidth={2} dot={false} />
                        </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </>
      )}

      {/* Recent Entries List */}
      <div className="pb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-3">Registros Recientes</h3>
        <div className="space-y-3">
            {entries.slice(0, 5).map(entry => (
                <div key={entry.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center">
                    <div>
                        <p className="font-bold text-gray-800">Día {entry.dayNumber}</p>
                        <p className="text-xs text-gray-500">{new Date(entry.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                         <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {Object.values(entry.pots).filter(p => p.weight !== '').length} macetas medidas
                         </span>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;