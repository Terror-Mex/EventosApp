package com.eventpro.controller;

import com.eventpro.model.*;
import com.eventpro.repository.*;
import com.eventpro.service.FileStorageService;
import com.eventpro.service.FcmService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import java.time.LocalDate;
import java.time.LocalTime;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final AssignmentRepository assignmentRepository;
    private final ReportRepository reportRepository;
    private final CheckInRepository checkInRepository;
    private final PasswordEncoder passwordEncoder;
    private final FileStorageService fileStorageService;
    private final FcmService fcmService;

    public AdminController(UserRepository userRepository, EventRepository eventRepository,
                           AssignmentRepository assignmentRepository, ReportRepository reportRepository,
                           CheckInRepository checkInRepository, PasswordEncoder passwordEncoder,
                           FileStorageService fileStorageService, FcmService fcmService) {
        this.userRepository = userRepository;
        this.eventRepository = eventRepository;
        this.assignmentRepository = assignmentRepository;
        this.reportRepository = reportRepository;
        this.checkInRepository = checkInRepository;
        this.passwordEncoder = passwordEncoder;
        this.fileStorageService = fileStorageService;
        this.fcmService = fcmService;
    }

    private User getCurrentUser() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName()).orElseThrow();
    }

    @PostMapping("/fcm-token")
    public ResponseEntity<?> updateFcmToken(@RequestBody Map<String, String> payload) {
        String token = payload.get("token");
        if (token != null) {
            User user = getCurrentUser();
            user.setFcmToken(token);
            userRepository.save(user);
        }
        return ResponseEntity.ok().build();
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalStaff", userRepository.countByRol("WORKER"));
        stats.put("totalEvents", eventRepository.count());
        stats.put("totalReports", reportRepository.count());
        return ResponseEntity.ok(stats);
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) {
        String fileUrl = fileStorageService.storeFile(file);
        Map<String, String> response = new HashMap<>();
        response.put("fileName", fileUrl);
        return ResponseEntity.ok(response);
    }

    // Events CRUD
    @GetMapping("/events")
    public ResponseEntity<List<Event>> getAllEvents() {
        return ResponseEntity.ok(eventRepository.findAll());
    }

    @PostMapping("/events")
    public ResponseEntity<Event> createEvent(@RequestBody Event event) {
        updateEventStatus(event);
        return ResponseEntity.ok(eventRepository.save(event));
    }

    @PutMapping("/events/{id}")
    public ResponseEntity<?> updateEvent(@PathVariable Long id, @RequestBody Event eventDetails) {
        return eventRepository.findById(id).map(event -> {
            // Check if dates or horarios changed
            boolean datesChanged = !event.getFechaInicio().equals(eventDetails.getFechaInicio())
                    || !event.getFechaFin().equals(eventDetails.getFechaFin())
                    || (eventDetails.getHorarios() != null && !eventDetails.getHorarios().equals(event.getHorarios()));

            List<Assignment> assignmentsToUpdate = new java.util.ArrayList<>();

            if (datesChanged) {
                ObjectMapper mapper = new ObjectMapper();

                // Parse new event days from incoming data
                List<String> newEventDays = new java.util.ArrayList<>();
                try {
                    if (eventDetails.getHorarios() != null && !eventDetails.getHorarios().isEmpty()) {
                        List<Map<String, String>> hList = mapper.readValue(eventDetails.getHorarios(), new TypeReference<List<Map<String, String>>>(){});
                        for (Map<String, String> h : hList) {
                            newEventDays.add(h.get("fecha"));
                        }
                    }
                } catch (Exception e) {}
                if (newEventDays.isEmpty()) {
                    LocalDate d = eventDetails.getFechaInicio();
                    while (!d.isAfter(eventDetails.getFechaFin())) {
                        newEventDays.add(d.toString());
                        d = d.plusDays(1);
                    }
                }

                // For each assigned worker: recalculate their days and check conflicts
                List<Assignment> currentAssignments = assignmentRepository.findByEvent(event);
                for (Assignment asg : currentAssignments) {
                    // Get worker's currently assigned days
                    List<String> oldWorkerDays = new java.util.ArrayList<>();
                    try {
                        if (asg.getDiasSeleccionados() != null && !asg.getDiasSeleccionados().isEmpty()) {
                            oldWorkerDays = mapper.readValue(asg.getDiasSeleccionados(), new TypeReference<List<String>>(){});
                        }
                    } catch (Exception e) {}

                    // Recalculate: keep only days that still exist in the new event
                    List<String> updatedWorkerDays;
                    if (oldWorkerDays.isEmpty()) {
                        // No specific days before, assign to all new days
                        updatedWorkerDays = new java.util.ArrayList<>(newEventDays);
                    } else {
                        updatedWorkerDays = new java.util.ArrayList<>(oldWorkerDays);
                        updatedWorkerDays.retainAll(newEventDays);
                        // If none of the old days remain in the new event, assign to all new days
                        if (updatedWorkerDays.isEmpty()) {
                            updatedWorkerDays = new java.util.ArrayList<>(newEventDays);
                        }
                    }

                    // Check for conflicts with the updated days against other events
                    List<Assignment> otherAssignments = assignmentRepository.findByUser(asg.getUser());
                    for (Assignment otherAsg : otherAssignments) {
                        if (otherAsg.getEvent().getId().equals(event.getId())) continue;
                        Event otherEvent = otherAsg.getEvent();
                        if ("FINALIZADO".equals(otherEvent.getEstado()) || "CANCELADO".equals(otherEvent.getEstado())) continue;

                        List<String> otherDays = new java.util.ArrayList<>();
                        try {
                            if (otherAsg.getDiasSeleccionados() != null && !otherAsg.getDiasSeleccionados().isEmpty()) {
                                otherDays = mapper.readValue(otherAsg.getDiasSeleccionados(), new TypeReference<List<String>>(){});
                            }
                        } catch (Exception e) {}
                        if (otherDays.isEmpty()) {
                            try {
                                if (otherEvent.getHorarios() != null && !otherEvent.getHorarios().isEmpty()) {
                                    List<Map<String, String>> hList = mapper.readValue(otherEvent.getHorarios(), new TypeReference<List<Map<String, String>>>(){});
                                    for (Map<String, String> h : hList) {
                                        otherDays.add(h.get("fecha"));
                                    }
                                }
                            } catch (Exception e) {}
                            if (otherDays.isEmpty()) {
                                LocalDate d = otherEvent.getFechaInicio();
                                while (!d.isAfter(otherEvent.getFechaFin())) {
                                    otherDays.add(d.toString());
                                    d = d.plusDays(1);
                                }
                            }
                        }

                        for (String day : updatedWorkerDays) {
                            if (otherDays.contains(day)) {
                                return ResponseEntity.badRequest().body(Map.of("message",
                                    "Conflicto: " + asg.getUser().getNombre() + " ya está asignado al evento '" + otherEvent.getNombre() + "' el día " + day + ". No se puede cambiar las fechas."));
                            }
                        }
                    }

                    // Mark assignment for update with new days
                    try {
                        asg.setDiasSeleccionados(mapper.writeValueAsString(updatedWorkerDays));
                    } catch (Exception e) {}
                    asg.setDiasAsignados(updatedWorkerDays.size());
                    assignmentsToUpdate.add(asg);
                }
            }

            // All validations passed — save event
            event.setNombre(eventDetails.getNombre());
            event.setNumeroEvento(eventDetails.getNumeroEvento());
            event.setFechaInicio(eventDetails.getFechaInicio());
            event.setFechaFin(eventDetails.getFechaFin());
            event.setHoraInicio(eventDetails.getHoraInicio());
            event.setHoraFin(eventDetails.getHoraFin());
            event.setHoraLlegada(eventDetails.getHoraLlegada());
            event.setUbicacion(eventDetails.getUbicacion());
            event.setLatitud(eventDetails.getLatitud());
            event.setLongitud(eventDetails.getLongitud());
            event.setDescripcion(eventDetails.getDescripcion());
            event.setCabina(eventDetails.getCabina());
            event.setCantCabina(eventDetails.getCantCabina());
            event.setReceptores(eventDetails.getReceptores());
            event.setCantReceptores(eventDetails.getCantReceptores());
            event.setEquipoExtras(eventDetails.getEquipoExtras());
            event.setArchivoAdjunto(eventDetails.getArchivoAdjunto());
            event.setHorarios(eventDetails.getHorarios());
            updateEventStatus(event);
            Event saved = eventRepository.save(event);

            // Save updated assignments and notify workers
            for (Assignment asg : assignmentsToUpdate) {
                assignmentRepository.save(asg);
            }
            
            // Notify all assigned workers that the event was updated
            List<Assignment> currentAssignments = assignmentRepository.findByEvent(saved);
            for (Assignment asg : currentAssignments) {
                if (asg.getUser().getFcmToken() != null && !asg.getUser().getFcmToken().isEmpty()) {
                    fcmService.sendPushNotification(asg.getUser().getFcmToken(), "Evento Actualizado", "El evento " + saved.getNombre() + " ha sido modificado.", "/worker/events");
                }
            }

            return ResponseEntity.ok((Object) saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/events/{id}")
    public ResponseEntity<?> deleteEvent(@PathVariable Long id) {
        return eventRepository.findById(id).map(event -> {
            assignmentRepository.deleteAll(assignmentRepository.findByEvent(event));
            
            List<Report> reports = reportRepository.findByEvent(event);
            for (Report r : reports) {
                if (r.getFotos() != null) r.getFotos().forEach(p -> fileStorageService.deleteFile(p.getRutaArchivo()));
            }
            reportRepository.deleteAll(reports);

            List<CheckIn> checkins = checkInRepository.findByEvent(event);
            for (CheckIn c : checkins) {
                if (c.getFotoEntrada() != null) fileStorageService.deleteFile(c.getFotoEntrada().getRutaArchivo());
                if (c.getFotoMontaje() != null) fileStorageService.deleteFile(c.getFotoMontaje().getRutaArchivo());
                if (c.getFotoSalida() != null) fileStorageService.deleteFile(c.getFotoSalida().getRutaArchivo());
            }
            checkInRepository.deleteAll(checkins);
            
            if (event.getArchivoAdjunto() != null && !event.getArchivoAdjunto().isEmpty()) {
                fileStorageService.deleteFile(event.getArchivoAdjunto());
            }
            
            eventRepository.delete(event);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // Staff CRUD
    @GetMapping("/staff")
    public ResponseEntity<List<User>> getAllStaff() {
        return ResponseEntity.ok(userRepository.findAllByOrderByNombreAsc());
    }

    @PostMapping("/staff")
    public ResponseEntity<User> createStaff(@RequestBody User user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return ResponseEntity.ok(userRepository.save(user));
    }
    
    @PutMapping("/staff/{id}")
    public ResponseEntity<?> updateStaff(@PathVariable Long id, @RequestBody User userDetails) {
        return userRepository.findById(id).map(user -> {
            if (id.equals(getCurrentUser().getId()) && !userDetails.isActivo()) {
                return ResponseEntity.badRequest().body(null); // Or a specific error message
            }
            user.setNombre(userDetails.getNombre());
            user.setEmail(userDetails.getEmail());
            if (userDetails.getPassword() != null && !userDetails.getPassword().isEmpty()) {
                user.setPassword(passwordEncoder.encode(userDetails.getPassword()));
            }
            if (id.equals(getCurrentUser().getId())) {
                user.setRol("ADMIN"); // Nunca permitir perder los privilegios
            } else {
                user.setRol(userDetails.getRol());
            }
            user.setTelefono(userDetails.getTelefono());
            user.setPuesto(userDetails.getPuesto());
            user.setActivo(userDetails.isActivo());
            user.setFotoPerfil(userDetails.getFotoPerfil());
            return ResponseEntity.ok(userRepository.save(user));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/staff/{id}")
    public ResponseEntity<?> deleteStaff(@PathVariable Long id) {
        if (id.equals(getCurrentUser().getId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "No puedes eliminar tu propia cuenta de administrador."));
        }
        return userRepository.findById(id).map(user -> {
            // Cascade delete related records
            assignmentRepository.deleteAll(assignmentRepository.findByUser(user));
            reportRepository.deleteAll(reportRepository.findByUser(user));
            checkInRepository.deleteAll(checkInRepository.findByUser(user));
            
            userRepository.delete(user);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // Payments
    @GetMapping("/payments")
    public ResponseEntity<List<Assignment>> getAllPayments() {
        return ResponseEntity.ok(assignmentRepository.findAll());
    }

    // Assignments
    @GetMapping("/events/{id}/assignments")
    public ResponseEntity<List<Assignment>> getEventAssignments(@PathVariable("id") Long eventId) {
        return eventRepository.findById(eventId).map(event -> 
            ResponseEntity.ok(assignmentRepository.findByEvent(event))
        ).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/events/{id}/checkins")
    public ResponseEntity<?> getEventCheckIns(@PathVariable("id") Long eventId) {
        try {
            return eventRepository.findById(eventId).map(event -> 
                ResponseEntity.ok(checkInRepository.findByEvent(event))
            ).orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            System.err.println("ERROR IN getEventCheckIns: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error fetching checkins: " + e.getMessage());
        }
    }    @PostMapping("/assignments")
    public ResponseEntity<?> assignStaff(@RequestBody Map<String, Object> payload) {
        try {
            if (payload.get("userId") == null || payload.get("eventId") == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Falta el ID de usuario o evento."));
            }

            Long userId = Long.parseLong(payload.get("userId").toString());
            Long eventId = Long.parseLong(payload.get("eventId").toString());
            String rolAsignado = payload.get("rolAsignado") != null ? payload.get("rolAsignado").toString() : "Técnico";
            
            Double pagoAsignado = 0.0;
            if (payload.get("pagoAsignado") != null && !payload.get("pagoAsignado").toString().isEmpty()) {
                pagoAsignado = Double.parseDouble(payload.get("pagoAsignado").toString());
            }

            Integer diasAsignados = 1;
            if (payload.get("diasAsignados") != null && !payload.get("diasAsignados").toString().isEmpty()) {
                diasAsignados = Integer.parseInt(payload.get("diasAsignados").toString());
            }

            Double pagoExtras = 0.0;
            if (payload.containsKey("pagoExtras") && payload.get("pagoExtras") != null && !payload.get("pagoExtras").toString().isEmpty()) {
                pagoExtras = Double.parseDouble(payload.get("pagoExtras").toString());
            }

            String diasSeleccionados = payload.containsKey("diasSeleccionados") ? payload.get("diasSeleccionados").toString() : null;
            String horaLlegada = payload.containsKey("horaLlegada") ? (payload.get("horaLlegada") != null ? payload.get("horaLlegada").toString() : null) : null;
            String llegadasPorDia = payload.containsKey("llegadasPorDia") ? (payload.get("llegadasPorDia") != null ? payload.get("llegadasPorDia").toString() : null) : null;

            User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            Event event = eventRepository.findById(eventId).orElseThrow(() -> new RuntimeException("Evento no encontrado"));

            if (assignmentRepository.findByUserAndEvent(user, event).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Este trabajador ya se encuentra asignado a este evento."));
            }

            // Parse selected days for the new assignment
            ObjectMapper mapper = new ObjectMapper();
            List<String> newSelectedDays = new java.util.ArrayList<>();
            try {
                if (diasSeleccionados != null && !diasSeleccionados.isEmpty() && !diasSeleccionados.equals("[]")) {
                    newSelectedDays = mapper.readValue(diasSeleccionados, new TypeReference<List<String>>(){});
                }
            } catch (Exception e) {}

            // If no specific days selected, derive from event horarios or full date range
            if (newSelectedDays.isEmpty()) {
                try {
                    if (event.getHorarios() != null && !event.getHorarios().isEmpty()) {
                        List<Map<String, String>> hList = mapper.readValue(event.getHorarios(), new TypeReference<List<Map<String, String>>>(){});
                        for (Map<String, String> h : hList) {
                            newSelectedDays.add(h.get("fecha"));
                        }
                    }
                } catch (Exception e) {}
                if (newSelectedDays.isEmpty()) {
                    LocalDate d = event.getFechaInicio();
                    while (!d.isAfter(event.getFechaFin())) {
                        newSelectedDays.add(d.toString());
                        d = d.plusDays(1);
                    }
                }
            }

            // Check for schedule conflict based on specific selected days
            List<Assignment> existingAssignments = assignmentRepository.findByUser(user);

            for (Assignment existingAssignment : existingAssignments) {
                Event existingEvent = existingAssignment.getEvent();
                if ("FINALIZADO".equals(existingEvent.getEstado()) || "CANCELADO".equals(existingEvent.getEstado())) {
                    continue;
                }

                // Get existing assignment's selected days
                List<String> existingSelectedDays = new java.util.ArrayList<>();
                try {
                    if (existingAssignment.getDiasSeleccionados() != null && !existingAssignment.getDiasSeleccionados().isEmpty() && !existingAssignment.getDiasSeleccionados().equals("[]")) {
                        existingSelectedDays = mapper.readValue(existingAssignment.getDiasSeleccionados(), new TypeReference<List<String>>(){});
                    }
                } catch (Exception e) {}

                if (existingSelectedDays.isEmpty()) {
                    try {
                        if (existingEvent.getHorarios() != null && !existingEvent.getHorarios().isEmpty()) {
                            List<Map<String, String>> hList = mapper.readValue(existingEvent.getHorarios(), new TypeReference<List<Map<String, String>>>(){});
                            for (Map<String, String> h : hList) {
                                existingSelectedDays.add(h.get("fecha"));
                            }
                        }
                    } catch (Exception e) {}
                    if (existingSelectedDays.isEmpty()) {
                        LocalDate d = existingEvent.getFechaInicio();
                        while (!d.isAfter(existingEvent.getFechaFin())) {
                            existingSelectedDays.add(d.toString());
                            d = d.plusDays(1);
                        }
                    }
                }

                // Check for overlap only if they have shared days
                for (String newDay : newSelectedDays) {
                    if (existingSelectedDays.contains(newDay)) {
                        LocalTime existingStart = existingEvent.getHoraInicio();
                        LocalTime existingEnd = existingEvent.getHoraFin();
                        LocalTime newStart = event.getHoraInicio();
                        LocalTime newEnd = event.getHoraFin();

                        if (existingStart == null || existingEnd == null || newStart == null || newEnd == null) continue;

                        // Standard overlap check: (StartA < EndB) and (EndA > StartB)
                        if (newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart)) {
                            return ResponseEntity.badRequest().body(Map.of("message",
                                "Conflicto el d\u00eda " + newDay + ": " + user.getNombre() + 
                                " ya est\u00e1 asignado a '" + existingEvent.getNombre() + 
                                "' de " + existingStart + " a " + existingEnd + ". No se puede traslapar con el horario de este evento (" + newStart + " - " + newEnd + ")."));
                        }
                    }
                }
            }

            Assignment assignment = new Assignment();
            assignment.setUser(user);
            assignment.setEvent(event);
            assignment.setRolAsignado(rolAsignado);
            assignment.setHoraLlegada(horaLlegada);
            assignment.setPagoAsignado(pagoAsignado);
            assignment.setDiasAsignados(newSelectedDays.size() > 0 ? newSelectedDays.size() : diasAsignados);
            assignment.setPagoExtras(pagoExtras);
            assignment.setLlegadasPorDia(llegadasPorDia);
            try {
                assignment.setDiasSeleccionados(mapper.writeValueAsString(newSelectedDays));
            } catch (Exception e) {
                assignment.setDiasSeleccionados(diasSeleccionados);
            }

            Assignment savedAssignment = assignmentRepository.save(assignment);
            
            // Notify the worker
            if (user.getFcmToken() != null && !user.getFcmToken().isEmpty()) {
                fcmService.sendPushNotification(user.getFcmToken(), "Nueva Asignaci\u00f3n", "Has sido asignado a un nuevo evento: " + event.getNombre(), "/worker/events");
            }

            return ResponseEntity.ok(savedAssignment);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "Error interno al procesar la asignaci\u00f3n: " + e.getMessage()));
        }
    }

    @PutMapping("/assignments/{id}/pagar")
    public ResponseEntity<?> togglePagado(@PathVariable Long id) {
        return assignmentRepository.findById(id).map(assignment -> {
            assignment.setPagado(assignment.getPagado() == null || !assignment.getPagado());
            // Optionally, notify the worker that they've been paid
            if (assignment.getPagado() && assignment.getUser().getFcmToken() != null && !assignment.getUser().getFcmToken().isEmpty()) {
                fcmService.sendPushNotification(assignment.getUser().getFcmToken(), "Pago Confirmado", "Tu pago para el evento " + assignment.getEvent().getNombre() + " ha sido marcado como Completado.", "/worker/payments");
            }
            return ResponseEntity.ok(assignmentRepository.save(assignment));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/assignments/bulk-pagar")
    public ResponseEntity<?> bulkTogglePagado(@RequestBody List<Long> ids) {
        List<Assignment> assignments = assignmentRepository.findAllById(ids);
        if(assignments.isEmpty()) return ResponseEntity.ok().build();
        
        // Find if we are marking as paid or unpaid based on the first item
        boolean targetStatus = assignments.get(0).getPagado() == null || !assignments.get(0).getPagado();
        
        for (Assignment asg : assignments) {
            asg.setPagado(targetStatus);
        }
        assignmentRepository.saveAll(assignments);
        
        // Notify user of the first assignment (assuming all belong to same worker)
        User user = assignments.get(0).getUser();
        if (targetStatus && user.getFcmToken() != null && !user.getFcmToken().isEmpty()) {
            fcmService.sendPushNotification(user.getFcmToken(), "Quincena Pagada", "Tu pago quincenal ha sido marcado como Completado.", "/worker/payments");
        }
        
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/assignments/{id}")
    public ResponseEntity<?> deleteAssignment(@PathVariable Long id) {
        return assignmentRepository.findById(id).map(assignment -> {
            assignmentRepository.delete(assignment);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // Reports
    @GetMapping("/reports")
    public ResponseEntity<List<Report>> getAllReports() {
        return ResponseEntity.ok(reportRepository.findAllByOrderByFechaCreacionDesc());
    }

    // Helper for automatic status
    private void updateEventStatus(Event event) {
        java.time.ZoneId zone = java.time.ZoneId.of("America/Mexico_City");
        java.time.LocalDateTime now = java.time.LocalDateTime.now(zone);
        java.time.LocalDateTime start = java.time.LocalDateTime.of(event.getFechaInicio(), event.getHoraInicio());
        java.time.LocalDateTime end = java.time.LocalDateTime.of(event.getFechaFin(), event.getHoraFin());

        if (end.isBefore(start)) {
            end = end.plusDays(1);
        }

        if (now.isBefore(start)) {
            event.setEstado("PENDIENTE");
        } else if (now.isAfter(end)) {
            event.setEstado("FINALIZADO");
        } else {
            event.setEstado("EN_CURSO");
        }
    }
}
