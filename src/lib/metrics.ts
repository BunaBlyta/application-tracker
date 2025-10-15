import { ACTIVE_STATUSES, type ApplicationStatus } from "@/lib/constants";

export type ApplicationMetricInput = {
  status: ApplicationStatus;
  followUpDate: Date | string | null;
};

export type DashboardMetrics = {
  total: number;
  active: number;
  interviews: number;
  offers: number;
  upcomingFollowUps: number;
  rejectionRate: number;
};

const toDate = (value: Date | string | null) => {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
};

export function computeDashboardMetrics(
  applications: ApplicationMetricInput[],
  referenceDate = new Date(),
): DashboardMetrics {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setHours(23, 59, 59, 999);

  const total = applications.length;
  const rejected = applications.filter((application) => application.status === "REJECTED").length;

  return {
    total,
    active: applications.filter((application) =>
      ACTIVE_STATUSES.includes(application.status as (typeof ACTIVE_STATUSES)[number]),
    ).length,
    interviews: applications.filter((application) => application.status === "INTERVIEW").length,
    offers: applications.filter((application) => application.status === "OFFER").length,
    upcomingFollowUps: applications.filter((application) => {
      if (application.status === "REJECTED") {
        return false;
      }

      const followUpDate = toDate(application.followUpDate);
      return Boolean(followUpDate && followUpDate >= start && followUpDate <= end);
    }).length,
    rejectionRate: total === 0 ? 0 : Math.round((rejected / total) * 100),
  };
}
