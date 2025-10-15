import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleRouteError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const companies = await prisma.company.findMany({
      where: { userId: user.id },
      include: {
        contacts: {
          orderBy: { name: "asc" },
        },
        _count: {
          select: { applications: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ companies });
  } catch (error) {
    return handleRouteError(error);
  }
}
