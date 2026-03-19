import { useState, useEffect } from 'react';
import api from '../../api/axios';
import dayjs from 'dayjs';
import { DollarSign, User, Calendar, Briefcase, Calculator } from 'lucide-react';

const AdminPayments = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            const res = await api.get('/admin/payments');
            setPayments(res.data);
        } catch (error) {
            console.error('Error fetching payments', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-primary">Cargando pagos...</div>;

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
        // Determine quincena based on diasSeleccionados (first assigned day) or event start
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

    // Ordenamos quincenas simplificadamente (por ahora usamos las claves o se puede mejorar)
    const sortedQuincenas = Object.keys(groupedByQuincena).sort((a, b) => b.localeCompare(a));

    return (
        <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <DollarSign className="mr-2 text-green-600" size={28} /> Control de Pagos
                </h1>
                <p className="text-sm text-gray-500 mt-1">Cálculos quincenales del personal operativo</p>
            </div>

            {sortedQuincenas.length === 0 ? (
                <div className="py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                    No hay registros de asignaciones ni pagos en el sistema.
                </div>
            ) : (
                <div className="space-y-10">
                    {sortedQuincenas.map(quincena => {
                        const quincenaAssignments = groupedByQuincena[quincena];

                        // Agrupar por trabajador dentro de la quincena
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

                            // Calcular total de este assignment
                            const dias = asg.diasAsignados || 1;
                            const pagoBase = asg.pagoAsignado || 0;
                            const extras = asg.pagoExtras || 0;
                            const totalAsg = (dias * pagoBase) + extras;

                            acc[workerId].total += totalAsg;
                            return acc;
                        }, {});

                        const workersList = Object.values(byWorker);
                        const grandTotal = workersList.reduce((sum, w) => sum + w.total, 0);

                        return (
                            <div key={quincena} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                {/* Encabezado de la Quincena */}
                                <div className="bg-gray-50 border-b border-gray-200 p-6 flex flex-col md:flex-row items-center justify-between">
                                    <h2 className="text-xl font-black text-gray-800 flex items-center">
                                        <Calendar className="mr-3 text-accent" /> {quincena}
                                    </h2>
                                    <div className="bg-success text-sidebar px-4 py-2 rounded-lg font-bold text-lg mt-4 md:mt-0 flex items-center shadow-sm border border-success/50">
                                        <Calculator className="mr-2" size={20} /> Total Quincena: ${grandTotal.toFixed(2)}
                                    </div>
                                </div>

                                <div className="p-6 space-y-8">
                                    {workersList.map(workerData => (
                                        <div key={workerData.user?.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                            {/* Header del trabajador */}
                                            <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-accent/30 text-sidebar flex items-center justify-center font-black">
                                                        {workerData.user?.nombre?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900">{workerData.user?.nombre}</h3>
                                                        <p className="text-xs text-gray-500 font-medium">{workerData.user?.email}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Total a pagar</span>
                                                    <span className="font-black text-xl text-[#6A994E]">${workerData.total.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            {/* Desglose de eventos */}
                                            <div className="p-4 hidden md:block overflow-x-auto">
                                                <table className="w-full text-sm text-left whitespace-nowrap">
                                                    <thead className="text-xs text-gray-500 uppercase font-bold tracking-wider bg-gray-50/50">
                                                        <tr>
                                                            <th className="px-4 py-3 rounded-l-lg">Evento</th>
                                                            <th className="px-4 py-3">Núm. Evento</th>
                                                            <th className="px-4 py-3 text-center">Días Trabajados</th>
                                                            <th className="px-4 py-3 text-right">Pago por Día</th>
                                                            <th className="px-4 py-3 text-right">Extras</th>
                                                            <th className="px-4 py-3 text-right rounded-r-lg">Subtotal</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {workerData.assignments.map(asg => {
                                                            const dias = asg.diasAsignados || 1;
                                                            const pagoBase = asg.pagoAsignado || 0;
                                                            const extras = asg.pagoExtras || 0;
                                                            const subtotal = (dias * pagoBase) + extras;
                                                            return (
                                                                <tr key={asg.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/20">
                                                                    <td className="px-4 py-3 font-medium text-gray-900">
                                                                        {asg.event?.nombre}
                                                                        <div className="text-xs text-gray-500 font-normal">
                                                                            {dayjs(asg.event?.fechaInicio).format('DD MMM')} al {dayjs(asg.event?.fechaFin).format('DD MMM YYYY')}
                                                                        </div>
                                                                        {asg.diasSeleccionados && (() => {
                                                                            try {
                                                                                const ds = JSON.parse(asg.diasSeleccionados);
                                                                                if (ds && ds.length > 0) return (
                                                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                                                        {ds.map(d => (
                                                                                            <span key={d} className="bg-accent/20 text-sidebar text-[9px] font-bold px-1.5 py-0.5 rounded">{dayjs(d).format('ddd DD/MM')}</span>
                                                                                        ))}
                                                                                    </div>
                                                                                );
                                                                            } catch(e) {}
                                                                            return null;
                                                                        })()}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">
                                                                            {asg.event?.numeroEvento || 'S/N'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center font-bold text-accent">{dias}</td>
                                                                    <td className="px-4 py-3 text-right text-gray-600">${pagoBase.toFixed(2)}</td>
                                                                    <td className="px-4 py-3 text-right text-sidebar/60">${extras.toFixed(2)}</td>
                                                                    <td className="px-4 py-3 text-right font-bold text-[#6A994E]">${subtotal.toFixed(2)}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Vista móvil del desglose */}
                                            <div className="p-4 md:hidden space-y-4">
                                                {workerData.assignments.map(asg => {
                                                    const dias = asg.diasAsignados || 1;
                                                    const pagoBase = asg.pagoAsignado || 0;
                                                    const extras = asg.pagoExtras || 0;
                                                    const subtotal = (dias * pagoBase) + extras;
                                                    return (
                                                        <div key={asg.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100 border-l-4 border-l-accent">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <p className="font-bold text-gray-900 text-sm">{asg.event?.nombre}</p>
                                                                    <span className="text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-bold mt-1 inline-block">
                                                                        #{asg.event?.numeroEvento || 'SIN-NUM'}
                                                                    </span>
                                                                </div>
                                                                <span className="font-black text-[#6A994E]">${subtotal.toFixed(2)}</span>
                                                            </div>
                                                            {asg.diasSeleccionados && (() => {
                                                                try {
                                                                    const ds = JSON.parse(asg.diasSeleccionados);
                                                                    if (ds && ds.length > 0) return (
                                                                        <div className="flex flex-wrap gap-1 mb-2">
                                                                            {ds.map(d => (
                                                                                <span key={d} className="bg-accent/20 text-sidebar text-[9px] font-bold px-1.5 py-0.5 rounded">{dayjs(d).format('ddd DD/MM')}</span>
                                                                            ))}
                                                                        </div>
                                                                    );
                                                                } catch(e) {}
                                                                return null;
                                                            })()}
                                                            <div className="flex justify-between text-xs text-gray-500 mt-2">
                                                                <span>{dias} día(s) a ${pagoBase}</span>
                                                                {extras > 0 && <span className="text-sidebar/60">Extras: ${extras}</span>}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                        </div>
                                    ))}
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
