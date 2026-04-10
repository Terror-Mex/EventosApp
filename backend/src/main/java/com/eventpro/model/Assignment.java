package com.eventpro.model;

import com.eventpro.dto.request.AssignmentRequest;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Entity
@Table(name = "assignments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Assignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    private String rolAsignado;
    private String horaLlegada; // Custom override
    private Double pagoAsignado;
    private Boolean pagado = false;
    private Integer diasAsignados;
    private Double pagoExtras;

    @Column(columnDefinition = "TEXT")
    private String diasSeleccionados; // JSON array of dates: ["2026-03-10","2026-03-12"]

    @Column(columnDefinition = "TEXT")
    private String llegadasPorDia; // JSON map of date->time: {"2026-03-10":"07:00","2026-03-12":"08:00"}

    public Assignment(AssignmentRequest request, User user, Event event, List<String> selectedDays) {
        this.user = user;
        this.event = event;
        this.rolAsignado = request.rolAsignado() != null ? request.rolAsignado() : "Técnico";
        this.horaLlegada = request.horaLlegada();
        this.pagoAsignado = request.pagoAsignado() != null ? request.pagoAsignado() : 0.0;
        this.diasAsignados = !selectedDays.isEmpty() ? selectedDays.size() : (request.diasAsignados() != null ? request.diasAsignados() : 1);
        this.pagoExtras = request.pagoExtras() != null ? request.pagoExtras() : 0.0;
        this.llegadasPorDia = request.llegadasPorDia();
        try {
            this.diasSeleccionados = new ObjectMapper().writeValueAsString(selectedDays);
        } catch (JsonProcessingException e) {
            this.diasSeleccionados = request.diasSeleccionados();
        }
    }
}
