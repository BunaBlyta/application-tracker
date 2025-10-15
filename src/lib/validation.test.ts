import { describe, expect, it } from "vitest";
import { applicationCreateSchema, tailoringRequestSchema } from "@/lib/validation";

describe("applicationCreateSchema", () => {
  it("normalizes a valid application payload", () => {
    const parsed = applicationCreateSchema.parse({
      companyName: " Northstar Analytics ",
      title: "Senior Full-Stack Engineer",
      workMode: "REMOTE",
      status: "APPLIED",
      priority: "HIGH",
      salaryMin: "150000",
      salaryMax: "185000",
      salaryCurrency: "usd",
      jobUrl: "",
      followUpDate: "2026-07-10",
    });

    expect(parsed.companyName).toBe("Northstar Analytics");
    expect(parsed.salaryMin).toBe(150000);
    expect(parsed.salaryCurrency).toBe("USD");
    expect(parsed.jobUrl).toBeNull();
    expect(parsed.followUpDate).toBeInstanceOf(Date);
  });

  it("rejects an invalid salary range", () => {
    const result = applicationCreateSchema.safeParse({
      companyName: "Ledgerly",
      title: "Frontend Engineer",
      salaryMin: "180000",
      salaryMax: "120000",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["salaryMax"]);
  });
});

describe("tailoringRequestSchema", () => {
  it("requires enough job description context", () => {
    const result = tailoringRequestSchema.safeParse({
      jobDescription: "Too short",
    });

    expect(result.success).toBe(false);
  });
});
