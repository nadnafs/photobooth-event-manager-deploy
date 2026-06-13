import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, UserPlus, List, Monitor, LogOut, BookOpen } from 'lucide-react';

const PenerimaLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/penerima/dashboard', icon: LayoutDashboard },
    { name: 'Pendaftaran', path: '/penerima/daftar', icon: UserPlus },
    { name: 'Menunggu Kasir', path: '/penerima/list', icon: List },
    { name: 'Panduan Penerima', path: '/penerima/info', icon: BookOpen },
    { name: 'Buka TV Antrian', path: '/tv-antrian', icon: Monitor, isExternal: true },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6">
          <h2 className="text-xl font-bold text-success">Photobooth System</h2>
          <p className="text-sm text-textSecondary mt-1">Role: {user?.role}</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            if (item.isExternal) {
              return (
                <a
                  key={item.name}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-textMain hover:bg-slate-100"
                >
                  <Icon size={20} className="text-textSecondary" />
                  {item.name}
                </a>
              );
            }
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive 
                    ? 'bg-success text-white font-medium shadow-sm' 
                    : 'text-textMain hover:bg-slate-100'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-white' : 'text-textSecondary'} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <button 
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 text-danger hover:bg-danger/10 rounded-xl transition-colors font-medium"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-card border-b border-border flex items-center justify-end px-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-success/20 text-success flex items-center justify-center font-bold">
              {user?.name?.charAt(0)}
            </div>
            <span className="font-medium text-textMain">{user?.name}</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PenerimaLayout;
