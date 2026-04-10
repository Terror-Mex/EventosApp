package com.eventpro.dto.response;

public record DashboardWorkerResponse(
    Long assignmentsCount,
    Long checkinsCount
) {
    public static DashboardWorkerResponse from(Long assignmentsCount, Long checkinsCount) {
        return new DashboardWorkerResponse(assignmentsCount, checkinsCount);
    }
}
