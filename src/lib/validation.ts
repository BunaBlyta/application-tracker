import { z } from "zod";
import {
  APPLICATION_PRIORITIES,
  APPLICATION_STATUSES,
  WORK_MODES,
} from "@/lib/constants";

const emptyStringToNull = (value: unknown) => {
  if (value === "") {
    return null;
  }

  return value;
};

const nullableText = (maxLength: number) =>
  z.preprocess(
    emptyStringToNull,
    z.string().trim().max(maxLength).nullable().optional(),
  );

const nullableUrl = z.preprocess(
  emptyStringToNull,
  z.string().trim().url("Enter a valid URL.").max(500).nullable().optional(),
);

const nullableNumber = z.preprocess(
  emptyStringToNull,
  z.coerce.number().int().nonnegative().max(1_000_000).nullable().optional(),
);

const nullableDate = z.preprocess(
  emptyStringToNull,
  z.union([z.coerce.date(), z.null()]).optional(),
);

const applicationShape = z.object({
  companyName: z.string().trim().min(1, "Company is required.").max(120),
  title: z.string().trim().min(1, "Role is required.").max(140),
  location: nullableText(120),
  workMode: z.enum(WORK_MODES).default("REMOTE"),
  jobUrl: nullableUrl,
  salaryMin: nullableNumber,
  salaryMax: nullableNumber,
  salaryCurrency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .default("USD"),
  status: z.enum(APPLICATION_STATUSES).default("SAVED"),
  priority: z.enum(APPLICATION_PRIORITIES).default("MEDIUM"),
  deadline: nullableDate,
  followUpDate: nullableDate,
  notes: nullableText(5_000),
  jobDescription: nullableText(20_000),
  contactName: nullableText(120),
  contactTitle: nullableText(120),
  contactEmail: z.preprocess(
    emptyStringToNull,
    z.string().trim().email().max(180).nullable().optional(),
  ),
});

function validateSalaryRange(
  value: { salaryMin?: number | null; salaryMax?: number | null },
  context: z.RefinementCtx,
) {
  if (
    value.salaryMin != null &&
    value.salaryMax != null &&
    value.salaryMax < value.salaryMin
  ) {
    context.addIssue({
      code: "custom",
      message: "Salary maximum must be greater than or equal to salary minimum.",
      path: ["salaryMax"],
    });
  }
}

export const applicationCreateSchema = applicationShape.superRefine(validateSalaryRange);

export const applicationUpdateSchema = applicationShape
  .partial()
  .superRefine(validateSalaryRange);

export const applicationQuerySchema = z.object({
  q: nullableText(120),
  status: z.enum(APPLICATION_STATUSES).optional(),
  priority: z.enum(APPLICATION_PRIORITIES).optional(),
  company: nullableText(120),
  role: nullableText(120),
  dateFrom: nullableDate,
  dateTo: nullableDate,
});

export const tailoringRequestSchema = z.object({
  jobDescription: z
    .string()
    .trim()
    .min(80, "Paste at least 80 characters from the job description.")
    .max(20_000),
  applicationId: nullableText(80),
  role: nullableText(140),
  company: nullableText(120),
  resumeContext: nullableText(5_000),
});

export const tailoringOutputSchema = z.object({
  cvBullets: z.array(z.string().trim().min(10).max(260)).min(3).max(6),
  coverLetter: z.string().trim().min(80).max(2_500),
  interviewNotes: z.array(z.string().trim().min(10).max(260)).min(3).max(6),
  keywordSummary: z.string().trim().min(40).max(1_500),
});

export type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>;
export type ApplicationUpdateInput = z.infer<typeof applicationUpdateSchema>;
export type ApplicationQueryInput = z.infer<typeof applicationQuerySchema>;
export type TailoringRequestInput = z.infer<typeof tailoringRequestSchema>;
export type TailoringOutput = z.infer<typeof tailoringOutputSchema>;
