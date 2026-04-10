package com.eventpro.repository;

import com.eventpro.model.Event;
import com.eventpro.model.Report;
import com.eventpro.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {
    List<Report> findByUserOrderByFechaCreacionDesc(User user);
    List<Report> findByUser(User user);
    List<Report> findByEvent(Event event);
    List<Report> findAllByOrderByFechaCreacionDesc();
    void deleteByEvent(Event event);

    @Query("SELECT r FROM Report r WHERE r.event IN (SELECT a.event FROM Assignment a WHERE a.user = :user) ORDER BY r.fechaCreacion DESC")
    List<Report> findByEventAssignedToUserOrderByFechaCreacionDesc(@Param("user") User user);
}
