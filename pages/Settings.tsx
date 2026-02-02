import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { supabase } from '../services/supabase';
import { compressImage } from '../utils/imageCompression';

const Settings: React.FC = () => {
    const { userProfile, updateUserProfile } = useData();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSaved, setIsSaved] = useState(false);

    // Estados locales para el formulario del perfil
    const [formData, setFormData] = useState({
        name: userProfile.name,
        role: userProfile.role,
        specialty: userProfile.specialty,
        phone: userProfile.phone,
        email: userProfile.email,
        avatar: userProfile.avatar,
        city: userProfile.city || '',
        isGoogleCalendarConnected: userProfile.isGoogleCalendarConnected,
        schedule: userProfile.schedule
    });

    // Sincronizar el formulario cuando el perfil cargue desde el servidor
    useEffect(() => {
        if (userProfile.name !== 'Usuario' || userProfile.email !== '') {
            setFormData({
                name: userProfile.name,
                role: userProfile.role,
                specialty: userProfile.specialty,
                phone: userProfile.phone,
                email: userProfile.email,
                avatar: userProfile.avatar,
                city: userProfile.city || '',
                isGoogleCalendarConnected: userProfile.isGoogleCalendarConnected,
                schedule: userProfile.schedule
            });
        }
    }, [userProfile]);

    // Password State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleScheduleChange = (index: number, field: string, value: any) => {
        const newSchedule = [...formData.schedule];
        newSchedule[index] = { ...newSchedule[index], [field]: value };
        setFormData(prev => ({ ...prev, schedule: newSchedule }));
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                // Compression
                const compressedBlob = await compressImage(file, 500, 0.7);
                // const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' }); // No longer needed

                // Sanitize filename
                const cleanEmail = userProfile.email?.replace(/[^a-zA-Z0-9]/g, '') || 'user';
                const fileName = `profile_${cleanEmail}_${Date.now()}.jpg`;

                console.log(`Uploading ${fileName} (Size: ${compressedBlob.size} bytes)`);

                // Upload Blob directly
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, compressedBlob, {
                        contentType: 'image/jpeg',
                        upsert: true,
                        cacheControl: '3600'
                    });

                if (uploadError) throw uploadError;

                // Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(fileName);

                setFormData(prev => ({ ...prev, avatar: publicUrl }));
            } catch (error: any) {
                console.error("Error uploading profile photo:", error);
                alert(`Error al subir la imagen: ${error.message || error.error_description || 'Error desconocido'}`);
            }
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleSave = () => {
        updateUserProfile(formData);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

    const toggleGoogleCalendar = () => {
        setFormData(prev => ({ ...prev, isGoogleCalendarConnected: !prev.isGoogleCalendarConnected }));
    };

    const handlePasswordUpdate = async () => {
        setPasswordMessage(null);
        if (!newPassword) return;

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
            return;
        }

        if (newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: 'Mínimo 6 caracteres.' });
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setPasswordMessage({ type: 'success', text: 'Contraseña actualizada.' });
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setPasswordMessage(null), 3000);
        } catch (err: any) {
            console.error("Error updating password:", err);
            setPasswordMessage({ type: 'error', text: 'Error al actualizar.' });
        }
    };

    return (
        <div className="px-4 md:px-10 lg:px-40 flex flex-1 justify-center py-8">
            <div className="layout-content-container flex flex-col w-full max-w-[960px] flex-1 gap-8">
                {/* Page Header */}
                <div className="flex flex-wrap justify-between items-center gap-4 sticky top-0 bg-background-light dark:bg-background-dark z-20 py-4 -my-4 backdrop-blur-sm bg-opacity-90">
                    <div>
                        <h1 className="text-[#111618] dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Configuración</h1>
                        <p className="text-[#617c89] dark:text-gray-400 mt-2 text-sm">Personaliza tu perfil y la configuración de la tienda.</p>
                    </div>
                    <button
                        onClick={handleSave}
                        className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-11 px-6 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all active:scale-95 group"
                    >
                        {isSaved ? (
                            <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">check</span>Guardado</span>
                        ) : (
                            <span className="truncate">Guardar cambios</span>
                        )}
                    </button>
                </div>

                {/* Grid Layout */}
                <div className={`grid grid-cols-1 ${userProfile.role === 'client' ? 'max-w-3xl mx-auto' : 'lg:grid-cols-3'} gap-6`}>
                    {/* Left Column (Main Settings) */}
                    <div className={`${userProfile.role === 'client' ? 'col-span-1' : 'lg:col-span-2'} flex flex-col gap-6`}>

                        {/* Profile Card */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-[#f0f3f4] dark:border-gray-800">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">person</span>
                                Datos Personales
                            </h3>
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
                                <div className="relative group cursor-pointer" onClick={triggerFileInput}>
                                    <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-24 md:size-32 shadow-inner border-4 border-white dark:border-gray-800" style={{ backgroundImage: `url("${formData.avatar}")` }}></div>
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="material-symbols-outlined text-white">camera_alt</span>
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
                                </div>
                                <div className="flex flex-col gap-2 flex-1 w-full text-center sm:text-left">
                                    <div className="flex flex-col gap-1">
                                        <h4 className="text-xl font-bold dark:text-white">{formData.name || 'Tu Nombre'}</h4>
                                        <p className="text-[#617c89] dark:text-gray-400 capitalize">{formData.role === 'client' ? 'Cliente' : formData.role}</p>
                                    </div>
                                    <button onClick={triggerFileInput} className="mt-2 text-primary font-bold text-sm hover:underline self-center sm:self-start">Cambiar Foto</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <label className="flex flex-col gap-2">
                                    <span className="text-sm font-bold text-[#111618] dark:text-gray-200">Nombre Completo</span>
                                    <input name="name" onChange={handleChange} value={formData.name} className="form-input w-full rounded-xl border border-[#dbe2e6] dark:border-gray-700 bg-[#f8fafc] dark:bg-gray-800 px-4 h-12 text-sm focus:border-primary focus:ring-primary dark:text-white" type="text" />
                                </label>

                                {userProfile.role !== 'client' && (
                                    <>
                                        <label className="flex flex-col gap-2">
                                            <span className="text-sm font-bold text-[#111618] dark:text-gray-200">Rol / Cargo</span>
                                            <input name="role" onChange={handleChange} value={formData.role} className="form-input w-full rounded-xl border border-[#dbe2e6] dark:border-gray-700 bg-[#f8fafc] dark:bg-gray-800 px-4 h-12 text-sm focus:border-primary focus:ring-primary dark:text-white" type="text" />
                                        </label>
                                        <label className="flex flex-col gap-2">
                                            <span className="text-sm font-bold text-[#111618] dark:text-gray-200">Especialidad</span>
                                            <input name="specialty" onChange={handleChange} value={formData.specialty} className="form-input w-full rounded-xl border border-[#dbe2e6] dark:border-gray-700 bg-[#f8fafc] dark:bg-gray-800 px-4 h-12 text-sm focus:border-primary focus:ring-primary dark:text-white" type="text" />
                                        </label>
                                    </>
                                )}

                                <label className="flex flex-col gap-2">
                                    <span className="text-sm font-bold text-[#111618] dark:text-gray-200">WhatsApp / Celular</span>
                                    <input name="phone" onChange={handleChange} value={formData.phone} className="form-input w-full rounded-xl border border-[#dbe2e6] dark:border-gray-700 bg-[#f8fafc] dark:bg-gray-800 px-4 h-12 text-sm focus:border-primary focus:ring-primary dark:text-white" type="tel" />
                                </label>

                                {userProfile.role === 'client' && (
                                    <label className="flex flex-col gap-2">
                                        <span className="text-sm font-bold text-[#111618] dark:text-gray-200">Ciudad</span>
                                        <input name="city" onChange={handleChange} value={formData.city || ''} className="form-input w-full rounded-xl border border-[#dbe2e6] dark:border-gray-700 bg-[#f8fafc] dark:bg-gray-800 px-4 h-12 text-sm focus:border-primary focus:ring-primary dark:text-white" type="text" placeholder="Ej: Bogotá" />
                                    </label>
                                )}

                                <div className={`${userProfile.role === 'client' ? 'md:col-span-1' : 'md:col-span-2'}`}>
                                    <label className="flex flex-col gap-2">
                                        <span className="text-sm font-bold text-[#111618] dark:text-gray-200">Correo Electrónico</span>
                                        <input name="email" onChange={handleChange} value={formData.email} className="form-input w-full rounded-xl border border-[#dbe2e6] dark:border-gray-700 bg-[#f8fafc] dark:bg-gray-800 px-4 h-12 text-sm focus:border-primary focus:ring-primary dark:text-white" type="email" />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Integrations (Keep for everyone for Google Calendar/Reminders) */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-[#f0f3f4] dark:border-gray-800">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><span className="material-symbols-outlined text-primary">sync_alt</span>Sincronización</h3>
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-5 rounded-xl bg-[#f8fafc] dark:bg-gray-800 border border-[#eff1f3] dark:border-gray-700">
                                <div className="flex items-center gap-4">
                                    <div className="bg-white dark:bg-gray-700 p-3 rounded-full shadow-sm">
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google Calendar" className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#111618] dark:text-white">Google Calendar</h4>
                                        <p className="text-sm text-[#617c89] dark:text-gray-400 mt-1">
                                            {formData.isGoogleCalendarConnected
                                                ? 'Tus citas se sincronizan automáticamente.'
                                                : 'Conecta para recibir recordatorios en tu calendario.'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={toggleGoogleCalendar}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${formData.isGoogleCalendarConnected
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800'
                                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
                                        }`}
                                >
                                    {formData.isGoogleCalendarConnected ? (
                                        <><span className="material-symbols-outlined text-[16px]">check_circle</span>Conectado</>
                                    ) : (
                                        <><span className="material-symbols-outlined text-[16px]">link_off</span>Conectar</>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Security / Password Section */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-[#f0f3f4] dark:border-gray-800">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">lock</span>
                                Seguridad de la Cuenta
                            </h3>
                            <div className="flex flex-col gap-4 max-w-lg">
                                <p className="text-sm text-[#617c89] dark:text-gray-400">Si iniciaste sesión con Google, puedes establecer una contraseña aquí para acceder desde otros dispositivos sin usar Google.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="flex flex-col gap-2">
                                        <span className="text-sm font-bold text-[#111618] dark:text-gray-200">Nueva Contraseña</span>
                                        <input
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="form-input w-full rounded-xl border border-[#dbe2e6] dark:border-gray-700 bg-[#f8fafc] dark:bg-gray-800 px-4 h-12 text-sm focus:border-primary focus:ring-primary dark:text-white"
                                            type="password"
                                            placeholder="••••••••"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-2">
                                        <span className="text-sm font-bold text-[#111618] dark:text-gray-200">Confirmar Contraseña</span>
                                        <div className="flex gap-2">
                                            <input
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="form-input w-full rounded-xl border border-[#dbe2e6] dark:border-gray-700 bg-[#f8fafc] dark:bg-gray-800 px-4 h-12 text-sm focus:border-primary focus:ring-primary dark:text-white"
                                                type="password"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                onClick={handlePasswordUpdate}
                                                disabled={!newPassword}
                                                className="bg-primary text-white rounded-xl px-4 font-bold disabled:opacity-50 hover:bg-primary/90 transition-colors"
                                            >
                                                Actualizar
                                            </button>
                                        </div>
                                    </label>
                                </div>
                                {passwordMessage && (
                                    <div className={`text-sm font-bold flex items-center gap-2 ${passwordMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                        <span className="material-symbols-outlined text-[18px]">{passwordMessage.type === 'success' ? 'check_circle' : 'error'}</span>
                                        {passwordMessage.text}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column (Schedule) - HIDE FOR CLIENTS */}
                    {userProfile.role !== 'client' && (
                        <div className="lg:col-span-1 flex flex-col gap-6">
                            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-[#f0f3f4] dark:border-gray-800 h-full flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="text-lg font-bold flex items-center gap-2"><span className="material-symbols-outlined text-primary">schedule</span>Horario</h3>
                                        <p className="text-xs text-gray-500 mt-1">Define tu disponibilidad semanal para citas.</p>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-1 space-y-6 mt-4">
                                    {formData.schedule.map((day, index) => (
                                        <div key={day.day} className="flex flex-col gap-2 pb-4 border-b border-dashed border-gray-100 dark:border-gray-700 last:border-0">
                                            <div className="flex items-center justify-between">
                                                <span className={`font-bold text-sm ${day.enabled ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>{day.day}</span>
                                                <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                                                    <input
                                                        type="checkbox"
                                                        checked={day.enabled}
                                                        onChange={(e) => handleScheduleChange(index, 'enabled', e.target.checked)}
                                                        className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300 dark:border-gray-600 checked:right-0 checked:border-primary transition-all duration-200 top-0 left-0"
                                                    />
                                                    <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ${day.enabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}></label>
                                                </div>
                                            </div>

                                            {/* Inputs Logic similar to screenshot */}
                                            {day.enabled ? (
                                                <div className="flex gap-2 items-center mt-1 animate-in fade-in duration-200">
                                                    <input
                                                        value={day.start}
                                                        onChange={(e) => handleScheduleChange(index, 'start', e.target.value)}
                                                        className="w-full text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 text-center dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                                        type="time"
                                                    />
                                                    <span className="text-gray-400 text-xs">-</span>
                                                    <input
                                                        value={day.end}
                                                        onChange={(e) => handleScheduleChange(index, 'end', e.target.value)}
                                                        className="w-full text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 text-center dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                                        type="time"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="mt-2 text-center py-2">
                                                    <span className="text-[10px] font-bold tracking-widest text-[#ff8a80] uppercase">Cerrado</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;