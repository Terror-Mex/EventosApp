package com.eventpro.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

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
    private Double pagoAsignado;
    private Integer diasAsignados;
    private Double pagoExtras;

    @Column(columnDefinition = "TEXT")
    private String diasSeleccionados; // JSON array of dates: ["2026-03-10","2026-03-12"]
}
