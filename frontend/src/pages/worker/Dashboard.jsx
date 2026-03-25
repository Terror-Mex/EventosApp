import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Calendar, CheckSquare, Clock, ArrowRight, DollarSign, Camera, User as UserIcon } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

import { requestNotificationPermissionAndSaveToken, setupForegroundMessages } from '../../utils/firebase';

const WorkerDashboard = () => {
    const { user, updateUser } = useAuth();
    const [stats, setStats] = useState({ assignmentsCount: 0, checkinsCount: 0 });
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);

    const isHistoryEvent = (event) => {
        if (event.estado !== 'FINALIZADO') return false;
        try {
            const endDateTime = dayjs(`${event.fechaFin} ${event.horaFin || '23:59'}`);
            return dayjs().isAfter(endDateTime.add(6, 'hours'));
        } catch (e) {
            return true;
        }
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsRes, eventsRes] = await Promise.all([
                    api.get('/worker/dashboard'),
                    api.get('/worker/events')
                ]);
                setStats(statsRes.data);

                // Fetch payments for próximo pago card
                const paymentsRes = await api.get('/worker/payments');
                setPayments(paymentsRes.data || []);

                // Filter future events and sort by date
                const futureEvents = eventsRes.data
                    .filter(a => dayjs(a.event.fechaInicio).isAfter(dayjs().subtract(1, 'day')))
                    .sort((a, b) => dayjs(a.event.fechaInicio).diff(dayjs(b.event.fechaInicio)));

                setUpcomingEvents(futureEvents);
            } catch (error) {
                console.error('Error fetching dashboard', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const getQuincena = (dateString) => {
        if (!dateString) return null;
        const d = dayjs(dateString);
        if (!d.isValid()) return null;
        const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const half = d.date() <= 15 ? 'Primera' : 'Segunda';
        return `${half} Quincena de ${meses[d.month()]} ${d.year()}`;
    };

    // Compute próximo pago: sum of pending (non-paid) assignments grouped by next quincena
    const nextPaymentInfo = (() => {
        const pending = payments.filter(a => !a.pagado);
        if (pending.length === 0) return null;

        // Group by quincena and pick the earliest
        const groups = {};
        pending.forEach(a => {
            let refDate = a.event?.fechaInicio;
            try {
                if (a.diasSeleccionados) {
                    const dias = JSON.parse(a.diasSeleccionados);
                    if (dias && dias.length > 0) refDate = dias[dias.length - 1];
                }
            } catch(e) {}
            const key = getQuincena(refDate);
            if (!key) return;
            if (!groups[key]) groups[key] = { key, refDate, total: 0 };
            const total = (a.pagoAsignado || 0) * (a.diasAsignados || 1) + (a.pagoExtras || 0);
            groups[key].total += total;
        });

        const sorted = Object.values(groups).sort((a, b) => dayjs(a.refDate).diff(dayjs(b.refDate)));
        return sorted[0] || null;
    })();

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('photo', file);

        try {
            const res = await api.post('/worker/profile-picture', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            updateUser({ fotoPerfil: res.data.fotoPerfil });
            alert('Foto de perfil actualizada');
        } catch (error) {
            console.error('Error uploading photo', error);
            alert('Error al subir la foto');
        }
    };

    if (loading) return <div className="p-8 text-center text-primary">Cargando dashboard...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary shadow-md bg-gray-100 flex items-center justify-center">
                            {user?.fotoPerfil ? (
                                <img src={user.fotoPerfil} alt="Perfil" className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon size={32} className="text-gray-400" />
                            )}
                        </div>
                        <label className="absolute bottom-0 right-0 p-1.5 bg-sidebar text-primary rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform">
                            <Camera size={14} />
                            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                        </label>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 leading-tight">
                            Hola, {user?.nombre?.split(' ')[0]} 👋
                        </h1>
                        <span className="bg-gray-800 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm inline-block mt-1">
                            {user?.puesto}
                        </span>
                    </div>
                </div>
                <Link to="/worker/reports" className="btn-primary flex items-center shadow-lg hover:-translate-y-0.5 transition-transform">
                    <CheckSquare size={18} className="mr-2" /> Crear Nuevo Reporte
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <div className="card bg-gradient-to-br from-white to-gray-50 border-l-4 border-l-accent hover:-translate-y-1 transition-transform">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-accent/20 text-sidebar mr-4">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Total Eventos</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.assignmentsCount}</p>
                        </div>
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-white to-gray-50 border-l-4 border-l-success hover:-translate-y-1 transition-transform">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-success overflow-hidden text-sidebar mr-4 shadow-sm">
                            <CheckSquare size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Check-ins Realizados</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.checkinsCount}</p>
                        </div>
                    </div>
                </div>

                {/* Próximo Pago */}
                <div className="card col-span-2 md:col-span-1 bg-gradient-to-br from-white to-yellow-50 border-l-4 border-l-primary hover:-translate-y-1 transition-transform">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-primary/30 text-sidebar mr-4 shadow-sm">
                            <DollarSign size={24} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm text-gray-500 font-medium">Próximo Pago</p>
                            {nextPaymentInfo ? (
                                <>
                                    <p className="text-2xl font-bold text-gray-800">${nextPaymentInfo.total.toFixed(2)}</p>
                                    <p className="text-[10px] text-gray-400 font-medium truncate">{nextPaymentInfo.key}</p>
                                </>
                            ) : (
                                <p className="text-sm font-medium text-gray-400">Sin pagos pendientes</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Upcoming Events */}
            <div className="flex items-center justify-between mt-8 mb-4">
                <h2 className="text-xl font-bold text-gray-800">Próximos Eventos</h2>
                <div className="h-px flex-1 bg-gray-100 mx-4 hidden md:block"></div>
                {upcomingEvents.some(a => isHistoryEvent(a.event)) && (
                    <button 
                        onClick={() => setShowHistory(!showHistory)}
                        className="text-xs font-bold text-gray-500 hover:text-sidebar transition-colors bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100"
                    >
                        {showHistory ? 'Ocultar Finalizados' : 'Ver Finalizados'}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingEvents.filter(a => !isHistoryEvent(a.event)).length > 0 ? (
                    upcomingEvents.filter(a => !isHistoryEvent(a.event)).map(({ event, rolAsignado }) => (
                        <div key={event.id} className="card hover:shadow-lg transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-lg leading-tight text-gray-900">{event.nombre}</h3>
                                <span className={`px-2 py-1 text-xs rounded-md font-semibold ${event.estado === 'PENDIENTE' ? 'bg-primary/50 text-sidebar' :
                                    event.estado === 'EN_CURSO' ? 'bg-accent/40 text-sidebar' :
                                        'bg-success/50 text-sidebar'
                                    }`}>
                                    {event.estado}
                                </span>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-center text-sm text-gray-600">
                                    <Calendar size={16} className="mr-2 text-accent" />
                                    {dayjs(event.fechaInicio).format('DD/MM/YYYY')} al {dayjs(event.fechaFin).format('DD/MM/YYYY')}
                                </div>
                                <div className="flex items-center text-sm text-gray-600">
                                    <Clock size={16} className="mr-2 text-accent" />
                                    {event.horaInicio} - {event.horaFin}
                                </div>
                                <div className="flex items-center text-sm text-gray-600">
                                    <div className="w-4 h-4 rounded-full bg-gray-200 mr-2 flex items-center justify-center text-[10px]">📍</div>
                                    {event.ubicacion}
                                </div>
                                <div className="mt-3 bg-gray-50 p-2 rounded-lg text-sm border border-gray-100">
                                    <span className="font-semibold text-gray-700">Rol:</span> {rolAsignado}
                                </div>
                            </div>

                            <Link
                                to={`/worker/events`}
                                className="w-full flex items-center justify-center btn-primary py-2 text-sm mt-4"
                            >
                                Ver Detalle <ArrowRight size={16} className="ml-2" />
                            </Link>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full card text-center py-10 bg-gray-50 border-dashed">
                        <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                            <Calendar size={24} className="text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">No tienes próximos eventos activos.</p>
                    </div>
                )}
            </div>

            {showHistory && (
                <div className="mt-12 pt-8 border-t border-gray-100 animate-fade-in">
                    <h2 className="text-lg font-bold text-gray-400 mb-6">Historial de Eventos</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {upcomingEvents.filter(a => isHistoryEvent(a.event)).map(({ event, rolAsignado }) => (
                            <div key={event.id} className="card bg-gray-50 opacity-60 grayscale border-gray-100 p-4">
                                <h3 className="font-bold text-gray-600 truncate">{event.nombre}</h3>
                                <p className="text-xs text-gray-500 mt-1">{dayjs(event.fechaInicio).format('DD/MM/YY')}</p>
                                <p className="text-[10px] uppercase font-bold text-gray-400 mt-2">{rolAsignado}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkerDashboard;
