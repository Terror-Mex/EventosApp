package com.eventpro.config;

import com.eventpro.model.User;
import com.eventpro.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import lombok.extern.slf4j.Slf4j;

@Slf4j
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

                log.info("=========================================");
                log.info("ADMIN SEMILLA CREADO: {}", safeEmail);
                log.info("=========================================");
                
            } else {
                // Si ya existe, FORZAR la actualización del password y nombre por si cambiaron en Railway
                User admin = adminOpt.get();
                admin.setNombre(adminNombre);
                admin.setPassword(passwordEncoder.encode(safePassword));
                userRepository.save(admin);
                
                log.info("=========================================");
                log.info("ADMIN SEMILLA ACTUALIZADO - password sincronizado");
                log.info("========================================="); 
            }
        };
    }
}
