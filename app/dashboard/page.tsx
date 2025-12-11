
"use client"

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Calendar, Droplets, FlaskConical, Scale, LogOut, Trophy } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setUser(user);

      // Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(profileData);

      // Fetch Entries
      const { data: entriesData } = await supabase
        .from('entries')
        .select('*, pots(*)')
        .eq('user_id', user.id)
        .order('date', { ascending: true });
      
      setEntries(entriesData || []);
      setLoading(false);
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando datos...</div>;

  // Chart Data Preparation
  const chartData = entries.map(e => ({
    day: e.day_number,
    p1: e.pots.find((p: any) => p.pot_number === '1')?.weight,
    p2: e.pots.find((p: any) => p.pot_number === '2')?.weight,
    p3: e.pots.find((p: any) => p.pot_number === '3')?.weight,
    p4: e.pots.find((p: any) => p.pot_number === '4')?.weight,
  }));

  const daysSinceStart = profile ? Math.floor((new Date().getTime() - new Date(profile.start_date).getTime()) / (1000 * 3600 * 24)) : 0;
  const isExperimentPhase = daysSinceStart >= 21;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30 px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg text-gray-800">Mi Huerto Digital</h1>
        </div>
        <div className="flex items-center gap-4">
             {profile && (
                 <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">
                    <Trophy size={12} /> {profile.score} pts
                 </div>
             )}
            <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut size={18} />
            </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Status Card */}
        <Card className="border-green-100 overflow-hidden relative">
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full transform translate-x-10 -translate-y-10 opacity-10 ${isExperimentPhase ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-xs uppercase text-gray-500 font-bold tracking-wider">Día del Experimento</p>
                        <h2 className="text-3xl font-bold text-gray-800">{daysSinceStart}</h2>
                    </div>
                    <Calendar className="text-gray-300" size={32} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-3">
                        <Droplets size={18} className="text-blue-600" />
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase">Riego</p>
                            <p className="text-xs font-bold text-blue-900">{isExperimentPhase ? 'Diferenciado' : 'Normal'}</p>
                        </div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg flex items-center gap-3">
                        <FlaskConical size={18} className="text-purple-600" />
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase">Fertilizante</p>
                            <p className="text-xs font-bold text-purple-900">{isExperimentPhase ? 'Semanal (Macetas F)' : 'Ninguno'}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Charts */}
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Scale className="text-[#2F855A]" /> Evolución de Peso
                </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid stroke="#f3f4f6" vertical={false} />
                        <XAxis dataKey="day" stroke="#9ca3af" tick={{fontSize: 10}} />
                        <YAxis stroke="#9ca3af" tick={{fontSize: 10}} />
                        <Tooltip />
                        <Line type="monotone" dataKey="p1" name="M1 (RF)" stroke="#10B981" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="p2" name="M2 (SF)" stroke="#F59E0B" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="p3" name="M3 (R)" stroke="#3B82F6" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="p4" name="M4 (S)" stroke="#F97316" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        <Button className="w-full h-12 text-lg shadow-lg" onClick={() => alert('Para implementar: Redirigir a /dashboard/new-entry')}>
            + Nuevo Registro
        </Button>
      </main>
    </div>
  );
}
