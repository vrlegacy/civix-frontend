import { BrowserRouter, Routes, Route, useNavigate, Navigate, useLocation, Outlet } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import LandingPage from "@/components/pages/Landingpage";
import LoginPage from "@/components/pages/LoginPage";
import SignUpPage from "@/components/pages/SignUpPage";
import VerifyEmail from "@/components/pages/VerifyEmail";
import Dashboard from "@/components/pages/Dashboard";
import RequestPasswordReset from "@/components/pages/RequestPasswordReset";
import ResetPassword from "@/components/pages/ResetPassword";
import PetitionsModule from "@/components/pages/PetitionsModule";
import PollsModule from "@/components/pages/pollsmodule";
import ComplaintsModule from "@/components/pages/ComplaintsModule";
import AdminDashboard from "@/components/pages/AdminDashboard";
import VolunteerDashboard from "@/components/pages/VolunteerDashboard";
import SharedLayout from "@/components/sharedlayout";
import { Page } from "@/types";

function AppRoutes() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (userData: any) => {
    login(userData);
    navigate('/dashboard');
  };

  const handleSignUp = (userData: any) => {
    // Navigate to login is not needed here anymore, as they need to verify
  };

  const handleNavigate = (page: Page, itemId?: string) => {
    if (page === 'landing') {
      navigate('/');
    } else {
      navigate(`/${page}${itemId ? `?id=${itemId}` : ''}`);
    }
  };

  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage onNavigate={handleNavigate} />} />
      <Route 
        path="/login" 
        element={<LoginPage onNavigate={handleNavigate} onLogin={handleLogin} />} 
      />
      <Route 
        path="/signup" 
        element={<SignUpPage onNavigate={handleNavigate} onSignUp={handleSignUp} />} 
      />
      <Route 
        path="/verify-email" 
        element={<VerifyEmail />} 
      />
      <Route 
        path="/request-password-reset" 
        element={<RequestPasswordReset onNavigate={handleNavigate} />} 
      />
      <Route 
        path="/reset-password" 
        element={<ResetPassword onNavigate={handleNavigate} />} 
      />

      {/* Protected Pages wrapped in SharedLayout */}
      <Route element={
        <ProtectedRoute fallback={<Navigate to="/login" replace />}>
          <MainLayout onNavigate={handleNavigate} />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<Dashboard onNavigate={handleNavigate} userName={user?.fullName || 'User'} />} />
        <Route path="/petitions" element={<PetitionsModule onNavigate={handleNavigate} userName={user?.fullName || 'User'} />} />
        <Route path="/polls" element={<PollsModule onNavigate={handleNavigate} userName={user?.fullName || 'User'} />} />
        <Route path="/complaints" element={<ComplaintsModule onNavigate={handleNavigate} userName={user?.fullName || 'User'} />} />
        <Route path="/admin" element={<AdminDashboard onNavigate={handleNavigate} userName={user?.fullName || 'User'} />} />
        <Route path="/volunteer" element={<VolunteerDashboard onNavigate={handleNavigate} userName={user?.fullName || 'User'} />} />
      </Route>

      {/* Fallback to root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

interface MainLayoutProps {
  onNavigate: (page: Page) => void;
}

function MainLayout({ onNavigate }: MainLayoutProps) {
  const location = useLocation();
  
  // Extract route name from location path
  let activePage: Page = 'dashboard';
  const path = location.pathname.substring(1);
  if (path) {
    activePage = path as Page;
  }

  return (
    <SharedLayout activePage={activePage} onNavigate={onNavigate}>
      <Outlet />
    </SharedLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster richColors closeButton />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
