import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

interface ClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientToEdit?: any | null; // If null, it's create mode
    onSave: (clientData: any) => Promise<void>;
}

const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, clientToEdit, onSave }) => {
    const [name, setName] = useState('');
    const [role, setRole] = useState('client');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Reset or Load data
            if (clientToEdit) {
                setName(clientToEdit.name || '');
                setRole(clientToEdit.role || 'client');
                setPhone(clientToEdit.phone || '');
                setEmail(clientToEdit.email || '');
                setAvatar(clientToEdit.avatar || null);
            } else {
                setName('');
                setRole('client');
                setPhone('');
                setEmail('');
                setAvatar(null);
            }
            setPassword('');
            setFormError(null);
        }
    }, [isOpen, clientToEdit]);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(fileName, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            setAvatar(publicUrl);
        } catch (error) {
            console.error("Error uploading photo:", error);
            setFormError("Error al subir la imagen");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setIsSubmitting(true);

        try {
            await onSave({
                id: clientToEdit?.id,
                name,
                role,
                phone,
                email,
                avatar,
                password: password || undefined // Only send if set
            });
            onClose();
        } catch (error: any) {
            console.error("Error saving client:", error);
            setFormError(error.message || "Error al guardar el cliente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-primary text-white shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined">{clientToEdit ? 'edit' : 'person_add'}</span>
                        <h3 className="font-bold text-lg">{clientToEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1 transition-colors"><span className="material-symbols-outlined">close</span></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto">
                    {/* Avatar Edit Section */}
                    <div className="flex flex-col items-center gap-3 mb-2">
                        <div
                            className="relative group cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div
                                className="size-24 rounded-full bg-cover bg-center border-4 border-white dark:border-slate-800 shadow-md bg-gray-100 dark:bg-slate-700"
                                style={{ backgroundImage: avatar ? `url("${avatar}")` : 'none' }}
                            >
                                {!avatar && (
                                    <div className="size-full flex items-center justify-center text-gray-400">
                                        <span className="material-symbols-outlined text-4xl">person</span>
                                    </div>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-white">camera_alt</span>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handlePhotoUpload}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs font-bold text-primary hover:underline"
                        >
                            Cambiar Foto
                        </button>
                    </div>

                    {formError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                            <span className="material-symbols-outlined fill">error</span>
                            <span className="text-sm font-bold">{formError}</span>
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nombre Completo</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">person</span>
                            <input
                                required
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: María Pérez"
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 h-12 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:text-white outline-none transition-all"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Rol Asignado</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">badge</span>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 h-12 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:text-white outline-none transition-all appearance-none"
                            >
                                <option value="client">Cliente</option>
                                <option value="professional">Profesional</option>
                                <option value="admin">Administrador</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">expand_more</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Celular</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">smartphone</span>
                                <input
                                    required
                                    type="tel"
                                    maxLength={10}
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                    placeholder="10 dígitos"
                                    className={`w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 h-12 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:text-white outline-none transition-all`}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Email</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                                <input
                                    required
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="cliente@email.com"
                                    className={`w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 h-12 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:text-white outline-none transition-all`}
                                />
                            </div>
                        </div>
                        {!clientToEdit && (
                            <div className="flex flex-col gap-2 md:col-span-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Contraseña (Opcional)</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">lock</span>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Establecer contraseña inicial"
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 h-12 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:text-white outline-none transition-all"
                                    />
                                </div>
                                <p className="text-xs text-slate-500">Si estableces una contraseña, comunícasela al cliente.</p>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 mt-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                        <button type="submit" disabled={isSubmitting || !name || !email || phone.length !== 10} className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2">
                            {isSubmitting ? (
                                <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[20px]">save</span>
                                    {clientToEdit ? 'Guardar Cambios' : 'Registrar Cliente'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClientModal;
