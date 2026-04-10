package com.eventpro.service;

import com.eventpro.dto.response.DashboardWorkerResponse;
import com.eventpro.model.User;
import com.eventpro.repository.AssignmentRepository;
import com.eventpro.repository.CheckInRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final AssignmentRepository assignmentRepository;
    private final CheckInRepository checkInRepository;

    public DashboardWorkerResponse getWorkerDashboard(User user) {
        return new DashboardWorkerResponse(
                assignmentRepository.countByUser(user),
                checkInRepository.countByUser(user)
        );
    }
}
