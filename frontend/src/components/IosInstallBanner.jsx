import { useState, useEffect } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';

const IosInstallBanner = () => {
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        // Detectar si es iOS (iPhone, iPad, iPod)
        const isIos = () => {
            const userAgent = window.navigator.userAgent.toLowerCase();
            return /iphone|ipad|ipod/.test(userAgent);
        };

        // Detectar si la app ya está instalada (Standalone Web App en iOS)
        const isStandalone = () => {
            return ('standalone' in window.navigator) && window.navigator.standalone;
        };

        // Saber si el usuario ya lo cerró voluntariamente
        const dismissed = localStorage.getItem('iosInstallBannerDismissed') === 'true';

        // Mostrar solo en iOS + No instalada + No ocultada manualmente
        if (isIos() && !isStandalone() && !dismissed) {
            setShowBanner(true);
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem('iosInstallBannerDismissed', 'true');
        setShowBanner(false);
    };

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-4 z-[9999] rounded-t-3xl pb-[calc(env(safe-area-inset-bottom,16px)+16px)] animate-fade-in">
            <div className="flex items-start justify-between gap-4 max-w-lg mx-auto relative pt-1">
                <button 
                    onClick={handleDismiss}
                    className="absolute -top-2 -right-2 text-gray-400 p-1 hover:text-gray-600 bg-white rounded-full border border-gray-200 shadow-sm transition-colors z-10"
                    aria-label="Cerrar banner"
                >
                    <X size={18} />
                </button>
                
                <div className="flex-shrink-0 bg-primary/10 p-2.5 rounded-2xl transform shadow-sm border border-primary/20">
                    <img 
                        src="/apple-touch-icon.png" 
                        alt="EventPro Logo" 
                        className="w-11 h-11 rounded-xl shadow-sm"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/vite.svg'; // Genérico
                        }} 
                    />
                </div>
                
                <div className="flex-1 text-[13.5px] text-gray-700 font-medium">
                    <p className="font-extrabold text-gray-900 mb-1.5 text-base tracking-tight">Instala EventPro</p>
                    <p className="leading-snug pr-2 text-gray-600">
                        Para recibir notificaciones y entrar más rápido, toca <span className="inline-flex items-center justify-center p-1 rounded-md bg-gray-100 mx-0.5 shadow-sm text-blue-500"><Share size={14} /></span> en la barra inferior de Safari y elige <span className="font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded shadow-sm inline-flex items-center"><PlusSquare size={13} className="mr-1 text-gray-500"/>Agregar a inicio</span>.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default IosInstallBanner;
