package com.eventpro.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import javax.annotation.PostConstruct;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    @Value("${FIREBASE_CREDENTIALS_PATH:classpath:firebase-adminsdk.json}")
    private String credentialsPath;

    @PostConstruct
    public void init() {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                InputStream serviceAccount;
                if (credentialsPath.startsWith("classpath:")) {
                    serviceAccount = new ClassPathResource(credentialsPath.substring(10)).getInputStream();
                } else {
                    serviceAccount = new FileInputStream(credentialsPath);
                }
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                        .build();

                FirebaseApp.initializeApp(options);
                System.out.println("Firebase Admin SDK properly initialized!");
            }
        } catch (IOException e) {
            System.err.println("Firebase App initialization Error: " + e.getMessage());
        }
    }
}

