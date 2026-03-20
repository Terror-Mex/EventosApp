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
            // Solo crear el admin semilla si no existe ningún usuario en la BD
            if (userRepository.findByEmail(adminEmail).isEmpty()) {
                User admin = new User();
                admin.setNombre(adminNombre);
                admin.setEmail(adminEmail);
                admin.setPassword(passwordEncoder.encode(adminPassword));
                admin.setRol("ADMIN");
                admin.setTelefono("");
                admin.setPuesto("Administrador");
                admin.setActivo(true);

                userRepository.save(admin);
                System.out.println("===========================================");
                System.out.println("  ADMIN SEMILLA CREADO EXITOSAMENTE");
                System.out.println("  Email: " + adminEmail);
                System.out.println("  Password: " + adminPassword);
                System.out.println("  ¡Cambia la contraseña después del primer login!");
                System.out.println("===========================================");
            }
        };
    }
}
