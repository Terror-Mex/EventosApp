import { useState, useEffect } from 'react';
import api from '../../api/axios';
import dayjs from 'dayjs';
import { DollarSign, Calendar, Briefcase, Calculator } from 'lucide-react';

const WorkerPayments = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            const res = await api.get('/worker/payments');
            setPayments(res.data);
        } catch (error) {
            console.error('Error fetching payments', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-primary">Cargando mis pagos...</div>;

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

    // Agrupamos por quincena usando diasSeleccionados para determinar la quincena correcta
    const groupedByQuincena = payments.reduce((acc, assignment) => {
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

    const sortedQuincenas = Object.keys(groupedByQuincena).sort((a, b) => b.localeCompare(a));

    return (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <DollarSign className="mr-2 text-green-600" size={28} /> Mis Pagos
                </h1>
                <p className="text-sm text-gray-500 mt-1">Estimación de tus ganancias por quincena</p>
            </div>

            {sortedQuincenas.length === 0 ? (
                <div className="py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                    Aún no tienes asignaciones para mostrar en pagos.
                </div>
            ) : (
                <div className="space-y-8">
                    {sortedQuincenas.map(quincena => {
                        const quincenaAssignments = groupedByQuincena[quincena];

                        let totalQuincena = 0;
                        const assignmentsWithTotal = quincenaAssignments.map(asg => {
                            const dias = asg.diasAsignados || 1;
                            const pagoBase = asg.pagoAsignado || 0;
                            const extras = asg.pagoExtras || 0;
                            const subtotal = (dias * pagoBase) + extras;
                            totalQuincena += subtotal;
                            return { ...asg, subtotal, dias, pagoBase, extras };
                        });

                        return (
                            <div key={quincena} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="bg-gray-50 border-b border-gray-200 p-6 flex flex-col sm:flex-row items-center justify-between">
                                    <h2 className="text-xl font-black text-gray-800 flex items-center">
                                        <Calendar className="mr-3 text-accent" /> {quincena}
                                    </h2>
                                    <div className="bg-success text-sidebar px-4 py-2 rounded-lg font-bold text-lg flex items-center mt-4 sm:mt-0 shadow-sm border border-success/50">
                                        Total a Recibir: ${totalQuincena.toFixed(2)}
                                    </div>
                                </div>

                                <div className="p-0 sm:p-6">
                                    <div className="space-y-0 sm:space-y-4">
                                        {assignmentsWithTotal.map(asg => (
                                            <div key={asg.id} className="border-b sm:border border-gray-100 sm:rounded-xl p-4 md:p-5 hover:bg-gray-50 transition-colors bg-white">
                                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">

                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="font-bold text-gray-900 text-lg md:text-xl">
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
                                                            {dayjs(asg.event?.fechaInicio).format('DD MMM')} al {dayjs(asg.event?.fechaFin).format('DD MMM YYYY')}
                                                        </div>
                                                        {asg.diasSeleccionados && (() => {
                                                            try {
                                                                const ds = JSON.parse(asg.diasSeleccionados);
                                                                if (ds && ds.length > 0) return (
                                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                                        <span className="text-[9px] text-gray-400 font-bold uppercase mr-1 self-center">Días:</span>
                                                                        {ds.map(d => (
                                                                            <span key={d} className="bg-accent/20 text-sidebar text-[9px] font-bold px-1.5 py-0.5 rounded">{dayjs(d).format('ddd DD/MM')}</span>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            } catch(e) {}
                                                            return null;
                                                        })()}
                                                    </div>

                                                    <div className="flex flex-col sm:items-end justify-center bg-gray-50/80 sm:bg-transparent p-3 sm:p-0 rounded-lg sm:rounded-none">
                                                        <div className="font-black text-2xl text-[#6A994E]">
                                                            ${asg.subtotal.toFixed(2)}
                                                        </div>
                                                        <div className="text-xs text-gray-400 font-medium uppercase tracking-widest mt-1">
                                                            Subtotal
                                                        </div>
                                                    </div>

                                                </div>

                                                <div className="mt-4 pt-4 border-t border-gray-100/60 grid grid-cols-3 gap-2 text-center text-sm">
                                                    <div>
                                                        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Días Laborados</div>
                                                        <div className="font-bold text-accent">{asg.dias}</div>
                                                    </div>
                                                    <div className="border-l border-r border-gray-100">
                                                        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Pago x Día</div>
                                                        <div className="font-bold text-gray-800">${asg.pagoBase.toFixed(2)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Extras</div>
                                                        <div className="font-bold text-sidebar/60">${asg.extras.toFixed(2)}</div>
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
