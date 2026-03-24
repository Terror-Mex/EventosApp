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

    // Filter by tab
    const filteredPayments = payments.filter(asg => 
        activeTab === 'pendientes' ? !asg.pagado : asg.pagado
    );

    // Sort ascending by event date (nearest first)
    const sortedAssignments = [...filteredPayments].sort((a, b) => {
        return dayjs(a.event?.fechaInicio).valueOf() - dayjs(b.event?.fechaInicio).valueOf();
    });

    const parsedAssignments = sortedAssignments.map(asg => {
        const dias = asg.diasAsignados || 1;
        const pagoBase = asg.pagoAsignado || 0;
        const extras = asg.pagoExtras || 0;
        const subtotal = (dias * pagoBase) + extras;
        return { ...asg, subtotal, dias, pagoBase, extras };
    });

    const grandTotal = parsedAssignments.reduce((sum, asg) => sum + asg.subtotal, 0);

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <DollarSign className="mr-2 text-green-600" size={28} /> Mis Pagos
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Control de tus ganancias operativas por evento.</p>
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

            {parsedAssignments.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center flex flex-col items-center justify-center">
                    <AlertCircle size={40} className="text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No hay registros en esta sección.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {parsedAssignments.map(asg => (
                        <div key={asg.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col sm:flex-row border transition-all hover:shadow-md ${activeTab === 'pagados' ? 'border-gray-200 opacity-70 saturate-50' : 'border-gray-200'}`}>
                            
                            {/* Fechas Info (Left side on Desktop, Top on Mobile) */}
                            <div className={`sm:w-40 flex flex-col items-center justify-center p-4 border-b sm:border-b-0 sm:border-r ${activeTab === 'pagados' ? 'bg-gray-100/50 border-gray-200 text-gray-400' : 'bg-sidebar/5 border-sidebar/10 text-sidebar'}`}>
                                <Calendar size={24} className="mb-2 opacity-80" />
                                <span className={`text-[10px] uppercase tracking-widest font-black mb-1 ${activeTab === 'pagados' ? 'text-gray-400' : 'text-sidebar/50'}`}>Fecha del Evento</span>
                                <span className="font-bold text-center text-sm leading-tight">
                                    {dayjs(asg.event?.fechaInicio).format('DD MMM')} <br/>
                                    <span className="text-xs opacity-70">al {dayjs(asg.event?.fechaFin).format('DD MMM')}</span>
                                </span>
                            </div>

                            {/* Detalle Central */}
                            <div className="flex-1 p-5 md:p-6 flex flex-col justify-center relative">
                                {activeTab === 'pagados' && (
                                    <div className="absolute top-4 right-4 text-[10px] font-black tracking-widest text-[#588040] bg-success/20 px-2 py-0.5 rounded border border-[#588040]/30 hidden sm:block uppercase flex items-center">
                                        <CheckCircle2 size={10} className="inline mr-1 -mt-0.5" /> Liquidado
                                    </div>
                                )}
                                
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className={`font-bold text-xl leading-tight ${activeTab === 'pagados' ? 'text-gray-500' : 'text-gray-900'}`}>
                                        {asg.event?.nombre}
                                    </h3>
                                    {asg.event?.numeroEvento && (
                                        <span className="bg-gray-100 text-gray-500 border border-gray-200 text-[10px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded">
                                            #{asg.event.numeroEvento}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="flex items-center text-sm font-medium text-gray-500 mb-4">
                                    <Briefcase className="mr-1.5" size={14} />
                                    {asg.rolAsignado || 'Operador'}
                                </div>

                                {asg.diasSeleccionados && (() => {
                                    try {
                                        const ds = JSON.parse(asg.diasSeleccionados);
                                        if (ds && ds.length > 0) return (
                                            <div className="flex flex-wrap gap-1 mb-4">
                                                <span className="text-[10px] text-gray-400 font-bold uppercase mr-1 self-center">Días asignados:</span>
                                                {ds.map(d => (
                                                    <span key={d} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${activeTab === 'pagados' ? 'bg-gray-100 text-gray-400' : 'bg-accent/10 text-sidebar'}`}>
                                                        {dayjs(d).format('ddd DD/MM')}
                                                    </span>
                                                ))}
                                            </div>
                                        );
                                    } catch(e) {}
                                    return null;
                                })()}
                                
                                <div className="grid grid-cols-3 gap-2 text-center sm:text-left text-sm mt-auto pt-4 border-t border-gray-100">
                                    <div>
                                        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Días Mínimos</div>
                                        <div className={`font-bold ${activeTab === 'pagados' ? 'text-gray-500' : 'text-gray-800'}`}>{asg.dias} jornada(s)</div>
                                    </div>
                                    <div className="border-l border-r border-gray-100 sm:px-4 px-2">
                                        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Tarifa Base</div>
                                        <div className={`font-bold ${activeTab === 'pagados' ? 'text-gray-500' : 'text-gray-800'}`}>${asg.pagoBase.toFixed(2)}</div>
                                    </div>
                                    <div className="sm:pl-4 pl-2">
                                        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Extras</div>
                                        <div className={`font-bold ${activeTab === 'pagados' ? 'text-gray-500' : 'text-sidebar/60'}`}>${asg.extras.toFixed(2)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Total Pagado Info */}
                            <div className="sm:w-48 bg-gray-50/50 p-6 flex flex-col justify-center items-center sm:items-end sm:text-right border-t sm:border-t-0 sm:border-l border-gray-100">
                                <div className={`font-black text-3xl sm:text-2xl md:text-3xl ${activeTab === 'pagados' ? 'text-gray-400' : 'text-[#6A994E]'}`}>
                                    ${asg.subtotal.toFixed(2)}
                                </div>
                                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">
                                    {activeTab === 'pendientes' ? 'Por Cobrar' : 'Monto Pagado'}
                                </div>
                                {activeTab === 'pagados' && (
                                    <div className="text-[10px] font-black tracking-widest text-[#588040] sm:hidden mt-3 uppercase flex items-center">
                                        <CheckCircle2 size={12} className="inline mr-1" /> Liquidado
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WorkerPayments;
