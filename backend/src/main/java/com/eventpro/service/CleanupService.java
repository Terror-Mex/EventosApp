package com.eventpro.service;

import com.eventpro.model.*;
import com.eventpro.repository.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RequiredArgsConstructor
@Slf4j
@Service
public class CleanupService {

    private final EventRepository eventRepository;
    private final CheckInRepository checkInRepository;
    private final ReportRepository reportRepository;
    private final AssignmentRepository assignmentRepository;
    private final FileStorageService fileStorageService;

    // Ejecuta cada lunes a las 2:00 AM (borrado semanal)
    @Scheduled(cron = "0 0 2 ? * MON")
    @Transactional
    public void cleanupOldData() {
        log.info(">>> EJECUTANDO TAREA DE LIMPIEZA SEMANAL (Cloudinary + DB)...");
        LocalDate hoy = LocalDate.now();
        List<Event> eventos = eventRepository.findAll();

        for (Event event : eventos) {
            if (event.getFechaFin() == null) continue;

            long diasPasados = ChronoUnit.DAYS.between(event.getFechaFin(), hoy);

            // PASO 1: A los 7 días (1 semana), borrar reportes, fotos de asistencia y archivos pesados
            if (diasPasados >= 7) {
                // Borrar Check-Ins y sus fotos
                List<CheckIn> checkins = checkInRepository.findByEvent(event);
                for (CheckIn c : checkins) {
                    if (c.getFotoEntrada() != null) fileStorageService.deleteFile(c.getFotoEntrada().getRutaArchivo());
                    if (c.getFotoMontaje() != null) fileStorageService.deleteFile(c.getFotoMontaje().getRutaArchivo());
                    if (c.getFotoSalida() != null) fileStorageService.deleteFile(c.getFotoSalida().getRutaArchivo());
                    checkInRepository.delete(c);
                }

                // Borrar Reportes y sus fotos
                List<Report> reportes = reportRepository.findByEvent(event);
                for (Report r : reportes) {
                    if (r.getFotos() != null) {
                        for (Photo p : r.getFotos()) {
                            fileStorageService.deleteFile(p.getRutaArchivo());
                        }
                    }
                    reportRepository.delete(r);
                }

                // Borrar archivo adjunto del evento para liberar espacio también
                if (event.getArchivoAdjunto() != null && !event.getArchivoAdjunto().isEmpty()) {
                    fileStorageService.deleteFile(event.getArchivoAdjunto());
                    event.setArchivoAdjunto(null);
                    eventRepository.save(event);
                }
            }

            // PASO 2: A los 60 días (2 meses), borrar el Evento y por ende las Asignaciones (Pagos)
            if (diasPasados >= 60) {
                // Borrar asignaciones (pagos del evento)
                List<Assignment> asignaciones = assignmentRepository.findByEvent(event);
                for (Assignment a : asignaciones) {
                    assignmentRepository.delete(a);
                }

                // Finalmente borrar el evento
                eventRepository.delete(event);
                log.info(">> EVENTO PASADO {} {}", event.getNumeroEvento() ," ELIMINADO POR ANTIGUEDAD (+60 DIAS)");
            }
        }
        log.info(">>> TAREA DE LIMPIEZA COMPLETADA.");
    }

    // Ejecuta cada 5 minutos
    @Scheduled(fixedRate = 300000)
    @Transactional
    public void updateEventStatuses() {
        List<Event> eventos = eventRepository.findAll();
        java.time.ZoneId zone = java.time.ZoneId.of("America/Mexico_City");
        java.time.LocalDateTime now = java.time.LocalDateTime.now(zone);
        
        for (Event event : eventos) {
            if ("CANCELADO".equals(event.getEstado())) continue;
            
            String oldStatus = event.getEstado();
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

            if (event.getEstado() != null && !event.getEstado().equals(oldStatus)) {
                eventRepository.save(event);
            }
        }
    }
}
