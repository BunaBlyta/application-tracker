import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleRouteError } from "@/lib/http";
import {
  applicationCreateSchema,
  applicationQuerySchema,
  type ApplicationCreateInput,
} from "@/lib/validation";

export const runtime = "nodejs";

async function resolveCompanyAndContact(userId: string, input: ApplicationCreateInput) {
  const company = await prisma.company.upsert({
    where: {
      userId_name: {
        userId,
        name: input.companyName,
      },
    },
    update: {
      location: input.location ?? undefined,
    },
    create: {
      name: input.companyName,
      location: input.location ?? undefined,
      userId,
    },
  });

  if (!input.contactName) {
    return { company, contact: null };
  }

  const existingContact = await prisma.contact.findFirst({
    where: {
      userId,
      companyId: company.id,
      name: input.contactName,
    },
  });

  const contact = existingContact
    ? await prisma.contact.update({
        where: { id: existingContact.id },
        data: {
          title: input.contactTitle,
          email: input.contactEmail,
        },
      })
    : await prisma.contact.create({
        data: {
          name: input.contactName,
          title: input.contactTitle,
          email: input.contactEmail,
          companyId: company.id,
          userId,
        },
      });

  return { company, contact };
}

function toApplicationCreateData(
  userId: string,
  companyId: string,
  contactId: string | null,
  input: ApplicationCreateInput,
) {
  return {
    title: input.title,
    location: input.location,
    workMode: input.workMode,
    jobUrl: input.jobUrl,
    salaryMin: input.salaryMin,
    salaryMax: input.salaryMax,
    salaryCurrency: input.salaryCurrency,
    status: input.status,
    priority: input.priority,
    deadline: input.deadline,
    followUpDate: input.followUpDate,
    notes: input.notes,
    jobDescription: input.jobDescription,
    userId,
    companyId,
    contactId,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = applicationQuerySchema.parse(params);
    const andFilters: Prisma.ApplicationWhereInput[] = [];

    if (filters.status) {
      andFilters.push({ status: filters.status });
    }

    if (filters.priority) {
      andFilters.push({ priority: filters.priority });
    }

    if (filters.q) {
      andFilters.push({
        OR: [
          { title: { contains: filters.q, mode: "insensitive" } },
          { notes: { contains: filters.q, mode: "insensitive" } },
          { jobDescription: { contains: filters.q, mode: "insensitive" } },
          { company: { name: { contains: filters.q, mode: "insensitive" } } },
        ],
      });
    }

    if (filters.company) {
      andFilters.push({
        company: { name: { contains: filters.company, mode: "insensitive" } },
      });
    }

    if (filters.role) {
      andFilters.push({
        title: { contains: filters.role, mode: "insensitive" },
      });
    }

    if (filters.dateFrom || filters.dateTo) {
      const range = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {}),
      };
      andFilters.push({
        OR: [{ followUpDate: range }, { deadline: range }, { createdAt: range }],
      });
    }

    const applications = await prisma.application.findMany({
      where: {
        userId: user.id,
        AND: andFilters,
      },
      include: {
        company: true,
        contact: true,
        timeline: {
          orderBy: { occurredAt: "desc" },
          take: 3,
        },
      },
      orderBy: [{ updatedAt: "desc" }],
    });

    return NextResponse.json({ applications });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const input = applicationCreateSchema.parse(await request.json());
    const { company, contact } = await resolveCompanyAndContact(user.id, input);

    const application = await prisma.application.create({
      data: {
        ...toApplicationCreateData(user.id, company.id, contact?.id ?? null, input),
        timeline: {
          create: {
            type: "CREATED",
            title: "Application added",
            body: `${input.title} at ${company.name} was added to the tracker.`,
          },
        },
      },
      include: {
        company: true,
        contact: true,
        timeline: {
          orderBy: { occurredAt: "desc" },
        },
      },
    });

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
