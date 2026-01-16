import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Clients from './pages/Clients';
import Team from './pages/Team';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { DataProvider } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
    const { session, loading } = useAuth();

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
                            <ProtectedRoute>
                                <Layout><Dashboard /></Layout>
                            </ProtectedRoute>
                        } />
                        <Route path="/agenda" element={
                            <ProtectedRoute>
                                <Layout><Agenda /></Layout>
                            </ProtectedRoute>
                        } />
                        <Route path="/clients" element={
                            <ProtectedRoute>
                                <Layout><Clients /></Layout>
                            </ProtectedRoute>
                        } />
                        <Route path="/team" element={
                            <ProtectedRoute>
                                <Layout><Team /></Layout>
                            </ProtectedRoute>
                        } />
                        <Route path="/settings" element={
                            <ProtectedRoute>
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