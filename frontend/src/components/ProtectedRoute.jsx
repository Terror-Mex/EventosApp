import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="h-screen flex items-center justify-center text-primary">Cargando...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.rol)) {
        // Redirect to their respective dashboard if they don't have permission
        return <Navigate to={user.rol === 'ADMIN' ? '/admin/dashboard' : '/worker/dashboard'} replace />;
    }

    return children;
};

export default ProtectedRoute;
