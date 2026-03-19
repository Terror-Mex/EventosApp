package com.eventpro.repository;

import com.eventpro.model.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findByFechaInicioGreaterThanEqualOrderByFechaInicioAsc(LocalDate date);
}
