
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isRegistering) {
                const { error } = await supabase.auth.signUp({
                    email, // Must match what supabase expects
                    password,
                });
                if (error) throw error;
                alert('Revisa tu email para confirmar tu cuenta!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;

                // Fetch profile to check role
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                    const role = profile?.role || 'client';

                    if (role === 'admin') navigate('/');
                    else if (role === 'professional') navigate('/professional');
                    else navigate('/client');
                } else {
                    navigate('/');
                }
            }
        } catch (err: any) {
            setError(err.message || 'Error de autenticación');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-background-light dark:bg-background-dark">
            <div className="w-full max-w-md p-8 bg-card-light dark:bg-card-dark rounded-2xl shadow-xl border border-border-light dark:border-border-dark">
                <div className="flex justify-center mb-6">
                    <span className="material-symbols-outlined text-5xl text-primary">spa</span>
                </div>
                <h2 className="text-3xl font-bold text-center mb-2 text-text-main-light dark:text-text-main-dark">
                    {isRegistering ? 'Crear Cuenta' : 'Bienvenido'}
                </h2>
                <p className="text-center text-text-sec-light dark:text-text-sec-dark mb-8">
                    BeautyManager Pro
                </p>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800">
                        {error}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-text-sec-light dark:text-text-sec-dark">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 rounded-xl bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-text-main-light dark:text-text-main-dark"
                            placeholder="nombre@ejemplo.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-text-sec-light dark:text-text-sec-dark">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 rounded-xl bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-text-main-light dark:text-text-main-dark"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 mt-4 shadow-lg shadow-primary/30"
                    >
                        {loading ? 'Procesando...' : (isRegistering ? 'Registrarse' : 'Iniciar Sesión')}
                    </button>
                </form>

                <div className="mt-8 text-center pt-6 border-t border-border-light dark:border-border-dark">
                    <button
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="text-sm font-medium text-text-sec-light dark:text-text-sec-dark hover:text-primary transition-colors"
                    >
                        {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
