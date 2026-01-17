import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Link } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            // Redirect to the current site URL. 
            // Supabase will append #access_token=... type=recovery etc.
            // The app's AuthEventHandler will detect 'PASSWORD_RECOVERY' and redirect to /update-password
            const redirectTo = window.location.origin;

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectTo,
            });

            if (error) throw error;

            setMessage('Se ha enviado un enlace de recuperación a tu correo electrónico.');
        } catch (err: any) {
            console.error("Error resetting password:", err);
            setError(err.message || "Error al enviar el correo de recuperación.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-background-light dark:bg-background-dark p-4">
            <div className="w-full max-w-md p-8 bg-card-light dark:bg-card-dark rounded-2xl shadow-xl border border-border-light dark:border-border-dark">
                <div className="flex justify-center mb-6">
                    <span className="material-symbols-outlined text-5xl text-primary">lock_reset</span>
                </div>
                <h2 className="text-3xl font-bold text-center mb-2 text-text-main-light dark:text-text-main-dark">
                    Recuperar Contraseña
                </h2>
                <p className="text-center text-text-sec-light dark:text-text-sec-dark mb-8">
                    Ingresa tu correo para recibir un enlace de restablecimiento.
                </p>

                {message && (
                    <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg text-sm border border-green-200 dark:border-green-800">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800">
                        {error}
                    </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-4">
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 mt-4 shadow-lg shadow-primary/30"
                    >
                        {loading ? 'Enviando...' : 'Enviar Enlace'}
                    </button>
                </form>

                <div className="mt-8 text-center pt-6 border-t border-border-light dark:border-border-dark">
                    <Link
                        to="/login"
                        className="text-sm font-medium text-text-sec-light dark:text-text-sec-dark hover:text-primary transition-colors flex items-center justify-center gap-1"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
