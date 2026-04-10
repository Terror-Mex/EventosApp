package com.eventpro.service;

import com.eventpro.dto.request.AssignmentRequest;
import com.eventpro.dto.response.AssignmentResponse;
import com.eventpro.model.Assignment;
import com.eventpro.model.Event;
import com.eventpro.model.User;
import com.eventpro.repository.AssignmentRepository;
import com.eventpro.repository.EventRepository;
import com.eventpro.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final FcmService fcmService;

    public List<AssignmentResponse> getAllAssignments() {
        return assignmentRepository.findAll().stream()
                .map(AssignmentResponse::from)
                .collect(Collectors.toList());
    }

    public List<AssignmentResponse> getEventAssignments(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Evento no encontrado con ID: " + eventId));
        return assignmentRepository.findByEvent(event).stream()
                .map(AssignmentResponse::from)
                .collect(Collectors.toList());
    }

    public List<AssignmentResponse> getMyAssignments(User user) {
        return assignmentRepository.findByUser(user).stream()
                .map(AssignmentResponse::from)
                .collect(Collectors.toList());
    }

    public AssignmentResponse assignStaff(AssignmentRequest payload) {
        User user = userRepository.findById(payload.userId())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + payload.userId()));
        Event event = eventRepository.findById(payload.eventId())
                .orElseThrow(() -> new RuntimeException("Evento no encontrado con ID: " + payload.eventId()));

        if (assignmentRepository.findByUserAndEvent(user, event).isPresent()) {
            throw new IllegalArgumentException("Este trabajador ya se encuentra asignado a este evento.");
        }

        List<String> newSelectedDays = getSelectedDays(payload, event);
        validateStaffAvailability(user, event, newSelectedDays);

        Assignment assignment = new Assignment(payload, user, event, newSelectedDays);
        Assignment savedAssignment = assignmentRepository.save(assignment);

        if (user.getFcmToken() != null && !user.getFcmToken().isEmpty()) {
            fcmService.sendPushNotification(user.getFcmToken(), "Nueva Asignación", "Has sido asignado a un nuevo evento: " + event.getNombre(), "/worker/events");
        }

        return AssignmentResponse.from(savedAssignment);
    }

    public AssignmentResponse togglePayment(Long id) {
        Assignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Asignación no encontrada con ID: " + id));
        assignment.setPagado(assignment.getPagado() == null || !assignment.getPagado());
        Assignment saved = assignmentRepository.save(assignment);

        if (saved.getPagado() && saved.getUser().getFcmToken() != null && !saved.getUser().getFcmToken().isEmpty()) {
            fcmService.sendPushNotification(saved.getUser().getFcmToken(), "Pago Confirmado", "Tu pago para el evento " + saved.getEvent().getNombre() + " ha sido marcado como Completado.", "/worker/payments");
        }
        return AssignmentResponse.from(saved);
    }

    public void bulkTogglePayment(List<Long> ids) {
        List<Assignment> assignments = assignmentRepository.findAllById(ids);
        if (assignments.isEmpty()) {
            return;
        }

        boolean targetStatus = assignments.getFirst().getPagado() == null || !assignments.getFirst().getPagado();
        assignments.forEach(asg -> asg.setPagado(targetStatus));
        assignmentRepository.saveAll(assignments);

        User user = assignments.getFirst().getUser();
        if (targetStatus && user.getFcmToken() != null && !user.getFcmToken().isEmpty()) {
            fcmService.sendPushNotification(user.getFcmToken(), "Quincena Pagada", "Tu pago quincenal ha sido marcado como Completado.", "/worker/payments");
        }
    }

    public void deleteAssignment(Long id) {
        Assignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Asignación no encontrada con ID: " + id));
        assignmentRepository.delete(assignment);
    }

    private List<String> getSelectedDays(AssignmentRequest payload, Event event) {
        ObjectMapper mapper = new ObjectMapper();
        List<String> selectedDays = new ArrayList<>();
        try {
            if (payload.diasSeleccionados() != null && !payload.diasSeleccionados().isEmpty() && !payload.diasSeleccionados().equals("[]")) {
                selectedDays = mapper.readValue(payload.diasSeleccionados(), new TypeReference<List<String>>() {});
            }
        } catch (Exception e) {
            // Ignore if parsing fails, will fall back to event days
        }

        if (selectedDays.isEmpty()) {
            try {
                if (event.getHorarios() != null && !event.getHorarios().isEmpty()) {
                    List<Map<String, String>> hList = mapper.readValue(event.getHorarios(), new TypeReference<List<Map<String, String>>>() {});
                    for (Map<String, String> h : hList) {
                        selectedDays.add(h.get("fecha"));
                    }
                }
            } catch (Exception e) {
                // Ignore if parsing fails, will fall back to date range
            }
            if (selectedDays.isEmpty()) {
                LocalDate d = event.getFechaInicio();
                while (!d.isAfter(event.getFechaFin())) {
                    selectedDays.add(d.toString());
                    d = d.plusDays(1);
                }
            }
        }
        return selectedDays;
    }

    private void validateStaffAvailability(User user, Event event, List<String> newSelectedDays) {
        List<Assignment> existingAssignments = assignmentRepository.findByUser(user);
        ObjectMapper mapper = new ObjectMapper();

        for (Assignment existingAssignment : existingAssignments) {
            Event existingEvent = existingAssignment.getEvent();
            if ("FINALIZADO".equals(existingEvent.getEstado()) || "CANCELADO".equals(existingEvent.getEstado())) {
                continue;
            }

            List<String> existingSelectedDays = new ArrayList<>();
            try {
                if (existingAssignment.getDiasSeleccionados() != null && !existingAssignment.getDiasSeleccionados().isEmpty() && !existingAssignment.getDiasSeleccionados().equals("[]")) {
                    existingSelectedDays = mapper.readValue(existingAssignment.getDiasSeleccionados(), new TypeReference<List<String>>() {});
                }
            } catch (Exception e) {}
            if (existingSelectedDays.isEmpty()) {
                try {
                    if (existingEvent.getHorarios() != null && !existingEvent.getHorarios().isEmpty()) {
                        List<Map<String, String>> hList = mapper.readValue(existingEvent.getHorarios(), new TypeReference<List<Map<String, String>>>() {});
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

            for (String newDay : newSelectedDays) {
                if (existingSelectedDays.contains(newDay)) {
                    // Buscar horario específico del día en conflicto
                    LocalTime existingStart = existingEvent.getHoraInicio();
                    LocalTime existingEnd = existingEvent.getHoraFin();

                    try {
                        if (existingEvent.getHorarios() != null) {
                            List<Map<String, String>> hList = mapper.readValue(
                                    existingEvent.getHorarios(),
                                    new TypeReference<List<Map<String, String>>>() {}
                            );
                            for (Map<String, String> h : hList) {
                                if (newDay.equals(h.get("fecha"))) {
                                    existingStart = LocalTime.parse(h.get("inicio"));
                                    existingEnd = LocalTime.parse(h.get("fin"));
                                    break;
                                }
                            }
                        }
                    } catch (Exception e) {}

                    LocalTime newStart = event.getHoraInicio();
                    LocalTime newEnd = event.getHoraFin();

                    if (existingStart != null && existingEnd != null && newStart != null && newEnd != null) {
                        if (newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart)) {
                            throw new IllegalArgumentException("Conflicto el día " + newDay + ": " + user.getNombre() +
                                    " ya está asignado a '" + existingEvent.getNombre() +
                                    "' de " + existingStart + " a " + existingEnd +
                                    ". No se puede traslapar con el horario de este evento (" + newStart + " - " + newEnd + ").");
                        }
                    }
                }
            }
        }
    }
}
