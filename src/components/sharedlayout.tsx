import React, { useState } from 'react';
import { Page } from '@/types';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Home, FileText, Vote, AlertTriangle, Shield, UserCheck, LogOut, Menu, X } from "lucide-react";
import ThemeToggle from "@/components/pages/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

interface SharedLayoutProps {
  children: React.ReactNode;
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const SharedLayout: React.FC<SharedLayoutProps> = ({ children, activePage, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const { user, logout } = useAuth();

  const userRole = user?.role || 'citizen';
  const userName = user?.fullName || 'User';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, page: 'dashboard' as Page },
    { id: 'petitions', label: 'Petitions', icon: FileText, page: 'petitions' as Page },
    { id: 'polls', label: 'Polls & Voting', icon: Vote, page: 'polls' as Page },
    { id: 'complaints', label: 'Complaints', icon: AlertTriangle, page: 'complaints' as Page },
  ];

  if (userRole === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin', icon: Shield, page: 'admin' as Page });
  } else if (userRole === 'volunteer') {
    navItems.push({ id: 'volunteer', label: 'Volunteer', icon: UserCheck, page: 'volunteer' as Page });
  }

  const handleLogoutClick = () => {
    logout();
    onNavigate('landing');
  };

  const getRoleBadge = () => {
    switch (userRole) {
      case 'admin': return 'Admin';
      case 'volunteer': return 'Volunteer';
     
      default: return 'Civic Member';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-civix-sandal dark:bg-gray-900 text-civix-dark-brown dark:text-civix-sandal">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-civix-warm-beige dark:border-gray-700 shadow-sm sticky top-0 z-40">
        <div className="w-full px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-civix-dark-brown dark:text-white cursor-pointer" onClick={() => onNavigate('dashboard')}>Civix</h1>
              <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
                {navItems.map(item => (
                  <button 
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.page);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`${
                      activePage === item.page
                        ? "text-civix-civic-green border-b-2 border-civix-civic-green"
                        : "text-civix-dark-brown dark:text-civix-sandal hover:text-civix-civic-green"
                    } transition-colors pb-1 flex items-center gap-2`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <div 
                className="flex items-center space-x-2 cursor-pointer border border-transparent hover:bg-civix-warm-beige/25 hover:border-civix-warm-beige dark:hover:bg-gray-700/50 p-1 rounded-lg transition-all"
                onClick={() => setShowLogout(!showLogout)}
              >
                <Avatar>
                  <AvatarImage src="/api/placeholder/40/40" />
                  <AvatarFallback className="bg-civix-civic-green text-white">
                    {userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block max-w-[150px] truncate">
                  <p className="text-sm font-semibold text-civix-dark-brown dark:text-white truncate">{userName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{getRoleBadge()}</p>
                </div>
                {showLogout && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLogoutClick();
                    }}
                    className="ml-1 hover:bg-red-500/10 hover:text-red-500 rounded-full h-8 w-8"
                  >
                    <LogOut className="w-4 h-4 text-civix-dark-brown dark:text-civix-sandal" />
                  </Button>
                )}
              </div>
              <div className="md:hidden">
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                  {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-800 border-t border-civix-warm-beige dark:border-gray-700">
            <nav className="flex flex-col p-4 space-y-2">
              {navItems.map(item => (
                <Button
                  key={item.id}
                  variant={activePage === item.page ? "secondary" : "ghost"}
                  className={`w-full justify-start text-base p-4 ${
                    activePage === item.page 
                      ? "bg-civix-civic-green text-white" 
                      : "text-civix-dark-brown dark:text-civix-sandal"
                  }`}
                  onClick={() => {
                    onNavigate(item.page);
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col w-full px-6 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-civix-dark-brown dark:bg-gray-950 border-t border-civix-dark-brown/20 dark:border-gray-800 py-6 mt-auto w-full">
        <div className="w-full px-6">
          <div className="text-center text-civix-sandal dark:text-civix-sandal/90 font-medium">
            <p>Civix – Empowering Citizens | © 2026</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SharedLayout;
