package com.eventpro.dto.response;

public record LoginResponse(
    String token,
    AuthUserResponse user
) {
    public static LoginResponse from(String token, AuthUserResponse user) {
        return new LoginResponse(token, user);
    }
}
