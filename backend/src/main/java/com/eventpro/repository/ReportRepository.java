package com.eventpro.repository;

import com.eventpro.model.Event;
import com.eventpro.model.Report;
import com.eventpro.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {
    List<Report> findByUserOrderByFechaCreacionDesc(User user);
    List<Report> findByUser(User user);
    List<Report> findByEvent(Event event);
    List<Report> findAllByOrderByFechaCreacionDesc();
}
