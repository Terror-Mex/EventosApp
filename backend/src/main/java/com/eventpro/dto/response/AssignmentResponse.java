package com.eventpro.dto.response;

import com.eventpro.model.Assignment;
import com.eventpro.model.CheckIn;

public record AssignmentResponse(
    Long id,
    UserResponse user,
    EventResponse event,
    String rolAsignado,
    String horaLlegada,
    Double pagoAsignado,
    Boolean pagado,
    Integer diasAsignados,
    Double pagoExtras,
    String horaEntrada,
    String horaMontaje,
    String horaSalida,
    String diasSeleccionados,
    String llegadasPorDia
) {
    public static AssignmentResponse from(Assignment assignment, CheckIn checkIn) {
        if (assignment == null) return null;
        return new AssignmentResponse(
            assignment.getId(),
            UserResponse.from(assignment.getUser()),
            EventResponse.from(assignment.getEvent()),
            assignment.getRolAsignado(),
            assignment.getHoraLlegada(),
            assignment.getPagoAsignado(),
            assignment.getPagado(),
            assignment.getDiasAsignados(),
            assignment.getPagoExtras(),
                checkIn != null && checkIn.getHoraEntrada() != null ? checkIn.getHoraEntrada().toString() : null,
                checkIn != null && checkIn.getHoraMontaje() != null ? checkIn.getHoraMontaje().toString() : null,
                checkIn != null && checkIn.getHoraSalida() != null ? checkIn.getHoraSalida().toString() : null,

                assignment.getDiasSeleccionados(),
            assignment.getLlegadasPorDia()
        );
    }
    // Mantenemos este para no romper otras partes del código si se usa solo con 1
    public static AssignmentResponse from(Assignment assignment) {
        return from(assignment, null);
    }
}
