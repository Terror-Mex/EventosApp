import { useState, useEffect } from 'react';
import api from '../../api/axios';
import dayjs from 'dayjs';
import { DollarSign, Clock, CheckCircle2, Briefcase, Calculator, AlertCircle, Calendar } from 'lucide-react';

const WorkerPayments = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pendientes'); // 'pendientes' | 'pagados'

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const res = await api.get('/worker/payments');
            setPayments(res.data);
        } catch (error) {
            console.error('Error fetching payments', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-primary font-medium animate-pulse">Cargando mis pagos...</div>;

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

    // Filter by tab
    const filteredPayments = payments.filter(asg => 
        activeTab === 'pendientes' ? !asg.pagado : asg.pagado
    );

    // Group by Quincena
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

    const sortedQuincenas = Object.keys(groupedByQuincena).sort((a, b) => {
        const dateA = dayjs(groupedByQuincena[a][0]?.event?.fechaInicio).valueOf();
        const dateB = dayjs(groupedByQuincena[b][0]?.event?.fechaInicio).valueOf();
        return dateA - dateB;
    });

    let overallTotal = 0;

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <DollarSign className="mr-2 text-green-600" size={28} /> Mis Pagos
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Control de tus ganancias operativas por quincena.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-fit font-medium">
                <button
                    onClick={() => setActiveTab('pendientes')}
                    className={`flex-1 md:px-8 py-2 rounded-lg transition-all flex justify-center items-center ${activeTab === 'pendientes' ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Clock size={16} className="mr-2" />
                    Por cobrar
                </button>
                <button
                    onClick={() => setActiveTab('pagados')}
                    className={`flex-1 md:px-8 py-2 rounded-lg transition-all flex justify-center items-center ${activeTab === 'pagados' ? 'bg-white shadow-sm text-[#588040] font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <CheckCircle2 size={16} className="mr-2" />
                    Historial Recibidos
                </button>
            </div>

            {sortedQuincenas.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center flex flex-col items-center justify-center">
                    <AlertCircle size={40} className="text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No hay registros en esta sección.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {sortedQuincenas.map(quincena => {
                        const quincenaAssignments = groupedByQuincena[quincena];

                        // Date sort within quincena
                        quincenaAssignments.sort((a, b) => dayjs(a.event?.fechaInicio).valueOf() - dayjs(b.event?.fechaInicio).valueOf());

                        let totalQuincena = 0;
                        const assignmentsWithTotal = quincenaAssignments.map(asg => {
                            const dias = asg.diasAsignados || 1;
                            const pagoBase = asg.pagoAsignado || 0;
                            const extras = asg.pagoExtras || 0;
                            const subtotal = (dias * pagoBase) + extras;
                            totalQuincena += subtotal;
                            return { ...asg, subtotal, dias, pagoBase, extras };
                        });
                        
                        overallTotal += totalQuincena;

                        return (
                            <div key={quincena} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className={`bg-gray-50 border-b border-gray-200 p-6 flex flex-col sm:flex-row items-center justify-between ${activeTab === 'pagados' ? 'opacity-70' : ''}`}>
                                    <h2 className="text-xl font-black text-gray-800 flex items-center">
                                        <Calendar className="mr-3 text-accent" /> {quincena}
                                    </h2>
                                    <div className="bg-success text-sidebar px-4 py-2 rounded-lg font-bold text-lg flex items-center mt-4 sm:mt-0 shadow-sm border border-success/50 uppercase tracking-wider">
                                        Total a Recibir: ${totalQuincena.toFixed(2)}
                                    </div>
                                </div>

                                <div className="p-0 sm:p-6">
                                    <div className="space-y-0 sm:space-y-4">
                                        {assignmentsWithTotal.map(asg => (
                                            <div key={asg.id} className={`border-b sm:border border-gray-100 sm:rounded-xl p-4 md:p-5 hover:bg-gray-50 transition-colors bg-white ${activeTab === 'pagados' ? 'opacity-70 saturate-50' : ''}`}>
                                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">

                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className={`font-bold text-lg md:text-xl ${activeTab === 'pagados' ? 'text-gray-500' : 'text-gray-900'}`}>
                                                                {asg.event?.nombre}
                                                            </h3>
                                                            {asg.event?.numeroEvento && (
                                                                <span className="bg-gray-200 text-gray-700 text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded ml-2">
                                                                    #{asg.event.numeroEvento}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center text-sm text-gray-500 font-medium">
                                                            <Briefcase className="mr-1.5" size={14} />
                                                            {asg.rolAsignado || 'Operador'}
                                                            <span className="mx-2 text-gray-300">•</span>
                                                            {dayjs(asg.event?.fechaInicio).format('DD MMM')} al {dayjs(asg.event?.fechaFin).format('DD MMM')}
                                                        </div>
                                                        {asg.diasSeleccionados && (() => {
                                                            try {
                                                                const ds = JSON.parse(asg.diasSeleccionados);
                                                                if (ds && ds.length > 0) return (
                                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                                        <span className="text-[9px] text-gray-400 font-bold uppercase mr-1 self-center">Días:</span>
                                                                        {ds.map(d => (
                                                                            <span key={d} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${activeTab === 'pagados' ? 'bg-gray-100 text-gray-400' : 'bg-accent/20 text-sidebar'}`}>
                                                                                {dayjs(d).format('ddd DD/MM')}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            } catch(e) {}
                                                            return null;
                                                        })()}
                                                    </div>

                                                    <div className="flex flex-col sm:items-end justify-center bg-gray-50/80 sm:bg-transparent p-3 sm:p-0 rounded-lg sm:rounded-none">
                                                        <div className={`font-black text-2xl ${activeTab === 'pagados' ? 'text-gray-500' : 'text-[#6A994E]'}`}>
                                                            ${asg.subtotal.toFixed(2)}
                                                        </div>
                                                        <div className="text-xs text-gray-400 font-medium uppercase tracking-widest mt-1">
                                                            Subtotal Evento
                                                        </div>
                                                        {activeTab === 'pagados' && (
                                                            <div className="text-[10px] font-black tracking-widest text-[#588040] bg-success/10 mt-2 px-2 py-0.5 rounded border border-[#588040]/20 flex items-center">
                                                                <CheckCircle2 size={10} className="inline mr-1 -mt-0.5" /> Liquidado
                                                            </div>
                                                        )}
                                                    </div>

                                                </div>

                                                <div className="mt-4 pt-4 border-t border-gray-100/60 grid grid-cols-3 gap-2 text-center text-sm">
                                                    <div>
                                                        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Días Laborados</div>
                                                        <div className={`font-bold ${activeTab === 'pagados' ? 'text-gray-500' : 'text-accent'}`}>{asg.dias}</div>
                                                    </div>
                                                    <div className="border-l border-r border-gray-100">
                                                        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Pago x Día</div>
                                                        <div className="font-bold text-gray-500">${asg.pagoBase.toFixed(2)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Extras</div>
                                                        <div className={`font-bold ${activeTab === 'pagados' ? 'text-gray-500' : 'text-sidebar/60'}`}>${asg.extras.toFixed(2)}</div>
                                                    </div>
                                                </div>

                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default WorkerPayments;
