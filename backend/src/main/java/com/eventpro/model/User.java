package com.eventpro.model;

import com.eventpro.dto.request.UserRequest;
import com.eventpro.dto.request.UserUpdateRequest;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String rol; // ADMIN or WORKER

    private String telefono;

    private String puesto;

    @Column(nullable = false)
    private boolean activo = true;

    @Column(length = 1000)
    private String fcmToken;

    @Column(length = 1000)
    private String fotoPerfil;

    public User(UserRequest request, PasswordEncoder passwordEncoder) {
        this.nombre = request.nombre();
        this.email = request.email();
        this.password = passwordEncoder.encode(request.password());
        this.rol = request.rol();
        this.telefono = request.telefono();
        this.puesto = request.puesto();
        this.activo = true; // Always active on creation
        this.fotoPerfil = request.fotoPerfil();
    }

    public void updateFrom(UserUpdateRequest request, PasswordEncoder passwordEncoder) {
        this.nombre = request.nombre();
        this.email = request.email();
        if (request.password() != null && !request.password().isEmpty()) {
            this.password = passwordEncoder.encode(request.password());
        }
        this.rol = request.rol();
        this.telefono = request.telefono();
        this.puesto = request.puesto();
        this.activo = request.activo();
        this.fotoPerfil = request.fotoPerfil();
    }
}
