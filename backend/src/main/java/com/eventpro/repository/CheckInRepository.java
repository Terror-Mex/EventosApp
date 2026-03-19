package com.eventpro.repository;

import com.eventpro.model.CheckIn;
import com.eventpro.model.Event;
import com.eventpro.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDate;

@Repository
public interface CheckInRepository extends JpaRepository<CheckIn, Long> {
    Optional<CheckIn> findByUserAndEventAndFecha(User user, Event event, LocalDate fecha);
    Optional<CheckIn> findByUserAndEvent(User user, Event event);
    List<CheckIn> findAllByUserAndEvent(User user, Event event);
    List<CheckIn> findByUser(User user);
    List<CheckIn> findByEvent(Event event);
}
