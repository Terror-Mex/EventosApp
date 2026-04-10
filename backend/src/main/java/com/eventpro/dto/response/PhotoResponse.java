package com.eventpro.dto.response;

import com.eventpro.model.Photo;
import java.time.LocalDateTime;

public record PhotoResponse(
    Long id,
    String rutaArchivo,
    String nombreOriginal,
    String tipo,
    LocalDateTime fechaSubida
) {
    public static PhotoResponse from(Photo photo) {
        if (photo == null) return null;
        return new PhotoResponse(
            photo.getId(),
            photo.getRutaArchivo(),
            photo.getNombreOriginal(),
            photo.getTipo(),
            photo.getFechaSubida()
        );
    }
}
