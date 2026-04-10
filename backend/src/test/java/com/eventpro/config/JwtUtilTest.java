package com.eventpro.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.core.userdetails.UserDetails;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class JwtUtilTest {

    private JwtUtil jwtUtil;
    private SecretKey testKey;

    @Mock
    private UserDetails mockUserDetails;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        String secret = "testSecretKeyForTestingPurposesOnly123";
        testKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        jwtUtil = new JwtUtil(secret, 3600000); // 1 hour default expiration
    }

    @Test
    void testGenerateTokenAndExtractUsername() {
        String username = "testuser";
        String role = "WORKER";
        Long userId = 123L;

        String token = jwtUtil.generateToken(username, role, userId);

        assertNotNull(token);
        assertFalse(token.isEmpty());

        String extractedUsername = jwtUtil.extractUsername(token);
        assertEquals(username, extractedUsername);
    }

    @Test
    void testValidateTokenWithValidTokenReturnsTrue() {
        String username = "testuser";
        String role = "WORKER";
        Long userId = 123L;

        String token = jwtUtil.generateToken(username, role, userId);

        when(mockUserDetails.getUsername()).thenReturn(username);

        boolean isValid = jwtUtil.validateToken(token, mockUserDetails);

        assertTrue(isValid);
    }

    @Test
    void testTokenContieneRolCorrecto() {
        String token = jwtUtil.generateToken("testuser", "ADMIN", 1L);

        Claims claims = Jwts.parser()
                .verifyWith(testKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        assertEquals("ADMIN", claims.get("role", String.class));
    }

    @Test
    void testTokenContieneUserIdCorrecto() {
        String token = jwtUtil.generateToken("testuser", "WORKER", 99L);

        Claims claims = Jwts.parser()
                .verifyWith(testKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        assertEquals(99, claims.get("userId", Integer.class));
    }


    @Test
    void testAdminTokenExpiresIn15Days() {
        String username = "adminuser";
        String role = "ADMIN";
        Long userId = 1L;

        String token = jwtUtil.generateToken(username, role, userId);

        // Extract expiration date using Jwts directly
        Date expiration = Jwts.parser()
                .verifyWith(testKey)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getExpiration();

        long expirationTime = expiration.getTime();
        long currentTime = System.currentTimeMillis();
        long diffHours = TimeUnit.MILLISECONDS.toHours(expirationTime - currentTime);
        long diffDays = TimeUnit.MILLISECONDS.toDays(expirationTime - currentTime);

        // Should be approximately 15 days (allowing some margin for test execution time)
        assertTrue(diffDays >= 14, "Admin token should last at least 14 days");
        assertTrue(diffDays <= 16, "Admin token should last at most 16 days");
    }

    @Test
    void testWorkerTokenExpiresIn30Days() {
        String username = "workeruser";
        String role = "WORKER";
        Long userId = 2L;

        String token = jwtUtil.generateToken(username, role, userId);

        // Extract expiration date using Jwts directly
        Date expiration = Jwts.parser()
                .verifyWith(testKey)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getExpiration();

        long expirationTime = expiration.getTime();
        long currentTime = System.currentTimeMillis();
        long diffDays = TimeUnit.MILLISECONDS.toDays(expirationTime - currentTime);

        // Should be approximately 30 days (allowing some margin for test execution time)
        assertTrue(diffDays >= 29, "Worker token should last at least 29 days");
        assertTrue(diffDays <= 31, "Worker token should last at most 31 days");
    }
}
