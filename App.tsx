import React, { useState, useEffect } from 'react';
import { UserProfile, ExperimentEntry, ViewState, AuthStage } from './types';
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

// Helper component for loading
const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-primary">
    <span className="text-4xl animate-bounce">🌱</span>
    <span className="mt-4 font-medium">Cargando CultivaDatos...</span>
  </div>
);

export default function App() {
  const { user, session, loading } = useAuth();
  const [entries, setEntries] = useState<ExperimentEntry[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  // We keep 'authStage' but purely for unauthenticated flow (Landing -> Login/Register)
  const [authStage, setAuthStage] = useState<AuthStage>('landing');
  const [tempProfile, setTempProfile] = useState<Partial<UserProfile> | null>(null);

  useEffect(() => {
    // If user is authenticated, we reset authStage to authenticated
    if (user && !loading) {
      setAuthStage('authenticated');
      if (user.role === 'god') {
        setCurrentView('admin');
      } else {
        loadEntries(user.id);
      }
    } else if (!loading && !user) {
      // Only reset to landing if we were in 'authenticated' state (e.g. after logout)
      // If we are in 'login' or 'register', stay there.
      if (authStage === 'authenticated' || authStage === 'landing') {
        setAuthStage('landing');
      }
    }
  }, [user, loading]);

  const loadEntries = async (userId: string) => {
    try {
      const data = await api.getUserEntries(userId);
      setEntries(data);
    } catch (e) {
      console.error("Error loading entries", e);
    }
  };

  // --- Handlers for Unauthenticated Flow ---

  const handleKitConfig = (partialProfile: Partial<UserProfile>) => {
    setTempProfile(partialProfile);
    setAuthStage('register');
  };

  const handleRegistrationComplete = (fullProfile: UserProfile) => {
    // In Supabase Auth, registration usually triggers auto-login or email check
    // For email/password, session might exist immediately if auto-confirm is on.
    // Or we wait for useAuth to pick up the change.
    // But we can set tempProfile to show VerifyEmail if needed.

    // If we used Google, we redirected.
    // If email/pass, we might be here.

    // If session exists, useEffect will take over.
    if (!session) {
      setTempProfile(fullProfile);
      setAuthStage('verify');
    }
  };

  const { signOut } = useAuth();

  const performLogout = async () => {
    await signOut();
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
      await loadEntries(user.id);
      setCurrentView('dashboard');
    } catch (e) {
      console.error("Error saving entry", e);
      alert("Error al guardar. Intenta nuevamente.");
    }
  };

  if (loading) return <LoadingScreen />;

  // --- UNAUTHENTICATED ROUTES ---

  if (!user) {
    if (authStage === 'landing') {
      return <Onboarding onSave={handleKitConfig} onLoginRequest={() => setAuthStage('login')} />;
    }
    if (authStage === 'login') {
      return <Login onLogin={() => { }} onBack={() => setAuthStage('landing')} />;
    }
    if (authStage === 'register' && tempProfile) {
      return <Register tempProfile={tempProfile} onComplete={handleRegistrationComplete} onBack={() => setAuthStage('landing')} />;
    }
    if (authStage === 'verify' && tempProfile) {
      return <VerifyEmail user={tempProfile as UserProfile} onConfirm={() => setAuthStage('login')} />;
    }

    // Fallback
    return <Onboarding onSave={handleKitConfig} onLoginRequest={() => setAuthStage('login')} />;
  }

  // --- AUTHENTICATED ROUTES ---

  // 1. Missing Profile / Kit (Partial Auth)
  // Context handles the "creating profile from local storage" part, but if it failed or missing:
  if (user.role !== 'god' && !user.kitCode) {
    // Emergency completion screen
    return (
      <CompleteRegistration
        user={user}
        onComplete={() => window.location.reload()}
      />
    );
  }

  // 2. Main App
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
      <Header user={user} currentView={currentView} onLogout={performLogout} />

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