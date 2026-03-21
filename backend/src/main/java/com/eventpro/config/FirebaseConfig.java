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

    // Variable para Railway: El contenido completo del archivo JSON pegado aquí
    @Value("${FIREBASE_CREDENTIALS:#{null}}")
    private String firebaseCredentialsJson;

    // Respaldo para desarrollo local
    @Value("${FIREBASE_CREDENTIALS_PATH:classpath:firebase-adminsdk.json}")
    private String credentialsPath;

    @PostConstruct
    public void init() {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                InputStream serviceAccount;

                // Prioridad 1: Leer el JSON directo de la variable de entorno de Railway
                if (firebaseCredentialsJson != null && !firebaseCredentialsJson.trim().isEmpty()) {
                    // Muchos servicios en la nube (incluido Railway) escapan los saltos de línea (\n) del private_key
                    // convirtiéndolos en dobles diagonales invertidas (\\n). Aquí lo corregimos forzosamente:
                    String processedJson = firebaseCredentialsJson.replace("\\n", "\n");
                    
                    serviceAccount = new java.io.ByteArrayInputStream(
                            processedJson.getBytes(java.nio.charset.StandardCharsets.UTF_8)
                    );
                }
                // Prioridad 2: Leer de un archivo (rutas o classpath para el viejo desarrollo local)
                else if (credentialsPath.startsWith("classpath:")) {
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

