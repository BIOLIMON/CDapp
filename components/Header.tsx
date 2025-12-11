import React from 'react';
import { UserProfile, ViewState } from '../types';
import { Sprout, LogOut, Trophy, ShieldCheck, User } from 'lucide-react';

interface HeaderProps {
  user: UserProfile | null;
  currentView: ViewState;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, currentView, onLogout }) => {
  const getTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Mi Huerto Digital';
      case 'form': return 'Nuevo Registro';
      case 'assistant': return 'Asistente IA';
      case 'resources': return 'Recursos';
      case 'admin': return 'Panel de Administración';
      default: return 'CultivaDatos';
    }
  };

  return (
    <header className="bg-primary text-white shadow-md sticky top-0 z-50">
      <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-full text-primary overflow-hidden w-8 h-8 flex items-center justify-center">
            {user?.role === 'admin' ? (
                <ShieldCheck size={20} />
            ) : user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
                <Sprout size={20} />
            )}
          </div>
          <h1 className="font-bold text-lg tracking-tight">{getTitle()}</h1>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            {user.role !== 'admin' && (
              <div className="flex items-center gap-1 bg-green-700/50 px-3 py-1 rounded-full">
                <Trophy size={14} className="text-yellow-400" />
                <span className="text-xs font-bold text-white">{user.score} pts</span>
              </div>
            )}
            
            <div className="text-xs text-green-100 text-right hidden sm:block">
              <p className="font-medium">{user.name}</p>
              <p className="opacity-80 font-mono">{user.kitCode}</p>
            </div>
            <button 
              onClick={onLogout}
              className="p-2 text-green-100 hover:text-white hover:bg-green-700/50 rounded-full transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;