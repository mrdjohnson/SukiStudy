
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icons } from './Icons';
import { User } from '../types';
import { useSettings } from '../contexts/SettingsContext';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { soundEnabled, toggleSound } = useSettings();

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              {user && (
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg lg:hidden"
                >
                  <Icons.Menu className="w-6 h-6" />
                </button>
              )}
              <Link to="/" className="flex items-center gap-2">
                <div className="bg-indigo-600 p-2 rounded-lg">
                  <Icons.Brain className="h-6 w-6 text-white" />
                </div>
                <span className="font-bold text-xl text-gray-900 tracking-tight">SukiStudy</span>
              </Link>
            </div>
            
            <div className="flex items-center gap-4">
              {user && (
                <>
                  <div className="hidden md:flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                    <span className="text-sm font-medium text-gray-600">Level {user.level}</span>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <span className="text-sm font-semibold text-indigo-600 truncate max-w-[100px]">{user.username}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-[101] w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Menu</h2>
          <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
            <Icons.X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-4 space-y-2">
           <Link to="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg font-medium">
             <Icons.Brain className="w-5 h-5" /> Dashboard
           </Link>
           <Link to="/session/games" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg font-medium">
             <Icons.Gamepad2 className="w-5 h-5" /> Games
           </Link>
           <Link to="/browse" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg font-medium">
             <Icons.BookOpen className="w-5 h-5" /> Browse
           </Link>
        </div>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-100 bg-gray-50 space-y-4">
           <div className="flex items-center justify-between px-4">
             <span className="text-sm font-medium text-gray-600">Sound Effects</span>
             <button onClick={toggleSound} className="p-2 bg-white rounded-full shadow-sm border border-gray-200">
                {soundEnabled ? <Icons.Volume className="w-5 h-5 text-indigo-600" /> : <Icons.VolumeOff className="w-5 h-5 text-gray-400" />}
             </button>
           </div>
           
           <button 
             onClick={() => { onLogout(); setSidebarOpen(false); }}
             className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-red-100 text-red-600 rounded-lg font-medium hover:bg-red-50"
           >
             <Icons.LogOut className="w-5 h-5" /> Logout
           </button>
        </div>
      </div>
    </>
  );
};
