package com.eventpro.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class FcmService {

    public void sendPushNotification(String token, String title, String body, String targetUrl) {
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
                                    .setIcon("/apple-touch-icon.png")
                                    .build())
                            .putHeader("Urgency", "high")
                            .setFcmOptions(com.google.firebase.messaging.WebpushFcmOptions.builder()
                                    .setLink(targetUrl)
                                    .build())
                            .build())
                    .build();

            String response = FirebaseMessaging.getInstance().send(message);
            log.info("Push notification successfully sent: {}", response);
        } catch (Exception e) {
            log.error("Error sending push notification via FCM: {}", e.getMessage());
        }
    }
}
