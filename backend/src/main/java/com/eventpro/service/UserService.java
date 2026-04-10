package com.eventpro.service;

import com.eventpro.dto.request.UserRequest;
import com.eventpro.dto.request.UserUpdateRequest;
import com.eventpro.dto.response.UserResponse;
import com.eventpro.model.User;
import com.eventpro.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final FileStorageService fileStorageService;

    public List<UserResponse> getAllStaff() {
        List<User> users = userRepository.findAllByOrderByNombreAsc();
        return users.stream()
                .map(UserResponse::from)
                .collect(Collectors.toList());
    }

    public Long countStaff() {
        return userRepository.countByRol("WORKER");
    }

    public UserResponse createStaff(UserRequest userRequest) {
        User user = new User(userRequest, passwordEncoder);
        User saved = userRepository.save(user);
        return UserResponse.from(saved);
    }

    public UserResponse updateStaff(Long id, UserUpdateRequest userDetails, User currentUser) {
        return userRepository.findById(id).map(user -> {
            if (id.equals(currentUser.getId()) && !userDetails.activo()) {
                throw new IllegalArgumentException("No puedes desactivar tu propia cuenta.");
            }
            user.updateFrom(userDetails, passwordEncoder);
            if (id.equals(currentUser.getId())) {
                user.setRol("ADMIN"); // Never allow self-demotion
            } else {
                user.setRol(userDetails.rol());
            }
            User saved = userRepository.save(user);
            return UserResponse.from(saved);
        }).orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + id));
    }

    public void deleteStaff(Long id, User currentUser) {
        if (id.equals(currentUser.getId())) {
            throw new IllegalArgumentException("No puedes eliminar tu propia cuenta de administrador.");
        }
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + id));
        userRepository.delete(user);
    }

    public void updateFcmToken(User user, String token) {
        if (token != null) {
            user.setFcmToken(token);
            userRepository.save(user);
        }
    }

    public Map<String, String> updateProfilePicture(User user, MultipartFile file) {
        if (user.getFotoPerfil() != null) {
            fileStorageService.deleteFile(user.getFotoPerfil());
        }
        String fileUrl = fileStorageService.storeFile(file);
        user.setFotoPerfil(fileUrl);
        userRepository.save(user);
        return Map.of("fotoPerfil", fileUrl);
    }

    public User getCurrentUser() {
        // 1. Obtenemos el email/username del contexto de seguridad de Spring
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        // 2. Buscamos al usuario en la base de datos
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no autenticado o no encontrado"));
    }
}
