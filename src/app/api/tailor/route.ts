import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateTailoring } from "@/lib/tailoring";
import { handleRouteError, jsonError } from "@/lib/http";
import { tailoringRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const input = tailoringRequestSchema.parse(await request.json());

    if (input.applicationId) {
      const application = await prisma.application.findFirst({
        where: { id: input.applicationId, userId: user.id },
        select: { id: true },
      });

      if (!application) {
        return jsonError("Application not found.", 404);
      }
    }

    const result = await generateTailoring(input);

    const saved = await prisma.tailoringResult.create({
      data: {
        source: result.source,
        cvBullets: result.cvBullets,
        coverLetter: result.coverLetter,
        interviewNotes: result.interviewNotes,
        keywordSummary: result.keywordSummary,
        rawJobDescription: input.jobDescription,
        applicationId: input.applicationId ?? null,
      },
    });

    if (input.applicationId) {
      await prisma.timelineEvent.create({
        data: {
          type: "TAILORING",
          title: "AI tailoring generated",
          body: result.warning ?? "Generated tailored CV bullets, cover letter, interview notes, and keyword summary.",
          applicationId: input.applicationId,
        },
      });
    }

    return NextResponse.json({
      result: {
        ...result,
        id: saved.id,
        createdAt: saved.createdAt,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
