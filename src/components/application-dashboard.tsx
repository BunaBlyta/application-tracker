"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle,
  ChevronRight,
  Clock3,
  Edit,
  ExternalLink,
  FileText,
  Filter,
  LayoutDashboard,
  Loader2,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ZodError } from "zod";
import {
  APPLICATION_PRIORITIES,
  APPLICATION_STATUSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  WORK_MODE_LABELS,
  WORK_MODES,
  type ApplicationPriority,
  type ApplicationStatus,
  type WorkMode,
} from "@/lib/constants";
import {
  applicationCreateSchema,
  tailoringRequestSchema,
} from "@/lib/validation";

type ApiCompany = {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  location: string | null;
  notes: string | null;
  contacts?: ApiContact[];
  _count?: {
    applications: number;
  };
};

type ApiContact = {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  notes: string | null;
};

type ApiTimelineEvent = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  occurredAt: string;
};

type ApiTailoringResult = {
  id: string;
  source: "gemini" | "mock";
  cvBullets: string[];
  coverLetter: string;
  interviewNotes: string[];
  keywordSummary: string;
  rawJobDescription: string;
  createdAt: string;
  warning?: string;
};

type ApiApplication = {
  id: string;
  title: string;
  location: string | null;
  workMode: WorkMode;
  jobUrl: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  status: ApplicationStatus;
  priority: ApplicationPriority;
  deadline: string | null;
  followUpDate: string | null;
  notes: string | null;
  jobDescription: string | null;
  createdAt: string;
  updatedAt: string;
  company: ApiCompany;
  contact: ApiContact | null;
  timeline?: ApiTimelineEvent[];
  tailoringResults?: ApiTailoringResult[];
};

type DashboardMetrics = {
  total: number;
  active: number;
  interviews: number;
  offers: number;
  upcomingFollowUps: number;
  rejectionRate: number;
};

type FilterState = {
  q: string;
  status: string;
  priority: string;
  company: string;
  role: string;
  dateFrom: string;
  dateTo: string;
};

type ApplicationFormDraft = {
  companyName: string;
  title: string;
  location: string;
  workMode: WorkMode;
  jobUrl: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  status: ApplicationStatus;
  priority: ApplicationPriority;
  deadline: string;
  followUpDate: string;
  notes: string;
  jobDescription: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
};

const emptyFilters: FilterState = {
  q: "",
  status: "",
  priority: "",
  company: "",
  role: "",
  dateFrom: "",
  dateTo: "",
};

const emptyDraft = (): ApplicationFormDraft => ({
  companyName: "",
  title: "",
  location: "",
  workMode: "REMOTE",
  jobUrl: "",
  salaryMin: "",
  salaryMax: "",
  salaryCurrency: "USD",
  status: "SAVED",
  priority: "MEDIUM",
  deadline: "",
  followUpDate: "",
  notes: "",
  jobDescription: "",
  contactName: "",
  contactTitle: "",
  contactEmail: "",
});

const statusStyles: Record<ApplicationStatus, string> = {
  SAVED: "border-stone-300 bg-stone-100 text-stone-700",
  APPLIED: "border-sky-200 bg-sky-50 text-sky-700",
  SCREENING: "border-cyan-200 bg-cyan-50 text-cyan-700",
  INTERVIEW: "border-amber-200 bg-amber-50 text-amber-800",
  OFFER: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
};

const priorityStyles: Record<ApplicationPriority, string> = {
  LOW: "border-stone-300 bg-white text-stone-600",
  MEDIUM: "border-blue-200 bg-blue-50 text-blue-700",
  HIGH: "border-red-200 bg-red-50 text-red-700",
};

const EMPTY_APPLICATIONS: ApiApplication[] = [];
const EMPTY_COMPANIES: ApiCompany[] = [];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function buildApplicationsUrl(filters: FilterState) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `/api/applications?${query}` : "/api/applications";
}

function toDateInput(value: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function draftFromApplication(application: ApiApplication): ApplicationFormDraft {
  return {
    companyName: application.company.name,
    title: application.title,
    location: application.location ?? "",
    workMode: application.workMode,
    jobUrl: application.jobUrl ?? "",
    salaryMin: application.salaryMin?.toString() ?? "",
    salaryMax: application.salaryMax?.toString() ?? "",
    salaryCurrency: application.salaryCurrency,
    status: application.status,
    priority: application.priority,
    deadline: toDateInput(application.deadline),
    followUpDate: toDateInput(application.followUpDate),
    notes: application.notes ?? "",
    jobDescription: application.jobDescription ?? "",
    contactName: application.contact?.name ?? "",
    contactTitle: application.contact?.title ?? "",
    contactEmail: application.contact?.email ?? "",
  };
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatCompactDate(value: string | null) {
  if (!value) {
    return "None";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatSalary(application: ApiApplication) {
  if (application.salaryMin == null && application.salaryMax == null) {
    return "Not listed";
  }

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: application.salaryCurrency,
    maximumFractionDigits: 0,
  });

  if (application.salaryMin != null && application.salaryMax != null) {
    return `${formatter.format(application.salaryMin)} - ${formatter.format(application.salaryMax)}`;
  }

  if (application.salaryMin != null) {
    return `${formatter.format(application.salaryMin)}+`;
  }

  return `Up to ${formatter.format(application.salaryMax ?? 0)}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Validation failed.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        statusStyles[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: ApplicationPriority }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        priorityStyles[priority],
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-stone-500">{label}</p>
        <span className={cx("flex h-9 w-9 items-center justify-center rounded-md", tone)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-normal text-stone-950">{value}</p>
    </section>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3" aria-label="Loading applications">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-lg border border-stone-200 bg-stone-100"
        />
      ))}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
        <Briefcase className="h-5 w-5" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-stone-950">No applications found</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
        Add an application or clear the filters to restore the full pipeline.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        New application
      </button>
    </div>
  );
}

export function ApplicationDashboard() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formDraft, setFormDraft] = useState<ApplicationFormDraft>(emptyDraft);
  const [editingApplication, setEditingApplication] = useState<ApiApplication | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const dashboardQuery = useQuery<{ metrics: DashboardMetrics }>({
    queryKey: ["dashboard"],
    queryFn: () => fetchJson("/api/dashboard"),
  });

  const applicationsQuery = useQuery<{ applications: ApiApplication[] }>({
    queryKey: ["applications", filters],
    queryFn: () => fetchJson(buildApplicationsUrl(filters)),
  });

  const companiesQuery = useQuery<{ companies: ApiCompany[] }>({
    queryKey: ["companies"],
    queryFn: () => fetchJson("/api/companies"),
  });

  const applications = applicationsQuery.data?.applications ?? EMPTY_APPLICATIONS;
  const selectedApplicationId =
    selectedId && applications.some((application) => application.id === selectedId)
      ? selectedId
      : applications[0]?.id ?? null;

  const detailQuery = useQuery<{ application: ApiApplication }>({
    queryKey: ["application", selectedApplicationId],
    enabled: Boolean(selectedApplicationId),
    queryFn: () => fetchJson(`/api/applications/${selectedApplicationId}`),
  });

  const metrics = dashboardQuery.data?.metrics;
  const detailApplication = detailQuery.data?.application;
  const activeApplication =
    detailApplication ??
    applications.find((application) => application.id === selectedApplicationId) ??
    null;

  const statusCounts = useMemo(() => {
    return applications.reduce<Record<ApplicationStatus, number>>(
      (counts, application) => {
        counts[application.status] += 1;
        return counts;
      },
      {
        SAVED: 0,
        APPLIED: 0,
        SCREENING: 0,
        INTERVIEW: 0,
        OFFER: 0,
        REJECTED: 0,
      },
    );
  }, [applications]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => {
      setNotice(null);
    }, 3600);
  };

  const invalidateApplicationData = async (id?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["applications"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["companies"] }),
      id ? queryClient.invalidateQueries({ queryKey: ["application", id] }) : Promise.resolve(),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: (input: unknown) =>
      fetchJson<{ application: ApiApplication }>("/api/applications", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: async ({ application }) => {
      setSelectedId(application.id);
      setIsFormOpen(false);
      setEditingApplication(null);
      await invalidateApplicationData(application.id);
      showNotice("Application created.");
    },
    onError: (error) => setFormError(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: unknown }) =>
      fetchJson<{ application: ApiApplication }>(`/api/applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: async ({ application }) => {
      setSelectedId(application.id);
      setIsFormOpen(false);
      setEditingApplication(null);
      await invalidateApplicationData(application.id);
      showNotice("Application updated.");
    },
    onError: (error) => setFormError(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ ok: true }>(`/api/applications/${id}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      setSelectedId(null);
      await invalidateApplicationData();
      showNotice("Application deleted.");
    },
  });

  const openCreateForm = () => {
    setEditingApplication(null);
    setFormDraft(emptyDraft());
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (application: ApiApplication) => {
    setEditingApplication(application);
    setFormDraft(draftFromApplication(application));
    setFormError(null);
    setIsFormOpen(true);
  };

  const submitApplicationForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    try {
      const payload = applicationCreateSchema.parse(formDraft);

      if (editingApplication) {
        updateMutation.mutate({ id: editingApplication.id, input: payload });
      } else {
        createMutation.mutate(payload);
      }
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const deleteApplication = (application: ApiApplication) => {
    const confirmed = window.confirm(
      `Delete ${application.title} at ${application.company.name}?`,
    );

    if (confirmed) {
      deleteMutation.mutate(application.id);
    }
  };

  const mutationBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-stone-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-stone-200 bg-white px-4 py-5 lg:block">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-950 text-white">
              <Briefcase className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-950">CareerOS</p>
              <p className="text-xs text-stone-500">Application tracker</p>
            </div>
          </div>

          <nav aria-label="Primary" className="mt-8 space-y-1">
            <a
              href="#dashboard"
              className="flex items-center gap-3 rounded-md bg-stone-100 px-3 py-2 text-sm font-semibold text-stone-950"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </a>
            <a
              href="#applications"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-950"
            >
              <Briefcase className="h-4 w-4" aria-hidden="true" />
              Applications
            </a>
            <a
              href="#tailoring"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-950"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              AI Tailoring
            </a>
          </nav>

          <div className="mt-8 rounded-lg border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-normal text-stone-500">
              Mock session
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <UserRound className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-stone-950">Alex Rivera</p>
                <p className="text-xs text-stone-500">alex.rivera@example.com</p>
              </div>
            </div>
          </div>
        </aside>

        <main id="dashboard" className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 px-4 py-4 backdrop-blur md:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-stone-500 lg:hidden">
                  <Briefcase className="h-4 w-4" aria-hidden="true" />
                  CareerOS
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal text-stone-950">
                  Job Application Tracker
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {notice ? (
                  <div
                    role="status"
                    className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
                  >
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    {notice}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="inline-flex items-center gap-2 rounded-md bg-stone-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-stone-800"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New application
                </button>
              </div>
            </div>
          </header>

          <div className="space-y-6 p-4 md:p-6 lg:p-8">
            <section
              aria-label="Application metrics"
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"
            >
              <MetricCard
                label="Total"
                value={metrics?.total ?? "-"}
                icon={Briefcase}
                tone="bg-stone-100 text-stone-700"
              />
              <MetricCard
                label="Active"
                value={metrics?.active ?? "-"}
                icon={Clock3}
                tone="bg-cyan-50 text-cyan-700"
              />
              <MetricCard
                label="Interviews"
                value={metrics?.interviews ?? "-"}
                icon={CalendarClock}
                tone="bg-amber-50 text-amber-700"
              />
              <MetricCard
                label="Offers"
                value={metrics?.offers ?? "-"}
                icon={CheckCircle}
                tone="bg-emerald-50 text-emerald-700"
              />
              <MetricCard
                label="Follow-ups"
                value={metrics?.upcomingFollowUps ?? "-"}
                icon={CalendarClock}
                tone="bg-blue-50 text-blue-700"
              />
              <MetricCard
                label="Rejection rate"
                value={metrics ? `${metrics.rejectionRate}%` : "-"}
                icon={FileText}
                tone="bg-rose-50 text-rose-700"
              />
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <section id="applications" className="min-w-0 space-y-4">
                <div className="rounded-lg border border-stone-200 bg-white shadow-sm">
                  <div className="border-b border-stone-200 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h2 className="text-base font-semibold text-stone-950">
                          Application pipeline
                        </h2>
                        <p className="mt-1 text-sm text-stone-500">
                          {applications.length} visible across the current filters
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {APPLICATION_STATUSES.map((status) => (
                          <button
                            type="button"
                            key={status}
                            onClick={() =>
                              setFilters((current) => ({
                                ...current,
                                status: current.status === status ? "" : status,
                              }))
                            }
                            className={cx(
                              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
                              filters.status === status
                                ? statusStyles[status]
                                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50",
                            )}
                          >
                            {STATUS_LABELS[status]}
                            <span>{statusCounts[status]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <form
                    className="grid gap-3 border-b border-stone-200 p-4 md:grid-cols-2 xl:grid-cols-6"
                    onSubmit={(event) => event.preventDefault()}
                    aria-label="Application filters"
                  >
                    <label className="xl:col-span-2">
                      <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-stone-600">
                        <Search className="h-3.5 w-3.5" aria-hidden="true" />
                        Search
                      </span>
                      <input
                        value={filters.q}
                        onChange={(event) =>
                          setFilters((current) => ({ ...current, q: event.target.value }))
                        }
                        placeholder="Company, role, notes"
                        className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-200"
                      />
                    </label>
                    <label>
                      <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-stone-600">
                        <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                        Status
                      </span>
                      <select
                        value={filters.status}
                        onChange={(event) =>
                          setFilters((current) => ({ ...current, status: event.target.value }))
                        }
                        className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-200"
                      >
                        <option value="">All</option>
                        {APPLICATION_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="mb-1.5 block text-xs font-semibold text-stone-600">
                        Priority
                      </span>
                      <select
                        value={filters.priority}
                        onChange={(event) =>
                          setFilters((current) => ({ ...current, priority: event.target.value }))
                        }
                        className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-200"
                      >
                        <option value="">All</option>
                        {APPLICATION_PRIORITIES.map((priority) => (
                          <option key={priority} value={priority}>
                            {PRIORITY_LABELS[priority]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="mb-1.5 block text-xs font-semibold text-stone-600">
                        Company
                      </span>
                      <input
                        value={filters.company}
                        onChange={(event) =>
                          setFilters((current) => ({
                            ...current,
                            company: event.target.value,
                          }))
                        }
                        list="company-filter-options"
                        className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-200"
                      />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-xs font-semibold text-stone-600">
                        Role
                      </span>
                      <input
                        value={filters.role}
                        onChange={(event) =>
                          setFilters((current) => ({ ...current, role: event.target.value }))
                        }
                        className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-200"
                      />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-xs font-semibold text-stone-600">
                        From
                      </span>
                      <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(event) =>
                          setFilters((current) => ({ ...current, dateFrom: event.target.value }))
                        }
                        className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-200"
                      />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-xs font-semibold text-stone-600">
                        To
                      </span>
                      <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(event) =>
                          setFilters((current) => ({ ...current, dateTo: event.target.value }))
                        }
                        className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-200"
                      />
                    </label>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => setFilters(emptyFilters)}
                        className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                      >
                        Clear
                      </button>
                    </div>
                  </form>

                  <datalist id="company-filter-options">
                    {(companiesQuery.data?.companies ?? []).map((company) => (
                      <option key={company.id} value={company.name} />
                    ))}
                  </datalist>

                  <div className="p-4">
                    {applicationsQuery.isLoading ? <LoadingRows /> : null}

                    {applicationsQuery.isError ? (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                        {getErrorMessage(applicationsQuery.error)}
                      </div>
                    ) : null}

                    {applicationsQuery.isSuccess && applications.length === 0 ? (
                      <EmptyState onCreate={openCreateForm} />
                    ) : null}

                    {applications.length > 0 ? (
                      <div className="overflow-hidden rounded-lg border border-stone-200">
                        <div className="hidden grid-cols-[1.5fr_1fr_140px_120px_120px_84px] gap-4 border-b border-stone-200 bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-normal text-stone-500 lg:grid">
                          <span>Role</span>
                          <span>Company</span>
                          <span>Status</span>
                          <span>Priority</span>
                          <span>Follow-up</span>
                          <span className="text-right">Actions</span>
                        </div>
                        <ul className="divide-y divide-stone-200">
                          {applications.map((application) => (
                            <li key={application.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedId(application.id)}
                                className={cx(
                                  "grid w-full gap-3 px-4 py-4 text-left hover:bg-stone-50 lg:grid-cols-[1.5fr_1fr_140px_120px_120px_84px] lg:items-center lg:gap-4",
                                  selectedApplicationId === application.id &&
                                    "bg-cyan-50/60 hover:bg-cyan-50",
                                )}
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-semibold text-stone-950">
                                    {application.title}
                                  </span>
                                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                                    <span>{application.location ?? "Location not set"}</span>
                                    <span>{WORK_MODE_LABELS[application.workMode]}</span>
                                    <span>{formatSalary(application)}</span>
                                  </span>
                                </span>
                                <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-stone-700">
                                  <Building2 className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
                                  <span className="truncate">{application.company.name}</span>
                                </span>
                                <span>
                                  <StatusBadge status={application.status} />
                                </span>
                                <span>
                                  <PriorityBadge priority={application.priority} />
                                </span>
                                <span className="text-sm text-stone-600">
                                  {formatCompactDate(application.followUpDate)}
                                </span>
                                <span className="flex justify-start gap-1 lg:justify-end">
                                  <button
                                    type="button"
                                    title="Edit application"
                                    aria-label={`Edit ${application.title}`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openEditForm(application);
                                    }}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-100"
                                  >
                                    <Edit className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Delete application"
                                    aria-label={`Delete ${application.title}`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      deleteApplication(application);
                                    }}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 bg-white text-rose-600 hover:bg-rose-50"
                                  >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              <aside className="min-w-0 space-y-4 xl:sticky xl:top-24 xl:self-start">
                <section className="rounded-lg border border-stone-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-stone-200 p-4">
                    <h2 className="text-base font-semibold text-stone-950">Application detail</h2>
                    {activeApplication ? (
                      <StatusBadge status={activeApplication.status} />
                    ) : null}
                  </div>

                  {detailQuery.isFetching && selectedApplicationId ? (
                    <div className="p-4 text-sm text-stone-500">Loading detail...</div>
                  ) : null}

                  {!activeApplication ? (
                    <div className="p-6 text-sm leading-6 text-stone-600">
                      Select an application to view notes, timeline, contacts, and tailoring.
                    </div>
                  ) : (
                    <div className="space-y-5 p-4">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-semibold text-stone-950">
                              {activeApplication.title}
                            </h3>
                            <p className="mt-1 text-sm text-stone-600">
                              {activeApplication.company.name}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openEditForm(activeApplication)}
                            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                          >
                            <Edit className="h-4 w-4" aria-hidden="true" />
                            Edit
                          </button>
                        </div>

                        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-md bg-stone-50 p-3">
                            <dt className="text-xs font-semibold text-stone-500">Location</dt>
                            <dd className="mt-1 text-stone-900">
                              {activeApplication.location ?? "Not set"}
                            </dd>
                          </div>
                          <div className="rounded-md bg-stone-50 p-3">
                            <dt className="text-xs font-semibold text-stone-500">Work mode</dt>
                            <dd className="mt-1 text-stone-900">
                              {WORK_MODE_LABELS[activeApplication.workMode]}
                            </dd>
                          </div>
                          <div className="rounded-md bg-stone-50 p-3">
                            <dt className="text-xs font-semibold text-stone-500">Salary</dt>
                            <dd className="mt-1 text-stone-900">
                              {formatSalary(activeApplication)}
                            </dd>
                          </div>
                          <div className="rounded-md bg-stone-50 p-3">
                            <dt className="text-xs font-semibold text-stone-500">Follow-up</dt>
                            <dd className="mt-1 text-stone-900">
                              {formatDate(activeApplication.followUpDate)}
                            </dd>
                          </div>
                        </dl>

                        {activeApplication.jobUrl ? (
                          <a
                            href={activeApplication.jobUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-900"
                          >
                            <ExternalLink className="h-4 w-4" aria-hidden="true" />
                            Open job posting
                          </a>
                        ) : null}
                      </div>

                      <section>
                        <h3 className="text-sm font-semibold text-stone-950">Notes</h3>
                        <p className="mt-2 rounded-md bg-stone-50 p-3 text-sm leading-6 text-stone-700">
                          {activeApplication.notes || "No notes yet."}
                        </p>
                      </section>

                      <section>
                        <h3 className="text-sm font-semibold text-stone-950">Contact</h3>
                        <div className="mt-2 rounded-md bg-stone-50 p-3 text-sm text-stone-700">
                          {activeApplication.contact ? (
                            <div>
                              <p className="font-semibold text-stone-950">
                                {activeApplication.contact.name}
                              </p>
                              <p className="mt-1">{activeApplication.contact.title ?? "Title not set"}</p>
                              <p className="mt-1">{activeApplication.contact.email ?? "Email not set"}</p>
                            </div>
                          ) : (
                            "No contact saved."
                          )}
                        </div>
                      </section>

                      <section>
                        <h3 className="text-sm font-semibold text-stone-950">Timeline</h3>
                        <ol className="mt-3 space-y-3">
                          {(activeApplication.timeline ?? []).length > 0 ? (
                            (activeApplication.timeline ?? []).map((event) => (
                              <li key={event.id} className="flex gap-3">
                                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
                                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-sm font-semibold text-stone-950">
                                    {event.title}
                                  </span>
                                  <span className="block text-xs text-stone-500">
                                    {formatDate(event.occurredAt)}
                                  </span>
                                  {event.body ? (
                                    <span className="mt-1 block text-sm leading-6 text-stone-600">
                                      {event.body}
                                    </span>
                                  ) : null}
                                </span>
                              </li>
                            ))
                          ) : (
                            <li className="text-sm text-stone-600">No timeline events yet.</li>
                          )}
                        </ol>
                      </section>
                    </div>
                  )}
                </section>

                <TailoringPanel
                  key={activeApplication?.id ?? "empty-tailoring"}
                  activeApplication={activeApplication}
                  onNotice={showNotice}
                />
              </aside>
            </div>
          </div>
        </main>
      </div>

      {isFormOpen ? (
        <ApplicationFormModal
          draft={formDraft}
          editing={Boolean(editingApplication)}
          error={formError}
          isBusy={mutationBusy}
          companies={companiesQuery.data?.companies ?? EMPTY_COMPANIES}
          onChange={setFormDraft}
          onClose={() => {
            setIsFormOpen(false);
            setEditingApplication(null);
            setFormError(null);
          }}
          onSubmit={submitApplicationForm}
        />
      ) : null}
    </div>
  );
}

function TailoringSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h4 className="text-xs font-semibold uppercase tracking-normal text-stone-500">
        {title}
      </h4>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-md bg-stone-50 p-3 text-sm leading-6 text-stone-700"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function TailoringPanel({
  activeApplication,
  onNotice,
}: {
  activeApplication: ApiApplication | null;
  onNotice: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [tailoringText, setTailoringText] = useState(
    activeApplication?.jobDescription ?? "",
  );
  const [resumeContext, setResumeContext] = useState("");
  const [tailoringResult, setTailoringResult] = useState<ApiTailoringResult | null>(
    activeApplication?.tailoringResults?.[0] ?? null,
  );
  const [tailoringError, setTailoringError] = useState<string | null>(null);

  const tailorMutation = useMutation({
    mutationFn: (input: unknown) =>
      fetchJson<{ result: ApiTailoringResult }>("/api/tailor", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: async ({ result }) => {
      setTailoringResult(result);
      setTailoringError(null);

      if (activeApplication) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["applications"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
          queryClient.invalidateQueries({ queryKey: ["application", activeApplication.id] }),
        ]);
      }

      onNotice(
        result.source === "gemini"
          ? "Gemini tailoring generated."
          : "Mock tailoring generated.",
      );
    },
    onError: (error) => setTailoringError(getErrorMessage(error)),
  });

  const submitTailoring = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeApplication) {
      return;
    }

    setTailoringError(null);

    try {
      const payload = tailoringRequestSchema.parse({
        jobDescription: tailoringText,
        applicationId: activeApplication.id,
        role: activeApplication.title,
        company: activeApplication.company.name,
        resumeContext,
      });

      tailorMutation.mutate(payload);
    } catch (error) {
      setTailoringError(getErrorMessage(error));
    }
  };

  return (
    <section id="tailoring" className="rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-700" aria-hidden="true" />
          <h2 className="text-base font-semibold text-stone-950">AI Tailoring</h2>
        </div>
      </div>

      {!activeApplication ? (
        <div className="p-4 text-sm leading-6 text-stone-600">
          Select an application to generate tailored material.
        </div>
      ) : (
        <div className="space-y-4 p-4">
          <form onSubmit={submitTailoring} className="space-y-3">
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-stone-600">
                Job description
              </span>
              <textarea
                value={tailoringText}
                onChange={(event) => setTailoringText(event.target.value)}
                rows={7}
                className="w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-200"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-stone-600">
                Resume context
              </span>
              <textarea
                value={resumeContext}
                onChange={(event) => setResumeContext(event.target.value)}
                rows={3}
                placeholder="Optional strengths, projects, or constraints"
                className="w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-200"
              />
            </label>
            {tailoringError ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {tailoringError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={tailorMutation.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {tailorMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              Generate tailoring
            </button>
          </form>

          {tailoringResult ? (
            <div className="space-y-4 border-t border-stone-200 pt-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-stone-950">
                  {tailoringResult.source === "gemini" ? "Gemini output" : "Mock output"}
                </h3>
                <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-600">
                  {tailoringResult.source}
                </span>
              </div>

              {tailoringResult.warning ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {tailoringResult.warning}
                </p>
              ) : null}

              <TailoringSection title="CV bullets" items={tailoringResult.cvBullets} />
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-normal text-stone-500">
                  Cover letter
                </h4>
                <p className="mt-2 rounded-md bg-stone-50 p-3 text-sm leading-6 text-stone-700">
                  {tailoringResult.coverLetter}
                </p>
              </section>
              <TailoringSection title="Interview notes" items={tailoringResult.interviewNotes} />
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-normal text-stone-500">
                  Keyword match
                </h4>
                <p className="mt-2 rounded-md bg-stone-50 p-3 text-sm leading-6 text-stone-700">
                  {tailoringResult.keywordSummary}
                </p>
              </section>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function ApplicationFormModal({
  draft,
  editing,
  error,
  isBusy,
  companies,
  onChange,
  onClose,
  onSubmit,
}: {
  draft: ApplicationFormDraft;
  editing: boolean;
  error: string | null;
  isBusy: boolean;
  companies: ApiCompany[];
  onChange: (draft: ApplicationFormDraft) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const updateDraft = (patch: Partial<ApplicationFormDraft>) => {
    onChange({ ...draft, ...patch });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="application-form-title"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-950/40 p-3 backdrop-blur-sm sm:p-6"
    >
      <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-5 py-4">
          <div>
            <h2 id="application-form-title" className="text-lg font-semibold text-stone-950">
              {editing ? "Edit application" : "New application"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-stone-200 text-stone-600 hover:bg-stone-50"
            aria-label="Close form"
            title="Close form"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 p-5">
          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <TextInput
              label="Company"
              value={draft.companyName}
              onChange={(value) => updateDraft({ companyName: value })}
              list="company-options"
              required
            />
            <TextInput
              label="Role / title"
              value={draft.title}
              onChange={(value) => updateDraft({ title: value })}
              required
            />
            <TextInput
              label="Location"
              value={draft.location}
              onChange={(value) => updateDraft({ location: value })}
            />
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-stone-700">Work mode</span>
              <select
                value={draft.workMode}
                onChange={(event) => updateDraft({ workMode: event.target.value as WorkMode })}
                className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-200"
              >
                {WORK_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {WORK_MODE_LABELS[mode]}
                  </option>
                ))}
              </select>
            </label>
            <TextInput
              label="Job URL"
              value={draft.jobUrl}
              onChange={(value) => updateDraft({ jobUrl: value })}
              type="url"
            />
            <TextInput
              label="Currency"
              value={draft.salaryCurrency}
              onChange={(value) => updateDraft({ salaryCurrency: value.toUpperCase() })}
              maxLength={3}
            />
            <TextInput
              label="Salary minimum"
              value={draft.salaryMin}
              onChange={(value) => updateDraft({ salaryMin: value })}
              type="number"
            />
            <TextInput
              label="Salary maximum"
              value={draft.salaryMax}
              onChange={(value) => updateDraft({ salaryMax: value })}
              type="number"
            />
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-stone-700">Status</span>
              <select
                value={draft.status}
                onChange={(event) =>
                  updateDraft({ status: event.target.value as ApplicationStatus })
                }
                className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-200"
              >
                {APPLICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-stone-700">Priority</span>
              <select
                value={draft.priority}
                onChange={(event) =>
                  updateDraft({ priority: event.target.value as ApplicationPriority })
                }
                className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-200"
              >
                {APPLICATION_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </select>
            </label>
            <TextInput
              label="Deadline"
              value={draft.deadline}
              onChange={(value) => updateDraft({ deadline: value })}
              type="date"
            />
            <TextInput
              label="Follow-up date"
              value={draft.followUpDate}
              onChange={(value) => updateDraft({ followUpDate: value })}
              type="date"
            />
            <TextInput
              label="Contact name"
              value={draft.contactName}
              onChange={(value) => updateDraft({ contactName: value })}
            />
            <TextInput
              label="Contact title"
              value={draft.contactTitle}
              onChange={(value) => updateDraft({ contactTitle: value })}
            />
            <TextInput
              label="Contact email"
              value={draft.contactEmail}
              onChange={(value) => updateDraft({ contactEmail: value })}
              type="email"
            />
          </div>

          <datalist id="company-options">
            {companies.map((company) => (
              <option key={company.id} value={company.name} />
            ))}
          </datalist>

          <label>
            <span className="mb-1.5 block text-sm font-semibold text-stone-700">Notes</span>
            <textarea
              value={draft.notes}
              onChange={(event) => updateDraft({ notes: event.target.value })}
              rows={4}
              className="w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-200"
            />
          </label>

          <label>
            <span className="mb-1.5 block text-sm font-semibold text-stone-700">
              Job description
            </span>
            <textarea
              value={draft.jobDescription}
              onChange={(event) => updateDraft({ jobDescription: event.target.value })}
              rows={6}
              className="w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-200"
            />
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-md border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-stone-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              {editing ? "Save changes" : "Create application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  maxLength,
  list,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: React.HTMLInputTypeAttribute;
  required?: boolean;
  maxLength?: number;
  list?: string;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-semibold text-stone-700">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        maxLength={maxLength}
        list={list}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-200"
      />
    </label>
  );
}
