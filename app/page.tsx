
"use client"

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Sprout, Users, ArrowRight, Leaf, Trophy, Lock } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [globalStats, setGlobalStats] = useState({ users: 0, entries: 0 });

  useEffect(() => {
    async function fetchStats() {
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: entryCount } = await supabase.from('entries').select('*', { count: 'exact', head: true });
      setGlobalStats({ users: userCount || 120, entries: entryCount || 1800 });
    }
    fetchStats();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (authView === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert(error.message);
      } else {
        router.push('/dashboard');
      }
    } else {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: { role: 'user' } }
      });
      if (error) {
        alert(error.message);
      } else {
        alert('Revisa tu correo para confirmar tu cuenta');
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen font-sans">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#2F855A] to-green-900 text-white pt-20 pb-32 overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
            <Sprout size={400} />
        </div>
        <div className="container mx-auto px-6 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 bg-green-800/50 backdrop-blur-sm px-4 py-1 rounded-full text-green-200 text-sm font-medium border border-green-700 mb-6">
                <Leaf size={16} />
                <span>Ciencia Ciudadana</span>
            </div>
            <h1 className="text-4xl md:text-7xl font-bold mb-6 tracking-tight">
                CultivaDatos
            </h1>
            <p className="text-xl md:text-2xl text-green-100 mb-8 max-w-2xl mx-auto">
                Únete al experimento masivo para el futuro de la agricultura resiliente.
            </p>
            
            <div className="flex flex-wrap justify-center gap-8 mt-12 text-center">
               <div>
                  <div className="text-4xl font-bold text-[#ECC94B]">{globalStats.users}</div>
                  <div className="text-sm uppercase tracking-wide opacity-80">Agricultores</div>
               </div>
               <div>
                  <div className="text-4xl font-bold text-[#ECC94B]">{globalStats.entries}</div>
                  <div className="text-sm uppercase tracking-wide opacity-80">Mediciones</div>
               </div>
            </div>
        </div>
      </section>

      {/* Auth Section */}
      <section className="flex-1 bg-gray-50 -mt-20 px-4 pb-20 z-20">
        <Card className="max-w-md mx-auto shadow-2xl border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold text-gray-800">
              {authView === 'login' ? 'Bienvenido de nuevo' : 'Únete al Experimento'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                 <Input 
                    type="email" 
                    placeholder="tucorreo@ejemplo.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                 />
                 <Input 
                    type="password" 
                    placeholder="Contraseña" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                 />
              </div>
              
              <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                {loading ? 'Procesando...' : (authView === 'login' ? 'Ingresar' : 'Crear Cuenta')}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <button 
                onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')}
                className="text-[#2F855A] hover:underline font-medium"
              >
                {authView === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia Sesión'}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Admin Link */}
        <div className="text-center mt-8">
            <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1">
                <Lock size={12} /> Acceso Coordinadores
            </Link>
        </div>
      </section>
    </div>
  );
}
