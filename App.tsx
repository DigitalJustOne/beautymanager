import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Clients from './pages/Clients';
import Team from './pages/Team';
import Settings from './pages/Settings';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';
import ProfessionalDashboard from './pages/ProfessionalDashboard';
import ClientDashboard from './pages/ClientDashboard';
import Services from './pages/Services';
import { DataProvider } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './services/supabase';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactElement, allowedRoles?: string[] }) => {
    const { session, role, loading, error, refreshProfile, signOut } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background-light dark:bg-background-dark p-4">
                <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg max-w-md w-full text-center">
                    <h3 className="text-red-700 dark:text-red-300 font-bold mb-2">Error de Sesión</h3>
                    <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                    <div className="flex gap-2 justify-center">
                        <button
                            onClick={() => refreshProfile()}
                            className="bg-primary text-white px-4 py-2 rounded hover:opacity-90 transition-opacity"
                        >
                            Reintentar
                        </button>
                        <button
                            onClick={() => signOut()}
                            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:opacity-90 transition-opacity"
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // If allowedRoles are specified and user has a role that's not in the list
    if (allowedRoles && role && !allowedRoles.includes(role)) {
        // Redirect to the correct dashboard based on user's role
        if (role === 'admin') return <Navigate to="/" replace />;
        if (role === 'professional') return <Navigate to="/professional" replace />;
        if (role === 'client') return <Navigate to="/client" replace />;
    }

    // If role is not loaded yet but we have session, it means profile fetch failed or is invalid
    if (allowedRoles && !role) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background-light dark:bg-background-dark p-4">
                <h3 className="text-xl font-semibold mb-2 text-text-primary-light dark:text-text-primary-dark">Completando perfil...</h3>
                <p className="text-text-secondary-light dark:text-text-secondary-dark mb-4">No se pudo cargar tu información de usuario.</p>
                <div className="flex gap-2">
                    <button
                        onClick={() => refreshProfile()}
                        className="bg-primary text-white px-4 py-2 rounded hover:opacity-90 transition-opacity"
                    >
                        Reintentar
                    </button>
                    <button
                        onClick={() => signOut()}
                        className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:opacity-90 transition-opacity"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        );
    }

    return children;
};

const AuthEventHandler = () => {
    const navigate = useNavigate();
    React.useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                navigate('/update-password');
            }
        });
        return () => subscription.unsubscribe();
    }, [navigate]);
    return null;
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <DataProvider>
                <BrowserRouter>
                    <AuthEventHandler />
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/update-password" element={<UpdatePassword />} />
                        <Route path="/" element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <Layout><Dashboard /></Layout>
                            </ProtectedRoute>
                        } />
                        <Route path="/professional" element={
                            <ProtectedRoute allowedRoles={['professional']}>
                                <Layout><ProfessionalDashboard /></Layout>
                            </ProtectedRoute>
                        } />
                        <Route path="/client" element={
                            <ProtectedRoute allowedRoles={['client']}>
                                <Layout><ClientDashboard /></Layout>
                            </ProtectedRoute>
                        } />
                        <Route path="/agenda" element={
                            <ProtectedRoute allowedRoles={['admin', 'professional']}>
                                <Layout><Agenda /></Layout>
                            </ProtectedRoute>
                        } />
                        <Route path="/clients" element={
                            <ProtectedRoute allowedRoles={['admin', 'professional']}>
                                <Layout><Clients /></Layout>
                            </ProtectedRoute>
                        } />
                        <Route path="/team" element={
                            <ProtectedRoute allowedRoles={['admin', 'professional']}>
                                <Layout><Team /></Layout>
                            </ProtectedRoute>
                        } />
                        <Route path="/services" element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <Layout><Services /></Layout>
                            </ProtectedRoute>
                        } />
                        <Route path="/settings" element={
                            <ProtectedRoute allowedRoles={['admin', 'professional', 'client']}>
                                <Layout><Settings /></Layout>
                            </ProtectedRoute>
                        } />
                    </Routes>
                </BrowserRouter>
            </DataProvider>
        </AuthProvider>
    );
};

export default App;