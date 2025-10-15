import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleRouteError } from "@/lib/http";
import { computeDashboardMetrics } from "@/lib/metrics";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const applications = await prisma.application.findMany({
      where: { userId: user.id },
      select: {
        status: true,
        followUpDate: true,
      },
    });

    return NextResponse.json({
      metrics: computeDashboardMetrics(applications),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
