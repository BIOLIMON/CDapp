import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, PlusCircle, MessageSquareText, BookOpen } from 'lucide-react';

interface BottomNavProps {
  currentView: ViewState;
  onChange: (view: ViewState) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onChange }) => {
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Inicio' },
    { id: 'form', icon: PlusCircle, label: 'Registrar' },

    { id: 'resources', icon: BookOpen, label: 'Guía' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-40">
      <div className="flex justify-around items-center max-w-3xl mx-auto">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id as ViewState)}
              className={`flex flex-col items-center justify-center w-full py-3 px-1 transition-colors ${isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;