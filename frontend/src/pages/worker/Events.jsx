import { useState, useEffect } from 'react';
import api from '../../api/axios';
import dayjs from 'dayjs';
import { Calendar, Clock, MapPin, DollarSign, Camera, CheckSquare, FileText, Send, Image as ImageIcon, X } from 'lucide-react';

const WorkerEvents = () => {
    const [previewImg, setPreviewImg] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [assignments, setAssignments] = useState([]);
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
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [eventDetails, setEventDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [checkInLoading, setCheckInLoading] = useState(false);
    const [reportForm, setReportForm] = useState({ contenido: '', photos: [] });
    const [reportLoading, setReportLoading] = useState(false);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await api.get('/worker/events');
            setAssignments(res.data);
        } catch (error) {
            console.error('Error fetching events', error);
        } finally {
            setLoading(false);
        }
    };

    const loadEventDetails = async (eventId) => {
        setSelectedEventId(eventId);
        setDetailsLoading(true);
        try {
            const res = await api.get(`/worker/events/${eventId}`);
            setEventDetails(res.data);
        } catch (error) {
            console.error('Error fetching details', error);
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleReportSubmit = async (e) => {
        e.preventDefault();
        if (!eventDetails || !reportForm.contenido.trim()) return;

        setReportLoading(true);
        try {
            const formData = new FormData();
            formData.append('eventId', eventDetails.event.id);
            formData.append('contenido', reportForm.contenido);

            for (let i = 0; i < reportForm.photos.length; i++) {
                formData.append('photos', reportForm.photos[i]);
            }

            await api.post('/worker/reports', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            alert('¡Reporte enviado exitosamente!');
            setReportForm({ contenido: '', photos: [] });
            loadEventDetails(eventDetails.event.id);
        } catch (error) {
            console.error('Error submitting report', error);
            alert('Error al enviar el reporte');
        } finally {
            setReportLoading(false);
        }
    };

    const handleReportPhotosChange = (e) => {
        if (e.target.files) {
            setReportForm({ ...reportForm, photos: Array.from(e.target.files) });
        }
    };

    const handleCheckInOut = async (type, file) => {
        if (!eventDetails || !file) return;

        setCheckInLoading(true);
        try {
            // Obtener coordenadas de forma nativa e inyectar al payload
            const position = await new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('La geolocalización no es compatible con este dispositivo. Navegador desactualizado.'));
                }
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            const formData = new FormData();
            formData.append('eventId', eventDetails.event.id);
            formData.append('photo', file);
            formData.append('latitud', lat);
            formData.append('longitud', lng);

            await api.post(`/worker/${type}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const typeName = type === 'checkin' ? 'Check-in (Entrada)' : type === 'montaje' ? 'Montaje y Pruebas' : 'Check-out (Salida)';
            alert(`¡${typeName} registrado exitosamente!`);
            
            await loadEventDetails(eventDetails.event.id);
        } catch (error) {
            console.error('Check-in/out error', error);
            
            // Si el error es específicamente de que el trabajador no dio click en Permitir Ubicación
            if (error.code === 1) { 
                alert('BLOQUEO DE GEOCERCA 🛑: No podemos registrar tu asistencia. Necesitamos permiso obligatorio para acceder a tu ubicación GPS y comprobar que estás en la zona del evento.');
            } else {
                const msg = error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response.data : error.message);
                alert(`Error al hacer tu registro: ` + msg);
            }
        } finally {
            setCheckInLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-primary">Cargando eventos...</div>;

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
            {/* List / Left Panel */}
            <div className={`w-full ${selectedEventId ? 'hidden lg:flex lg:w-1/4 text-gray-700' : 'lg:w-1/4'} flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar`}>
                <h1 className="text-2xl font-bold text-gray-800 sticky top-0 bg-background pb-2 pt-1 z-10">Mis Eventos</h1>
                
                <div className="space-y-4">
                    <h2 className="text-sm font-bold text-sidebar uppercase tracking-wider border-b border-gray-100 pb-1">Eventos Activos</h2>
                    {assignments.filter(a => !isHistoryEvent(a.event)).length === 0 ? (
                        <div className="text-gray-400 text-xs text-center py-4 italic">No hay eventos activos</div>
                    ) : (
                        assignments.filter(a => !isHistoryEvent(a.event)).map(({ event, rolAsignado }) => (
                            <div
                                key={event.id}
                                onClick={() => loadEventDetails(event.id)}
                                className={`card cursor-pointer transition-all ${selectedEventId === event.id ? 'ring-2 ring-primary border-transparent' : 'hover:border-primary-light'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-md leading-tight">{event.nombre}</h3>
                                    {event.numeroEvento && (
                                        <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">#{event.numeroEvento}</span>
                                    )}
                                </div>
                                <p className="text-[12px] text-gray-600 mb-1 flex items-center"><Calendar size={12} className="mr-1.5 text-accent" /> {dayjs(event.fechaInicio).format('DD/MM/YYYY')}</p>
                                <p className="text-[11px] font-medium text-sidebar bg-primary/40 inline-block px-1.5 py-0.5 rounded mt-1">{rolAsignado}</p>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-6 space-y-4">
                    <button 
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full flex items-center justify-between text-xs font-bold text-gray-500 hover:text-sidebar transition-colors bg-gray-50 px-3 py-2 rounded-lg border border-gray-100"
                    >
                        <span>HISTORIAL FINALIZADOS</span>
                        <span>{showHistory ? '−' : '+'}</span>
                    </button>

                    {showHistory && (
                        <div className="space-y-3 animate-fade-in">
                            {assignments.filter(a => isHistoryEvent(a.event)).length === 0 ? (
                                <div className="text-gray-400 text-xs text-center py-4 italic">No hay eventos finalizados</div>
                            ) : (
                                assignments.filter(a => isHistoryEvent(a.event)).map(({ event, rolAsignado }) => (
                                    <div
                                        key={event.id}
                                        onClick={() => loadEventDetails(event.id)}
                                        className={`card bg-gray-50 opacity-60 grayscale border-gray-200 cursor-pointer transition-all ${selectedEventId === event.id ? 'ring-2 ring-gray-300' : ''}`}
                                    >
                                        <h3 className="font-bold text-sm text-gray-600 truncate">{event.nombre}</h3>
                                        <p className="text-[10px] text-gray-500">{dayjs(event.fechaInicio).format('DD/MM/YY')}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Details / Right Panel */}
            {selectedEventId && (
                <div className="w-full lg:w-3/4 h-full overflow-y-auto custom-scrollbar md:pl-4 p-2 pb-8">
                    <button
                        className="lg:hidden text-primary font-medium mb-4 flex items-center"
                        onClick={() => setSelectedEventId(null)}
                    >
                        ← Volver a la lista
                    </button>

                    {detailsLoading ? (
                        <div className="card h-64 flex items-center justify-center text-gray-500">Cargando detalles...</div>
                    ) : eventDetails ? (
                        <div className="card space-y-6 animate-fade-in relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>

                            <div className="border-b pb-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-3xl font-extrabold text-gray-900">{eventDetails.event.nombre}</h2>
                                    {eventDetails.event.numeroEvento && (
                                        <span className="bg-gray-100 border border-gray-200 text-gray-700 text-xs px-2 py-1 rounded font-bold tracking-widest mt-1">
                                            #{eventDetails.event.numeroEvento}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-2 flex gap-2 items-center">
                                    <span className={`text-xs px-2 py-1 rounded-md font-medium uppercase tracking-wider ${eventDetails.event.estado === 'FINALIZADO' ? (isHistoryEvent(eventDetails.event) ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-800') : 'bg-gray-100 text-gray-800'}`}>{eventDetails.event.estado}</span>
                                    <span className="bg-primary text-text text-xs px-2 py-1 rounded-md font-medium">{eventDetails.assignment.rolAsignado}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="mt-0.5 text-accent"><Calendar size={20} /></div>
                                        <div>
                                            <p className="font-semibold text-gray-900">Fechas</p>
                                            <p className="text-gray-600">{dayjs(eventDetails.event.fechaInicio).format('DD MMM YYYY')} - {dayjs(eventDetails.event.fechaFin).format('DD MMM YYYY')}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="mt-0.5 text-accent"><Clock size={20} /></div>
                                        <div className="w-full">
                                            <p className="font-semibold text-gray-900 mb-2">Mis Días Asignados</p>
                                            <div className="text-gray-600 text-sm space-y-2">
                                                {(() => {
                                                    // Parse assigned days
                                                    let assignedDays = [];
                                                    try {
                                                        if (eventDetails.assignment.diasSeleccionados) {
                                                            assignedDays = JSON.parse(eventDetails.assignment.diasSeleccionados);
                                                        }
                                                    } catch (e) {}

                                                    try {
                                                        if (eventDetails.event.horarios) {
                                                            let hList = JSON.parse(eventDetails.event.horarios);
                                                            // Filter to only assigned days
                                                            if (assignedDays.length > 0) {
                                                                hList = hList.filter(h => assignedDays.includes(h.fecha));
                                                            }
                                                            if (hList && hList.length > 0) {
                                                                return hList.map((h, i) => (
                                                                    <div key={`w-h-${i}`} className="bg-white border border-gray-100 p-2 text-xs rounded-lg shadow-sm w-full">
                                                                        <div className="font-bold text-gray-800 border-b border-gray-100 pb-1 mb-1">
                                                                            {dayjs(h.fecha, 'YYYY-MM-DD').format('dddd DD/MM/YYYY')}
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
                                                                            <div><span className="font-bold text-gray-500">Llegada:</span> <span className="font-bold text-red-600">{h.llegada}</span></div>
                                                                            <div><span className="font-bold text-gray-500">Inicio:</span> {h.inicio} </div>
                                                                            <div><span className="font-bold text-gray-500">Fin:</span> {h.fin} </div>
                                                                        </div>
                                                                    </div>
                                                                ));
                                                            }
                                                        }
                                                    } catch (e) { }
                                                    return (
                                                        <div className="bg-white border border-gray-100 p-2 text-xs rounded-lg shadow-sm">
                                                            <div className="grid grid-cols-1 gap-1">
                                                                <p><span className="font-bold text-gray-500">Llegada:</span> <span className="font-bold text-red-600">{eventDetails.event.horaLlegada}</span></p>
                                                                <p><span className="font-bold text-gray-500">Evento:</span> {eventDetails.event.horaInicio} a {eventDetails.event.horaFin}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="mt-0.5 text-accent"><MapPin size={20} /></div>
                                        <div>
                                            <p className="font-semibold text-gray-900">Ubicación</p>
                                            <p className="text-gray-600">{eventDetails.event.ubicacion}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="mt-0.5 text-accent"><DollarSign size={20} /></div>
                                        <div>
                                            <p className="font-semibold text-gray-900">Pago Asignado</p>
                                            <p className="text-gray-600 tracking-wide font-medium">${eventDetails.assignment.pagoAsignado} <span className="text-xs text-gray-400 font-normal">/día</span></p>

                                            {eventDetails.assignment.pagoExtras > 0 && (
                                                <p className="text-sidebar/70 tracking-wide font-medium text-sm mt-1">+ ${eventDetails.assignment.pagoExtras} <span className="text-xs text-sidebar/50 font-normal">(Extras)</span></p>
                                            )}

                                            {eventDetails.assignment.pagoExtras > 0 && (
                                                <p className="text-sidebar tracking-wide font-bold mt-1 text-sm border-t border-gray-100 pt-1">
                                                    Total: ${(eventDetails.assignment.pagoAsignado * eventDetails.assignment.diasAsignados) + eventDetails.assignment.pagoExtras}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                                    <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                                        <CheckSquare size={18} className="mr-2 text-accent" /> Control de Asistencia
                                    </h3>

                                    <div className="space-y-6">
                                        {(() => {
                                            // Parse assigned days for this worker
                                            let assignedDays = [];
                                            try {
                                                if (eventDetails.assignment.diasSeleccionados) {
                                                    assignedDays = JSON.parse(eventDetails.assignment.diasSeleccionados);
                                                }
                                            } catch (e) {}

                                            let hList = [];
                                            try { hList = eventDetails.event.horarios ? JSON.parse(eventDetails.event.horarios) : []; } catch (e) { }
                                            if (hList.length === 0) {
                                                hList = [{
                                                    fecha: dayjs(eventDetails.event.fechaInicio, 'YYYY-MM-DD').format('YYYY-MM-DD'),
                                                    llegada: eventDetails.event.horaLlegada
                                                }];
                                            }

                                            // Filter to only assigned days if we have specific days
                                            if (assignedDays.length > 0) {
                                                hList = hList.filter(h => assignedDays.includes(h.fecha));
                                            }

                                            return hList.map((h, i) => {
                                                const currentCiList = eventDetails.checkIns || (eventDetails.checkIn ? [eventDetails.checkIn] : []);
                                                const dayCi = currentCiList.find(c => c.fecha === h.fecha) || {};
                                                const isToday = h.fecha === dayjs().format('YYYY-MM-DD');

                                                return (
                                                    <div key={`w-asistencia-${i}`} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <div className="flex items-center">
                                                                <Calendar size={14} className="mr-2 text-gray-400" />
                                                                <span className="text-sm font-bold text-gray-700 capitalize">{dayjs(h.fecha, 'YYYY-MM-DD').format('dddd, DD MMM YYYY')}</span>
                                                            </div>
                                                            {isToday && <span className="bg-primary/20 text-sidebar text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest">HOY</span>}
                                                        </div>

                                                        {(!isToday && !dayCi.horaEntrada && !dayCi.horaMontaje && !dayCi.horaSalida) ? (
                                                            <div className="text-center p-3 text-xs text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                                                {dayjs(h.fecha).isBefore(dayjs(), 'day') ? 'No registraste asistencia este día.' : 'Día futuro. Los botones de check-in se habilitarán este día.'}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-4">
                                                                <div className="relative">
                                                                    {dayCi.horaEntrada ? (
                                                                        <div className="flex items-center text-sidebar bg-success/40 p-3 rounded-lg border border-success mb-3 shadow-sm">
                                                                            <CheckSquare size={18} className="mr-3" />
                                                                            <div className="flex flex-col">
                                                                                <span className="text-xs font-bold uppercase tracking-wider text-sidebar/80">Entrada Registrada</span>
                                                                                <span className="text-sm font-medium">{dayjs(dayCi.horaEntrada).format('HH:mm')}</span>
                                                                            </div>
                                                                        </div>
                                                                    ) : isToday ? (
                                                                        <div className="mb-3">
                                                                            <label className="w-full btn-primary flex justify-center items-center py-3 bg-success border-success text-sidebar hover:brightness-95 shadow-sm cursor-pointer">
                                                                                <Camera size={18} className="mr-2 hidden sm:block" />
                                                                                <span className="text-sm sm:text-base">{checkInLoading ? 'Subiendo Foto...' : 'Entrada (Obligatorio)'}</span>
                                                                                <input
                                                                                    type="file"
                                                                                    accept="image/*"
                                                                                    capture="environment"
                                                                                    className="hidden"
                                                                                    disabled={checkInLoading}
                                                                                    onClick={(e) => { e.target.value = null; }}
                                                                                    onChange={(e) => {
                                                                                        if (e.target.files?.[0]) handleCheckInOut('checkin', e.target.files[0]);
                                                                                    }}
                                                                                />
                                                                            </label>
                                                                        </div>
                                                                    ) : null}

                                                                    {eventDetails.assignment?.rolAsignado !== 'Intérprete' && (
                                                                        <div className="mb-3">
                                                                            {dayCi.horaMontaje ? (
                                                                                <div className="flex items-center text-sidebar bg-accent/30 p-3 rounded-lg border border-accent mb-3 shadow-sm">
                                                                                    <CheckSquare size={18} className="mr-3" />
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-xs font-bold uppercase tracking-wider text-sidebar/80">Montaje Registrado</span>
                                                                                        <span className="text-sm font-medium">{dayjs(dayCi.horaMontaje).format('HH:mm')}</span>
                                                                                    </div>
                                                                                </div>
                                                                            ) : isToday ? (
                                                                                <div className="mb-3">
                                                                                    <label className={`w-full flex justify-center items-center py-3 rounded-lg border-2 border-accent text-sidebar font-medium hover:bg-accent/10 transition-colors cursor-pointer ${(!dayCi.horaEntrada || checkInLoading) ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>
                                                                                        <Camera size={18} className="mr-2 hidden sm:block" />
                                                                                        <span className="text-sm sm:text-base">{checkInLoading ? 'Subiendo Foto...' : 'Montaje (Obligatorio)'}</span>
                                                                                        {!((!dayCi.horaEntrada || checkInLoading)) && (
                                                                                            <input
                                                                                                type="file"
                                                                                                accept="image/*"
                                                                                                capture="environment"
                                                                                                className="hidden"
                                                                                                onClick={(e) => { e.target.value = null; }}
                                                                                                onChange={(e) => {
                                                                                                    if (e.target.files?.[0]) handleCheckInOut('montaje', e.target.files[0]);
                                                                                                }}
                                                                                            />
                                                                                        )}
                                                                                    </label>
                                                                                </div>
                                                                            ) : null}
                                                                        </div>
                                                                    )}

                                                                    {dayCi.horaSalida ? (
                                                                        <div className="flex items-center text-sidebar bg-primary/40 p-3 rounded-lg border border-primary shadow-sm">
                                                                            <CheckSquare size={18} className="mr-3" />
                                                                            <div className="flex flex-col">
                                                                                <span className="text-xs font-bold uppercase tracking-wider text-sidebar/80">Salida Registrada</span>
                                                                                <span className="text-sm font-medium">{dayjs(dayCi.horaSalida).format('HH:mm')}</span>
                                                                            </div>
                                                                        </div>
                                                                    ) : isToday ? (
                                                                        <div>
                                                                            <label className={`w-full flex justify-center items-center py-3 rounded-lg font-medium bg-primary text-sidebar hover:brightness-95 shadow-sm cursor-pointer ${(!dayCi.horaEntrada || checkInLoading || (eventDetails.assignment?.rolAsignado !== 'Intérprete' && !dayCi.horaMontaje)) ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>
                                                                                <Camera size={18} className="mr-2 hidden sm:block" />
                                                                                <span className="text-sm sm:text-base">{checkInLoading ? 'Subiendo Foto...' : 'Salida (Obligatorio)'}</span>
                                                                                {!((!dayCi.horaEntrada || checkInLoading || (eventDetails.assignment?.rolAsignado !== 'Intérprete' && !dayCi.horaMontaje))) && (
                                                                                    <input
                                                                                        type="file"
                                                                                        accept="image/*"
                                                                                        capture="environment"
                                                                                        className="hidden"
                                                                                        onClick={(e) => { e.target.value = null; }}
                                                                                        onChange={(e) => {
                                                                                            if (e.target.files?.[0]) handleCheckInOut('checkout', e.target.files[0]);
                                                                                        }}
                                                                                    />
                                                                                )}
                                                                            </label>
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            </div>


                            <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="font-bold text-gray-800 border-l-4 border-primary pl-2">Detalles del Equipo</h3>
                                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-3">
                                        <div className="text-sm">
                                            <span className="font-bold block mb-1 text-sidebar">Cabina:</span>
                                            {(() => {
                                                try {
                                                    if (eventDetails.event.cabina?.startsWith('[')) {
                                                        const cabList = JSON.parse(eventDetails.event.cabina);
                                                        return cabList.map((c, i) => (
                                                            <span key={`wcab-${i}`} className="block pl-2 text-xs mb-0.5">• {c.cant}x {c.tipo}</span>
                                                        ));
                                                    }
                                                } catch (e) { }
                                                return <span className="block pl-2 text-xs">• {eventDetails.event.cantCabina}x {eventDetails.event.cabina}</span>;
                                            })()}
                                        </div>
                                        <div className="text-sm">
                                            <span className="font-bold block mb-1 text-sidebar">Receptores:</span>
                                            {(() => {
                                                try {
                                                    if (eventDetails.event.receptores?.startsWith('[')) {
                                                        const recList = JSON.parse(eventDetails.event.receptores);
                                                        return recList.map((r, i) => (
                                                            <span key={`wrec-${i}`} className="block pl-2 text-xs mb-0.5">• {r.cant}x {r.tipo}</span>
                                                        ));
                                                    }
                                                } catch (e) { }
                                                return <span className="block pl-2 text-xs">• {eventDetails.event.cantReceptores}x {eventDetails.event.receptores}</span>;
                                            })()}
                                        </div>
                                        {eventDetails.event.equipoExtras && (
                                            <p><span className="font-bold">Extras:</span> {eventDetails.event.equipoExtras}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-bold text-gray-800 border-l-4 border-primary pl-2">Información Adicional</h3>
                                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-2">
                                        <p className="whitespace-pre-line text-xs">{eventDetails.event.descripcion}</p>

                                        {eventDetails.event.archivoAdjunto && (
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                                <a href={eventDetails.event.archivoAdjunto.startsWith('http') ? eventDetails.event.archivoAdjunto : `/uploads/${eventDetails.event.archivoAdjunto}`} target="_blank" rel="noreferrer" className="flex items-center text-blue-600 font-bold hover:underline text-sm bg-blue-50/50 p-2 rounded-lg border border-blue-100 w-fit">
                                                    <FileText size={16} className="mr-2" />
                                                    Ver Archivo Adjunto
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>


                            {/* Photos Preview if available (Mock) */}
                            {eventDetails.checkIn && (eventDetails.checkIn.fotoEntrada || eventDetails.checkIn.fotoSalida) && (
                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <h3 className="font-bold text-gray-800 mb-4">Fotos de Asistencia</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {eventDetails.checkIn.fotoEntrada && (
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs font-bold text-gray-500 mb-2 uppercase">Entrada</span>
                                                <img
                                                    src={eventDetails.checkIn.fotoEntrada.rutaArchivo}
                                                    alt="Entrada"
                                                    className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:border-primary transition-colors"
                                                    onClick={() => {
                                                        setPreviewImg(eventDetails.checkIn.fotoEntrada.rutaArchivo);
                                                        setShowPreviewModal(true);
                                                    }}
                                                />
                                            </div>
                                        )}
                                        {eventDetails.checkIn.fotoSalida && (
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs font-bold text-gray-500 mb-2 uppercase">Salida</span>
                                                <img
                                                    src={eventDetails.checkIn.fotoSalida.rutaArchivo}
                                                    alt="Salida"
                                                    className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:border-primary transition-colors"
                                                    onClick={() => {
                                                        setPreviewImg(eventDetails.checkIn.fotoSalida.rutaArchivo);
                                                        setShowPreviewModal(true);
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}


                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                                    <FileText size={18} className="mr-2 text-accent" /> Enviar Reporte de Incidencias / Novedades
                                </h3>
                                <form onSubmit={handleReportSubmit} className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Descripción del reporte</label>
                                        <textarea
                                            className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:border-primary outline-none transition-all min-h-[100px]"
                                            placeholder="Ej: Faltaron 2 receptores, el cliente pidió más tiempo..."
                                            value={reportForm.contenido}
                                            onChange={(e) => setReportForm({ ...reportForm, contenido: e.target.value })}
                                            required
                                        ></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                                            <ImageIcon size={16} className="mr-2" /> Adjuntar Fotos (Opcional)
                                        </label>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            className="block w-full text-sm text-gray-500
                                                    file:mr-4 file:py-2 file:px-4
                                                    file:rounded-full file:border-0
                                                    file:text-sm file:font-semibold
                                                    file:bg-sidebar/10 file:text-sidebar
                                                    hover:file:bg-sidebar/20 cursor-pointer"
                                            onChange={handleReportPhotosChange}
                                        />
                                        {reportForm.photos.length > 0 && (
                                            <p className="text-xs text-sidebar mt-2 flex items-center font-semibold bg-success/30 px-2 py-1 rounded inline-flex border border-success/40">
                                                ✅ {reportForm.photos.length} fotos seleccionadas
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={reportLoading || !reportForm.contenido.trim()}
                                        className="btn-primary w-full flex items-center justify-center py-2.5 disabled:opacity-50"
                                    >
                                        <Send size={18} className="mr-2" />
                                        {reportLoading ? 'Enviando Reporte...' : 'Enviar Reporte al Administrador'}
                                    </button>
                                </form>
                            </div>

                        </div>
                    ) : null}
                </div>
            )}

            {/* Modal para ver fotos grandes */}
            {showPreviewModal && previewImg && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-90 p-4" onClick={() => setShowPreviewModal(false)}>
                    <div className="relative max-w-4xl max-h-screen">
                        <button className="absolute -top-10 right-0 text-white font-bold p-2 hover:bg-white/20 rounded-full" onClick={() => setShowPreviewModal(false)}>
                            <X size={24} />
                        </button>
                        <img src={previewImg} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
                    </div>
                </div>
            )}

        </div>
    );
};

export default WorkerEvents;
