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
    const permission = await Notification.requestPermission();
    
    if (permission === "granted") {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

      const token = await getToken(messaging, { 
        serviceWorkerRegistration: registration,
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });
      
      if (token) {
        try {
            await api.post(endpoint, { token });
        } catch(e) {
            console.error("Error al guardar token en el backend:", e);
        }
      } else {
        console.warn("No se pudo obtener el token de registro. Asegúrate de tener los certificados VAPID configurados.");
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
        const title = payload.notification?.title || payload.data?.title || 'EventPro Notificación';
        const body = payload.notification?.body || payload.data?.body || 'Tienes un nuevo mensaje';
        
        if (Notification.permission === 'granted') {
            const urlToOpen = payload.fcmOptions?.link || payload.notification?.click_action || '/';
            navigator.serviceWorker.ready.then((registration) => {
                registration.showNotification(title, {
                    body: body,
                    icon: '/apple-touch-icon.png',
                    data: { url: urlToOpen }
                });
            }).catch(error => {
                console.error("Error disparando push en móvil:", error);
                alert(`🔔 ${title}\n${body}`);
            });
        } else {
            alert(`🔔 ${title}\n${body}`);
        }
    });
};
