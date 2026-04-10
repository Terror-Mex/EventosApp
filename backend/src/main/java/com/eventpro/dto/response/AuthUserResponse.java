package com.eventpro.dto.response;

import com.eventpro.model.User;

public record AuthUserResponse(
    Long id,
    String nombre,
    String email,
    String rol,
    String puesto,
    String fotoPerfil
) {
    public static AuthUserResponse from(User user) {
        if (user == null) return null;
        return new AuthUserResponse(
            user.getId(),
            user.getNombre(),
            user.getEmail(),
            user.getRol(),
            user.getPuesto() != null ? user.getPuesto() : "",
            user.getFotoPerfil() != null ? user.getFotoPerfil() : ""
        );
    }
}
