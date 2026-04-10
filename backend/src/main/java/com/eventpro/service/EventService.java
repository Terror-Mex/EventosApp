package com.eventpro.service;

import com.eventpro.dto.request.EventRequest;
import com.eventpro.dto.response.AssignmentResponse;
import com.eventpro.dto.response.CheckInResponse;
import com.eventpro.dto.response.EventResponse;
import com.eventpro.model.Assignment;
import com.eventpro.model.CheckIn;
import com.eventpro.model.Event;
import com.eventpro.model.User;
import com.eventpro.repository.AssignmentRepository;
import com.eventpro.repository.CheckInRepository;
import com.eventpro.repository.EventRepository;
import com.eventpro.repository.ReportRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


@Slf4j
@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final AssignmentRepository assignmentRepository;
    private final ReportRepository reportRepository;
    private final FcmService fcmService;
    private final UserService userService;
    private final CheckInRepository checkInRepository;

    public List<EventResponse> getAllEvents() {
        return eventRepository.findAll().stream()
                .map(EventResponse::from)
                .collect(Collectors.toList());
    }

    public Long countEvents() {
        return eventRepository.count();
    }

    public EventResponse createEvent(EventRequest eventRequest) {
        Event event = new Event(eventRequest);
        updateEventStatus(event);
        Event saved = eventRepository.save(event);
        return EventResponse.from(saved);
    }

    public EventResponse updateEvent(Long id, EventRequest eventDetails) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Evento no encontrado con ID: " + id));

        event.updateFrom(eventDetails);
        updateEventStatus(event);
        Event saved = eventRepository.save(event);

        // Notificar a workers asignados
        List<Assignment> assignments = assignmentRepository.findByEvent(saved);
        for (Assignment assignment : assignments) {
            if (assignment.getUser().getFcmToken() != null && !assignment.getUser().getFcmToken().isEmpty()) {
                fcmService.sendPushNotification(
                        assignment.getUser().getFcmToken(),
                        "Evento Actualizado",
                        "El evento '" + saved.getNombre() + "' ha sido modificado.",
                        "/worker/events"
                );
            }
        }

        return EventResponse.from(saved);
    }

    @Transactional
    public void deleteEvent(Long id) {
        log.info("Intentando borrar evento ID: {}", id);
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Evento no encontrado con ID: " + id));

        log.info("Borrando asignaciones del evento: {}", id);
        assignmentRepository.deleteByEventId(id);

        log.info("Borrando reportes del evento: {}", id);
        reportRepository.deleteByEvent(event);

        log.info("Borrando evento: {}", id);
        eventRepository.delete(event);
    }

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

    public Map<String, Object> getEventWithAssignments(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Evento no encontrado"));

        // 1. Obtenemos al usuario que está consultando (Tú)
        User currentUser = userService.getCurrentUser();

        // 2. Definimos la fecha de hoy para buscar el check-in
        LocalDate hoy = LocalDate.now(ZoneId.of("America/Mexico_City"));

        List<AssignmentResponse> assignments = assignmentRepository.findByEvent(event)
                .stream()
                .map(asig -> {
                    // 3. ¿Esta asignación pertenece al usuario actual?
                    CheckIn check = null;
                    if (asig.getUser().getId().equals(currentUser.getId())) {
                        // Solo buscamos el check-in para el usuario que está logueado
                        check = checkInRepository.findByUserAndEventAndFecha(currentUser, event, hoy)
                                .orElse(null);
                    }

                    // 4. Usamos el nuevo método 'from' que recibe el check-in
                    return AssignmentResponse.from(asig,check);
                })
                .collect(Collectors.toList());

        List<CheckInResponse> myCheckIns = checkInRepository.findByUserAndEvent(currentUser, event)
                .stream()
                .map(CheckInResponse::from)
                .collect(Collectors.toList());

        return Map.of(
                "event", EventResponse.from(event),
                "assignments", assignments,
                "myCheckIns", myCheckIns);
    }
}
