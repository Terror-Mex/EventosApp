package com.eventpro.dto.request;

import jakarta.validation.constraints.NotBlank;

public record FcmTokenRequest(
    @NotBlank(message = "El token FCM es obligatorio")
    String token
) {
}
