package com.eventpro.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "events")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;

    private String numeroEvento;

    @Column(nullable = false)
    private LocalDate fechaInicio;

    @Column(nullable = false)
    private LocalDate fechaFin;

    @Column(nullable = false)
    private LocalTime horaLlegada;

    @Column(nullable = false)
    private LocalTime horaInicio;

    @Column(nullable = false)
    private LocalTime horaFin;

    @Column(columnDefinition = "TEXT")
    private String horarios; // JSON de horarios por día: [{fecha: '2023-10-10', llegada: '08:00', inicio: '09:00', fin: '18:00'}]

    @Column(nullable = false)
    private String ubicacion;

    private Double latitud;
    private Double longitud;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    private String cabina; // Media cabina, cabina completa
    private Integer cantCabina;
    private String receptores; // normales, luminosos, bodys
    private Integer cantReceptores;
    
    @Column(columnDefinition = "TEXT")
    private String equipoExtras;

    private String archivoAdjunto;

    @Column(nullable = false)
    private String estado = "PENDIENTE";
}
