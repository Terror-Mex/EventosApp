package com.eventpro.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;

public record EventRequest(
    @NotBlank(message = "El nombre del evento es obligatorio")
    String nombre,

    String numeroEvento,

    @NotNull(message = "La fecha de inicio es obligatoria")
    LocalDate fechaInicio,

    @NotNull(message = "La fecha de fin es obligatoria")
    LocalDate fechaFin,

    @NotNull(message = "La hora de inicio es obligatoria")
    LocalTime horaInicio,

    @NotNull(message = "La hora de fin es obligatoria")
    LocalTime horaFin,

    String horarios,

    @NotBlank(message = "La ubicación es obligatoria")
    String ubicacion,

    Double latitud,
    Double longitud,
    String descripcion,
    String cabina,
    Integer cantCabina,
    String receptores,
    Integer cantReceptores,
    String equipoExtras,
    String archivoAdjunto,
    String estado
) {
}
