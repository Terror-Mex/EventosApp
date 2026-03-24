import { useState, useEffect } from 'react';
import api from '../../api/axios';
import dayjs from 'dayjs';
import { DollarSign, CheckCircle2, Clock, Calculator, AlertCircle, Calendar } from 'lucide-react';

const AdminPayments = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pendientes'); // 'pendientes' | 'pagados'

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/payments');
            setPayments(res.data);
        } catch (error) {
            console.error('Error fetching payments', error);
        } finally {
            setLoading(false);
        }
    };

    const togglePagado = async (id) => {
        try {
            await api.put(`/admin/assignments/${id}/pagar`);
            // Optimistic update
            setPayments(prev => prev.map(p => p.id === id ? { ...p, pagado: !p.pagado } : p));
        } catch (error) {
            console.error('Error toggling payment status', error);
            alert("Hubo un error al guardar el estado de pago.");
            fetchPayments(); // rollback
        }
    };

    if (loading) return <div className="p-8 text-center text-primary font-medium animate-pulse">Cargando pagos...</div>;

    // Filtration
    const filteredPayments = payments.filter(asg =>
        activeTab === 'pendientes' ? !asg.pagado : asg.pagado
    );

    // Sort ascending by event date (nearest first)
    const sortedPayments = [...filteredPayments].sort((a, b) => {
        return dayjs(a.event?.fechaInicio).valueOf() - dayjs(b.event?.fechaInicio).valueOf();
    });

    // Grouping strictly by worker for this tab
    const groupedByWorker = sortedPayments.reduce((acc, asg) => {
        const workerId = asg.user?.id || 0;
        if (!acc[workerId]) {
            acc[workerId] = {
                user: asg.user,
                assignments: [],
                total: 0
            };
        }
        acc[workerId].assignments.push(asg);

        const dias = asg.diasAsignados || 1;
        const pagoBase = asg.pagoAsignado || 0;
        const extras = asg.pagoExtras || 0;
        acc[workerId].total += (dias * pagoBase) + extras;
        
        return acc;
    }, {});

    const workersList = Object.values(groupedByWorker).sort((a, b) => a.user?.nombre.localeCompare(b.user?.nombre));
    const grandTotal = workersList.reduce((sum, w) => sum + w.total, 0);

    return (
        <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <DollarSign className="mr-2 text-green-600" size={28} /> Control de Pagos
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Monitorea y liquida los pagos operativos de tu personal por evento.
                    </p>
                </div>
                <div className="bg-success/15 text-[#588040] px-4 py-2.5 rounded-xl font-bold flex items-center shadow-sm border border-success/30">
                    <Calculator className="mr-2" size={20} /> Total de esta lista: ${grandTotal.toFixed(2)}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-fit font-medium">
                <button
                    onClick={() => setActiveTab('pendientes')}
                    className={`flex-1 md:px-8 py-2 rounded-lg transition-all flex justify-center items-center ${activeTab === 'pendientes' ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Clock size={16} className="mr-2" />
                    Pagos Pendientes
                </button>
                <button
                    onClick={() => setActiveTab('pagados')}
                    className={`flex-1 md:px-8 py-2 rounded-lg transition-all flex justify-center items-center ${activeTab === 'pagados' ? 'bg-white shadow-sm text-[#588040] font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <CheckCircle2 size={16} className="mr-2" />
                    Historial Pagados
                </button>
            </div>

            {workersList.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center flex flex-col items-center justify-center">
                    <AlertCircle size={40} className="text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No hay registros en esta sección.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {workersList.map(workerData => (
                        <div key={workerData.user?.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${activeTab === 'pagados' ? 'border-gray-200 opacity-80' : 'border-gray-200'}`}>
                            
                            {/* Header Trabajador */}
                            <div className={`p-4 border-b flex items-center justify-between ${activeTab === 'pagados' ? 'bg-gray-100/50 border-gray-200' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${activeTab === 'pagados' ? 'bg-gray-200 text-gray-500' : 'bg-accent/30 text-sidebar'}`}>
                                        {workerData.user?.nombre?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className={`font-bold ${activeTab === 'pagados' ? 'text-gray-600' : 'text-gray-900'}`}>{workerData.user?.nombre}</h3>
                                        <p className="text-xs text-gray-500 font-medium">{workerData.user?.email}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">Subtotal Ficha</span>
                                    <span className={`font-black text-xl ${activeTab === 'pagados' ? 'text-gray-500' : 'text-[#6A994E]'}`}>
                                        ${workerData.total.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Desglose Assignments */}
                            <div className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className={`text-[11px] uppercase font-bold tracking-wider ${activeTab === 'pagados' ? 'bg-gray-50 text-gray-400' : 'bg-white text-gray-500 border-b border-gray-100'}`}>
                                            <tr>
                                                <th className="px-5 py-3">Evento</th>
                                                <th className="px-5 py-3 text-center">Fechas / Días</th>
                                                <th className="px-5 py-3 text-right">Tarifa</th>
                                                <th className="px-5 py-3 text-right">Extras</th>
                                                <th className="px-5 py-3 text-right font-black">Total</th>
                                                <th className="px-5 py-3 text-center">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {workerData.assignments.map(asg => {
                                                const dias = asg.diasAsignados || 1;
                                                const pagoBase = asg.pagoAsignado || 0;
                                                const extras = asg.pagoExtras || 0;
                                                const subtotal = (dias * pagoBase) + extras;
                                                
                                                return (
                                                    <tr key={asg.id} className={`hover:bg-gray-50/50 transition-colors ${activeTab === 'pagados' ? 'text-gray-500' : ''}`}>
                                                        <td className="px-5 py-4">
                                                            <div className={`font-bold ${activeTab === 'pagados' ? 'text-gray-500' : 'text-gray-900'}`}>
                                                                {asg.event?.nombre}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider">
                                                                    #{asg.event?.numeroEvento || 'SIN-NUM'}
                                                                </span>
                                                                <span className="text-xs text-sidebar/80 italic flex items-center">
                                                                    {asg.rolAsignado || 'General'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 text-center">
                                                            <div className="text-xs text-gray-500 flex items-center justify-center font-medium">
                                                                <Calendar size={12} className="mr-1" />
                                                                {dayjs(asg.event?.fechaInicio).format('DD MMM')}
                                                            </div>
                                                            <div className="mt-1 font-bold text-[11px] tracking-wider text-accent uppercase">
                                                                {dias} Día(s)
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 text-right">
                                                            <span className="text-gray-600 font-medium">${pagoBase.toFixed(2)}</span>
                                                        </td>
                                                        <td className="px-5 py-4 text-right">
                                                            <span className="text-sidebar/60 font-medium">${extras.toFixed(2)}</span>
                                                        </td>
                                                        <td className="px-5 py-4 text-right">
                                                            <span className={`font-black ${activeTab === 'pagados' ? 'text-gray-500' : 'text-[#6A994E]'}`}>
                                                                ${subtotal.toFixed(2)}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-4 text-center">
                                                            <button
                                                                onClick={() => togglePagado(asg.id)}
                                                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm ${
                                                                    activeTab === 'pendientes'
                                                                    ? 'bg-[#E3F2E1] text-[#4A7C32] hover:bg-[#D5EAD3] border border-[#A6D4A0]'
                                                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200'
                                                                }`}
                                                            >
                                                                {activeTab === 'pendientes' ? 'Marcar Pagado' : 'Desmarcar'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminPayments;
