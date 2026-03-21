package com.eventpro.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import org.springframework.stereotype.Service;

@Service
public class FcmService {

    public void sendPushNotification(String token, String title, String body) {
        if (token == null || token.isEmpty()) {
            return;
        }

        try {
            Message message = Message.builder()
                    .setToken(token)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    // Configuración específica de Web para forzar entrega en el navegador
                    .setWebpushConfig(com.google.firebase.messaging.WebpushConfig.builder()
                            .setNotification(com.google.firebase.messaging.WebpushNotification.builder()
                                    .setTitle(title)
                                    .setBody(body)
                                    .setIcon("/apple-touch-icon.png") // PNG Obligatorio para Android, los SVG rompen la bandeja nativa
                                    .build())
                            .putHeader("Urgency", "high")
                            .build())
                    .build();

            String response = FirebaseMessaging.getInstance().send(message);
            System.out.println("Push notification successfully sent: " + response);
        } catch (Exception e) {
            System.err.println("Error sending push notification via FCM: " + e.getMessage());
        }
    }
}
