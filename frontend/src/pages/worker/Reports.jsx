import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import dayjs from 'dayjs';
import { Camera, Send, FileText, CheckCircle2, Search } from 'lucide-react';

const WorkerReports = () => {
    const [reports, setReports] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // Form State
    const [selectedEventId, setSelectedEventId] = useState('');
    const [content, setContent] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const fileInputRef = React.useRef(null);

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

            selectedFiles.forEach((file, index) => {
                // Generar un nombre único para evitar que el backend (o el navergador) los sobrescriba si se llaman igual
                const extension = file.name.split('.').pop();
                const uniqueName = `evidencia_${Date.now()}_${index}.${extension}`;
                formData.append('photos', file, uniqueName);
            });

            await api.post('/worker/reports', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setSuccessMsg('Reporte enviado correctamente.');
            setContent('');
            setSelectedEventId('');
            setSelectedFiles([]);
            setPreviewUrls([]);
            if (fileInputRef.current) fileInputRef.current.value = '';
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
                        <label className="label">Evidencia Fotográfica (Máx. 3 fotos)</label>
                        <div className={`mt-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 transition-all ${previewUrls.length > 0 ? 'border-accent bg-accent/5' : 'border-gray-300 hover:border-accent bg-gray-50'}`}>
                            {previewUrls.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full mb-4">
                                    {previewUrls.map((url, idx) => (
                                        <div key={idx} className="relative group">
                                            <img src={url} alt={`Preview ${idx + 1}`} className="h-32 w-full object-cover rounded-lg shadow-md border border-white" />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newFiles = [...selectedFiles];
                                                    const newUrls = [...previewUrls];
                                                    newFiles.splice(idx, 1);
                                                    newUrls.splice(idx, 1);
                                                    setSelectedFiles(newFiles);
                                                    setPreviewUrls(newUrls);
                                                }}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg hover:bg-red-600 z-10"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {previewUrls.length < 3 && (
                                <div 
                                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                    className="flex flex-col items-center cursor-pointer w-full py-4 relative hover:opacity-80"
                                >
                                    <div className="bg-white p-4 rounded-full shadow-sm text-sidebar mb-3 border border-gray-100">
                                        <Camera size={28} />
                                    </div>
                                    <span className="text-sm font-bold text-sidebar text-center mb-1">Elegir archivos / Tomar foto</span>
                                    <span className="text-xs text-gray-400">Archivos actuales: {selectedFiles.length} (quedan {3 - selectedFiles.length})</span>
                                    <span className="text-xs text-gray-400 mt-1">Máximo 5MB (JPG, PNG)</span>
                                </div>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept="image/*"
                                multiple
                                capture="environment"
                                onChange={(e) => {
                                    if (!e.target.files || e.target.files.length === 0) return;
                                    const newFilesArray = Array.from(e.target.files);
                                    
                                    // Make sure we never exceed 3
                                    if (selectedFiles.length + newFilesArray.length > 3) {
                                        alert('Puedes subir un máximo de 3 fotos en total.');
                                        e.target.value = ''; // clear input
                                        return;
                                    }
                                    
                                    const urls = newFilesArray.map(f => URL.createObjectURL(f));
                                    
                                    // Secure, synchronous concatenation
                                    const combinedFiles = [...selectedFiles, ...newFilesArray];
                                    const combinedUrls = [...previewUrls, ...urls];
                                    
                                    setSelectedFiles(prev => [...prev, ...newFilesArray]);
                                    setPreviewUrls(prev=> [...prev, ...urls]);
                                    
                                    // Always clear input so same file can be selected again if removed
                                    e.target.value = '';
                                }}
                            />
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
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-900">{report.event.nombre}</h3>
                                            {report.event.numeroEvento && (
                                                <span className="bg-gray-100 border border-gray-200 text-gray-600 text-[9px] px-1.5 py-0.5 rounded font-bold tracking-widest uppercase mt-0.5">
                                                    #{report.event.numeroEvento}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-500 mt-1">Reportado por: <strong>{report.user?.nombre || 'Usuario Desconocido'}</strong></span>
                                    </div>
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md ml-2 flex-shrink-0">
                                        {dayjs(report.fechaCreacion).format('DD MMM YYYY, HH:mm')}
                                    </span>
                                </div>
                                <p className="text-gray-700 text-sm whitespace-pre-line leading-relaxed mb-4">
                                    {report.contenido}
                                </p>
                                {report.fotos?.length > 0 && (
                                    <div className="mt-4">
                                        <div className="flex items-center gap-2 text-sidebar text-xs font-bold mb-3">
                                            <Camera size={14} />
                                            <span>{report.fotos.length} foto(s) adjunta(s)</span>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {report.fotos.map((foto, idx) => (
                                                <div key={idx} className="group relative w-24 h-24 sm:w-32 sm:h-32 bg-gray-200 rounded-lg overflow-hidden border border-gray-300 flex-shrink-0">
                                                    <img
                                                        src={foto.rutaArchivo}
                                                        alt={foto.nombreOriginal || `Evidencia ${idx + 1}`}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
                                                        }}
                                                    />
                                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                        <a href={foto.rutaArchivo} target="_blank" rel="noopener noreferrer" className="text-white bg-black bg-opacity-50 p-2 rounded-full hover:bg-opacity-70">
                                                            <Search size={16} />
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
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
