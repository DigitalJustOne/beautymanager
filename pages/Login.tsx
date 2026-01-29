
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const { session, role, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // Only disable the button when the form is actually submitting
    // NOT during initial auth check - that's shown with a separate loading screen
    const isButtonDisabled = formLoading;

    // Show loading screen if auth is still checking the initial session
    const isInitialAuthCheck = authLoading && !formLoading;

    // Only redirect if we have a session AND a role already (e.g., coming back to page)
    React.useEffect(() => {
        if (session && role) {
            console.log("Login: Redirecting role", role);
            if (role === 'admin') navigate('/');
            else if (role === 'professional') navigate('/professional');
            else navigate('/client');
        }
    }, [session, role, navigate]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError(null);

        try {
            if (isRegistering) {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (signUpError) throw signUpError;
                alert('¡Revisa tu email para confirmar tu cuenta!');
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
                // Redirection is handled by the useEffect above
            }
        } catch (err: any) {
            console.error("Auth error:", err);
            setFormError(err.message || 'Error de autenticación');
        } finally {
            setFormLoading(false);
        }
    };

    // Show a loading spinner if we're checking auth initially
    if (isInitialAuthCheck) {
        return (
            <div className="flex h-screen items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="text-text-sec-light dark:text-text-sec-dark">Verificando sesión...</p>
                </div>
            </div>
        );
    }

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

                {formError && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800">
                        {formError}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    {/* Google Login Button */}
                    <button
                        type="button"
                        onClick={async () => {
                            try {
                                setFormLoading(true);
                                console.log("Iniciando OAuth con URL de redirección:", window.location.origin);
                                
                                const { data, error } = await supabase.auth.signInWithOAuth({
                                    provider: 'google',
                                    options: {
                                        redirectTo: window.location.origin,
                                        skipBrowserRedirect: false,
                                    }
                                });

                                if (error) {
                                    console.error("Error en OAuth:", error);
                                    setFormError(error.message);
                                    // Alert para debug en móvil
                                    alert(`Error al conectar con Google: ${error.message}`);
                                    setFormLoading(false);
                                } else {
                                    // Si no hay error, la redirección debería ocurrir automáticamente.
                                    // Si data.url existe, podríamos forzarla, pero el SDK suele encargarse.
                                    console.log("OAuth iniciado correctamente:", data);
                                }
                            } catch (err: any) {
                                console.error("Excepción en OAuth:", err);
                                setFormError(err.message || "Error desconocido al iniciar sesión");
                                setFormLoading(false);
                            }
                        }}
                        disabled={isButtonDisabled}
                        className="w-full py-3 px-4 bg-white dark:bg-card-dark text-gray-700 dark:text-white font-bold rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-3 mb-4"
                    >
                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-5 h-5" />
                        Continuar con Google
                    </button>

                    <div className="relative flex items-center justify-center my-6">
                        <div className="border-t border-gray-200 dark:border-gray-700 w-full absolute"></div>
                        <span className="bg-card-light dark:bg-card-dark px-3 text-xs text-text-sec-light dark:text-text-sec-dark font-medium relative z-10 uppercase">O continúa con email</span>
                    </div>

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

                    <div className="flex justify-end">
                        <Link
                            to="/forgot-password"
                            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={isButtonDisabled}
                        className="w-full py-3 px-4 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 mt-4 shadow-lg shadow-primary/30"
                    >
                        {formLoading ? 'Procesando...' : (isRegistering ? 'Registrarse' : 'Iniciar Sesión')}
                    </button>
                </form>

                <div className="mt-8 text-center pt-6 border-t border-border-light dark:border-border-dark flex flex-col gap-4">
                    <button
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="text-sm font-medium text-text-sec-light dark:text-text-sec-dark hover:text-primary transition-colors"
                    >
                        {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
                    </button>
                    <span className="text-[10px] font-bold text-gray-300 dark:text-slate-600 uppercase tracking-widest">Version 1.1.2</span>
                </div>
            </div>
        </div>
    );
};

export default Login;
