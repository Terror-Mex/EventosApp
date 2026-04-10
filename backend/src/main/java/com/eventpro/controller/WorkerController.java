package com.eventpro.controller;

import com.eventpro.dto.request.FcmTokenRequest;
import com.eventpro.dto.response.AssignmentResponse;
import com.eventpro.dto.response.CheckInResponse;
import com.eventpro.dto.response.DashboardWorkerResponse;
import com.eventpro.dto.response.ReportResponse;
import com.eventpro.model.User;
import com.eventpro.repository.UserRepository;
import com.eventpro.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RequiredArgsConstructor
@Slf4j
@RestController
@RequestMapping("/api/worker")
@Tag(name = "Worker", description = "Endpoints para empleados/workers")
public class WorkerController {

    private final UserRepository userRepository;
    private final CheckInService checkInService;
    private final ReportService reportService;
    private final AssignmentService assignmentService;
    private final DashboardService dashboardService;
    private final UserService userService;
    private final EventService eventService;



    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName()).orElseThrow();
    }

    @Operation(summary = "Obtener dashboard del worker")
    @GetMapping("/dashboard")
    public ResponseEntity<DashboardWorkerResponse> getDashboard() {
        return ResponseEntity.ok(dashboardService.getWorkerDashboard(getCurrentUser()));
    }

    @Operation(summary = "Actualizar token FCM")
    @PostMapping("/fcm-token")
    public ResponseEntity<?> updateFcmToken(@Valid @RequestBody FcmTokenRequest request) {
        userService.updateFcmToken(getCurrentUser(), request.token());
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Obtener mis eventos asignados")
    @GetMapping("/events")
    public ResponseEntity<List<AssignmentResponse>> getMyEvents() {
        return ResponseEntity.ok(assignmentService.getMyAssignments(getCurrentUser()));
    }

    @Operation(summary = "Obtener mis pagos")
    @GetMapping("/payments")
    public ResponseEntity<List<AssignmentResponse>> getMyPayments() {
        return ResponseEntity.ok(assignmentService.getMyAssignments(getCurrentUser()));
    }

    @Operation(summary = "Obtener detalles de un evento")
    @GetMapping("/events/{id}")
    public ResponseEntity<?> getEventDetail(@PathVariable Long id) {
        // This method might need a dedicated service method if it grows more complex
        return ResponseEntity.ok(eventService.getEventWithAssignments(id));
    }

    @Operation(summary = "Realizar check-in en un evento")
    @PostMapping("/checkin")
    public ResponseEntity<CheckInResponse> checkIn(@RequestParam("eventId") Long eventId,
                                                   @RequestParam("photo") MultipartFile file,
                                                   @RequestParam(value = "latitud", required = false) Double latitud,
                                                   @RequestParam(value = "longitud", required = false) Double longitud) {
        return ResponseEntity.ok(checkInService.checkIn(eventId, file, latitud, longitud, getCurrentUser()));
    }

    @Operation(summary = "Realizar check-in para montaje")
    @PostMapping("/montaje")
    public ResponseEntity<CheckInResponse> checkMontaje(@RequestParam("eventId") Long eventId,
                                                        @RequestParam("photo") MultipartFile file,
                                                        @RequestParam(value = "latitud", required = false) Double latitud,
                                                        @RequestParam(value = "longitud", required = false) Double longitud,
                                                        @RequestParam("fecha") String fecha) {
        return ResponseEntity.ok(checkInService.checkMontaje(eventId, file, latitud, longitud, getCurrentUser(), fecha));
    }

    @Operation(summary = "Realizar check-out de un evento")
    @PostMapping("/checkout")
    public ResponseEntity<CheckInResponse> checkOut(@RequestParam("eventId") Long eventId,
                                                    @RequestParam("photo") MultipartFile file,
                                                    @RequestParam(value = "latitud", required = false) Double latitud,
                                                    @RequestParam(value = "longitud", required = false) Double longitud,
                                                    @RequestParam("fecha") String fecha) {
        return ResponseEntity.ok(checkInService.checkOut(eventId, file, latitud, longitud, getCurrentUser(), fecha));
    }

    @Operation(summary = "Obtener mis reportes")
    @GetMapping("/reports")
    public ResponseEntity<List<ReportResponse>> getMyReports() {
        return ResponseEntity.ok(reportService.getReportsForWorker(getCurrentUser()));
    }

    @Operation(summary = "Crear un nuevo reporte")
    @PostMapping("/reports")
    public ResponseEntity<ReportResponse> createReport(@RequestParam("eventId") Long eventId,
                                                       @RequestParam("contenido") String contenido,
                                                       @RequestParam(value = "photos", required = false) MultipartFile[] photos) {
        return ResponseEntity.ok(reportService.createReport(eventId, contenido, photos, getCurrentUser()));
    }

    @Operation(summary = "Actualizar foto de perfil")
    @PostMapping("/profile-picture")
    public ResponseEntity<Map<String, String>> updateProfilePicture(@RequestParam("photo") MultipartFile file) {
        return ResponseEntity.ok(userService.updateProfilePicture(getCurrentUser(), file));
    }
}
