import React from 'react';
import { useData } from '../context/DataContext';

const ProfessionalDashboard: React.FC = () => {
    const { appointments, userProfile, updateAppointmentStatus } = useData();
    const myAppointments = appointments.filter(a => a.professionalId === undefined /* Handle legacy */ ||
        // In a real app, we need to match the professional ID linked to the user.
        // For now, we rely on the backend RLS ensuring 'appointments' only contains allowed ones?
        // Wait, DataContext fetches ALL appointments indiscriminately currently?
        // Yes, DataContext 'fetchData' calls .select('*').
        // But with RLS now enabled, it will ONLY return the allowed ones!
        // So we can just use 'appointments' directly!
        true
    );

    // Sort by date
    const sortedAppointments = [...myAppointments].sort((a, b) =>
        (a.date && b.date) ? a.date.getTime() - b.date.getTime() : 0
    );

    return (
        <div className="p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-text-main-light dark:text-text-main-dark mb-2">
                    Hola, {userProfile.name}
                </h1>
                <p className="text-text-sec-light dark:text-text-sec-dark">
                    Gestiona tus citas programadas.
                </p>
            </header>

            <div className="bg-card-light dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-border-light dark:border-border-dark">
                <h2 className="text-xl font-bold mb-4">Próximas Citas</h2>

                {sortedAppointments.length === 0 ? (
                    <p className="text-text-sec-light dark:text-text-sec-dark">No tienes citas programadas.</p>
                ) : (
                    <div className="space-y-4">
                        {sortedAppointments.map(appt => (
                            <div key={appt.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-background-light dark:bg-background-dark rounded-xl border border-border-light dark:border-border-dark">
                                <div className="flex items-center gap-4 mb-3 md:mb-0">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                        {appt.time}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-text-main-light dark:text-text-main-dark">{appt.client}</h3>
                                        <p className="text-sm text-text-sec-light dark:text-text-sec-dark">{appt.service} • {appt.duration}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${appt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                            appt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {appt.status.toUpperCase()}
                                    </span>
                                    {appt.status !== 'cancelled' && (
                                        <div className="flex gap-1">
                                            {appt.status === 'pending' && (
                                                <button
                                                    onClick={() => updateAppointmentStatus(appt.id, 'confirmed')}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                                    title="Confirmar"
                                                >
                                                    <span className="material-symbols-outlined">check</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => updateAppointmentStatus(appt.id, 'cancelled')}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                title="Cancelar"
                                            >
                                                <span className="material-symbols-outlined">close</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfessionalDashboard;
