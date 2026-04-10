package com.eventpro.controller;

import com.eventpro.dto.request.*;
import com.eventpro.dto.response.*;
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
@RestController
@RequestMapping("/api/admin")
@Slf4j
@Tag(name = "Admin", description = "Endpoints de administración")
public class AdminController {

    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final UserService userService;
    private final EventService eventService;
    private final AssignmentService assignmentService;
    private final ReportService reportService;
    private final CheckInService checkInService;


    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName()).orElseThrow();
    }

    @Operation(summary = "Actualizar token FCM")
    @PostMapping("/fcm-token")
    public ResponseEntity<?> updateFcmToken(@Valid @RequestBody FcmTokenRequest request) {
        userService.updateFcmToken(getCurrentUser(), request.token());
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Obtener estadísticas del dashboard")
    @GetMapping("/dashboard")
    public ResponseEntity<DashboardStatsResponse> getDashboardStats() {
        DashboardStatsResponse stats = new DashboardStatsResponse(
            userService.countStaff(),
            eventService.countEvents(),
            reportService.countReports()
        );
        return ResponseEntity.ok(stats);
    }

    @Operation(summary = "Subir archivo")
    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) {
        String fileUrl = fileStorageService.storeFile(file);
        Map<String, String> response = Map.of("fileName", fileUrl);
        return ResponseEntity.ok(response);
    }

    // Events CRUD
    @Operation(summary = "Obtener todos los eventos")
    @GetMapping("/events")
    public ResponseEntity<List<EventResponse>> getAllEvents() {
        return ResponseEntity.ok(eventService.getAllEvents());
    }

    @Operation(summary = "Crear un nuevo evento")
    @PostMapping("/events")
    public ResponseEntity<EventResponse> createEvent(@Valid @RequestBody EventRequest eventRequest) {
        return ResponseEntity.ok(eventService.createEvent(eventRequest));
    }

    @Operation(summary = "Actualizar un evento")
    @PutMapping("/events/{id}")
    public ResponseEntity<EventResponse> updateEvent(@PathVariable Long id, @Valid @RequestBody EventRequest eventDetails) {
        return ResponseEntity.ok(eventService.updateEvent(id, eventDetails));
    }

    @Operation(summary = "Eliminar un evento")
    @DeleteMapping("/events/{id}")
    public ResponseEntity<?> deleteEvent(@PathVariable Long id) {
        eventService.deleteEvent(id);
        return ResponseEntity.ok().build();
    }

    // Staff CRUD
    @Operation(summary = "Obtener todos los empleados")
    @GetMapping("/staff")
    public ResponseEntity<List<UserResponse>> getAllStaff() {
        return ResponseEntity.ok(userService.getAllStaff());
    }

    @Operation(summary = "Crear un nuevo empleado")
    @PostMapping("/staff")
    public ResponseEntity<UserResponse> createStaff(@Valid @RequestBody UserRequest userRequest) {
        return ResponseEntity.ok(userService.createStaff(userRequest));
    }

    @Operation(summary = "Actualizar un empleado")
    @PutMapping("/staff/{id}")
    public ResponseEntity<UserResponse> updateStaff(@PathVariable Long id, @Valid @RequestBody UserUpdateRequest userDetails) {
        User currentUser = getCurrentUser();
        return ResponseEntity.ok(userService.updateStaff(id, userDetails, currentUser));
    }

    @Operation(summary = "Eliminar un empleado")
    @DeleteMapping("/staff/{id}")
    public ResponseEntity<?> deleteStaff(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        userService.deleteStaff(id, currentUser);
        return ResponseEntity.ok().build();
    }

    // Payments
    @Operation(summary = "Obtener todos los pagos")
    @GetMapping("/payments")
    public ResponseEntity<List<AssignmentResponse>> getAllPayments() {
        return ResponseEntity.ok(assignmentService.getAllAssignments());
    }

    // Assignments
    @Operation(summary = "Obtener asignaciones de un evento")
    @GetMapping("/events/{id}/assignments")
    public ResponseEntity<List<AssignmentResponse>> getEventAssignments(@PathVariable("id") Long eventId) {
        return ResponseEntity.ok(assignmentService.getEventAssignments(eventId));
    }

    @Operation(summary = "Obtener check-ins de un evento")
    @GetMapping("/events/{id}/checkins")
    public ResponseEntity<List<CheckInResponse>> getEventCheckIns(@PathVariable("id") Long eventId) {
        return ResponseEntity.ok(checkInService.getEventCheckIns(eventId));
    }

    @Operation(summary = "Asignar personal a un evento")
    @PostMapping("/assignments")
    public ResponseEntity<AssignmentResponse> assignStaff(@Valid @RequestBody AssignmentRequest payload) {
        return ResponseEntity.ok(assignmentService.assignStaff(payload));
    }

    @Operation(summary = "Toggle estado pagado de una asignación")
    @PutMapping("/assignments/{id}/pagar")
    public ResponseEntity<AssignmentResponse> togglePagado(@PathVariable Long id) {
        return ResponseEntity.ok(assignmentService.togglePayment(id));
    }

    @Operation(summary = "Toggle estado pagado de múltiples asignaciones")
    @PutMapping("/assignments/bulk-pagar")
    public ResponseEntity<?> bulkTogglePagado(@RequestBody List<Long> ids) {
        assignmentService.bulkTogglePayment(ids);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Eliminar una asignación")
    @DeleteMapping("/assignments/{id}")
    public ResponseEntity<?> deleteAssignment(@PathVariable Long id) {
        assignmentService.deleteAssignment(id);
        return ResponseEntity.ok().build();
    }

    // Reports
    @Operation(summary = "Obtener todos los reportes")
    @GetMapping("/reports")
    public ResponseEntity<List<ReportResponse>> getAllReports() {
        return ResponseEntity.ok(reportService.getAllReports());
    }
}
