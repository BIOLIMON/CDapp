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
import CompleteRegistration from './views/CompleteRegistration';

import { useAuth } from './contexts/AuthContext';
import { api } from './services/api';
import { supabase } from './lib/supabase';

export default function App() {
  const { user, session, loading } = useAuth();
  const [entries, setEntries] = useState<ExperimentEntry[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  // Auth State
  const [authStage, setAuthStage] = useState<AuthStage>('landing');
  const [tempProfile, setTempProfile] = useState<Partial<UserProfile> | null>(null);

  const handleRegistrationCompleted = (newProfile: UserProfile) => {
    // Force reload to ensure AuthContext picks up the new kit code from DB
    window.location.reload();
  };

  useEffect(() => {
    // Check for auth errors in URL (e.g. from Google redirect)
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.substring(1); // Remove #
    const hashParams = new URLSearchParams(hash);

    const error = params.get('error') || hashParams.get('error');
    const errorDesc = params.get('error_description') || hashParams.get('error_description');

    if (window.location.pathname === '/admin') {
      // Allow standard flow to handle auth state. 
      // If unauthorized, onBoarding/Login will show. 
      // If authorized, effect will redirect to admin view if role matches.
      // We can force 'login' stage if not authed.
      if (!user && !loading && authStage !== 'login') {
        setAuthStage('login');
      }
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
      if (user.role === 'god') {
        setCurrentView('admin');
      } else {
        loadEntries(user.id);
      }
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
    if (profile.role === 'god') {
      setCurrentView('admin');
    } else {
      loadEntries(profile.id);
      setCurrentView('dashboard');
    }
    setAuthStage('authenticated');
  };

  const handleLogout = async () => {
    // const { supabase } = await import('./lib/supabase');
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

    // New: If specific error state or just missing profile but authenticated
    if (session) {
      // User is authenticated (e.g. Google Login) but has no profile row in DB yet.
      // We treat them as a "User" role for the purpose of completion.
      const placeholderUser: UserProfile = {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario',
        role: 'user', // Default
        kitCode: '',
        startDate: new Date().toISOString(),
        score: 0,
        password: ''
      };

      return (
        <CompleteRegistration
          user={placeholderUser}
          onComplete={handleRegistrationCompleted}
        />
      );
    }

    // Authenticated but no profile found in DB (and no local pending state consumed yet)
    // This happens if Supabase created the Auth User but the specific 'profiles' row is missing 
    // AND the AuthContext logic didn't create it (e.g. race condition or error).

    // We can auto-recover if we have session info.
    const recoverProfile = () => {
      // Try to construct a temp profile from session
      const tempUser: UserProfile = {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.user_metadata?.full_name || 'Usuario',
        role: 'user',
        kitCode: '', // Missing!
        startDate: new Date().toISOString(),
        score: 0,
        password: ''
      };
      // Show CompleteRegistration to force them to enter kit again
      return (
        <CompleteRegistration
          user={tempUser}
          onComplete={handleRegistrationCompleted}
        />
      );
    };

    return recoverProfile();
  }



  // --- Strict Kit Enforcement ---
  if (user.role !== 'god' && !user.kitCode) {
    return (
      <CompleteRegistration
        user={user}
        onComplete={handleRegistrationCompleted}
      />
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
        return (user.role === 'god') ? <AdminPanel /> : <Dashboard user={user} entries={entries} onViewChange={setCurrentView} />;
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

      {user.role !== 'god' && (
        <BottomNav currentView={currentView} onChange={setCurrentView} />
      )}
    </div>
  );
}