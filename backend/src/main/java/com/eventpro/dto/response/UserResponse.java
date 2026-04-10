package com.eventpro.dto.response;

import com.eventpro.model.User;

public record UserResponse(
    Long id,
    String nombre,
    String email,
    String rol,
    String telefono,
    String puesto,
    Boolean activo,
    String fotoPerfil
) {
    public static UserResponse from(User user) {
        if (user == null) return null;
        return new UserResponse(
            user.getId(),
            user.getNombre(),
            user.getEmail(),
            user.getRol(),
            user.getTelefono(),
            user.getPuesto(),
            user.isActivo(),
            user.getFotoPerfil()
        );
    }
}
