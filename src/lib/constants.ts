export const APPLICATION_STATUSES = [
  "SAVED",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
] as const;

export const APPLICATION_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

export const WORK_MODES = ["REMOTE", "HYBRID", "ONSITE"] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type ApplicationPriority = (typeof APPLICATION_PRIORITIES)[number];
export type WorkMode = (typeof WORK_MODES)[number];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

export const PRIORITY_LABELS: Record<ApplicationPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site",
};

export const ACTIVE_STATUSES = ["SAVED", "APPLIED", "SCREENING", "INTERVIEW"] as const;
