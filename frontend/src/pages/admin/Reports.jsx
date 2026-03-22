import { useState, useEffect } from 'react';
import api from '../../api/axios';
import dayjs from 'dayjs';
import { FileText, Camera, Calendar, User, Search } from 'lucide-react';

const AdminReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const res = await api.get('/admin/reports');
            setReports(res.data);
        } catch (error) {
            console.error('Error fetching reports', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-primary">Cargando reportes...</div>;

    const filteredReports = reports.filter(r =>
        r.event.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.event.numeroEvento || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.contenido.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reportes de Eventos</h1>
                    <p className="text-sm text-gray-500 mt-1">Revisa los informes enviados por el personal operativo</p>
                </div>

                <div className="relative w-full md:w-72">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por evento, autor, contenido..."
                        className="input-field pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {filteredReports.map((report) => (
                    <div key={report.id} className="card p-0 overflow-hidden hover:shadow-lg transition-shadow border-l-4 border-l-primary">
                        <div className="p-6">
                            <div className="flex flex-col lg:flex-row justify-between items-start gap-4 mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="bg-sidebar/10 text-sidebar p-3 rounded-xl hidden sm:block">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900 border-b border-gray-100 pb-1 mb-1 flex items-center gap-2">
                                            Event: <span className="text-sidebar">{report.event.nombre}</span>
                                            {report.event.numeroEvento && (
                                                <span className="bg-gray-100 border border-gray-200 text-gray-600 text-[10px] px-2 py-0.5 rounded font-bold tracking-widest uppercase">
                                                    #{report.event.numeroEvento}
                                                </span>
                                            )}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                                            <span className="flex items-center font-medium"><User size={14} className="mr-1.5 text-gray-400" /> {report.user.nombre}</span>
                                            <span className="flex items-center"><Calendar size={14} className="mr-1.5 text-gray-400" /> {dayjs(report.fechaCreacion).format('DD MMM YYYY, HH:mm')}</span>
                                        </div>
                                    </div>
                                </div>

                                {report.fotos && report.fotos.length > 0 && (
                                    <div className="flex items-center gap-2 text-blue-700 text-xs font-semibold bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 self-start lg:self-center shrink-0">
                                        <Camera size={14} />
                                        <span>{report.fotos.length} adjuntos</span>
                                    </div>
                                )}
                            </div>

                            <div className="bg-gray-50 rounded-lg p-5 border border-gray-100 text-gray-700 text-sm md:text-base leading-relaxed whitespace-pre-line mt-2">
                                {report.contenido}
                            </div>

                            {/* Photos Demo Display */}
                            {report.fotos && report.fotos.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Evidencia Fotográfica</p>
                                    <div className="flex flex-wrap gap-3">
                                        {report.fotos.map(f => (
                                            <div key={f.id} className="group relative w-24 h-24 sm:w-32 sm:h-32 bg-gray-200 rounded-lg overflow-hidden border border-gray-300 flex-shrink-0">
                                                {/* 
                          We can't reliably load images in this demo environment if the backend server URL is weird 
                          or uploads aren't accessible relative to the vite dev server without the proxy handling it correctly.
                          Vite proxy handles /uploads, so this should work if the file actually exists.
                        */}
                                                <img
                                                    src={f.rutaArchivo}
                                                    alt={f.nombreOriginal}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <a href={f.rutaArchivo} target="_blank" rel="noopener noreferrer" className="text-white bg-black bg-opacity-50 p-2 rounded-full hover:bg-opacity-70">
                                                        <Search size={16} />
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {filteredReports.length === 0 && (
                    <div className="py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                        {searchTerm ? 'No se encontraron reportes que coincidan con la búsqueda.' : 'No hay reportes registrados en el sistema.'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminReports;
