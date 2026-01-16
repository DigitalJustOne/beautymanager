import React from 'react';
import { useData } from '../context/DataContext';

const ClientDashboard: React.FC = () => {
    const { appointments, userProfile, updateUserProfile } = useData();

    // RLS filters appointments for us
    const myAppointments = appointments;

    const [isEditing, setIsEditing] = React.useState(false);
    const [editName, setEditName] = React.useState(userProfile.name);
    const [editPhone, setEditPhone] = React.useState(userProfile.phone);

    const handleSaveProfile = async () => {
        await updateUserProfile({
            name: editName,
            phone: editPhone
        });
        setIsEditing(false);
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <header className="mb-8 text-center">
                <div className="inline-block relative">
                    <img
                        src={userProfile.avatar}
                        alt={userProfile.name}
                        className="w-24 h-24 rounded-full border-4 border-primary/20 mb-4 mx-auto"
                    />
                    <button className="absolute bottom-4 right-0 p-1 bg-primary text-white rounded-full text-xs">
                        <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                </div>
                <h1 className="text-3xl font-bold text-text-main-light dark:text-text-main-dark">
                    Hola, {userProfile.name}
                </h1>
                <p className="text-text-sec-light dark:text-text-sec-dark">
                    Bienvenido a tu espacio personal.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Card */}
                <div className="bg-card-light dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-border-light dark:border-border-dark">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">Mis Datos</h2>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="text-primary text-sm font-bold hover:underline"
                        >
                            {isEditing ? 'Cancelar' : 'Editar'}
                        </button>
                    </div>

                    {isEditing ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-text-sec-light">Nombre</label>
                                <input
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="w-full mt-1 p-2 rounded border border-border-light dark:bg-background-dark"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-text-sec-light">Teléfono</label>
                                <input
                                    value={editPhone}
                                    onChange={e => setEditPhone(e.target.value)}
                                    className="w-full mt-1 p-2 rounded border border-border-light dark:bg-background-dark"
                                />
                            </div>
                            <button
                                onClick={handleSaveProfile}
                                className="w-full py-2 bg-primary text-white rounded-lg font-bold"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-text-sec-light">mail</span>
                                <span>{userProfile.email}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-text-sec-light">call</span>
                                <span>{userProfile.phone || 'Sin teléfono'}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Appointments Card */}
                <div className="bg-card-light dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-border-light dark:border-border-dark">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">Mis Citas</h2>
                        <button className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full font-bold hover:bg-primary/20">
                            + Nueva Cita
                        </button>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {myAppointments.length === 0 ? (
                            <p className="text-center py-8 text-text-sec-light">No tienes citas agendadas.</p>
                        ) : (
                            myAppointments.map(appt => (
                                <div key={appt.id} className="p-3 bg-background-light dark:bg-background-dark rounded-xl border border-border-light dark:border border-l-4 border-l-primary">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold">{appt.service}</p>
                                            <p className="text-sm text-text-sec-light">{appt.date?.toLocaleDateString()} - {appt.time}</p>
                                            {appt.professionalName && (
                                                <p className="text-xs mt-1 text-primary">con {appt.professionalName}</p>
                                            )}
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded ${appt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {appt.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientDashboard;
