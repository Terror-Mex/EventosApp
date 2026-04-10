package com.eventpro.dto.response;

public record DashboardStatsResponse(
    Long totalStaff,
    Long totalEvents,
    Long totalReports
) {
    public static DashboardStatsResponse from(Long totalStaff, Long totalEvents, Long totalReports) {
        return new DashboardStatsResponse(totalStaff, totalEvents, totalReports);
    }
}
