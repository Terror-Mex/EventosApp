import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import api from "../api/axios";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestNotificationPermissionAndSaveToken = async (endpoint = '/worker/fcm-token') => {
  try {
    console.log("Iniciando solicitud de permisos de notificaciones...");
    const permission = await Notification.requestPermission();
    console.log("Respuesta del usuario al permiso:", permission);
    
    if (permission === "granted") {
      console.log("Permiso concedido. Registrando Service Worker...");
      
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log("Service Worker registrado con éxito:", registration.scope);

      console.log("Obteniendo token de FCM...");
      const token = await getToken(messaging, { 
        serviceWorkerRegistration: registration,
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });
      
      if (token) {
        console.log("\n\n===============================================");
        console.log("🔴 ATENCIÓN: TU TOKEN FCM FRESCO ES EL SIGUIENTE:");
        console.log(token);
        console.log("===============================================\n\n");
        try {
            await api.post(endpoint, { token });
            console.log("Token guardado en el backend.");
        } catch(e) {
            console.error("Error al guardar token en el backend:", e);
        }
      } else {
        console.warn("No se pudo obtener el token de registro. Asegúrate de tener los certificados VAPID configurados si Firebase lo exige.");
      }
    } else {
      console.warn("El usuario denegó el permiso para notificaciones.");
    }
  } catch (error) {
    console.error("Error crítico durante la configuración de notificaciones:", error);
  }
};

export const setupForegroundMessages = () => {
    return onMessage(messaging, (payload) => {
        console.log('🔔 Mensaje crudo recibido en primer plano: ', payload);
        
        const title = payload.notification?.title || payload.data?.title || 'EventPro Notificación';
        const body = payload.notification?.body || payload.data?.body || 'Tienes un nuevo mensaje';
        
        // Disparar una notificación nativa estándar en lugar de un alert bloqueable
        if (Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: '/apple-touch-icon.png'
            });
        } else {
            // Fallback si por alguna extraña razón los permisos están intermedios
            alert(`🔔 ${title}\n${body}`);
        }
    });
};
