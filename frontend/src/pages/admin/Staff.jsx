import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit2, UserCheck, UserX, Trash2, AlertCircle, ChevronDown, ChevronRight, User as UserIcon } from 'lucide-react';

const AdminStaff = () => {
    const { user: currentUser } = useAuth();
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [collapsedGroups, setCollapsedGroups] = useState({});

    const [form, setForm] = useState({
        nombre: '', email: '', password: '', rol: 'WORKER',
        telefono: '', puesto: '', activo: true
    });

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            const res = await api.get('/admin/staff');
            const sortedStaff = res.data.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
            setStaff(sortedStaff);
        } catch (error) {
            console.error('Error fetching staff', error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (user = null) => {
        if (user) {
            setForm({ ...user, password: '' });
            setEditingId(user.id);
        } else {
            setForm({
                nombre: '', email: '', password: '', rol: 'WORKER',
                telefono: '', puesto: '', activo: true
            });
            setEditingId(null);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                // If password is empty, don't send it so it's not updated
                const payload = { ...form };
                if (!payload.password) delete payload.password;
                await api.put(`/admin/staff/${editingId}`, payload);
            } else {
                await api.post('/admin/staff', form);
            }
            setIsModalOpen(false);
            fetchStaff();
        } catch (error) {
            console.error('Error saving staff', error);
            alert('Error al guardar trabajador');
        }
    };

    const toggleStatus = async (user) => {
        if (user.id === currentUser.id) {
            alert('No puedes desactivar tu propia cuenta mientras estás en sesión.');
            return;
        }
        try {
            const payload = { ...user, activo: !user.activo };
            delete payload.password; // Do not touch password
            await api.put(`/admin/staff/${user.id}`, payload);
            fetchStaff();
        } catch (error) {
            console.error('Error toggling status', error);
        }
    };

    const handleDeleteStaff = async (id) => {
        if (id === currentUser.id) {
            alert('No puedes eliminar tu propia cuenta de administrador.');
            return;
        }
        if (window.confirm('¿Estás seguro de eliminar este trabajador? Se eliminarán todos sus reportes y registros asociados.')) {
            try {
                await api.delete(`/admin/staff/${id}`);
                fetchStaff();
            } catch (error) {
                console.error('Error deleting staff', error);
                alert('Error al eliminar el trabajador.');
            }
        }
    };

    if (loading) return <div className="p-8 text-center text-primary">Cargando personal...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Personal</h1>
                    <p className="text-sm text-gray-500 mt-1">Administra los trabajadores y administradores del sistema</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary flex items-center">
                    <Plus size={18} className="mr-2" /> Agregar Personal
                </button>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-medium text-sm text-left">
                                <th className="px-6 py-4">Nombre</th>
                                <th className="px-6 py-4">Contacto</th>
                                <th className="px-6 py-4">Rol / Puesto</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {(() => {
                                if (staff.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                                                No hay personal registrado en el sistema.
                                            </td>
                                        </tr>
                                    );
                                }

                                const grouped = {
                                    'Administradores': staff.filter(s => s.rol === 'ADMIN'),
                                    'Técnicos': staff.filter(s => s.rol === 'WORKER' && s.puesto === 'Técnico'),
                                    'Staff': staff.filter(s => s.rol === 'WORKER' && s.puesto === 'Staff'),
                                    'Intérpretes': staff.filter(s => s.rol === 'WORKER' && s.puesto === 'Intérprete'),
                                    'Otros / Sin Puesto': staff.filter(s => s.rol === 'WORKER' && !['Técnico', 'Staff', 'Intérprete'].includes(s.puesto))
                                };

                                return Object.entries(grouped).map(([groupName, users]) => {
                                    if (users.length === 0) return null;
                                    
                                    // Add specific colors based on the group matching the app's palette
                                    let colorClass = "bg-slate-50 text-slate-500 border-l-4 border-l-slate-300";
                                    if (groupName === 'Administradores') colorClass = "bg-sidebar/5 text-sidebar border-l-4 border-l-sidebar";
                                    if (groupName === 'Técnicos') colorClass = "bg-accent/10 text-accent border-l-4 border-l-accent";
                                    if (groupName === 'Staff') colorClass = "bg-success/15 text-[#588040] border-l-4 border-l-success";
                                    if (groupName === 'Intérpretes') colorClass = "bg-primary/20 text-[#c27c44] border-l-4 border-l-primary";

                                    return (
                                        <div key={groupName} className="contents">
                                            <tr 
                                                className="border-y border-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                                                onClick={() => setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                                            >
                                                <td colSpan="5" className={`px-6 py-3 font-black uppercase tracking-widest text-xs select-none ${colorClass}`}>
                                                    <div className="flex items-center">
                                                        {collapsedGroups[groupName] ? <ChevronRight size={14} className="mr-1.5" /> : <ChevronDown size={14} className="mr-1.5" />}
                                                        {groupName} <span className="ml-2 bg-white/60 px-2 py-0.5 rounded text-[10px] tabular-nums">{users.length}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                            {!collapsedGroups[groupName] && users.map((user) => (
                                                <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${!user.activo ? 'opacity-60 bg-gray-50' : ''}`}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0 flex items-center justify-center">
                                                                {user.fotoPerfil ? (
                                                                    <img src={user.fotoPerfil} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <UserIcon size={20} className="text-gray-300" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-gray-900 truncate">{user.nombre}</p>
                                                                {user.rol === 'ADMIN' ? (
                                                                    <p className="text-[11px] font-black tracking-wider uppercase text-purple-600 mt-0.5">Administrador</p>
                                                                ) : (
                                                                    <p className="text-xs text-gray-500 mt-0.5">ID: #{user.id}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm text-gray-800">{user.email}</p>
                                                        <p className="text-xs text-gray-500">{user.telefono || 'Sin teléfono'}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider rounded font-black mb-1 ${user.rol === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-sidebar/10 text-sidebar'
                                                            }`}>
                                                            {user.rol}
                                                        </span>
                                                        {user.rol !== 'ADMIN' && (
                                                            <p className="text-sm text-gray-600">{user.puesto || '-'}</p>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${user.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                            }`}>
                                                            {user.activo ? <><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span> Activo</>
                                                                : <><span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></span> Inactivo</>}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex justify-center space-x-2">
                                                            <button
                                                                onClick={() => openModal(user)}
                                                                className="p-1.5 bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 rounded shadow-sm transition-all"
                                                                title="Editar"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            {user.id !== currentUser.id && (
                                                                <>
                                                                    <button
                                                                        onClick={() => toggleStatus(user)}
                                                                        className={`p-1.5 bg-white border shadow-sm rounded transition-all ${user.activo ? 'border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-300' : 'border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-300'
                                                                            }`}
                                                                        title={user.activo ? "Inactivar" : "Activar"}
                                                                    >
                                                                        {user.activo ? <UserX size={16} /> : <UserCheck size={16} />}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteStaff(user.id)}
                                                                        className="p-1.5 bg-white border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-300 rounded shadow-sm transition-all"
                                                                        title="Eliminar"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {user.id === currentUser.id && (
                                                                <div className="p-1.5 text-xs font-medium text-gray-400 italic flex items-center bg-gray-50 rounded border border-dashed border-gray-200" title="Tu cuenta (Acción protegida)">
                                                                    <AlertCircle size={12} className="mr-1" /> Eres tú
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </div>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black bg-opacity-50 p-4">
                    <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                {form.fotoPerfil && (
                                    <div className="w-12 h-12 rounded-full overflow-hidden border border-primary shadow-sm bg-gray-50 flex-shrink-0">
                                        <img src={form.fotoPerfil} alt="" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <h3 className="text-xl font-bold text-gray-900">
                                    {editingId ? 'Editar Personal' : 'Agregar Personal'}
                                </h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="label">Nombre Completo</label>
                                <input type="text" className="input-field" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Email</label>
                                    <input type="email" className="input-field" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">Contraseña {editingId && <span className="text-xs font-normal text-gray-400">(Dejar en blanco para no cambiar)</span>}</label>
                                    <input type="password" className="input-field" required={!editingId} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Teléfono</label>
                                    <input type="text" className="input-field" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">Rol del Sistema</label>
                                    <select
                                        className={`input-field ${editingId === currentUser.id ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}`}
                                        value={form.rol}
                                        onChange={(e) => setForm({ ...form, rol: e.target.value })}
                                        disabled={editingId === currentUser.id}
                                    >
                                        <option value="WORKER">Trabajador</option>
                                        <option value="ADMIN">Administrador</option>
                                    </select>
                                    {editingId === currentUser.id && (
                                        <span className="text-[10px] text-red-500 font-bold block mt-1">
                                            Por seguridad, no puedes cambiar tu propio rol.
                                        </span>
                                    )}
                                </div>
                            </div>

                            {form.rol !== 'ADMIN' && (
                                <div>
                                    <label className="label">Puesto o Especialidad</label>
                                    <select className="input-field" value={form.puesto} onChange={(e) => setForm({ ...form, puesto: e.target.value })}>
                                        <option value="">-- Seleccionar --</option>
                                        <option value="Técnico">Técnico</option>
                                        <option value="Staff">Staff</option>
                                        <option value="Intérprete">Intérprete</option>
                                    </select>
                                </div>
                            )}

                            <div className="flex justify-end pt-4 space-x-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
                                <button type="submit" className="btn-primary">{editingId ? 'Guardar Cambios' : 'Registrar Trabajador'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminStaff;
