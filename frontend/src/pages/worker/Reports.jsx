import { useState, useEffect } from 'react';
import api from '../../api/axios';
import dayjs from 'dayjs';
import { Camera, Send, FileText, CheckCircle2 } from 'lucide-react';

const WorkerReports = () => {
    const [reports, setReports] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // Form State
    const [selectedEventId, setSelectedEventId] = useState('');
    const [content, setContent] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [reportsRes, eventsRes] = await Promise.all([
                api.get('/worker/reports'),
                api.get('/worker/events')
            ]);
            setReports(reportsRes.data);
            setEvents(eventsRes.data.map(a => a.event));
        } catch (error) {
            console.error('Error fetching data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedEventId || !content) return;

        setSubmitting(true);
        setSuccessMsg('');
        try {
            const formData = new FormData();
            formData.append('eventId', selectedEventId);
            formData.append('contenido', content);

            if (selectedFile) {
                formData.append('photos', selectedFile);
            }

            await api.post('/worker/reports', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setSuccessMsg('Reporte enviado correctamente.');
            setContent('');
            setSelectedEventId('');
            setSelectedFile(null);
            setPreviewUrl(null);
            fetchData(); // reload reports

            setTimeout(() => setSuccessMsg(''), 5000);
        } catch (error) {
            console.error('Error submitting report', error);
            alert('Error al enviar el reporte.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-primary">Cargando reportes...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary text-sidebar p-2 rounded-lg shadow-sm"><FileText size={24} /></div>
                <h1 className="text-2xl font-bold text-gray-900">Reportes de Eventos</h1>
            </div>

            {/* New Report Form */}
            <div className="card border-t-4 border-t-primary shadow-lg p-6 md:p-8">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Crear Nuevo Reporte</h2>

                {successMsg && (
                    <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
                        <CheckCircle2 size={20} className="mr-2 flex-shrink-0" />
                        <p>{successMsg}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="label">Selecciona el Evento</label>
                        <select
                            className="input-field"
                            required
                            value={selectedEventId}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                        >
                            <option value="">-- Elige un evento --</option>
                            {events.map(ev => (
                                <option key={ev.id} value={ev.id}>
                                    {ev.numeroEvento ? `#${ev.numeroEvento} - ` : ''}{ev.nombre} ({dayjs(ev.fechaInicio).format('DD/MMM/YYYY')})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="label">Detalles del Reporte</label>
                        <textarea
                            className="input-field min-h-[120px] resize-y"
                            placeholder="Describe novedades, incidencias o resumen del servicio..."
                            required
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        ></textarea>
                    </div>

                    <div className="relative">
                        <label className="label">Evidencia Fotográfica</label>
                        <div className={`mt-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 transition-all ${previewUrl ? 'border-accent bg-accent/5' : 'border-gray-300 hover:border-accent bg-gray-50'}`}>
                            {previewUrl ? (
                                <div className="space-y-4 w-full">
                                    <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-lg shadow-md border border-white" />
                                    <button
                                        type="button"
                                        onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                                        className="text-xs text-red-500 font-bold uppercase tracking-wider block mx-auto hover:underline"
                                    >
                                        Quitar foto
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center cursor-pointer w-full h-full py-4">
                                    <div className="bg-white p-4 rounded-full shadow-sm text-sidebar mb-3 border border-gray-100">
                                        <Camera size={28} />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">Tocar para tomar o seleccionar foto</span>
                                    <span className="text-xs text-gray-400 mt-1">Máximo 5MB (JPG, PNG)</span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setSelectedFile(file);
                                                setPreviewUrl(URL.createObjectURL(file));
                                            }
                                        }}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={submitting || !selectedEventId || !content}
                            className="btn-primary flex items-center gap-2 px-8"
                        >
                            {submitting ? 'Enviando...' : <><Send size={18} /> Enviar Reporte</>}
                        </button>
                    </div>
                </form>
            </div>

            {/* Report History */}
            <div className="mt-12">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Historial de Reportes</h2>

                {reports.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-gray-100">
                        Aún no has enviado ningún reporte.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reports.map((report) => (
                            <div key={report.id} className="card bg-white p-5 hover:border-gray-300 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-gray-900">{report.event.nombre}</h3>
                                        {report.event.numeroEvento && (
                                            <span className="bg-gray-100 border border-gray-200 text-gray-600 text-[9px] px-1.5 py-0.5 rounded font-bold tracking-widest uppercase mt-0.5">
                                                #{report.event.numeroEvento}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md ml-2 flex-shrink-0">
                                        {dayjs(report.fechaCreacion).format('DD MMM YYYY, HH:mm')}
                                    </span>
                                </div>
                                <p className="text-gray-700 text-sm whitespace-pre-line leading-relaxed mb-4">
                                    {report.contenido}
                                </p>
                                {report.fotos?.length > 0 && (
                                    <div className="flex items-center gap-2 text-sidebar text-xs font-bold bg-sidebar/10 w-fit px-3 py-1.5 rounded-lg border border-sidebar/20 shadow-sm">
                                        <Camera size={14} />
                                        <span>{report.fotos.length} foto(s) adjunta(s)</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkerReports;
