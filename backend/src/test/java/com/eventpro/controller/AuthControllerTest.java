package com.eventpro.controller;

import com.eventpro.config.JwtUtil;
import com.eventpro.model.User;
import com.eventpro.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String adminEmail;
    private String adminPassword;

    @BeforeEach
    void setUp() {
        // Limpiar base de datos antes de cada test usando native query
        userRepository.deleteAllInBatch();

        // Obtener credenciales del admin semilla desde la configuración
        adminEmail = "admin@eventpro.com";
        adminPassword = "admin123";

        // Crear admin semilla para tests
        User adminUser = new User();
        adminUser.setNombre("Administrador");
        adminUser.setEmail(adminEmail);
        adminUser.setPassword(passwordEncoder.encode(adminPassword));
        adminUser.setRol("ADMIN");
        adminUser.setTelefono("");
        adminUser.setPuesto("Administrador");
        adminUser.setActivo(true);

        userRepository.save(adminUser);
    }

    @Test
    @Transactional
    void testLoginConCredencialesCorrectasDevuelve200YToken() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + adminEmail + "\",\"password\":\"" + adminPassword + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.user.email", equalTo(adminEmail)))
                .andExpect(jsonPath("$.user.nombre", equalTo("Administrador")))
                .andExpect(jsonPath("$.user.rol", equalTo("ADMIN")));
    }

    @Test
    @Transactional
    void testLoginConCredencialesIncorrectasDevuelve401() throws Exception {
        String wrongPassword = "wrongpassword123";

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + adminEmail + "\",\"password\":\"" + wrongPassword + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @Transactional
    void testLoginConUsuarioInactivoDevuelve401() throws Exception {
        // Desactivar usuario
        User user = userRepository.findByEmail(adminEmail).orElseThrow();
        user.setActivo(false);
        userRepository.save(user);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + adminEmail + "\",\"password\":\"" + adminPassword + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "admin@eventpro.com", roles = "ADMIN")
    void testGetMeConTokenValidoDevuelve200YDatosUsuario() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", equalTo("admin@eventpro.com")))
                .andExpect(jsonPath("$.nombre", equalTo("Administrador")))
                .andExpect(jsonPath("$.rol", equalTo("ADMIN")))
                .andExpect(jsonPath("$.id", notNullValue()));
    }

    @Test
    void testGetMeSinTokenDevuelve401() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @Transactional
    void testLoginGeneraTokenValido() throws Exception {
        String response = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + adminEmail + "\",\"password\":\"" + adminPassword + "\"}"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        // Extraer el token de la respuesta JSON
        String token = response.substring(response.indexOf("\"token\":\"") + 9);
        token = token.substring(0, token.indexOf("\""));

        // Validar que el token es válido usando JwtUtil
        User user = userRepository.findByEmail(adminEmail).orElseThrow();
        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRol()))
        );
        boolean isValid = jwtUtil.validateToken(token, userDetails);
        org.junit.jupiter.api.Assertions.assertTrue(isValid);
    }
}
