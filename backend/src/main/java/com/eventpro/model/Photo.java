package com.eventpro.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "photos")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Photo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String rutaArchivo;

    @Column(nullable = false)
    private String nombreOriginal;

    @Column(nullable = false)
    private String tipo; // CHECKIN_ENTRADA, CHECKIN_SALIDA, REPORTE

    @Column(nullable = false)
    private LocalDateTime fechaSubida = LocalDateTime.now();
}
