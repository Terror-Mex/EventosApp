package com.eventpro.service;

import com.eventpro.dto.response.ReportResponse;
import com.eventpro.model.Event;
import com.eventpro.model.Photo;
import com.eventpro.model.Report;
import com.eventpro.model.User;
import com.eventpro.repository.EventRepository;
import com.eventpro.repository.ReportRepository;
import com.eventpro.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final EventRepository eventRepository;
    private final FileStorageService fileStorageService;
    private final UserRepository userRepository;
    private final FcmService fcmService;

    public List<ReportResponse> getAllReports() {
        return reportRepository.findAllByOrderByFechaCreacionDesc().stream()
                .map(ReportResponse::from)
                .collect(Collectors.toList());
    }

    public Long countReports() {
        return reportRepository.count();
    }

    public List<ReportResponse> getReportsForWorker(User user) {
        return reportRepository.findByEventAssignedToUserOrderByFechaCreacionDesc(user).stream()
                .map(ReportResponse::from)
                .collect(Collectors.toList());
    }

    public ReportResponse createReport(Long eventId, String contenido, MultipartFile[] photos, User user) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Evento no encontrado con ID: " + eventId));

        Report report = new Report(user, event, contenido);

        if (photos != null) {
            if (photos.length > 3) {
                throw new IllegalArgumentException("Se permiten máximo 3 fotos por reporte");
            }
            for (MultipartFile file : photos) {
                if (!file.isEmpty()) {
                    String fileUrl = fileStorageService.storeFile(file);
                    Photo photo = new Photo(null, fileUrl, file.getOriginalFilename(), "REPORTE", LocalDateTime.now());
                    report.getFotos().add(photo);
                }
            }
        }

        Report saved = reportRepository.save(report);
        notifyAdmins("Nuevo Reporte Creado", user.getNombre() + " envió un reporte para el evento: " + event.getNombre());
        return ReportResponse.from(saved);
    }

    private void notifyAdmins(String title, String body) {
        List<User> admins = userRepository.findByRol("ADMIN");
        for (User admin : admins) {
            if (admin.getFcmToken() != null && !admin.getFcmToken().isEmpty()) {
                fcmService.sendPushNotification(
                        admin.getFcmToken(),
                        title,
                        body,
                        "/admin/reports"
                );
            }
        }
    }
}
