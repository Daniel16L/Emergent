import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/sonner";

// Layouts
import MainLayout from "./layouts/MainLayout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import NewOrder from "./pages/NewOrder";
import Clients from "./pages/Clients";
import Stock from "./pages/Stock";
import Logistics from "./pages/Logistics";
import DriverView from "./pages/DriverView";
import Targets from "./pages/Targets";
import Settings from "./pages/Settings";

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect based on role
    if (user.role === 'driver') {
      return <Navigate to="/driver" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}

// Layout wrapper for protected pages
function ProtectedPage({ children, allowedRoles }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <MainLayout>{children}</MainLayout>
    </ProtectedRoute>
  );
}

// Auth redirect component
function AuthRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    if (user.role === 'driver') {
      return <Navigate to="/driver" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <Login />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<AuthRedirect />} />

      {/* Driver Route (no sidebar) */}
      <Route 
        path="/driver" 
        element={
          <ProtectedRoute allowedRoles={['driver']}>
            <DriverView />
          </ProtectedRoute>
        } 
      />

      {/* Protected Routes with MainLayout */}
      <Route 
        path="/" 
        element={
          <ProtectedPage allowedRoles={['admin', 'agent']}>
            <Dashboard />
          </ProtectedPage>
        } 
      />
      <Route 
        path="/orders" 
        element={
          <ProtectedPage allowedRoles={['admin', 'agent']}>
            <Orders />
          </ProtectedPage>
        } 
      />
      <Route 
        path="/new-order" 
        element={
          <ProtectedPage allowedRoles={['admin', 'agent']}>
            <NewOrder />
          </ProtectedPage>
        } 
      />
      <Route 
        path="/clients" 
        element={
          <ProtectedPage allowedRoles={['admin', 'agent']}>
            <Clients />
          </ProtectedPage>
        } 
      />
      <Route 
        path="/stock" 
        element={
          <ProtectedPage allowedRoles={['admin', 'agent']}>
            <Stock />
          </ProtectedPage>
        } 
      />
      <Route 
        path="/logistics" 
        element={
          <ProtectedPage allowedRoles={['admin', 'agent']}>
            <Logistics />
          </ProtectedPage>
        } 
      />
      <Route 
        path="/targets" 
        element={
          <ProtectedPage allowedRoles={['admin', 'agent']}>
            <Targets />
          </ProtectedPage>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <ProtectedPage allowedRoles={['admin']}>
            <Settings />
          </ProtectedPage>
        } 
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
