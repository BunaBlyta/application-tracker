import { describe, expect, it } from "vitest";
import { buildMockTailoring, extractKeywords } from "@/lib/tailoring";

describe("extractKeywords", () => {
  it("prioritizes repeated role keywords and ignores filler words", () => {
    const keywords = extractKeywords(
      "React TypeScript React PostgreSQL product workflows and customer workflows",
      4,
    );

    expect(keywords).toEqual(["react", "workflows", "customer", "postgresql"]);
  });
});

describe("buildMockTailoring", () => {
  it("returns complete deterministic tailoring output", () => {
    const result = buildMockTailoring({
      company: "Northstar",
      role: "Senior Full-Stack Engineer",
      jobDescription:
        "We need a senior engineer with TypeScript, React, PostgreSQL, API design, accessibility, workflow design, and strong product collaboration experience.",
      applicationId: null,
      resumeContext: null,
    });

    expect(result.cvBullets).toHaveLength(4);
    expect(result.interviewNotes).toHaveLength(4);
    expect(result.coverLetter).toContain("Senior Full-Stack Engineer");
    expect(result.keywordSummary.toLowerCase()).toContain("typescript");
  });
});
