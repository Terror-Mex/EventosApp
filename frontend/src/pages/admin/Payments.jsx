import { useState, useEffect } from 'react';
import api from '../../api/axios';
import dayjs from 'dayjs';
import { DollarSign, User, CheckCircle2, Clock, Calendar, Briefcase, Calculator, AlertCircle } from 'lucide-react';

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

    const getQuincena = (dateString) => {
        if (!dateString) return 'Sin Fecha';
        const d = dayjs(dateString);
        if (!d.isValid()) return 'Sin Fecha';
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const month = meses[d.month()];
        const year = d.year();
        const half = d.date() <= 15 ? 'Primera' : 'Segunda';
        return `${half} Quincena de ${month} ${year}`;
    };

    // Toggle bulk payment for a specific worker's quincena
    const bulkTogglePagado = async (assignmentsIds) => {
        if (!assignmentsIds || assignmentsIds.length === 0) return;
        try {
            await api.put(`/admin/assignments/bulk-pagar`, assignmentsIds);
            fetchPayments();
        } catch (error) {
            console.error('Error toggling payment status', error);
            alert("Hubo un error al guardar el estado de pago.");
        }
    };

    if (loading) return <div className="p-8 text-center text-primary font-medium animate-pulse">Cargando pagos...</div>;

    // Filter by tab
    const filteredPayments = payments.filter(asg => 
        activeTab === 'pendientes' ? !asg.pagado : asg.pagado
    );

    // Grouping logic: Quincena -> Worker -> Assignments
    const groupedByQuincena = filteredPayments.reduce((acc, assignment) => {
        let refDate = assignment.event?.fechaInicio;
        try {
            if (assignment.diasSeleccionados) {
                const dias = JSON.parse(assignment.diasSeleccionados);
                if (dias && dias.length > 0) refDate = dias[0];
            }
        } catch (e) {}
        
        const q = getQuincena(refDate);
        if (!acc[q]) acc[q] = [];
        acc[q].push(assignment);
        return acc;
    }, {});

    // Sort Quincenas so the newest is at the top conceptually (alphabetical works because of how we format strings but it's not ideal if you span multiple years, so we can sort them by the newest assignment date inside it)
    const sortedQuincenas = Object.keys(groupedByQuincena).sort((a, b) => {
        const dateA = dayjs(groupedByQuincena[a][0]?.event?.fechaInicio).valueOf();
        const dateB = dayjs(groupedByQuincena[b][0]?.event?.fechaInicio).valueOf();
        // Ascending sort (nearest event first)
        return dateA - dateB;
    });

    return (
        <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <DollarSign className="mr-2 text-green-600" size={28} /> Control de Pagos
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Cálculos quincenales y liquidaciones del personal.</p>
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

            {sortedQuincenas.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center flex flex-col items-center justify-center">
                    <AlertCircle size={40} className="text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No hay registros para mostrar en esta sección.</p>
                </div>
            ) : (
                <div className="space-y-10">
                    {sortedQuincenas.map(quincena => {
                        const quincenaAssignments = groupedByQuincena[quincena];

                        // Sort assignments inside quincena by date ascending
                        quincenaAssignments.sort((a, b) => dayjs(a.event?.fechaInicio).valueOf() - dayjs(b.event?.fechaInicio).valueOf());

                        // Agrupar por trabajador
                        const byWorker = quincenaAssignments.reduce((acc, asg) => {
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

                        const workersList = Object.values(byWorker).sort((a, b) => a.user?.nombre.localeCompare(b.user?.nombre));
                        const grandTotal = workersList.reduce((sum, w) => sum + w.total, 0);

                        return (
                            <div key={quincena} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                {/* Encabezado de la Quincena */}
                                <div className={`bg-gray-50/50 border-b border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between ${activeTab === 'pagados' ? 'opacity-70' : ''}`}>
                                    <h2 className="text-xl font-black text-gray-800 flex items-center">
                                        <Calendar className="mr-3 text-accent" /> {quincena}
                                    </h2>
                                    <div className="bg-success text-sidebar px-4 py-2 rounded-lg font-bold text-sm mt-4 md:mt-0 flex items-center shadow-sm border border-success/50 uppercase tracking-widest">
                                        <Calculator className="mr-2" size={16} /> Total: ${grandTotal.toFixed(2)}
                                    </div>
                                </div>

                                <div className="p-6 space-y-8">
                                    {workersList.map(workerData => {
                                        const asgIds = workerData.assignments.map(a => a.id);
                                        return (
                                            <div key={workerData.user?.id} className={`bg-white rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row border transition-all ${activeTab === 'pagados' ? 'border-gray-200 opacity-80' : 'border-gray-200 hover:shadow-md'}`}>
                                                
                                                {/* Header Trabajador (Left Col) */}
                                                <div className={`md:w-64 p-5 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r ${activeTab === 'pagados' ? 'bg-gray-100/50 border-gray-200' : 'bg-sidebar/5 border-sidebar/10'}`}>
                                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-xl mb-3 shadow-inner overflow-hidden border ${activeTab === 'pagados' ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-sidebar border-sidebar/10'}`}>
                                                        {workerData.user?.fotoPerfil ? (
                                                            <img src={workerData.user.fotoPerfil} alt="" className={`w-full h-full object-cover ${activeTab === 'pagados' ? 'grayscale opacity-50' : ''}`} />
                                                        ) : (
                                                            workerData.user?.nombre?.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <h3 className={`font-bold ${activeTab === 'pagados' ? 'text-gray-600' : 'text-gray-900'}`}>{workerData.user?.nombre}</h3>
                                                    <p className="text-xs text-gray-500 font-medium mb-3">{workerData.user?.email}</p>
                                                    
                                                    <div className={`font-black text-2xl mb-4 ${activeTab === 'pagados' ? 'text-gray-500' : 'text-[#6A994E]'}`}>
                                                        ${workerData.total.toFixed(2)}
                                                    </div>

                                                    <button
                                                        onClick={() => bulkTogglePagado(asgIds)}
                                                        className={`w-full py-2 text-xs font-bold rounded-lg transition-all shadow-sm ${
                                                            activeTab === 'pendientes'
                                                            ? 'bg-[#E3F2E1] text-[#4A7C32] hover:bg-[#D5EAD3] border border-[#A6D4A0]'
                                                            : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                                                        }`}
                                                    >
                                                        {activeTab === 'pendientes' ? 'Marcar quincena pagada' : 'Desmarcar pago'}
                                                    </button>
                                                </div>

                                                {/* Desglose Assignments (Right Col) */}
                                                <div className="flex-1 p-0 overflow-x-auto">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className={`text-[11px] uppercase font-bold tracking-wider ${activeTab === 'pagados' ? 'bg-gray-50 text-gray-400' : 'bg-gray-50/50 text-gray-500 border-b border-gray-100'}`}>
                                                            <tr>
                                                                <th className="px-5 py-3">Eventos de la quincena</th>
                                                                <th className="px-5 py-3 text-center">Fechas</th>
                                                                <th className="px-5 py-3 text-right">Desglose</th>
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
                                                                                    #{asg.event?.numeroEvento || 'S/N'}
                                                                                </span>
                                                                                <span className="text-xs text-sidebar/80 italic flex items-center">
                                                                                    {asg.rolAsignado || 'General'}
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-5 py-4 text-center">
                                                                            <div className="text-[11px] text-gray-500 font-medium whitespace-nowrap">
                                                                                {dayjs(asg.event?.fechaInicio).format('DD MMM')} al {dayjs(asg.event?.fechaFin).format('DD MMM')}
                                                                            </div>
                                                                            <div className="mt-1 font-bold text-[10px] tracking-wider text-accent uppercase">
                                                                                {dias} Día(s)
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-5 py-4 text-right">
                                                                            <div className="text-xs text-gray-500">${pagoBase} x {dias} d.</div>
                                                                            {extras > 0 && <div className="text-[10px] text-sidebar/60 mt-0.5">+ ${extras} extras</div>}
                                                                            <div className={`font-black mt-1 ${activeTab === 'pagados' ? 'text-gray-400' : 'text-[#6A994E]'}`}>
                                                                                = ${subtotal.toFixed(2)}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminPayments;
