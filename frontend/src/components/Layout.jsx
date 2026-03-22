import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Menu, X, LogOut, Home, Calendar, Users, FileText, CheckSquare, CalendarDays, DollarSign
} from 'lucide-react';

const SidebarLink = ({ to, icon: Icon, children, onClick }) => (
    <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) =>
            `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 mb-2 ${isActive
                ? 'bg-primary text-sidebar font-bold shadow-btn'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`
        }
    >
        <Icon size={20} />
        <span className="font-medium">{children}</span>
    </NavLink>
);

const Layout = () => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const toggleMobileMenu = () => setIsMobileOpen(!isMobileOpen);

    const isAdmin = user?.rol === 'ADMIN';

    return (
        <div className="min-h-screen bg-background flex w-full">
            {/* Mobile overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                className={`fixed inset-y-0 left-0 bg-sidebar text-white w-64 p-4 z-30 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex items-center justify-between lg:justify-center mb-10">
                    <div className="text-2xl font-bold flex items-center gap-2">
                        <div className="bg-primary text-sidebar p-1 rounded-md">
                            <CalendarDays size={24} />
                        </div>
                        <span>Event<span className="text-primary">Pro</span></span>
                    </div>
                    <button onClick={toggleMobileMenu} className="lg:hidden text-white/80 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1">
                    {isAdmin ? (
                        <>
                            <SidebarLink to="/admin/dashboard" icon={Home} onClick={() => setIsMobileOpen(false)}>Dashboard</SidebarLink>
                            <SidebarLink to="/admin/events" icon={Calendar} onClick={() => setIsMobileOpen(false)}>Eventos</SidebarLink>
                            <SidebarLink to="/admin/staff" icon={Users} onClick={() => setIsMobileOpen(false)}>Personal</SidebarLink>
                            <SidebarLink to="/admin/payments" icon={DollarSign} onClick={() => setIsMobileOpen(false)}>Pagos</SidebarLink>
                            <SidebarLink to="/admin/reports" icon={FileText} onClick={() => setIsMobileOpen(false)}>Reportes</SidebarLink>
                        </>
                    ) : (
                        <>
                            <SidebarLink to="/worker/dashboard" icon={Home} onClick={() => setIsMobileOpen(false)}>Dashboard</SidebarLink>
                            <SidebarLink to="/worker/events" icon={Calendar} onClick={() => setIsMobileOpen(false)}>Mis Eventos</SidebarLink>
                            <SidebarLink to="/worker/payments" icon={DollarSign} onClick={() => setIsMobileOpen(false)}>Pagos</SidebarLink>
                            <SidebarLink to="/worker/reports" icon={FileText} onClick={() => setIsMobileOpen(false)}>Mis Reportes</SidebarLink>
                        </>
                    )}
                </nav>

                <div className="absolute bottom-4 inset-x-4">
                    <div className="bg-white/10 border border-white/10 rounded-lg p-4 mb-4">
                        <p className="text-sm font-bold text-white truncate">{user?.nombre}</p>
                        <p className="text-xs text-white/80 truncate">{user?.email}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                        <LogOut size={18} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <header className="bg-white shadow-sm lg:hidden flex items-center justify-between p-4 z-10">
                    <div className="text-xl font-bold flex items-center gap-2 text-sidebar">
                        <div className="bg-sidebar text-primary p-1 rounded-md">
                            <CalendarDays size={20} />
                        </div>
                        <span>Event<span className="font-black">Pro</span></span>
                    </div>
                    <button onClick={toggleMobileMenu} className="text-gray-600 hover:text-primary">
                        <Menu size={24} />
                    </button>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-4 md:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
