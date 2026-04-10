package com.eventpro.dto.response;

import com.eventpro.model.Report;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public record ReportResponse(
    Long id,
    UserResponse user,
    EventResponse event,
    String contenido,
    LocalDateTime fechaCreacion,
    List<PhotoResponse> fotos
) {
    public static ReportResponse from(Report report) {
        if (report == null) return null;
        List<PhotoResponse> fotoResponses = report.getFotos() != null
            ? report.getFotos().stream().map(PhotoResponse::from).collect(Collectors.toList())
            : List.of();
        return new ReportResponse(
            report.getId(),
            UserResponse.from(report.getUser()),
            EventResponse.from(report.getEvent()),
            report.getContenido(),
            report.getFechaCreacion(),
            fotoResponses
        );
    }
}
