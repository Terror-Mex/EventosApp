package com.eventpro.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.ZoneId;

@Entity
@Table(name = "checkins")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CheckIn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    private LocalDate fecha;

    private LocalDateTime horaEntrada;
    private LocalDateTime horaMontaje;
    private LocalDateTime horaSalida;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "foto_entrada_id")
    private Photo fotoEntrada;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "foto_montaje_id")
    private Photo fotoMontaje;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "foto_salida_id")
    private Photo fotoSalida;

    public CheckIn(User user, Event event) {
        this.user = user;
        this.event = event;
        this.fecha = LocalDate.now(ZoneId.of("America/Mexico_City"));
    }
}
