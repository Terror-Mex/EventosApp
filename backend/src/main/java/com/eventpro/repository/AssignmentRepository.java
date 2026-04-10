package com.eventpro.repository;

import com.eventpro.model.Assignment;
import com.eventpro.model.Event;
import com.eventpro.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findByUser(User user);
    List<Assignment> findByEvent(Event event);
    Optional<Assignment> findByUserAndEvent(User user, Event event);
    void deleteByEventId(Long id);
    Long countByUser(User user);
}

