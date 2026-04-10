package com.eventpro.service;

import com.eventpro.dto.response.CheckInResponse;
import com.eventpro.model.CheckIn;
import com.eventpro.model.Event;
import com.eventpro.model.Photo;
import com.eventpro.model.User;
import com.eventpro.repository.CheckInRepository;
import com.eventpro.repository.EventRepository;
import com.eventpro.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Transactional
@Service
@RequiredArgsConstructor
public class CheckInService {

    private final CheckInRepository checkInRepository;
    private final EventRepository eventRepository;
    private final FileStorageService fileStorageService;
    private final UserRepository userRepository;
    private final FcmService fcmService;

    public List<CheckInResponse> getEventCheckIns(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Evento no encontrado con ID: " + eventId));
        return checkInRepository.findByEvent(event).stream()
                .map(CheckInResponse::from)
                .collect(Collectors.toList());
    }

    public CheckInResponse checkIn(Long eventId, MultipartFile file, Double latitud, Double longitud, User user) {
        log.info("CheckIn - eventId: {}, lat: {}, lon: {}, user: {}", eventId, latitud, longitud, user.getEmail());
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Evento no encontrado con ID: " + eventId));
        validateDistance(event, latitud, longitud);
        LocalDate hoyMexico = LocalDate.now(ZoneId.of("America/Mexico_City"));

        Optional<CheckIn> existingCheckIn = checkInRepository.findByUserAndEventAndFecha(user, event, hoyMexico);
        if (existingCheckIn.isPresent() && existingCheckIn.get().getHoraEntrada() != null) {
            throw new IllegalStateException("Ya se ha registrado la entrada para este evento hoy.");
        }

        String fileUrl = fileStorageService.storeFile(file);
        Photo photo = new Photo(null, fileUrl, file.getOriginalFilename(), "CHECKIN_ENTRADA", LocalDateTime.now());

        CheckIn checkIn = existingCheckIn.orElseGet(() -> {
                    CheckIn newCheck = new CheckIn(user, event);
                    newCheck.setFecha(hoyMexico);
                    return newCheck;
                });
        checkIn.setHoraEntrada(LocalDateTime.now());
        checkIn.setFotoEntrada(photo);
        CheckIn saved = checkInRepository.save(checkIn);

        notifyAdmins("Nuevo Check-In (Entrada)", user.getNombre() + " registró entrada en el evento: " + event.getNombre());
        return CheckInResponse.from(saved);
    }

    public CheckInResponse checkMontaje(Long eventId, MultipartFile file, Double latitud, Double longitud, User user, String fecha) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Evento no encontrado con ID: " + eventId));
        validateDistance(event, latitud, longitud);

        // Parsear la fecha del request
        LocalDate fechaLocal = LocalDate.parse(fecha);

        CheckIn checkIn = checkInRepository.findByUserAndEventAndFecha(user, event, fechaLocal)
                .orElseThrow(() -> new RuntimeException("Debes registrar entrada primero en el día: " + fecha));

        if (checkIn.getHoraMontaje() != null) {
            throw new IllegalStateException("Ya se ha registrado el montaje para este evento en la fecha: " + fecha);
        }

        String fileUrl = fileStorageService.storeFile(file);
        Photo photo = new Photo(null, fileUrl, file.getOriginalFilename(), "MONTAJE", LocalDateTime.now());

        checkIn.setHoraMontaje(LocalDateTime.now());
        checkIn.setFotoMontaje(photo);
        CheckIn saved = checkInRepository.save(checkIn);

        notifyAdmins("Check-In (Montaje/Pruebas)", user.getNombre() + " registró montaje en el evento: " + event.getNombre());
        return CheckInResponse.from(saved);
    }

    public CheckInResponse checkOut(Long eventId, MultipartFile file, Double latitud, Double longitud, User user, String fecha) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Evento no encontrado con ID: " + eventId));
        validateDistance(event, latitud, longitud);

        // Parsear la fecha del request
        LocalDate fechaLocal = LocalDate.parse(fecha);

        CheckIn checkIn = checkInRepository.findByUserAndEventAndFecha(user, event, fechaLocal)
                .orElseThrow(() -> new RuntimeException("Debes registrar entrada primero en el día: " + fecha));

        if (checkIn.getHoraSalida() != null) {
            throw new IllegalStateException("Ya se ha registrado la salida para este evento en la fecha: " + fecha);
        }

        String fileUrl = fileStorageService.storeFile(file);
        Photo photo = new Photo(null, fileUrl, file.getOriginalFilename(), "CHECKIN_SALIDA", LocalDateTime.now());

        checkIn.setHoraSalida(LocalDateTime.now());
        checkIn.setFotoSalida(photo);
        CheckIn saved = checkInRepository.save(checkIn);

        notifyAdmins("Check-Out (Salida)", user.getNombre() + " registró salida del evento: " + event.getNombre());
        return CheckInResponse.from(saved);
    }

    private void validateDistance(Event event, Double latitud, Double longitud) {
        log.info("Validando distancia - lat: {}, lon: {}, eventLat: {}, eventLon: {}", latitud, longitud, event.getLatitud(), event.getLongitud());
        if (event.getLatitud() != null && event.getLongitud() != null) {
            if (latitud == null || longitud == null) {
                throw new IllegalArgumentException("Se requiere ubicación GPS (Permisos de ubicación) para reportarse en este evento.");
            }
            double distance = calculateDistance(latitud, longitud, event.getLatitud(), event.getLongitud());
            if (distance > 300) {
                throw new IllegalArgumentException("Aún no estás en el lugar del evento.");
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

    private void notifyAdmins(String title, String body) {
        List<User> admins = userRepository.findByRol("ADMIN");
        for (User admin : admins) {
            if (admin.getFcmToken() != null && !admin.getFcmToken().isEmpty()) {
                fcmService.sendPushNotification(
                        admin.getFcmToken(),
                        title,
                        body,
                        "/admin/checkins"
                );
            }
        }
    }
}
