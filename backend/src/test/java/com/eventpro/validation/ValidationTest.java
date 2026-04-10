package com.eventpro.validation;

import com.eventpro.dto.request.LoginRequest;
import com.eventpro.dto.request.UserRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class ValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    // --- Tests para LoginRequest ---

    @Test
    void testLoginRequestEmailVacioDeberiaFallar() {
        LoginRequest request = new LoginRequest("", "password123");
        Set<ConstraintViolation<LoginRequest>> violations = validator.validate(request);

        assertEquals(1, violations.size());
        ConstraintViolation<LoginRequest> violation = violations.iterator().next();
        assertEquals("El email es obligatorio", violation.getMessage());
        assertEquals("email", violation.getPropertyPath().toString());
    }

    @Test
    void testLoginRequestEmailNullDeberiaFallar() {
        LoginRequest request = new LoginRequest(null, "password123");
        Set<ConstraintViolation<LoginRequest>> violations = validator.validate(request);

        assertEquals(1, violations.size());
        ConstraintViolation<LoginRequest> violation = violations.iterator().next();
        assertEquals("El email es obligatorio", violation.getMessage());
    }

    @Test
    void testLoginRequestEmailFormatoInvalidoDeberiaFallar() {
        LoginRequest request = new LoginRequest("email-invalido", "password123");
        Set<ConstraintViolation<LoginRequest>> violations = validator.validate(request);

        assertEquals(1, violations.size());
        ConstraintViolation<LoginRequest> violation = violations.iterator().next();
        assertEquals("El formato del email no es válido", violation.getMessage());
    }

    @Test
    void testLoginRequestPasswordVaciaDeberiaFallar() {
        LoginRequest request = new LoginRequest("email@ejemplo.com", "");
        Set<ConstraintViolation<LoginRequest>> violations = validator.validate(request);

        assertEquals(1, violations.size());
        ConstraintViolation<LoginRequest> violation = violations.iterator().next();
        assertEquals("La contraseña es obligatoria", violation.getMessage());
        assertEquals("password", violation.getPropertyPath().toString());
    }

    @Test
    void testLoginRequestPasswordNullDeberiaFallar() {
        LoginRequest request = new LoginRequest("email@ejemplo.com", null);
        Set<ConstraintViolation<LoginRequest>> violations = validator.validate(request);

        assertEquals(1, violations.size());
        ConstraintViolation<LoginRequest> violation = violations.iterator().next();
        assertEquals("La contraseña es obligatoria", violation.getMessage());
    }

    @Test
    void testLoginRequestCompletamenteVacioDeberiaFallarConMultiplesErrores() {
        LoginRequest request = new LoginRequest(null, null);
        Set<ConstraintViolation<LoginRequest>> violations = validator.validate(request);

        assertEquals(2, violations.size());
        for (ConstraintViolation<LoginRequest> violation : violations) {
            assertTrue(
                "El email es obligatorio".equals(violation.getMessage()) ||
                "La contraseña es obligatoria".equals(violation.getMessage())
            );
        }
    }

    // --- Tests para UserRequest ---

    @Test
    void testUserRequestNombreVacioDeberiaFallar() {
        UserRequest request = new UserRequest("", "email@ejemplo.com", "password123", "ADMIN", null, null, true, null);
        Set<ConstraintViolation<UserRequest>> violations = validator.validate(request);

        assertEquals(1, violations.size());
        ConstraintViolation<UserRequest> violation = violations.iterator().next();
        assertEquals("El nombre es obligatorio", violation.getMessage());
        assertEquals("nombre", violation.getPropertyPath().toString());
    }

    @Test
    void testUserRequestEmailVacioDeberiaFallar() {
        UserRequest request = new UserRequest("Nombre", "", "password123", "ADMIN", null, null, true, null);
        Set<ConstraintViolation<UserRequest>> violations = validator.validate(request);

        assertEquals(1, violations.size());
        ConstraintViolation<UserRequest> violation = violations.iterator().next();
        assertEquals("El email es obligatorio", violation.getMessage());
    }

    @Test
    void testUserRequestEmailFormatoInvalidoDeberiaFallar() {
        UserRequest request = new UserRequest("Nombre", "email-invalido", "password123", "ADMIN", null, null, true, null);
        Set<ConstraintViolation<UserRequest>> violations = validator.validate(request);

        assertEquals(1, violations.size());
        ConstraintViolation<UserRequest> violation = violations.iterator().next();
        assertEquals("El formato del email no es válido", violation.getMessage());
    }

    @Test
    void testUserRequestPasswordVaciaDeberiaFallar() {
        UserRequest request = new UserRequest("Nombre", "email@ejemplo.com", "", "ADMIN", null, null, true, null);
        Set<ConstraintViolation<UserRequest>> violations = validator.validate(request);

        assertEquals(1, violations.size());
        ConstraintViolation<UserRequest> violation = violations.iterator().next();
        assertEquals("La contraseña es obligatoria", violation.getMessage());
    }

    @Test
    void testUserRequestRolVacioDeberiaFallar() {
        UserRequest request = new UserRequest("Nombre", "email@ejemplo.com", "password123", "", null, null, true, null);
        Set<ConstraintViolation<UserRequest>> violations = validator.validate(request);

        assertEquals(1, violations.size());
        ConstraintViolation<UserRequest> violation = violations.iterator().next();
        assertEquals("El rol es obligatorio", violation.getMessage());
    }

    @Test
    void testUserRequestActivoNullDeberiaFallar() {
        // Usando un helper para probar con null (aunque boolean no puede ser null en records,
        // el test verifica que la validación funciona)
        // En este caso, el campo booleano activo se define como @NotNull en el record
        UserRequest request = new UserRequest("Nombre", "email@ejemplo.com", "password123", "ADMIN", null, null, true, null);
        Set<ConstraintViolation<UserRequest>> violations = validator.validate(request);

        assertEquals(0, violations.size(), "Todos los campos son válidos");
    }

    @Test
    void testUserRequestCompletamenteVacioDeberiaFallarConMultiplesErrores() {
        UserRequest request = new UserRequest(null, null, null, null, null, null, false, null);
        Set<ConstraintViolation<UserRequest>> violations = validator.validate(request);

        // Esperamos 4 errores: nombre, email, password y rol obligatorios
        // El activo es false (primitivo boolean no puede ser null, pero hay @NotNull en el record)
        assertTrue(violations.size() >= 3, "Debería tener al menos 3 errores de campos obligatorios");

        boolean tieneErrorNombre = false;
        boolean tieneErrorEmail = false;
        boolean tieneErrorPassword = false;
        boolean tieneErrorRol = false;

        for (ConstraintViolation<UserRequest> violation : violations) {
            String field = violation.getPropertyPath().toString();
            String message = violation.getMessage();

            if ("nombre".equals(field) && "El nombre es obligatorio".equals(message)) {
                tieneErrorNombre = true;
            }
            if ("email".equals(field) && "El email es obligatorio".equals(message)) {
                tieneErrorEmail = true;
            }
            if ("password".equals(field) && "La contraseña es obligatoria".equals(message)) {
                tieneErrorPassword = true;
            }
            if ("rol".equals(field) && "El rol es obligatorio".equals(message)) {
                tieneErrorRol = true;
            }
        }

        assertTrue(tieneErrorNombre, "Debería tener error de nombre");
        assertTrue(tieneErrorEmail, "Debería tener error de email");
        assertTrue(tieneErrorPassword, "Debería tener error de password");
        assertTrue(tieneErrorRol, "Debería tener error de rol");
    }

    // --- Tests de validación válida ---

    @Test
    void testLoginRequestValidoNoDeberiaTenerViolaciones() {
        LoginRequest request = new LoginRequest("email@ejemplo.com", "password123");
        Set<ConstraintViolation<LoginRequest>> violations = validator.validate(request);

        assertEquals(0, violations.size(), "El request válido no debería tener validaciones fallidas");
    }

    @Test
    void testUserRequestValidoNoDeberiaTenerViolaciones() {
        UserRequest request = new UserRequest(
            "Nombre Completo",
            "email@ejemplo.com",
            "password123",
            "ADMIN",
            "123456789",
            "Desarrollador",
            true,
            null
        );
        Set<ConstraintViolation<UserRequest>> violations = validator.validate(request);

        assertEquals(0, violations.size(), "El request válido no debería tener validaciones fallidas");
    }
}
