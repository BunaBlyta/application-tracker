import { describe, expect, it } from "vitest";
import { computeDashboardMetrics } from "@/lib/metrics";

describe("computeDashboardMetrics", () => {
  it("calculates pipeline totals and upcoming follow-ups", () => {
    const metrics = computeDashboardMetrics(
      [
        { status: "SAVED", followUpDate: "2026-07-01T09:00:00.000Z" },
        { status: "INTERVIEW", followUpDate: "2026-07-05T09:00:00.000Z" },
        { status: "OFFER", followUpDate: "2026-07-03T09:00:00.000Z" },
        { status: "REJECTED", followUpDate: "2026-07-02T09:00:00.000Z" },
      ],
      new Date("2026-07-01T12:00:00.000Z"),
    );

    expect(metrics).toEqual({
      total: 4,
      active: 2,
      interviews: 1,
      offers: 1,
      upcomingFollowUps: 3,
      rejectionRate: 25,
    });
  });

  it("handles an empty pipeline", () => {
    expect(computeDashboardMetrics([], new Date("2026-07-01"))).toEqual({
      total: 0,
      active: 0,
      interviews: 0,
      offers: 0,
      upcomingFollowUps: 0,
      rejectionRate: 0,
    });
  });
});
