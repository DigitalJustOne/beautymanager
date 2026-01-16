import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MenuItem } from '../types';
import ChatBot from './ChatBot';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const menuItems: MenuItem[] = [
    { path: '/', icon: 'dashboard', label: 'Dashboard' },
    { path: '/agenda', icon: 'calendar_today', label: 'Agenda' },
    { path: '/clients', icon: 'group', label: 'Clientes' },
    { path: '/team', icon: 'badge', label: 'Equipo' }, // Nuevo item
    { path: '/settings', icon: 'settings', label: 'Ajustes' },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { userProfile } = useData();
    const { signOut } = useAuth();

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    // Función para manejar el cierre de sesión
    const handleLogout = async () => {
        console.log("Intento de cerrar sesión - Click recibido");
        const confirmed = window.confirm('¿Estás seguro de que deseas cerrar sesión?');
        console.log("Confirmación de usuario:", confirmed);

        if (confirmed) {
            try {
                console.log("Ejecutando signOut...");
                await signOut();
                console.log("signOut finalizado. Redirigiendo...");
                // Force hash change and reload to clear all memory state
                window.location.replace('/#/login');
                window.location.reload();
            } catch (error) {
                console.error("Error al cerrar sesión (Catch):", error);
                // Fallback manual
                window.location.replace('/#/login');
                window.location.reload();
            }
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark font-display">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-72 bg-card-light dark:bg-card-dark border-r border-border-light dark:border-border-dark shrink-0 h-full transition-all z-20">
                <div className="p-6 flex flex-col h-full justify-between">
                    <div>
                        {/* Profile Header */}
                        <div className="flex items-center gap-3 mb-10 px-2">
                            <div className="bg-center bg-no-repeat bg-cover rounded-full h-12 w-12 border-2 border-primary/20 shrink-0"
                                style={{ backgroundImage: `url("${userProfile.avatar}")` }}>
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <h1 className="text-base font-bold truncate">{userProfile.name}</h1>
                                <p className="text-sm text-text-sec-light dark:text-text-sec-dark truncate">{userProfile.role}</p>
                            </div>
                        </div>

                        {/* Navigation Links */}
                        <nav className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-0 pt-4 pb-2">
                            {menuItems.filter(item => {
                                if (userProfile.role === 'admin') return true;
                                if (userProfile.role === 'professional') return ['Dashboard', 'Agenda', 'Ajustes'].includes(item.label);
                                if (userProfile.role === 'client') return ['Dashboard', 'Ajustes'].includes(item.label);
                                return false; // Default hidden
                            }).map((item) => {
                                let path = item.path;
                                // Redirect Dashboard link based on role
                                if (item.label === 'Dashboard') {
                                    if (userProfile.role === 'professional') path = '/professional';
                                    if (userProfile.role === 'client') path = '/client';
                                }

                                return (
                                    <Link
                                        key={item.path}
                                        to={path}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all shrink-0 ${location.pathname === path
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-text-sec-light dark:text-text-sec-dark hover:bg-background-light dark:hover:bg-background-dark hover:text-text-main-light dark:hover:text-text-main-dark'
                                            }`}
                                    >
                                        <span className={`material-symbols-outlined ${location.pathname === path ? 'fill' : ''}`}>{item.icon}</span>
                                        <span className={`text-sm ${location.pathname === path ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Logout */}
                    <div className="pt-4 border-t border-border-light dark:border-border-dark mt-auto">
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center justify-center gap-2 rounded-full h-12 px-4 bg-transparent border border-border-light dark:border-border-dark text-text-sec-light dark:text-text-sec-dark hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-all cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[20px]">logout</span>
                            <span className="text-sm font-bold">Cerrar Sesión</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Header & Overlay */}
            <div className={`lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={closeMobileMenu}></div>

            {/* Mobile Drawer */}
            <aside className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-card-light dark:bg-card-dark transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 flex flex-col h-full justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                                    <span className="material-symbols-outlined">spa</span>
                                </div>
                                <span className="font-bold text-lg">BeautyPro</span>
                            </div>
                            <button onClick={closeMobileMenu} className="p-1">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <nav className="flex flex-col gap-2">
                            {menuItems.filter(item => {
                                if (userProfile.role === 'admin') return true;
                                if (userProfile.role === 'professional') return ['Dashboard', 'Agenda', 'Ajustes'].includes(item.label);
                                if (userProfile.role === 'client') return ['Dashboard', 'Ajustes'].includes(item.label);
                                return false;
                            }).map((item) => {
                                let path = item.path;
                                if (item.label === 'Dashboard') {
                                    if (userProfile.role === 'professional') path = '/professional';
                                    if (userProfile.role === 'client') path = '/client';
                                }
                                return (
                                    <Link
                                        key={item.path}
                                        to={path}
                                        onClick={closeMobileMenu}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all ${location.pathname === path
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-text-sec-light dark:text-text-sec-dark hover:bg-background-light dark:hover:bg-background-dark'
                                            }`}
                                    >
                                        <span className={`material-symbols-outlined ${location.pathname === path ? 'fill' : ''}`}>{item.icon}</span>
                                        <span className="text-sm font-medium">{item.label}</span>
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>
                    {/* Mobile Logout */}
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center justify-center gap-2 rounded-full h-12 px-4 bg-transparent border border-border-light dark:border-border-dark text-text-sec-light dark:text-text-sec-dark hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-all cursor-pointer mt-4"
                    >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        <span className="text-sm font-bold">Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <main className="flex-1 flex flex-col h-full relative w-full">
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center justify-between p-4 bg-card-light dark:bg-card-dark border-b border-border-light dark:border-border-dark sticky top-0 z-10">
                    <button onClick={toggleMobileMenu} className="p-2 -ml-2 rounded-full hover:bg-background-light dark:hover:bg-background-dark">
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                    <span className="font-bold text-lg">BeautyPro</span>
                    <div className="w-10 h-10 rounded-full bg-cover bg-center" style={{ backgroundImage: `url("${userProfile.avatar}")` }}></div>
                </header>

                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {children}
                </div>
            </main>

            <ChatBot />
        </div>
    );
};

export default Layout;