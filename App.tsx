import React, { useState, useEffect } from 'react';
import { UserProfile, ExperimentEntry, ViewState, AuthStage } from './types';
import { db } from './services/db';
import Onboarding from './views/Onboarding';
import Dashboard from './views/Dashboard';
import EntryForm from './views/EntryForm';
import Resources from './views/Resources';
import Assistant from './views/Assistant';
import AdminPanel from './views/AdminPanel';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import Login from './views/Login';
import Register from './views/Register';
import VerifyEmail from './views/VerifyEmail';

import { useAuth } from './contexts/AuthContext';
import { api } from './services/api';

export default function App() {
  const { user, session, loading } = useAuth();
  const [entries, setEntries] = useState<ExperimentEntry[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  // Auth State
  const [authStage, setAuthStage] = useState<AuthStage>('landing');
  const [tempProfile, setTempProfile] = useState<Partial<UserProfile> | null>(null);

  useEffect(() => {
    // Check for auth errors in URL (e.g. from Google redirect)
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.substring(1); // Remove #
    const hashParams = new URLSearchParams(hash);

    const error = params.get('error') || hashParams.get('error');
    const errorDesc = params.get('error_description') || hashParams.get('error_description');

    if (window.location.pathname === '/admin') {
      setAuthStage('admin_login');
      return;
    }

    if (error) {
      console.error("Auth Error detected:", error, errorDesc);
      // Clean URL to prevent staying in error state
      window.history.replaceState(null, '', window.location.pathname);
      alert(`Error de inicio de sesión: ${decodedErrorDesc(errorDesc) || error}`);
    }

    if (user) {
      setAuthStage('authenticated');
      loadEntries(user.id);
    } else {
      if (!loading && authStage !== 'admin_login') setAuthStage('landing');
    }
  }, [user, loading]);

  const decodedErrorDesc = (desc: string | null) => {
    if (!desc) return null;
    return decodeURIComponent(desc).replace(/\+/g, ' ');
  };

  const loadEntries = async (userId: string) => {
    try {
      const data = await api.getUserEntries(userId);
      setEntries(data);
    } catch (e) {
      console.error("Error loading entries", e);
    }
  };

  // --- Handlers for Auth Flow ---

  // Step 1: Landing -> Kit Config
  const handleKitConfig = (partialProfile: Partial<UserProfile>) => {
    // Admin Check Bypass
    if (partialProfile.role === 'admin') {
      handleLoginSuccess(partialProfile as UserProfile);
      return;
    }
    setTempProfile(partialProfile);
    setAuthStage('register');
  };

  // Step 2: Register (Profile) -> Verification
  const handleRegistrationComplete = (fullProfile: UserProfile) => {
    setTempProfile(fullProfile); // Update temp with full details
    setAuthStage('verify');
  };

  // Step 3: Verify -> Login Success (Simplified for Supabase: User clicks link in email)
  const handleVerificationComplete = () => {
    // In Supabase, the user clicks a link in email which redirects them back.
    // Auto-login might happen or they need to login.
    // For this MVP, let's treat "Verify" as "Please check your email" screen.
    setAuthStage('login');
  };

  const handleLoginSuccess = (profile: UserProfile) => {
    // State update handled by AuthContext mostly, but we set view here
    if (profile.role === 'admin') {
      setCurrentView('admin');
    } else {
      loadEntries(profile.id);
      setCurrentView('dashboard');
    }
    setAuthStage('authenticated');
  };

  const handleLogout = async () => {
    const { supabase } = await import('./lib/supabase');
    await supabase.auth.signOut();
    setEntries([]);
    setCurrentView('dashboard');
    setAuthStage('landing');
    setTempProfile(null);
  };

  const handleAddEntry = async (entry: ExperimentEntry) => {
    if (!user) return;
    const fullEntry = { ...entry, userId: user.id };

    try {
      await api.addEntry(fullEntry);
      // Refresh entries
      await loadEntries(user.id);
      setCurrentView('dashboard');
    } catch (e) {
      console.error("Error saving entry", e);
      alert("Error al guardar. Intenta nuevamente.");
    }
  };

  const handleAdminSystemLogin = async (pwd: string) => {
    if (pwd === 'ADMIN123') {
      // 1. Try to promote real user if logged in
      if (session?.user) {
        const success = await api.promoteToAdmin(session.user.id);
        if (success) {
          alert("¡Cuenta promovida a Administrador! Recargando...");
          window.location.reload(); // Reload to fetch new role
          return;
        } else {
          console.warn("Could not promote user directly. Fallback to System Admin mode.");
          // If promotion failed (RLS?), we fall back to fake user, but upload might fail if RPC missing.
          // Alerting user to ensuring RPC is created or RLS allows it.
        }
      }

      // 2. Fallback: System Admin (Fake User)
      const adminUser: UserProfile = {
        id: 'system-admin',
        name: 'System Administrator',
        email: 'admin@system.local',
        kitCode: 'ADMIN-ACCESS',
        role: 'admin',
        startDate: new Date().toISOString(),
        score: 0,
        password: ''
      };
      // Store secret for API usage (RPC)
      localStorage.setItem('admin_secret', 'ADMIN123');

      handleLoginSuccess(adminUser);
      setAuthStage('admin_authenticated');
      setCurrentView('admin');
    } else {
      alert("Contraseña incorrecta");
    }
  };


  // if (loading) return ... (Handled inside useAuth? No, useAuth gives loading state)
  if (loading) return <div className="min-h-screen flex items-center justify-center text-primary">Cargando...</div>;

  // --- Render Logic based on AuthStage ---

  if (authStage === 'admin_login') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Acceso Administrativo</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            handleAdminSystemLogin(fd.get('password') as string);
          }}>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2 text-gray-700">Contraseña del Sistema</label>
              <input type="password" name="password" className="w-full p-3 border rounded" autoFocus />
            </div>
            <button type="submit" className="w-full bg-gray-900 text-white font-bold py-3 rounded hover:bg-black transition">
              Ingresar
            </button>
            <button type="button" onClick={() => { window.location.pathname = '/'; }} className="w-full mt-4 text-gray-500 text-sm hover:underline">
              Volver al inicio
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Special case: Admin Authenticated via Bypass
  if (authStage === 'admin_authenticated') {
    return <AdminPanel />;
  }

  if (authStage === 'landing') {
    return (
      <Onboarding
        onSave={handleKitConfig}
        onLoginRequest={() => setAuthStage('login')}
      />
    );
  }

  if (authStage === 'login') {
    return (
      <Login
        onLogin={handleLoginSuccess}
        onBack={() => setAuthStage('landing')}
      />
    );
  }

  if (authStage === 'register' && tempProfile) {
    return (
      <Register
        tempProfile={tempProfile}
        onComplete={handleRegistrationComplete}
        onBack={() => setAuthStage('landing')}
      />
    );
  }

  if (authStage === 'verify' && tempProfile) {
    return (
      <VerifyEmail
        user={tempProfile as UserProfile}
        onConfirm={handleVerificationComplete}
      />
    );
  }

  // --- Authenticated App ---

  if (!user) {
    if (loading) return <div className="min-h-screen flex items-center justify-center text-primary">Cargando...</div>;

    // If we are here, it means we have no user profile loaded.
    // If we have a session (handled by AuthContext internals but not exposed as such fully effectively yet),
    // AuthContext sets user to null.
    // We should redirect to Landing/Onboarding to force them to register with a kit.

    // Ideally we would check if they are "actually" logged in (have session) but no profile.
    // Since we don't expose 'session' from AuthContext, we rely on the fact that if we were supposed to be logged in,
    // we would have a user.
    // So we just reset state to landing.

    // However, to prevent infinite loops if something is really broken, we can show a special message or allows logout.

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-xl font-bold mb-2">Cuenta no configurada</h2>
        <p className="mb-4 text-gray-600">No encontramos un perfil asociado a esta cuenta.</p>
        <p className="mb-6 text-sm text-gray-500">Es posible que hayas iniciado sesión con Google sin tener un Kit registrado.</p>

        <div className="flex flex-col gap-4 items-center">
          <button
            onClick={() => {
              handleLogout(); // Ensure we clear supabase session
              setAuthStage('landing');
            }}
            className="bg-primary text-white px-6 py-2 rounded-full font-bold shadow-md hover:bg-green-700"
          >
            Ir a Registrar Kit
          </button>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard user={user} entries={entries} onViewChange={setCurrentView} />;
      case 'form':
        return <EntryForm user={user} onSave={handleAddEntry} onCancel={() => setCurrentView('dashboard')} />;
      case 'assistant':
        return <Assistant />;
      case 'resources':
        return <Resources />;
      case 'admin':
        return user.role === 'admin' ? <AdminPanel /> : <Dashboard user={user} entries={entries} onViewChange={setCurrentView} />;
      default:
        return <Dashboard user={user} entries={entries} onViewChange={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
      <Header user={user} currentView={currentView} onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-3xl mx-auto w-full">
          {renderView()}
        </div>
      </main>

      {user.role !== 'admin' && (
        <BottomNav currentView={currentView} onChange={setCurrentView} />
      )}
    </div>
  );
}