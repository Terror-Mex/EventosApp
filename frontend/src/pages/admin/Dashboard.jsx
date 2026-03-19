import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Users, CalendarDays, FileText, Activity } from 'lucide-react';
import dayjs from 'dayjs';
import { requestNotificationPermissionAndSaveToken, setupForegroundMessages } from '../../utils/firebase';

const AdminDashboard = () => {
    const [stats, setStats] = useState({ totalStaff: 0, totalEvents: 0, totalReports: 0 });
    const [recentEvents, setRecentEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Initialize FCM for Admin device to receive reports/check-in pushes
        requestNotificationPermissionAndSaveToken('/admin/fcm-token');
        const unsubscribe = setupForegroundMessages();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsRes, eventsRes] = await Promise.all([
                    api.get('/admin/dashboard'),
                    api.get('/admin/events')
                ]);
                setStats(statsRes.data);

                // Pick upcoming events
                const future = eventsRes.data
                    .filter(e => dayjs(e.fechaInicio).isAfter(dayjs().subtract(1, 'day')))
                    .sort((a, b) => dayjs(a.fechaInicio).diff(dayjs(b.fechaInicio)))
                    .slice(0, 5);

                setRecentEvents(future);
            } catch (error) {
                console.error('Error fetching admin dashboard', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    if (loading) return <div className="p-8 text-center text-primary">Cargando panel de administrador...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Panel de Control</h1>
                    <p className="text-sm text-gray-500 mt-1">Visión general del estado de EventPro</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link to="/admin/staff" className="btn-primary flex items-center shadow-lg hover:-translate-y-0.5 transition-transform">
                        <Users size={18} className="mr-2" /> Agregar Personal
                    </Link>
                    <Link to="/admin/reports" className="btn-primary flex items-center shadow-lg hover:-translate-y-0.5 transition-transform">
                        <FileText size={18} className="mr-2" /> Ver Reportes
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Personal" value={stats.totalStaff} icon={Users} color="bg-accent" />
                <StatCard title="Eventos Registrados" value={stats.totalEvents} icon={CalendarDays} color="bg-primary" />
                <StatCard title="Reportes Recibidos" value={stats.totalReports} icon={FileText} color="bg-success" />
            </div>

            <div className="grid grid-cols-1 gap-6 mt-8">
                <div className="card p-0 overflow-hidden shadow-sm">
                    <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center bg-gray-50">
                        <h2 className="font-bold text-gray-800">Próximos Eventos</h2>
                        <Link to="/admin/events" className="text-sm font-bold text-sidebar hover:text-sidebar/70 transition-colors">Ver todos</Link>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {recentEvents.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">No hay próximos eventos programados.</div>
                        ) : (
                            recentEvents.map(event => (
                                <div key={event.id} className="p-6 hover:bg-gray-50 transition-colors flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-gray-900">{event.nombre}</h3>
                                        <p className="text-xs text-gray-500 mt-1">{dayjs(event.fechaInicio).format('DD/MM/YYYY')} al {dayjs(event.fechaFin).format('DD/MM/YYYY')} • {event.ubicacion}</p>
                                    </div>
                                    <span className={`px-3 py-1 text-xs rounded-full font-bold ${event.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' :
                                        event.estado === 'EN_CURSO' ? 'bg-blue-100 text-blue-800' :
                                            'bg-green-100 text-green-800'
                                        }`}>
                                        {event.estado}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, color, textValue }) => (
    <div className="card overflow-hidden relative group">
        <div className={`absolute top-0 right-0 right-[-10px] top-[-10px] w-24 h-24 rounded-full ${color} opacity-10 group-hover:scale-150 transition-transform duration-500 ease-out`}></div>
        <div className="flex items-center justify-between relative z-10">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <p className={`text-3xl font-bold text-gray-900 ${textValue ? 'text-xl mt-1' : ''}`}>{value}</p>
            </div>
            <div className={`p-3 rounded-xl text-text ${color} shadow-md`}>
                <Icon size={24} />
            </div>
        </div>
    </div>
);

export default AdminDashboard;
