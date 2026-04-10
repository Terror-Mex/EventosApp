package com.eventpro.dto.response;

import com.eventpro.model.CheckIn;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record CheckInResponse(
    Long id,
    UserResponse user,
    EventResponse event,
    LocalDate fecha,
    LocalDateTime horaEntrada,
    LocalDateTime horaMontaje,
    LocalDateTime horaSalida,
    PhotoResponse fotoEntrada,
    PhotoResponse fotoMontaje,
    PhotoResponse fotoSalida
) {
    public static CheckInResponse from(CheckIn checkIn) {
        if (checkIn == null) return null;
        return new CheckInResponse(
            checkIn.getId(),
            UserResponse.from(checkIn.getUser()),
            EventResponse.from(checkIn.getEvent()),
            checkIn.getFecha(),
            checkIn.getHoraEntrada(),
            checkIn.getHoraMontaje(),
            checkIn.getHoraSalida(),
            PhotoResponse.from(checkIn.getFotoEntrada()),
            PhotoResponse.from(checkIn.getFotoMontaje()),
            PhotoResponse.from(checkIn.getFotoSalida())
        );
    }
}
