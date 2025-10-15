import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/http";
import {
  applicationUpdateSchema,
  type ApplicationUpdateInput,
} from "@/lib/validation";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function resolveUpdateRelations(userId: string, input: ApplicationUpdateInput) {
  const relations: Prisma.ApplicationUpdateInput = {};

  if (input.companyName) {
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

    relations.company = { connect: { id: company.id } };

    if (input.contactName) {
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

      relations.contact = { connect: { id: contact.id } };
    }
  }

  return relations;
}

function toApplicationUpdateData(input: ApplicationUpdateInput) {
  const data: Prisma.ApplicationUpdateInput = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.location !== undefined) data.location = input.location;
  if (input.workMode !== undefined) data.workMode = input.workMode;
  if (input.jobUrl !== undefined) data.jobUrl = input.jobUrl;
  if (input.salaryMin !== undefined) data.salaryMin = input.salaryMin;
  if (input.salaryMax !== undefined) data.salaryMax = input.salaryMax;
  if (input.salaryCurrency !== undefined) data.salaryCurrency = input.salaryCurrency;
  if (input.status !== undefined) data.status = input.status;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.deadline !== undefined) data.deadline = input.deadline;
  if (input.followUpDate !== undefined) data.followUpDate = input.followUpDate;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.jobDescription !== undefined) data.jobDescription = input.jobDescription;

  return data;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    const { id } = await context.params;
    const application = await prisma.application.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        company: true,
        contact: true,
        timeline: {
          orderBy: { occurredAt: "desc" },
        },
        tailoringResults: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!application) {
      return jsonError("Application not found.", 404);
    }

    return NextResponse.json({ application });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    const { id } = await context.params;
    const existing = await prisma.application.findFirst({
      where: { id, userId: user.id },
      select: { id: true, status: true, notes: true },
    });

    if (!existing) {
      return jsonError("Application not found.", 404);
    }

    const input = applicationUpdateSchema.parse(await request.json());
    const relationData = await resolveUpdateRelations(user.id, input);
    const updateData = toApplicationUpdateData(input);
    const timelineCreates: Prisma.TimelineEventCreateWithoutApplicationInput[] = [];

    if (input.status && input.status !== existing.status) {
      timelineCreates.push({
        type: "STATUS_CHANGE",
        title: `Moved to ${input.status.toLowerCase()}`,
        body: `Status changed from ${existing.status.toLowerCase()} to ${input.status.toLowerCase()}.`,
      });
    }

    if (input.notes !== undefined && input.notes !== existing.notes) {
      timelineCreates.push({
        type: "NOTE",
        title: "Notes updated",
        body: input.notes ?? "Notes cleared.",
      });
    }

    const application = await prisma.application.update({
      where: { id },
      data: {
        ...updateData,
        ...relationData,
        ...(timelineCreates.length > 0
          ? {
              timeline: {
                create: timelineCreates,
              },
            }
          : {}),
      },
      include: {
        company: true,
        contact: true,
        timeline: {
          orderBy: { occurredAt: "desc" },
        },
        tailoringResults: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    return NextResponse.json({ application });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    const { id } = await context.params;
    const existing = await prisma.application.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      return jsonError("Application not found.", 404);
    }

    await prisma.application.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
