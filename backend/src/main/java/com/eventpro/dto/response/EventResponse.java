package com.eventpro.dto.response;

import com.eventpro.model.Event;
import java.time.LocalDate;
import java.time.LocalTime;

public record EventResponse(
    Long id,
    String nombre,
    String numeroEvento,
    LocalDate fechaInicio,
    LocalDate fechaFin,
    LocalTime horaInicio,
    LocalTime horaFin,
    String horarios,
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
    public static EventResponse from(Event event) {
        if (event == null) return null;
        return new EventResponse(
            event.getId(),
            event.getNombre(),
            event.getNumeroEvento(),
            event.getFechaInicio(),
            event.getFechaFin(),
            event.getHoraInicio(),
            event.getHoraFin(),
            event.getHorarios(),
            event.getUbicacion(),
            event.getLatitud(),
            event.getLongitud(),
            event.getDescripcion(),
            event.getCabina(),
            event.getCantCabina(),
            event.getReceptores(),
            event.getCantReceptores(),
            event.getEquipoExtras(),
            event.getArchivoAdjunto(),
            event.getEstado()
        );
    }
}
