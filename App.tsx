import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Clients from './pages/Clients';
import Team from './pages/Team';
import Settings from './pages/Settings';
import Login from './pages/Login';
import ProfessionalDashboard from './pages/ProfessionalDashboard';
import ClientDashboard from './pages/ClientDashboard';
import { DataProvider } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactElement, allowedRoles?: string[] }) => {
    const { session, role, loading } = useAuth();

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

    // If allowe dRoles are specified and user has a role that's not in the list
    if (allowedRoles && role && !allowedRoles.includes(role)) {
        // Redirect to the correct dashboard based on user's role
        if (role === 'admin') return <Navigate to="/" replace />;
        if (role === 'professional') return <Navigate to="/professional" replace />;
        if (role === 'client') return <Navigate to="/client" replace />;
    }

    // If role is not loaded yet but we have session, wait a bit more
    if (allowedRoles && !role) {
        return (
            <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return children;
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <DataProvider>
                <HashRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
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
                            <ProtectedRoute allowedRoles={['admin']}>
                                <Layout><Clients /></Layout>
                            </ProtectedRoute>
                        } />
                        <Route path="/team" element={
                            <ProtectedRoute allowedRoles={['admin', 'professional']}>
                                <Layout><Team /></Layout>
                            </ProtectedRoute>
                        } />
                        <Route path="/settings" element={
                            <ProtectedRoute allowedRoles={['admin', 'professional', 'client']}>
                                <Layout><Settings /></Layout>
                            </ProtectedRoute>
                        } />
                    </Routes>
                </HashRouter>
            </DataProvider>
        </AuthProvider>
    );
};

export default App;