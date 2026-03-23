import { useState, useEffect } from 'react';
import api from '../../api/axios';
import dayjs from 'dayjs';
import { Plus, Edit2, Trash2, Calendar as LayoutIcon, MapPin, DollarSign, Users, X, Clock, CalendarDays } from 'lucide-react';
import { CheckSquare, Image as ImageIcon } from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { es } from 'date-fns/locale/es';
import NewPlaceAutocomplete from '../../components/NewPlaceAutocomplete';

registerLocale('es', es);

const AdminEvents = () => {
    const [events, setEvents] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);

    // Modals state
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    const [currentEvent, setCurrentEvent] = useState(null);
    const [editingId, setEditingId] = useState(null);

    const isHistoryEvent = (event) => {
        if (event.estado !== 'FINALIZADO') return false;
        try {
            const endDateTime = dayjs(`${event.fechaFin} ${event.horaFin || '23:59'}`);
            return dayjs().isAfter(endDateTime.add(6, 'hours'));
        } catch (e) {
            return true; // Fallback to history if date is invalid
        }
    };

    // Form states
    const [eventForm, setEventForm] = useState({
        nombre: '', numeroEvento: '', fechaInicio: new Date(), fechaFin: new Date(), horaInicio: '09:00', horaFin: '18:00',
        horaLlegada: '08:00', ubicacion: '', latitud: null, longitud: null, descripcion: '',
        cabina: 'Media cabina', cantCabina: 1, receptores: 'normales', cantReceptores: 50, equipoExtras: '', archivoAdjunto: ''
    });

    const [assignForm, setAssignForm] = useState({
        eventId: '', userId: '', rolAsignado: '', pagoAsignado: '', diasAsignados: 1, pagoExtras: 0
    });
    const [isUploading, setIsUploading] = useState(false);

    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [previewImg, setPreviewImg] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [detailViewMode, setDetailViewMode] = useState('details');

    const [eventAssignments, setEventAssignments] = useState([]);
    const [eventCheckIns, setEventCheckIns] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [eventsRes, staffRes] = await Promise.all([
                api.get('/admin/events'),
                api.get('/admin/staff')
            ]);
            setEvents(eventsRes.data);
            const sortedStaff = staffRes.data
                .filter(u => u.rol === 'WORKER')
                .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
            setStaff(sortedStaff);
        } catch (error) {
            console.error('Error fetching data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEventModal = (event = null) => {
        if (event) {
            let parsedCabinas = [{ tipo: event.cabina || 'Media cabina', cant: event.cantCabina || 1 }];
            try { if (event.cabina?.startsWith('[')) parsedCabinas = JSON.parse(event.cabina); } catch (e) { }
            parsedCabinas = parsedCabinas.map(c => c.tipo === 'cabina completa' ? { ...c, tipo: 'Cabina completa' } : c);

            let parsedReceptores = [{ tipo: event.receptores || 'normales', cant: event.cantReceptores || 50 }];
            try { if (event.receptores?.startsWith('[')) parsedReceptores = JSON.parse(event.receptores); } catch (e) { }

            let parsedHorarios = [];
            try { if (event.horarios) parsedHorarios = JSON.parse(event.horarios); } catch (e) { }

            if (parsedHorarios.length === 0) {
                // Fallback a generar 1 bloque por cada día del evento si viene de formato viejo
                const startDate = dayjs(event.fechaInicio, 'YYYY-MM-DD');
                const endDate = dayjs(event.fechaFin, 'YYYY-MM-DD');
                let currDate = startDate;
                while (currDate.isBefore(endDate) || currDate.isSame(endDate, 'day')) {
                    parsedHorarios.push({
                        fecha: currDate.format('YYYY-MM-DD'),
                        llegada: event.horaLlegada || '08:00',
                        inicio: event.horaInicio || '09:00',
                        fin: event.horaFin || '18:00'
                    });
                    currDate = currDate.add(1, 'day');
                }
            }

            setEventForm({
                ...event,
                fechaInicio: dayjs(event.fechaInicio, 'YYYY-MM-DD').toDate(),
                fechaFin: dayjs(event.fechaFin, 'YYYY-MM-DD').toDate(),
                numeroEvento: event.numeroEvento || '',
                archivoAdjunto: event.archivoAdjunto || '',
                cabinaList: parsedCabinas,
                receptoresList: parsedReceptores,
                horariosList: parsedHorarios
            });
            setEditingId(event.id);
        } else {
            setEventForm({
                nombre: '', numeroEvento: '', fechaInicio: new Date(), fechaFin: new Date(), horaInicio: '09:00', horaFin: '18:00',
                horaLlegada: '08:00', ubicacion: '', latitud: null, longitud: null, descripcion: '',
                cabinaList: [{ tipo: 'Media cabina', cant: 1 }],
                receptoresList: [{ tipo: 'normales', cant: 50 }],
                horariosList: [{ fecha: dayjs().format('YYYY-MM-DD'), llegada: '08:00', inicio: '09:00', fin: '18:00' }],
                equipoExtras: '', archivoAdjunto: ''
            });
            setEditingId(null);
        }
        setIsEventModalOpen(true);
    };

    const handleDateChange = (type, date) => {
        const newForm = { ...eventForm, [type]: date };

        try {
            const startStr = dayjs(newForm.fechaInicio).format('YYYY-MM-DD');
            const endStr = dayjs(newForm.fechaFin).format('YYYY-MM-DD');
            const startDate = dayjs(startStr, 'YYYY-MM-DD');
            const endDate = dayjs(endStr, 'YYYY-MM-DD');

            if (startDate.isValid() && endDate.isValid() && (startDate.isBefore(endDate) || startDate.isSame(endDate, 'day'))) {
                let currDate = startDate;
                const newHorarios = [];
                // Intentar preservar horarios de días previos si la fecha coincide
                while (currDate.isBefore(endDate) || currDate.isSame(endDate, 'day')) {
                    const dateStr = currDate.format('YYYY-MM-DD');
                    const existing = eventForm.horariosList?.find(h => h.fecha === dateStr);

                    if (existing) {
                        newHorarios.push(existing);
                    } else {
                        // Usar los valores del primer bloque si existen, o defaults
                        const base = eventForm.horariosList?.[0] || {};
                        newHorarios.push({
                            fecha: dateStr,
                            llegada: base.llegada || '08:00',
                            inicio: base.inicio || '09:00',
                            fin: base.fin || '18:00'
                        });
                    }
                    currDate = currDate.add(1, 'day');
                }
                newForm.horariosList = newHorarios;
            }
        } catch (error) { console.error('Error regen horarios', error) }

        setEventForm(newForm);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        setIsUploading(true);

        try {
            const response = await api.post('/admin/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setEventForm({ ...eventForm, archivoAdjunto: response.data.fileName });
            alert('Archivo subido correctamente');
        } catch (error) {
            console.error('Error subiendo archivo', error);
            alert('Error al subir el archivo');
        } finally {
            setIsUploading(false);
        }
    };

    const handleEventSubmit = async (e) => {
        e.preventDefault();
        try {
            const fInicio = dayjs(eventForm.fechaInicio).format('YYYY-MM-DD');
            const fFin = dayjs(eventForm.fechaFin).format('YYYY-MM-DD');

            if (!fInicio || !fFin) {
                alert('Error: Forma de fecha inválida.');
                return;
            }

            if (!eventForm.nombre || eventForm.nombre.trim() === '') {
                alert('Error: El nombre del evento es obligatorio.');
                return;
            }

            if (!eventForm.latitud || !eventForm.longitud) {
                alert('Error: La ubicación debe ser obligatoriamente seleccionada desde las sugerencias de Google Maps. No escribas la dirección libremente, esto es para garantizar las coordenadas de la Geocerca.');
                return;
            }

            const payload = {
                nombre: eventForm.nombre.trim(),
                numeroEvento: eventForm.numeroEvento || '',
                fechaInicio: fInicio,
                fechaFin: fFin,
                horaInicio: eventForm.horariosList?.[0]?.inicio || '09:00',
                horaFin: eventForm.horariosList?.[0]?.fin || '18:00',
                horaLlegada: eventForm.horariosList?.[0]?.llegada || '08:00',
                ubicacion: eventForm.ubicacion,
                latitud: eventForm.latitud,
                longitud: eventForm.longitud,
                descripcion: eventForm.descripcion,
                cabina: JSON.stringify(eventForm.cabinaList || []),
                cantCabina: eventForm.cabinaList?.reduce((acc, c) => acc + (parseInt(c.cant) || 0), 0) || 0,
                receptores: JSON.stringify(eventForm.receptoresList || []),
                cantReceptores: eventForm.receptoresList?.reduce((acc, c) => acc + (parseInt(c.cant) || 0), 0) || 0,
                horarios: JSON.stringify(eventForm.horariosList || []),
                equipoExtras: eventForm.equipoExtras || '',
                archivoAdjunto: eventForm.archivoAdjunto || ''
            };

            if (editingId) {
                await api.put(`/admin/events/${editingId}`, payload);
            } else {
                await api.post('/admin/events', payload);
            }

            setIsEventModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Error al guardar el evento:', error);
            const errorMsg = error.response?.data?.message || error.message;
            alert(`Error al guardar el evento: ${errorMsg}`);
        }
    };


    const handleDeleteEvent = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar este evento?')) {
            try {
                await api.delete(`/admin/events/${id}`);
                fetchData();
            } catch (error) {
                console.error('Error deleting event', error);
                alert('Error eliminando el evento.');
            }
        }
    };

    const handleOpenAssignModal = async (e, event) => {
        e.stopPropagation(); // Prevent opening detail modal
        setCurrentEvent(event);

        // Parse event days for day selection
        let eventDays = [];
        try {
            if (event.horarios) {
                const hList = JSON.parse(event.horarios);
                eventDays = hList.map(h => h.fecha);
            }
        } catch (err) {}
        if (eventDays.length === 0) {
            let d = dayjs(event.fechaInicio);
            const end = dayjs(event.fechaFin);
            while (!d.isAfter(end)) {
                eventDays.push(d.format('YYYY-MM-DD'));
                d = d.add(1, 'day');
            }
        }

        setAssignForm({
            eventId: event.id, userId: '', rolAsignado: 'Técnico', pagoAsignado: '', diasAsignados: eventDays.length, pagoExtras: 0,
            eventDays: eventDays,
            diasSeleccionados: [...eventDays] // all days selected by default
        });

        // Fetch current assignments for this event
        try {
            const res = await api.get(`/admin/events/${event.id}/assignments`);
            setEventAssignments(res.data);
            setIsAssignModalOpen(true);
        } catch (error) {
            console.error('Error fetching assignments', error);
        }
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        if (assignForm.diasSeleccionados && assignForm.diasSeleccionados.length === 0) {
            alert('Debes seleccionar al menos un día.');
            return;
        }
        try {
            const payload = {
                eventId: parseInt(assignForm.eventId),
                userId: parseInt(assignForm.userId),
                rolAsignado: assignForm.rolAsignado,
                pagoAsignado: parseFloat(assignForm.pagoAsignado),
                diasAsignados: assignForm.diasSeleccionados ? assignForm.diasSeleccionados.length : parseInt(assignForm.diasAsignados),
                pagoExtras: parseFloat(assignForm.pagoExtras || 0),
                diasSeleccionados: JSON.stringify(assignForm.diasSeleccionados || [])
            };
            await api.post('/admin/assignments', payload);

            // Refresh assignments list in modal
            const res = await api.get(`/admin/events/${assignForm.eventId}/assignments`);
            setEventAssignments(res.data);

            setAssignForm({ ...assignForm, userId: '', rolAsignado: 'Técnico', pagoAsignado: '', pagoExtras: 0, diasSeleccionados: [...(assignForm.eventDays || [])] });
            alert('Personal asignado exitosamente.');
        } catch (error) {
            console.error('Error assigning staff', error);
            const msg = error.response?.data?.message || 'Error al asignar personal.';
            alert(msg);
        }
    };

    const handleDeleteAssignment = async (id) => {
        if (window.confirm('¿Eliminar esta asignación?')) {
            try {
                await api.delete(`/admin/assignments/${id}`);
                const res = await api.get(`/admin/events/${currentEvent.id}/assignments`);
                setEventAssignments(res.data);
            } catch (error) {
                console.error('Error deleting assignment', error);
                alert('Error al eliminar asignación.');
            }
        }
    };

    const handleOpenDetail = async (event, mode = 'details') => {
        setSelectedEvent(event);
        setDetailViewMode(mode);
        try {
            const assigRes = await api.get(`/admin/events/${event.id}/assignments`);
            setEventAssignments(assigRes.data);

            try {
                const checkInRes = await api.get(`/admin/events/${event.id}/checkins`);
                console.log("CHECKINS CARGADOS:", checkInRes.data);
                setEventCheckIns(checkInRes.data || []);
            } catch (checkInErr) {
                console.error('Error fetching checkins:', checkInErr);
                setEventCheckIns([]);
            }

            setIsDetailModalOpen(true);
        } catch (error) {
            console.error('Error fetching event details for modal', error);
            setEventAssignments([]);
            setEventCheckIns([]);
            setIsDetailModalOpen(true);
        }
    };

    if (loading) return <div className="p-8 text-center text-primary">Cargando eventos...</div>;

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Eventos</h1>
                    <p className="text-sm text-gray-500 mt-1">Administra los eventos, horarios y staff asignado</p>
                </div>
                <button
                    onClick={() => handleOpenEventModal()}
                    className="btn-primary flex items-center"
                >
                    <Plus size={18} className="mr-2" /> Nuevo Evento
                </button>
            </div>

            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h2 className="text-lg font-bold text-gray-800">Eventos Activos</h2>
                <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-sm font-bold text-sidebar hover:text-accent transition-colors flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg"
                >
                    {showHistory ? 'Ocultar Historial' : 'Ver Historial (Finalizados)'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                {events.filter(e => !isHistoryEvent(e)).map((event) => (
                    <div key={event.id}
                        onClick={() => handleOpenDetail(event, 'details')}
                        className="card relative flex flex-col hover:border-primary cursor-pointer transition-all duration-300 group shadow-sm hover:shadow-md"
                    >
                        <div className="absolute top-4 right-4 flex space-x-2 z-10">
                            <button onClick={(e) => { e.stopPropagation(); handleOpenEventModal(event); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Eliminar">
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div className="mb-4 pr-16">
                            <span className={`inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full mb-3 ${event.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' :
                                event.estado === 'EN_CURSO' ? 'bg-blue-100 text-blue-800' :
                                    event.estado === 'FINALIZADO' ? (isHistoryEvent(event) ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-800') :
                                        'bg-green-100 text-green-800'
                                }`}>
                                {event.estado}
                            </span>
                            {event.numeroEvento && (
                                <span className="inline-block px-2 py-1 text-[10px] font-bold tracking-widest rounded-full mb-3 ml-2 bg-gray-100 text-gray-800 border border-gray-200">
                                    #{event.numeroEvento}
                                </span>
                            )}
                            <h3 className="font-bold text-xl text-gray-900 leading-tight">{event.nombre}</h3>
                        </div>

                        <div className="space-y-3 mb-6 flex-1">
                            <div className="flex text-sm text-gray-600 items-start">
                                <LayoutIcon size={16} className="mr-2.5 mt-0.5 text-accent flex-shrink-0" />
                                <span>
                                    {dayjs(event.fechaInicio).format('DD/MM/YYYY')} al {dayjs(event.fechaFin).format('DD/MM/YYYY')}<br />
                                    <span className="text-gray-500 text-xs font-medium">Llegada: {event.horaLlegada} • Inicio: {event.horaInicio}</span>
                                </span>
                            </div>
                            <div className="flex text-sm text-gray-600 items-center">
                                <MapPin size={16} className="mr-2.5 text-accent flex-shrink-0" />
                                <span className="truncate">{event.ubicacion}</span>
                            </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-gray-100 flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleOpenDetail(event, 'attendance'); }}
                                className="flex-1 flex items-center justify-center py-2.5 text-[12px] font-bold tracking-wide text-text bg-success hover:brightness-95 rounded-lg transition-all shadow-sm"
                            >
                                <LayoutIcon size={14} className="mr-1" /> Asistencia
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleOpenAssignModal(e, event); }}
                                className="flex-1 flex items-center justify-center py-2.5 text-[12px] font-bold tracking-wide text-text bg-accent hover:brightness-95 rounded-lg transition-all shadow-sm"
                            >
                                <Users size={14} className="mr-1" /> Asignar personal
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {showHistory && (
                <div className="space-y-4 pt-4 animate-fade-in">
                    <h2 className="text-lg font-bold text-gray-500 border-b border-gray-100 pb-2">Historial de Eventos Finalizados</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                        {events.filter(e => isHistoryEvent(e)).map((event) => (
                            <div key={event.id}
                                onClick={() => handleOpenDetail(event, 'details')}
                                className="card relative flex flex-col bg-gray-50 opacity-60 grayscale border-gray-200 cursor-pointer transition-all duration-300 group"
                            >
                                <div className="mb-4 pr-16">
                                    <span className="inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full mb-3 bg-gray-200 text-gray-700">
                                        {event.estado}
                                    </span>
                                    {event.numeroEvento && (
                                        <span className="inline-block px-2 py-1 text-[10px] font-bold tracking-widest rounded-full mb-3 ml-2 bg-gray-100 text-gray-800 border border-gray-200">
                                            #{event.numeroEvento}
                                        </span>
                                    )}
                                    <h3 className="font-bold text-xl text-gray-900 leading-tight">{event.nombre}</h3>
                                </div>

                                <div className="space-y-3 mb-6 flex-1">
                                    <div className="flex text-sm text-gray-600 items-start">
                                        <LayoutIcon size={16} className="mr-2.5 mt-0.5 text-gray-400 flex-shrink-0" />
                                        <span>
                                            {dayjs(event.fechaInicio).format('DD/MM/YYYY')} al {dayjs(event.fechaFin).format('DD/MM/YYYY')}
                                        </span>
                                    </div>
                                    <div className="flex text-sm text-gray-600 items-center">
                                        <MapPin size={16} className="mr-2.5 text-gray-400 flex-shrink-0" />
                                        <span className="truncate">{event.ubicacion}</span>
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-gray-100 flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleOpenAssignModal(e, event); }}
                                        className="flex-1 flex items-center justify-center py-2 text-[11px] font-bold tracking-wide text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                                    >
                                        <Users size={14} className="mr-1" /> Asignar personal
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal Crear/Editar Evento */}
            {isEventModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black bg-opacity-50 p-4">
                    <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0 bg-gray-50 rounded-t-xl">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center">
                                <span className="w-2 h-6 bg-sidebar mr-3 rounded-full"></span>
                                {editingId ? 'Editar Evento' : 'Crear Nuevo Evento'}
                            </h3>
                            <button onClick={() => setIsEventModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleEventSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="p-3 rounded-xl border border-sidebar/20 bg-sidebar/5 shadow-sm col-span-1 md:col-span-3">
                                    <label className="block text-xs font-bold text-sidebar uppercase mb-1 tracking-wide">Nombre o Título del Evento</label>
                                    <input
                                        type="text"
                                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-lg font-bold focus:border-sidebar outline-none transition-all"
                                        placeholder="Ej: Boda Civil"
                                        required
                                        value={eventForm.nombre}
                                        onChange={(e) => setEventForm({ ...eventForm, nombre: e.target.value })}
                                    />
                                </div>
                                <div className="p-3 rounded-xl border border-sidebar/20 bg-sidebar/5 shadow-sm col-span-1 md:col-span-1">
                                    <label className="block text-xs font-bold text-sidebar uppercase mb-1 tracking-wide">Núm. Evento</label>
                                    <input
                                        type="text"
                                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-lg font-bold focus:border-sidebar outline-none transition-all text-center"
                                        placeholder="EV-001"
                                        required
                                        value={eventForm.numeroEvento}
                                        onChange={(e) => setEventForm({ ...eventForm, numeroEvento: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col">
                                    <label className="label">Fecha Inicio</label>
                                    <DatePicker
                                        selected={eventForm.fechaInicio}
                                        onChange={(date) => handleDateChange('fechaInicio', date)}
                                        dateFormat="dd/MM/yyyy"
                                        locale="es"
                                        className="input-field w-full"
                                        required
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="label">Fecha Fin</label>
                                    <DatePicker
                                        selected={eventForm.fechaFin}
                                        onChange={(date) => handleDateChange('fechaFin', date)}
                                        dateFormat="dd/MM/yyyy"
                                        locale="es"
                                        className="input-field w-full"
                                        required
                                        minDate={eventForm.fechaInicio}
                                    />
                                </div>
                            </div>

                            <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
                                <h4 className="text-sm font-bold text-sidebar mb-3 flex items-center tracking-wide uppercase">
                                    <Clock size={16} className="mr-2" /> HORARIOS POR DÍA ({eventForm.horariosList?.length || 1} {eventForm.horariosList?.length === 1 ? 'Día' : 'Días'})
                                </h4>
                                <div className="space-y-4">
                                    {eventForm.horariosList?.map((horario, index) => (
                                        <div key={`h-${index}`} className="bg-white p-3 rounded-lg border border-sidebar/10 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                                            <div className="font-bold text-sm text-sidebar mb-1 sm:mb-0 pb-1 sm:pb-2 border-b sm:border-b-0 border-sidebar/10 flex items-center">
                                                <CalendarDays size={14} className="mr-1.5" />
                                                {dayjs(horario.fecha, 'YYYY-MM-DD').format('DD/MM/YYYY')}
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 mb-1 block">Llegada</label>
                                                <input type="time" required className="input-field bg-accent/10 border-accent/30 text-sidebar font-semibold text-sm p-1.5" value={horario.llegada} onChange={(e) => {
                                                    const newList = eventForm.horariosList.map((h, i) => i === index ? { ...h, llegada: e.target.value } : h);
                                                    setEventForm({ ...eventForm, horariosList: newList });
                                                }} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 mb-1 block">Inicio</label>
                                                <input type="time" required className="input-field bg-accent/10 border-accent/30 text-sidebar font-semibold text-sm p-1.5" value={horario.inicio} onChange={(e) => {
                                                    const newList = eventForm.horariosList.map((h, i) => i === index ? { ...h, inicio: e.target.value } : h);
                                                    setEventForm({ ...eventForm, horariosList: newList });
                                                }} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 mb-1 block">Fin</label>
                                                <input type="time" required className="input-field bg-accent/10 border-accent/30 text-sidebar font-semibold text-sm p-1.5" value={horario.fin} onChange={(e) => {
                                                    const newList = eventForm.horariosList.map((h, i) => i === index ? { ...h, fin: e.target.value } : h);
                                                    setEventForm({ ...eventForm, horariosList: newList });
                                                }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="label">Ubicación</label>
                                <NewPlaceAutocomplete
                                    value={eventForm.ubicacion}
                                    onPlaceSelected={(place) => {
                                        setEventForm({
                                            ...eventForm,
                                            ubicacion: place.address || '',
                                            latitud: place.lat || null,
                                            longitud: place.lng || null
                                        });
                                    }}
                                    className="input-field w-full"
                                    required={true}
                                    placeholder="Buscar dirección o nombre del lugar (Ej. México)..."
                                />
                            </div>

                            <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
                                <h4 className="text-sm font-bold text-sidebar mb-3 flex items-center tracking-wide uppercase">
                                    <LayoutIcon size={16} className="mr-2" /> SECCIÓN: EQUIPO
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="label mb-0">Cabinas</label>
                                            <button type="button" onClick={() => setEventForm({ ...eventForm, cabinaList: [...(eventForm.cabinaList || []), { tipo: 'Media cabina', cant: 1 }] })} className="text-sidebar hover:text-accent transition-colors flex items-center text-xs font-bold">
                                                <Plus size={14} className="mr-1" /> Añadir
                                            </button>
                                        </div>
                                        {eventForm.cabinaList?.map((cab, index) => (
                                            <div key={`cab-${index}`} className="flex gap-2 items-start relative group">
                                                <div className="flex-1">
                                                    <select className="input-field" value={cab.tipo} onChange={(e) => {
                                                        const newCabinas = (eventForm.cabinaList || []).map((c, i) => i === index ? { ...c, tipo: e.target.value } : c);
                                                        setEventForm({ ...eventForm, cabinaList: newCabinas });
                                                    }}>
                                                        <option value="Media cabina">Media cabina</option>
                                                        <option value="Cabina completa">Cabina completa</option>
                                                    </select>
                                                </div>
                                                <div className="w-20">
                                                    <input type="number" min="0" className="input-field" value={cab.cant} onChange={(e) => {
                                                        const newCabinas = (eventForm.cabinaList || []).map((c, i) => i === index ? { ...c, cant: parseInt(e.target.value) || 0 } : c);
                                                        setEventForm({ ...eventForm, cabinaList: newCabinas });
                                                    }} />
                                                </div>
                                                {(eventForm.cabinaList?.length || 0) > 1 && (
                                                    <button type="button" onClick={() => {
                                                        const newCabinas = eventForm.cabinaList.filter((_, i) => i !== index);
                                                        setEventForm({ ...eventForm, cabinaList: newCabinas });
                                                    }} className="text-red-400 hover:text-red-600 p-2 mt-1">
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="label mb-0">Receptores</label>
                                            <button type="button" onClick={() => setEventForm({ ...eventForm, receptoresList: [...(eventForm.receptoresList || []), { tipo: 'normales', cant: 50 }] })} className="text-sidebar hover:text-accent transition-colors flex items-center text-xs font-bold">
                                                <Plus size={14} className="mr-1" /> Añadir
                                            </button>
                                        </div>
                                        {eventForm.receptoresList?.map((rec, index) => (
                                            <div key={`rec-${index}`} className="flex gap-2 items-start relative group">
                                                <div className="flex-1">
                                                    <select className="input-field" value={rec.tipo} onChange={(e) => {
                                                        const newRec = (eventForm.receptoresList || []).map((r, i) => i === index ? { ...r, tipo: e.target.value } : r);
                                                        setEventForm({ ...eventForm, receptoresList: newRec });
                                                    }}>
                                                        <option value="normales">Normales</option>
                                                        <option value="luminosos">Luminosos</option>
                                                    </select>
                                                </div>
                                                <div className="w-20">
                                                    <input type="number" min="0" className="input-field" value={rec.cant} onChange={(e) => {
                                                        const newRec = (eventForm.receptoresList || []).map((r, i) => i === index ? { ...r, cant: parseInt(e.target.value) || 0 } : r);
                                                        setEventForm({ ...eventForm, receptoresList: newRec });
                                                    }} />
                                                </div>
                                                {(eventForm.receptoresList?.length || 0) > 1 && (
                                                    <button type="button" onClick={() => {
                                                        const newRec = eventForm.receptoresList.filter((_, i) => i !== index);
                                                        setEventForm({ ...eventForm, receptoresList: newRec });
                                                    }} className="text-red-400 hover:text-red-600 p-2 mt-1">
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="label">Equipo Extras</label>
                                        <textarea className="input-field min-h-[60px]" placeholder="Cámaras, micrófonos adicionales, etc." value={eventForm.equipoExtras} onChange={(e) => setEventForm({ ...eventForm, equipoExtras: e.target.value })}></textarea>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="label">Descripción</label>
                                    <textarea className="input-field min-h-[100px]" placeholder="Detalles del evento, itinerarios..." value={eventForm.descripcion} onChange={(e) => setEventForm({ ...eventForm, descripcion: e.target.value })}></textarea>
                                </div>

                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Anexar archivo (Opcional)</label>
                                    <div className="flex items-center space-x-4">
                                        <input
                                            type="file"
                                            className="block w-full text-sm text-gray-500
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-full file:border-0
                                                file:text-sm file:font-semibold
                                                file:bg-primary file:text-sidebar
                                                hover:file:brightness-95 cursor-pointer
                                                disabled:opacity-50"
                                            onChange={handleFileUpload}
                                            disabled={isUploading}
                                        />
                                        {isUploading && <span className="text-sm text-sidebar font-bold animate-pulse">Subiendo...</span>}
                                    </div>
                                    {eventForm.archivoAdjunto && (
                                        <div className="mt-3 text-sm flex items-center bg-green-50 text-green-700 p-2 rounded-md">
                                            <span className="font-medium mr-2">Archivo adjunto guardado:</span>
                                            <a href={eventForm.archivoAdjunto.startsWith('http') ? eventForm.archivoAdjunto : `/uploads/${eventForm.archivoAdjunto}`} target="_blank" rel="noreferrer" className="underline hover:text-green-900 truncate max-w-[200px]">
                                                {eventForm.archivoAdjunto}
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => setEventForm({ ...eventForm, archivoAdjunto: '' })}
                                                className="ml-auto text-red-500 hover:text-red-700 font-bold px-2"
                                            >
                                                [X]
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 space-x-3">
                                <button type="button" onClick={() => setIsEventModalOpen(false)} className="btn-secondary">Cancelar</button>
                                <button type="submit" className="btn-primary">{editingId ? 'Guardar Cambios' : 'Crear Evento'}</button>
                            </div>
                        </form>
                    </div>
                </div >
            )}

            {/* Modal Asignar Personal */}
            {
                isAssignModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black bg-opacity-50 p-4">
                        <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                                <h3 className="text-xl font-bold text-gray-900 border-l-4 border-sidebar pl-3">
                                    Staff del Evento: <span className="text-sidebar">{currentEvent?.nombre}</span>
                                </h3>
                                <button onClick={() => setIsAssignModalOpen(false)} className="text-gray-400 hover:text-gray-900">
                                    <XIcon />
                                </button>
                            </div>

                            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                                {/* Assign Form */}
                                <div className="w-full md:w-1/3 p-6 border-r border-gray-100 bg-white overflow-y-auto">
                                    <h4 className="font-bold text-gray-800 mb-4">Nueva Asignación</h4>
                                    <form onSubmit={handleAssignSubmit} className="space-y-4">
                                        <div>
                                            <label className="label">Trabajador</label>
                                            <select className="input-field text-sm" required value={assignForm.userId} onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })}>
                                                <option value="">-- Seleccionar --</option>
                                                {staff
                                                    .filter(s => s.activo && !eventAssignments.some(asg => asg.user.id === s.id))
                                                    .map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.puesto})</option>)
                                                }
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">Rol en el Evento</label>
                                            <select className="input-field text-sm" required value={assignForm.rolAsignado} onChange={(e) => setAssignForm({ ...assignForm, rolAsignado: e.target.value })}>
                                                <option value="Técnico">Técnico</option>
                                                <option value="Staff">Staff</option>
                                                <option value="Intérprete">Intérprete</option>
                                            </select>
                                        </div>
                                        <div className="space-y-4">
                                            {/* Day selection for multi-day events */}
                                            {assignForm.eventDays && assignForm.eventDays.length > 1 && (
                                                <div>
                                                    <label className="label">Días asignados</label>
                                                    <div className="space-y-1.5 mt-1">
                                                        {assignForm.eventDays.map((day) => {
                                                            const isChecked = assignForm.diasSeleccionados?.includes(day);
                                                            return (
                                                                <label key={day} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-sm ${
                                                                    isChecked ? 'bg-primary/20 border-primary' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                                                }`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={() => {
                                                                            const updated = isChecked
                                                                                ? assignForm.diasSeleccionados.filter(d => d !== day)
                                                                                : [...(assignForm.diasSeleccionados || []), day];
                                                                            setAssignForm({ ...assignForm, diasSeleccionados: updated, diasAsignados: updated.length });
                                                                        }}
                                                                        className="accent-primary"
                                                                    />
                                                                    <span className="font-semibold text-gray-800">{dayjs(day).format('ddd DD/MM/YYYY')}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 mt-1">{assignForm.diasSeleccionados?.length || 0} de {assignForm.eventDays.length} días seleccionados</p>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="label">Días</label>
                                                    <input type="number" min="1" className="input-field text-sm bg-gray-100" readOnly value={assignForm.diasSeleccionados ? assignForm.diasSeleccionados.length : assignForm.diasAsignados} />
                                                </div>
                                                <div>
                                                    <label className="label">Pago por día ($)</label>
                                                    <input type="number" step="0.01" className="input-field text-sm" required value={assignForm.pagoAsignado} onChange={(e) => setAssignForm({ ...assignForm, pagoAsignado: e.target.value })} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="label">Extras ($) <span className="text-[10px] text-gray-400 font-normal">(Viáticos, bonos, etc.)</span></label>
                                                <input type="number" step="0.01" className="input-field text-sm" value={assignForm.pagoExtras} onChange={(e) => setAssignForm({ ...assignForm, pagoExtras: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="bg-sidebar/5 p-4 rounded-lg text-sm border border-sidebar/10">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-gray-600">Base ({assignForm.diasSeleccionados ? assignForm.diasSeleccionados.length : assignForm.diasAsignados}d x ${assignForm.pagoAsignado || 0}):</span>
                                                <span className="font-medium">${(parseFloat(assignForm.pagoAsignado || 0) * (assignForm.diasSeleccionados ? assignForm.diasSeleccionados.length : parseInt(assignForm.diasAsignados || 0))).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center mb-2 border-b border-sidebar/10 pb-2">
                                                <span className="text-gray-600">Extras:</span>
                                                <span className="font-medium">${parseFloat(assignForm.pagoExtras || 0).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center font-bold text-sidebar">
                                                <span>TOTAL A PAGAR:</span>
                                                <span>${(parseFloat(assignForm.pagoAsignado || 0) * (assignForm.diasSeleccionados ? assignForm.diasSeleccionados.length : parseInt(assignForm.diasAsignados || 0)) + parseFloat(assignForm.pagoExtras || 0)).toFixed(2)}</span>
                                            </div>
                                        </div>
                                        <button type="submit" className="w-full btn-primary py-2 text-sm mt-2">
                                            Asignar Trabajador
                                        </button>
                                    </form>
                                </div>

                                {/* Assignments List */}
                                <div className="w-full md:w-2/3 bg-gray-50 p-6 overflow-y-auto">
                                    <h4 className="font-bold text-gray-800 mb-4">Personal Asignado ({eventAssignments.length})</h4>

                                    {eventAssignments.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                                            Aún no hay personal asignado a este evento.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {eventAssignments.map(asg => (
                                                <div key={asg.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center group">
                                                    <div className="flex-1">
                                                        <p className="font-bold text-gray-900 text-sm">{asg.user.nombre}</p>
                                                        <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 mt-1">
                                                            <span className="bg-gray-100 px-2 py-0.5 rounded uppercase"><span className="font-bold mr-1 text-gray-700">Rol:</span> {asg.rolAsignado}</span>
                                                            <span className="bg-gray-100 px-2 py-0.5 rounded uppercase"><span className="font-bold mr-1 text-gray-700">Días:</span> {asg.diasAsignados}</span>
                                                            <span className="text-sidebar font-bold flex items-center bg-success/30 px-2 py-0.5 rounded border border-success/40">
                                                                Total: ${(asg.pagoAsignado * asg.diasAsignados + (asg.pagoExtras || 0)).toFixed(2)}
                                                            </span>
                                                        </div>
                                                        {asg.diasSeleccionados && (() => {
                                                            try {
                                                                const dias = JSON.parse(asg.diasSeleccionados);
                                                                if (dias && dias.length > 0) return (
                                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                                        {dias.map(d => (
                                                                            <span key={d} className="bg-primary/20 text-sidebar text-[9px] font-bold px-1.5 py-0.5 rounded">{dayjs(d).format('ddd DD/MM')}</span>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            } catch(e) {}
                                                            return null;
                                                        })()}
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteAssignment(asg.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                                        title="Eliminar asignación"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal Detalle del Evento */}
            <EventDetailModal
                checkIns={eventCheckIns}
                onPreviewImage={(url) => { setPreviewImg(url); setShowPreviewModal(true); }}
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                event={selectedEvent}
                assignments={eventAssignments}
                viewMode={detailViewMode}
                setViewMode={setDetailViewMode}
            />

            {/* Modal para ver fotos grandes */}
            {
                showPreviewModal && previewImg && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-90 p-4" onClick={() => setShowPreviewModal(false)}>
                        <div className="relative max-w-4xl max-h-screen">
                            <button className="absolute -top-10 right-0 text-white font-bold p-2 hover:bg-white/20 rounded-full" onClick={() => setShowPreviewModal(false)}>
                                <X size={24} />
                            </button>
                            <img src={previewImg} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
                        </div>
                    </div>
                )
            }

        </div >
    );
};

/* Modal Detalle del Evento */
const EventDetailModal = ({ isOpen, onClose, event, assignments, checkIns, onPreviewImage, viewMode, setViewMode }) => {
    if (!isOpen || !event) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black bg-opacity-60 p-4 font-sans text-left">
            <div className="relative w-full max-w-[90vw] bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                <div className="bg-sidebar p-4 md:p-5 text-white relative flex-shrink-0">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                        <XIcon />
                    </button>
                    <div className="flex items-center gap-3 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase inline-block ${event.estado === 'PENDIENTE' ? 'bg-yellow-500/20 text-yellow-400' :
                            event.estado === 'EN_CURSO' ? 'bg-accent/20 text-accent/80' : 'bg-success/20 text-success/80'
                            }`}>
                            {event.estado}
                        </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-black leading-tight">{event.nombre}</h2>
                    <div className="flex flex-wrap gap-3 md:gap-5 mt-2 text-xs md:text-sm">
                        <div className="flex items-center text-gray-300">
                            <svg className="w-4 h-4 mr-1.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <span>{dayjs(event.fechaInicio).format('DD/MM/YYYY')} - {dayjs(event.fechaFin).format('DD/MM/YYYY')}</span>
                        </div>
                        <div className="flex items-center text-gray-300">
                            <svg className="w-4 h-4 mr-1.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <span>{event.ubicacion}</span>
                        </div>
                    </div>
                </div>

                {/* TABS NAVEGACION */}
                <div className="flex border-b border-gray-200 bg-gray-50/80 backdrop-blur sticky top-0 z-20">
                    <button
                        onClick={() => setViewMode('details')}
                        className={`flex-1 py-4 font-bold text-sm tracking-widest uppercase transition-colors ${viewMode === 'details' ? 'text-text border-b-4 border-accent bg-accent/10' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
                    >
                        Detalles del Evento
                    </button>
                    <button
                        onClick={() => setViewMode('attendance')}
                        className={`flex-1 py-4 font-bold text-sm tracking-widest uppercase transition-colors ${viewMode === 'attendance' ? 'text-text border-b-4 border-accent bg-accent/10' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
                    >
                        Control de Asistencia
                    </button>
                </div>

                <div className="overflow-y-auto w-full">
                    {viewMode === 'details' && (
                        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Horarios del Evento</h4>
                                    <div className="space-y-3">
                                        {(() => {
                                            try {
                                                if (event.horarios) {
                                                    const hList = JSON.parse(event.horarios);
                                                    if (hList && hList.length > 0) {
                                                        return hList.map((h, i) => (
                                                            <div key={`vm-h-${i}`} className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs w-full">
                                                                <div className="font-bold text-gray-900 border-b border-gray-200 pb-1 mb-2">
                                                                    {dayjs(h.fecha, 'YYYY-MM-DD').format('DD/MM/YYYY')}
                                                                </div>
                                                                <div className="flex justify-between py-1 border-b border-gray-100 last:border-0 last:pb-0">
                                                                    <span className="text-gray-500">Llegada Staff:</span><span className="font-bold text-gray-800">{h.llegada}</span>
                                                                </div>
                                                                <div className="flex justify-between py-1 border-b border-gray-100 last:border-0 last:pb-0">
                                                                    <span className="text-gray-500">Inicio Evento:</span><span className="font-bold text-gray-800">{h.inicio}</span>
                                                                </div>
                                                                <div className="flex justify-between py-1 last:border-0 last:pb-0">
                                                                    <span className="text-gray-500">Fin Evento:</span><span className="font-bold text-gray-800">{h.fin}</span>
                                                                </div>
                                                            </div>
                                                        ));
                                                    }
                                                }
                                            } catch (e) { }
                                            return (
                                                <div className="space-y-2">
                                                    <div className="flex justify-between py-2 border-b border-gray-50">
                                                        <span className="text-gray-600">Llegada Staff:</span>
                                                        <span className="font-bold text-gray-900">{event.horaLlegada}</span>
                                                    </div>
                                                    <div className="flex justify-between py-2 border-b border-gray-50">
                                                        <span className="text-gray-600">Inicio Evento:</span>
                                                        <span className="font-bold text-gray-900">{event.horaInicio}</span>
                                                    </div>
                                                    <div className="flex justify-between py-2 border-b border-gray-50">
                                                        <span className="text-gray-600">Fin Evento:</span>
                                                        <span className="font-bold text-gray-900">{event.horaFin}</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 font-sans">Equipo Solicitado</h4>
                                    <div className="bg-accent/10 p-4 rounded-xl border border-accent/20 space-y-3 font-sans">
                                        <div className="text-sm">
                                            <span className="text-sidebar font-bold block mb-1">Cabinas:</span>
                                            {(() => {
                                                try {
                                                    if (event.cabina?.startsWith('[')) {
                                                        const cabList = JSON.parse(event.cabina);
                                                        return cabList.map((c, i) => (
                                                            <span key={`vcab-${i}`} className="text-sidebar block pl-2 text-xs mb-0.5 font-bold">• {c.cant}x {c.tipo}</span>
                                                        ));
                                                    }
                                                } catch (e) { }
                                                return <span className="text-sidebar block pl-2 text-xs font-bold">• {event.cantCabina}x {event.cabina}</span>;
                                            })()}
                                        </div>
                                        <div className="text-sm mt-3">
                                            <span className="text-sidebar font-bold block mb-1">Receptores:</span>
                                            {(() => {
                                                try {
                                                    if (event.receptores?.startsWith('[')) {
                                                        const recList = JSON.parse(event.receptores);
                                                        return recList.map((r, i) => (
                                                            <span key={`vrec-${i}`} className="text-sidebar block pl-2 text-xs mb-0.5 font-bold">• {r.cant}x {r.tipo}</span>
                                                        ));
                                                    }
                                                } catch (e) { }
                                                return <span className="text-sidebar block pl-2 text-xs font-bold">• {event.cantReceptores}x {event.receptores}</span>;
                                            })()}
                                        </div>
                                        {event.equipoExtras && (
                                            <div className="mt-2 pt-2 border-t border-accent/20">
                                                <p className="text-[10px] uppercase font-bold text-sidebar/60">Extras:</p>
                                                <p className="text-xs text-sidebar italic">"{event.equipoExtras}"</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Descripción</h4>
                                <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 italic text-sm mb-4">
                                    "{event.descripcion || 'Sin descripción adicional.'}"
                                </p>

                                {event.archivoAdjunto && (
                                    <div className="bg-primary/20 p-4 rounded-xl border border-primary/40">
                                        <h4 className="text-xs font-bold text-sidebar uppercase tracking-widest mb-2 flex items-center">
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                            Archivo Adjunto
                                        </h4>
                                        <a href={event.archivoAdjunto.startsWith('http') ? event.archivoAdjunto : `/uploads/${event.archivoAdjunto}`} target="_blank" rel="noreferrer" className="text-sm text-sidebar/80 hover:text-sidebar underline font-medium truncate block">
                                            {event.archivoAdjunto}
                                        </a>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Staff Asignado ({assignments?.length || 0})</h4>
                                <div className="space-y-3">
                                    {assignments && assignments.length > 0 ? (
                                        assignments.map(asg => (
                                            <div key={asg.id} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-success/40 flex items-center justify-center mr-3 shadow-sm">
                                                    <Users size={14} className="text-sidebar" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{asg.user.nombre}</p>
                                                    <p className="text-[10px] text-gray-500 uppercase font-medium">{asg.rolAsignado} • {asg.diasAsignados} día(s)</p>
                                                    {asg.diasSeleccionados && (() => {
                                                        try {
                                                            const dias = JSON.parse(asg.diasSeleccionados);
                                                            if (dias && dias.length > 0) return (
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {dias.map(d => (
                                                                        <span key={d} className="bg-primary/20 text-sidebar text-[8px] font-bold px-1.5 py-0.5 rounded">{dayjs(d).format('ddd DD/MM')}</span>
                                                                    ))}
                                                                </div>
                                                            );
                                                        } catch(e) {}
                                                        return null;
                                                    })()}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200 text-center">
                                            No hay personal asignado.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )} {/* CIERRE VISTA DETALLES */}

                    {/* Inicio Panel Asistencia Full Width */}
                    {viewMode === 'attendance' && (
                        <div className="p-5 md:p-6 space-y-4 md:space-y-5 w-full">
                            <div className="flex justify-end">
                                <div className="bg-accent/20 px-4 py-2 rounded-lg border border-accent/30 flex items-center gap-3 shadow-sm">
                                    <CheckSquare size={18} className="text-sidebar" />
                                    <span className="font-black text-lg text-sidebar">{checkIns?.length || 0} / {assignments?.length || 0}</span>
                                    <span className="text-xs font-bold text-sidebar uppercase tracking-widest">Registros</span>
                                </div>
                            </div>

                            {assignments && assignments.length > 0 ? (
                                <div className="space-y-4">
                                    {assignments.map(asg => {
                                        const userId = asg.user?.id;
                                        const userCheckIns = checkIns?.filter(c => c.user?.id === userId || c.userId === userId) || [];

                                        // Parse assigned days for this worker
                                        let assignedDays = [];
                                        try {
                                            if (asg.diasSeleccionados) {
                                                assignedDays = JSON.parse(asg.diasSeleccionados);
                                            }
                                        } catch (e) {}

                                        let hList = [];
                                        try { hList = event.horarios ? JSON.parse(event.horarios) : []; } catch (e) { }
                                        if (hList.length === 0) {
                                            hList = [{
                                                fecha: dayjs(event.fechaInicio, 'YYYY-MM-DD').format('YYYY-MM-DD'),
                                                llegada: event.horaLlegada
                                            }];
                                        }

                                        // Filter to only assigned days
                                        if (assignedDays.length > 0) {
                                            hList = hList.filter(h => assignedDays.includes(h.fecha));
                                        }

                                        return (
                                            <div key={asg.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden group">
                                                {/* Barra de Acento */}
                                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-accent group-hover:bg-primary transition-colors"></div>

                                                {/* Info del Trabajador */}
                                                <div className="flex items-center gap-4 w-full lg:w-1/4">
                                                    <div className="w-12 h-12 rounded-full bg-accent/20 text-sidebar flex items-center justify-center font-black text-xl flex-shrink-0 shadow-inner">
                                                        {asg.user?.nombre.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h5 className="font-bold text-sidebar text-lg leading-tight">{asg.user?.nombre}</h5>
                                                        <span className="text-[10px] font-black tracking-widest text-sidebar bg-primary/40 px-2 py-1 rounded-md uppercase mt-1 inline-block">{asg.rolAsignado}</span>
                                                        {assignedDays.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {assignedDays.map(d => (
                                                                    <span key={d} className="bg-primary/20 text-sidebar text-[8px] font-bold px-1.5 py-0.5 rounded">{dayjs(d).format('DD/MM')}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Detalles de Asistencia Vertical a Horizontal */}
                                                <div className="w-full lg:flex-1 flex flex-col gap-3">
                                                    {hList.map((h, i) => {
                                                        const normalizeDate = (d) => {
                                                            if (!d) return null;
                                                            if (Array.isArray(d)) return `${d[0]}-${d[1].toString().padStart(2, '0')}-${d[2].toString().padStart(2, '0')}`;
                                                            return d;
                                                        };
                                                        const ci = userCheckIns.find(c => normalizeDate(c.fecha) === normalizeDate(h.fecha)) || (userCheckIns.length === 1 && !userCheckIns[0].fecha ? userCheckIns[0] : null);
                                                        const isPast = dayjs(h.fecha).isBefore(dayjs(), 'day');
                                                        const noRegistro = isPast && !ci?.horaEntrada && !ci?.horaMontaje && !ci?.horaSalida;

                                                        return (
                                                            <div key={`ci-${i}`} className="flex flex-col sm:flex-row flex-wrap lg:flex-nowrap gap-4 items-start lg:items-center justify-between bg-gray-50/50 p-3 rounded-xl border border-gray-100 relative">
                                                                <div className="absolute -left-1.5 top-2 bottom-2 w-1 bg-gray-300 rounded-r-md"></div>

                                                                {/* Fecha Badge */}
                                                                <div className="w-full sm:w-auto flex items-center shrink-0 pr-4 sm:border-r border-gray-200">
                                                                    <span className="bg-sidebar text-primary px-3 py-1.5 text-[10px] font-black tracking-widest uppercase rounded-lg shadow-sm flex items-center">
                                                                        <CalendarDays size={12} className="mr-1.5" />
                                                                        {dayjs(h.fecha, 'YYYY-MM-DD').format('DD MMM')}
                                                                    </span>
                                                                </div>

                                                                {noRegistro ? (
                                                                    /* Día pasado sin ningún registro */
                                                                    <div className="w-full lg:flex-1 flex items-center justify-center">
                                                                        <span className="text-red-400 text-xs font-bold uppercase tracking-wider bg-red-50 border border-red-200 px-4 py-2 rounded-lg">
                                                                            ⚠ No registró asistencia
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                {/* Hora Acordada */}
                                                                <div className="w-full sm:w-auto flex flex-col lg:items-center">
                                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5">Llegada</span>
                                                                    <div className="flex items-center text-red-500 font-black text-sm flex-wrap xl:justify-center">
                                                                        <Clock size={14} className="mr-1.5" />
                                                                        {h.llegada || event.horaLlegada}
                                                                    </div>
                                                                </div>

                                                                {/* Entrada Real */}
                                                                <div className="w-full sm:w-auto flex flex-col lg:items-center">
                                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5">Entrada</span>
                                                                    <div className="w-full flex items-center justify-between lg:justify-center gap-2">
                                                                        {ci?.horaEntrada ? (
                                                                            <div className="flex items-center gap-2 bg-success/30 border border-success/40 pl-3 pr-1 py-1 rounded-lg shadow-sm">
                                                                                <div className="flex items-center text-sidebar font-black text-xs whitespace-nowrap">
                                                                                    <CheckSquare size={14} className="mr-1.5 text-sidebar" />
                                                                                    {dayjs(ci.horaEntrada).format('HH:mm')}
                                                                                </div>
                                                                                {ci.fotoEntrada && (
                                                                                    <button onClick={() => onPreviewImage(ci.fotoEntrada.rutaArchivo)} className="bg-white hover:bg-success/50 text-sidebar p-1 rounded-md shadow-sm border border-success/30 transition-all ml-auto" title="Ver foto de entrada">
                                                                                        <ImageIcon size={14} />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest border border-dashed border-gray-300 px-3 py-1 rounded-lg">Pend.</span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Montaje / Pruebas */}
                                                                {asg.rolAsignado !== 'Intérprete' && (
                                                                    <div className="w-full sm:w-auto flex flex-col lg:items-center">
                                                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5">Montaje</span>
                                                                        <div className="w-full flex items-center justify-between lg:justify-center gap-2">
                                                                            {ci?.horaMontaje ? (
                                                                                <div className="flex items-center gap-2 bg-accent/30 border border-accent/40 pl-3 pr-1 py-1 rounded-lg shadow-sm">
                                                                                    <div className="flex items-center text-sidebar font-black text-xs whitespace-nowrap">
                                                                                        <CheckSquare size={14} className="mr-1.5 text-sidebar" />
                                                                                        {dayjs(ci.horaMontaje).format('HH:mm')}
                                                                                    </div>
                                                                                    {ci.fotoMontaje && (
                                                                                        <button onClick={() => onPreviewImage(ci.fotoMontaje.rutaArchivo)} className="bg-white hover:bg-accent/50 text-sidebar p-1 rounded-md shadow-sm border border-accent/30 transition-all ml-auto" title="Ver foto de montaje">
                                                                                            <ImageIcon size={14} />
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest border border-dashed border-gray-300 px-3 py-1 rounded-lg">Pend.</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Salida Real */}
                                                                <div className="w-full sm:w-auto flex flex-col lg:items-center">
                                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5">Salida</span>
                                                                    <div className="w-full flex items-center justify-between lg:justify-center gap-2">
                                                                        {ci?.horaSalida ? (
                                                                            <div className="flex items-center gap-2 bg-primary/40 border border-primary/50 pl-3 pr-1 py-1 rounded-lg shadow-sm">
                                                                                <div className="flex items-center text-sidebar font-black text-xs whitespace-nowrap">
                                                                                    <CheckSquare size={14} className="mr-1.5 text-sidebar" />
                                                                                    {dayjs(ci.horaSalida).format('HH:mm')}
                                                                                </div>
                                                                                {ci.fotoSalida && (
                                                                                    <button onClick={() => onPreviewImage(ci.fotoSalida.rutaArchivo)} className="bg-white hover:bg-primary/50 text-sidebar p-1 rounded-md shadow-sm border border-primary/30 transition-all ml-auto" title="Ver foto de salida">
                                                                                        <ImageIcon size={14} />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest border border-dashed border-gray-300 px-3 py-1 rounded-lg">Pend.</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center text-gray-500 font-medium">
                                    <Users size={48} className="mx-auto mb-4 text-gray-300" />
                                    Ningún trabajador ha sido asignado a este evento todavía.
                                </div>
                            )}
                        </div>
                    )} {/* CIERRE VISTA ASISTENCIA */}
                </div>
            </div>
        </div>
    );
};

const XIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);

export default AdminEvents;
