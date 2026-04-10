package com.eventpro.dto.request;

import jakarta.validation.constraints.NotNull;

public record AssignmentRequest(
    @NotNull(message = "El ID de usuario es obligatorio")
    Long userId,

    @NotNull(message = "El ID de evento es obligatorio")
    Long eventId,

    String rolAsignado,
    String horaLlegada,
    Double pagoAsignado,
    Integer diasAsignados,
    Double pagoExtras,
    String diasSeleccionados,
    String llegadasPorDia
) {
}
