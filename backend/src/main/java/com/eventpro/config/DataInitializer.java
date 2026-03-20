package com.eventpro.config;

import com.eventpro.model.User;
import com.eventpro.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    @Value("${app.admin.email:admin@eventpro.com}")
    private String adminEmail;

    @Value("${app.admin.password:admin123}")
    private String adminPassword;

    @Value("${app.admin.nombre:Administrador}")
    private String adminNombre;

    @Bean
    public CommandLineRunner initData(UserRepository userRepository,
                                      PasswordEncoder passwordEncoder) {
        return args -> {
            String safeEmail = adminEmail.trim();
            String safePassword = adminPassword.trim();
            // Buscar el admin semilla por email
            var adminOpt = userRepository.findByEmail(safeEmail);
            
            if (adminOpt.isEmpty()) {
                // Crear desde cero
                User admin = new User();
                admin.setNombre(adminNombre);
                admin.setEmail(safeEmail);
                admin.setPassword(passwordEncoder.encode(safePassword));
                admin.setRol("ADMIN");
                admin.setTelefono("");
                admin.setPuesto("Administrador");
                admin.setActivo(true);
                userRepository.save(admin);
                
                System.out.println("===========================================");
                System.out.println("  ADMIN SEMILLA CREADO (NUEVO)");
                System.out.println("  Email: " + safeEmail);
                System.out.println("===========================================");
            } else {
                // Si ya existe, FORZAR la actualización del password y nombre por si cambiaron en Railway
                User admin = adminOpt.get();
                admin.setNombre(adminNombre);
                admin.setPassword(passwordEncoder.encode(safePassword));
                userRepository.save(admin);
                
                System.out.println("===========================================");
                System.out.println("  ADMIN SEMILLA ACTUALIZADO (EXISTENTE)");
                System.out.println("  Password sincronizado con tus variables de entorno");
                System.out.println("===========================================");
            }
        };
    }
}
