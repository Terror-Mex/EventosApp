import { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const response = await api.get('/auth/me');
                    setUser(response.data);
                } catch (error) {
                    console.error('Auth initialization failed', error);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    // Escucha de notificaciones a nivel global para que nunca se "caigan" cuando cambies de página
    useEffect(() => {
        if (!user) return; // Sólo escuchar si hay un usuario logueado
        
        // Importar dinámicamente para no bloquear el renderizado inicial de la app
        import('../utils/firebase').then(({ requestNotificationPermissionAndSaveToken, setupForegroundMessages }) => {
            const endpoint = user.rol === 'ADMIN' ? '/admin/fcm-token' : '/worker/fcm-token';
            requestNotificationPermissionAndSaveToken(endpoint);
            
            const unsubscribe = setupForegroundMessages();
            return () => {
                if (unsubscribe) unsubscribe();
            };
        }).catch(err => console.error("Firebase not loaded: ", err));
        
    }, [user]);

    const login = async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { token, user: userData } = response.data;
        localStorage.setItem('token', token);
        setUser(userData);
        return userData;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        window.location.href = '/login';
    };

    const updateUser = (data) => {
        setUser(prev => ({ ...prev, ...data }));
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
