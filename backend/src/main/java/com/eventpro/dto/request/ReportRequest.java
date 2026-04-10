package com.eventpro.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public record ReportRequest(
    @NotNull(message = "El ID de usuario es obligatorio")
    Long userId,

    @NotNull(message = "El ID de evento es obligatorio")
    Long eventId,

    @NotBlank(message = "El contenido del reporte es obligatorio")
    String contenido,

    LocalDateTime fechaCreacion
) {
}
