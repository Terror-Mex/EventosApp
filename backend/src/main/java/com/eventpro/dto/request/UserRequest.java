package com.eventpro.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UserRequest(
    @NotBlank(message = "El nombre es obligatorio")
    String nombre,

    @NotBlank(message = "El email es obligatorio")
    @Email(message = "El formato del email no es válido")
    String email,

    @NotBlank(message = "La contraseña es obligatoria")
    String password,

    @NotBlank(message = "El rol es obligatorio")
    String rol,

    String telefono,
    String puesto,

    @NotNull(message = "El estado activo es obligatorio")
    boolean activo,

    String fotoPerfil
) {
}
