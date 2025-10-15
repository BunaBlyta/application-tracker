import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  tailoringOutputSchema,
  type TailoringOutput,
  type TailoringRequestInput,
} from "@/lib/validation";

export type TailoringResult = TailoringOutput & {
  source: "gemini" | "mock";
  warning?: string;
};

const STOP_WORDS = new Set([
  "about",
  "across",
  "and",
  "are",
  "build",
  "for",
  "from",
  "have",
  "into",
  "our",
  "that",
  "the",
  "their",
  "this",
  "with",
  "work",
  "you",
  "your",
]);

export function extractKeywords(text: string, limit = 10) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  const counts = new Map<string, number>();
  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

export function buildMockTailoring(input: TailoringRequestInput): TailoringOutput {
  const role = input.role ?? "the target role";
  const company = input.company ?? "the company";
  const keywords = extractKeywords(input.jobDescription, 8);
  const keywordPhrase = keywords.length > 0 ? keywords.join(", ") : "role requirements";

  return {
    cvBullets: [
      `Reframe recent work around ${role}, emphasizing measurable ownership across ${keywords.slice(0, 3).join(", ") || "the core requirements"}.`,
      `Add a product-impact bullet that connects TypeScript, React, API design, and stakeholder collaboration to ${company}'s hiring priorities.`,
      `Highlight one technical leadership example where you improved reliability, delivery speed, or usability for a workflow-heavy product.`,
      `Include a concise data-modeling or systems-design achievement that mirrors the job description's strongest backend signals.`,
    ],
    coverLetter: `I am excited about ${role} at ${company} because the role calls for practical product engineering, strong technical judgment, and ownership across the full stack. My experience shipping TypeScript, React, API, and PostgreSQL-backed workflows maps directly to the needs described in the posting, especially around ${keywordPhrase}. I would bring a bias for clear execution, accessible interfaces, and durable systems that help teams move faster without sacrificing quality.`,
    interviewNotes: [
      `Prepare a two-minute story that ties your strongest project to these keywords: ${keywordPhrase}.`,
      "Bring one example of making a complex workflow easier for users while preserving technical correctness.",
      "Review tradeoffs for data modeling, validation, optimistic UI, and observability in a product dashboard.",
      `Ask how ${company} measures success for this role during the first 90 days.`,
    ],
    keywordSummary: `Highest-signal keywords from the posting: ${keywordPhrase}. The strongest resume alignment should emphasize full-stack TypeScript delivery, user-facing workflow quality, validated APIs, database modeling, and cross-functional product execution.`,
  };
}

function parseJsonFromModel(text: string) {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fencedMatch?.[1] ?? text.match(/\{[\s\S]*\}/)?.[0] ?? text;
  return tailoringOutputSchema.parse(JSON.parse(jsonText));
}

export async function generateTailoring(
  input: TailoringRequestInput,
): Promise<TailoringResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      ...buildMockTailoring(input),
      source: "mock",
      warning: "GEMINI_API_KEY is missing, so deterministic mock tailoring was used.",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
    });

    const prompt = [
      "Return strict JSON only with this shape:",
      '{"cvBullets":["..."],"coverLetter":"...","interviewNotes":["..."],"keywordSummary":"..."}',
      "Generate tailored job-search material for a candidate.",
      `Company: ${input.company ?? "Unknown"}`,
      `Role: ${input.role ?? "Unknown"}`,
      `Resume context: ${input.resumeContext ?? "No extra context provided."}`,
      `Job description:\n${input.jobDescription}`,
    ].join("\n\n");

    const response = await model.generateContent(prompt);
    const parsed = parseJsonFromModel(response.response.text());

    return {
      ...parsed,
      source: "gemini",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Gemini error.";

    return {
      ...buildMockTailoring(input),
      source: "mock",
      warning: `Gemini request failed, so mock tailoring was used. ${message}`,
    };
  }
}
