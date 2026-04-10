package com.eventpro.service;

import com.eventpro.config.JwtUtil;
import com.eventpro.dto.request.LoginRequest;
import com.eventpro.dto.response.AuthUserResponse;
import com.eventpro.dto.response.LoginResponse;
import com.eventpro.model.User;
import com.eventpro.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public LoginResponse login(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.email(), loginRequest.password())
        );

        User user = userRepository.findByEmail(loginRequest.email())
                .filter(User::isActivo)
                .orElseThrow(() -> new IllegalArgumentException("Credenciales inválidas o usuario inactivo."));

        String jwt = jwtUtil.generateToken(user.getEmail(), user.getRol(), user.getId());
        AuthUserResponse userResponse = AuthUserResponse.from(user);
        return new LoginResponse(jwt, userResponse);
    }

    public AuthUserResponse getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new IllegalStateException("Usuario no autenticado.");
        }

        String currentEmail = authentication.getName();
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new IllegalStateException("Usuario no encontrado."));

        return AuthUserResponse.from(user);
    }

    public void logout() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getPrincipal())) {
            String currentEmail = authentication.getName();
            userRepository.findByEmail(currentEmail).ifPresent(user -> {
                user.setFcmToken(null);
                userRepository.save(user);
            });
        }
    }
}
