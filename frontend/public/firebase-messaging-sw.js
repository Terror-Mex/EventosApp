importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBqDnAAUea2z1SwuK9W2QeuZ43gXCHbh94",
  authDomain: "eventosapp-f5d17.firebaseapp.com",
  projectId: "eventosapp-f5d17",
  storageBucket: "eventosapp-f5d17.firebasestorage.app",
  messagingSenderId: "53052408720",
  appId: "1:53052408720:web:80d3972492a3fbdecd2915"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Mensaje recibido en background procesado automáticamente por Firebase', payload);
  // Firebase genera la notificación automáticamente cuando el servidor manda un bloque 
  // 'notification' dentro del payload, por tanto si la ejecutamos manualmente aquí,
  // se duplicará la alerta visual para el usuario.
});

// Forzar al Service Worker a tomar el control inmediatamente para evitar que 
// versiones viejas se queden "trabadas" esperando que el usuario cierre todas las pestañas.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  let urlToOpen = '/';
  if (event.notification.data && event.notification.data.url) {
      urlToOpen = event.notification.data.url;
  } else if (event.notification.data && event.notification.data.FCM_MSG && event.notification.data.FCM_MSG.fcmOptions) {
      urlToOpen = event.notification.data.FCM_MSG.fcmOptions.link || '/';
  }

  if (!urlToOpen.startsWith('http')) {
      const origin = self.location.origin;
      urlToOpen = new URL(urlToOpen, origin).href;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si hay pestaña abierta, enfocar y navegar
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(c => c.navigate(urlToOpen));
        }
      }
      // Si la app está cerrada, abrir una nueva ventana PWA
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
