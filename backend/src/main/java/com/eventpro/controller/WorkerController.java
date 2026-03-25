package com.eventpro.controller;

import com.eventpro.model.*;
import com.eventpro.repository.*;
import com.eventpro.service.FileStorageService;
import com.eventpro.service.FcmService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/worker")
public class WorkerController {

    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final AssignmentRepository assignmentRepository;
    private final CheckInRepository checkInRepository;
    private final ReportRepository reportRepository;
    private final FileStorageService fileStorageService;
    private final FcmService fcmService;

    public WorkerController(UserRepository userRepository, EventRepository eventRepository,
                            AssignmentRepository assignmentRepository, CheckInRepository checkInRepository,
                            ReportRepository reportRepository, FileStorageService fileStorageService,
                            FcmService fcmService) {
        this.userRepository = userRepository;
        this.eventRepository = eventRepository;
        this.assignmentRepository = assignmentRepository;
        this.checkInRepository = checkInRepository;
        this.reportRepository = reportRepository;
        this.fileStorageService = fileStorageService;
        this.fcmService = fcmService;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName()).orElseThrow();
    }

    private void notifyAdmins(String title, String body) {
        List<User> admins = userRepository.findByRol("ADMIN");
        for (User admin : admins) {
            if (admin.getFcmToken() != null && !admin.getFcmToken().isEmpty()) {
                fcmService.sendPushNotification(admin.getFcmToken(), title, body, "/admin/events");
            }
        }
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371000; // Radius of the earth in meters
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Convert to meters
    }

    private void validateDistance(Event event, Double latitud, Double longitud) {
        if (event.getLatitud() != null && event.getLongitud() != null) {
            if (latitud == null || longitud == null) {
                throw new RuntimeException("Se requiere ubicación GPS (Permisos de ubicación) para reportarse en este evento.");
            }
            double distance = calculateDistance(latitud, longitud, event.getLatitud(), event.getLongitud());
            if (distance > 300) {
                throw new RuntimeException("aún no estas en el lugar del evento");
            }
        }
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard() {
        User user = getCurrentUser();
        List<Assignment> assignments = assignmentRepository.findByUser(user);
        List<CheckIn> checkins = checkInRepository.findByUser(user);
        
        Map<String, Object> response = new HashMap<>();
        response.put("assignmentsCount", assignments.size());
        response.put("checkinsCount", checkins.size());
        
        return ResponseEntity.ok(response);
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

    @GetMapping("/events")
    public ResponseEntity<List<Assignment>> getMyEvents() {
        User user = getCurrentUser();
        return ResponseEntity.ok(assignmentRepository.findByUser(user));
    }

    @GetMapping("/payments")
    public ResponseEntity<List<Assignment>> getMyPayments() {
        User user = getCurrentUser();
        return ResponseEntity.ok(assignmentRepository.findByUser(user));
    }

    @GetMapping("/events/{id}")
    public ResponseEntity<?> getEventDetail(@PathVariable Long id) {
        User user = getCurrentUser();
        Optional<Event> eventOpt = eventRepository.findById(id);
        
        if (eventOpt.isEmpty()) return ResponseEntity.notFound().build();
        Event event = eventOpt.get();
        
        Optional<Assignment> assignment = assignmentRepository.findByUserAndEvent(user, event);
        if (assignment.isEmpty()) return ResponseEntity.status(403).body("Not assigned to this event");
        
        List<CheckIn> checkIns = checkInRepository.findAllByUserAndEvent(user, event);
        
        Map<String, Object> response = new HashMap<>();
        response.put("event", event);
        response.put("assignment", assignment.get());
        response.put("checkIns", checkIns);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/checkin")
    public ResponseEntity<?> checkIn(@RequestParam("eventId") Long eventId, 
                                     @RequestParam("photo") MultipartFile file,
                                     @RequestParam(value = "latitud", required = false) Double latitud,
                                     @RequestParam(value = "longitud", required = false) Double longitud) {
        System.out.println(">>> CHECKIN ATTEMPT for eventId " + eventId);
        try {
            User user = getCurrentUser();
            Event event = eventRepository.findById(eventId).orElseThrow();
            
            validateDistance(event, latitud, longitud);

            Optional<CheckIn> existingCheckIn = checkInRepository.findByUserAndEventAndFecha(user, event, LocalDate.now());
            if (existingCheckIn.isPresent() && existingCheckIn.get().getHoraEntrada() != null) {
                System.out.println(">>> CHECKIN ALREADY DONE for eventId " + eventId);
                return ResponseEntity.badRequest().body("Already checked in");
            }
            
            String fileUrl = fileStorageService.storeFile(file);
            System.out.println(">>> CHECKIN PHOTO SAVED: " + fileUrl);
            Photo photo = new Photo(null, fileUrl, file.getOriginalFilename(), "CHECKIN_ENTRADA", LocalDateTime.now());
            
            CheckIn checkIn = existingCheckIn.orElse(new CheckIn());
            checkIn.setUser(user);
            checkIn.setEvent(event);
            checkIn.setFecha(LocalDate.now());
            checkIn.setHoraEntrada(LocalDateTime.now());
            checkIn.setFotoEntrada(photo);
            
            checkInRepository.save(checkIn);
            System.out.println(">>> CHECKIN SAVED SUCCESSFULLY");
            
            // Notificar admins
            notifyAdmins("Nuevo Check-In (Entrada)", user.getNombre() + " registró entrada en el evento: " + event.getNombre());
            
            return ResponseEntity.ok(checkIn);
        } catch (Exception e) {
            System.out.println(">>> CHECKIN ERROR: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }
    @PostMapping("/montaje")
    public ResponseEntity<?> checkMontaje(@RequestParam("eventId") Long eventId, 
                                      @RequestParam("photo") MultipartFile file,
                                      @RequestParam(value = "latitud", required = false) Double latitud,
                                      @RequestParam(value = "longitud", required = false) Double longitud) {
        try {
            User user = getCurrentUser();
            Event event = eventRepository.findById(eventId).orElseThrow();
            
            validateDistance(event, latitud, longitud);

            CheckIn checkIn = checkInRepository.findByUserAndEventAndFecha(user, event, LocalDate.now())
                    .orElseThrow(() -> new RuntimeException("Debes registrar entrada primero hoy"));
                    
            if (checkIn.getHoraMontaje() != null) {
                return ResponseEntity.badRequest().body("Montaje-Pruebas ya registrado");
            }
        
        String fileUrl = fileStorageService.storeFile(file);
        Photo photo = new Photo(null, fileUrl, file.getOriginalFilename(), "MONTAJE", LocalDateTime.now());
        
        checkIn.setHoraMontaje(LocalDateTime.now());
        checkIn.setFotoMontaje(photo);
        
        checkInRepository.save(checkIn);
        
        // Notificar admins
        notifyAdmins("Check-In (Montaje/Pruebas)", user.getNombre() + " registró montaje en el evento: " + event.getNombre());
        
        return ResponseEntity.ok(checkIn);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/checkout")
    public ResponseEntity<?> checkOut(@RequestParam("eventId") Long eventId, 
                                      @RequestParam("photo") MultipartFile file,
                                      @RequestParam(value = "latitud", required = false) Double latitud,
                                      @RequestParam(value = "longitud", required = false) Double longitud) {
        try {
            User user = getCurrentUser();
            Event event = eventRepository.findById(eventId).orElseThrow();
            
            validateDistance(event, latitud, longitud);

            CheckIn checkIn = checkInRepository.findByUserAndEventAndFecha(user, event, LocalDate.now())
                    .orElseThrow(() -> new RuntimeException("Debes registrar entrada primero hoy"));
                    
            if (checkIn.getHoraSalida() != null) {
                return ResponseEntity.badRequest().body("Already checked out");
            }
        
        String fileUrl = fileStorageService.storeFile(file);
        Photo photo = new Photo(null, fileUrl, file.getOriginalFilename(), "CHECKIN_SALIDA", LocalDateTime.now());
        
        checkIn.setHoraSalida(LocalDateTime.now());
        checkIn.setFotoSalida(photo);
        
        checkInRepository.save(checkIn);
        
        // Notificar admins
        notifyAdmins("Check-Out (Salida)", user.getNombre() + " registró salida del evento: " + event.getNombre());
        
        return ResponseEntity.ok(checkIn);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/reports")
    public ResponseEntity<List<Report>> getMyReports() {
        return ResponseEntity.ok(reportRepository.findByUserOrderByFechaCreacionDesc(getCurrentUser()));
    }

    @PostMapping("/reports")
    public ResponseEntity<?> createReport(@RequestParam("eventId") Long eventId,
                                          @RequestParam("contenido") String contenido,
                                          @RequestParam(value = "photos", required = false) MultipartFile[] photos) {
        User user = getCurrentUser();
        Event event = eventRepository.findById(eventId).orElseThrow();
        
        Report report = new Report();
        report.setUser(user);
        report.setEvent(event);
        report.setContenido(contenido);
        report.setFechaCreacion(LocalDateTime.now());
        
        if (photos != null) {
            for (MultipartFile file : photos) {
                if (!file.isEmpty()) {
                    String fileUrl = fileStorageService.storeFile(file);
                    Photo photo = new Photo(null, fileUrl, file.getOriginalFilename(), "REPORTE", LocalDateTime.now());
                    report.getFotos().add(photo);
                }
            }
        }
        
        reportRepository.save(report);
        
        // Notificar admins
        notifyAdmins("Nuevo Reporte Creado", user.getNombre() + " envió un reporte para el evento: " + event.getNombre());

        return ResponseEntity.ok(report);
    }
    @PostMapping("/profile-picture")
    public ResponseEntity<?> updateProfilePicture(@RequestParam("photo") MultipartFile file) {
        try {
            User user = getCurrentUser();
            
            // Delete old picture if exists
            if (user.getFotoPerfil() != null) {
                fileStorageService.deleteFile(user.getFotoPerfil());
            }
            
            String fileUrl = fileStorageService.storeFile(file);
            user.setFotoPerfil(fileUrl);
            userRepository.save(user);
            
            return ResponseEntity.ok(Map.of("fotoPerfil", fileUrl));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al subir foto de perfil: " + e.getMessage());
        }
    }
}
