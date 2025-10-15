import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const email = process.env.MOCK_USER_EMAIL ?? "alex.rivera@example.com";

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Alex Rivera",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
    },
    create: {
      email,
      name: "Alex Rivera",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
    },
  });

  await prisma.tailoringResult.deleteMany({
    where: { application: { userId: user.id } },
  });
  await prisma.timelineEvent.deleteMany({
    where: { application: { userId: user.id } },
  });
  await prisma.application.deleteMany({ where: { userId: user.id } });
  await prisma.contact.deleteMany({ where: { userId: user.id } });
  await prisma.company.deleteMany({ where: { userId: user.id } });

  const companies = await Promise.all([
    prisma.company.create({
      data: {
        name: "Northstar Analytics",
        website: "https://northstar.example",
        industry: "Data platform",
        location: "New York, NY",
        notes: "Series B analytics tooling company with strong product-led growth.",
        userId: user.id,
      },
    }),
    prisma.company.create({
      data: {
        name: "HelioGrid",
        website: "https://heliogrid.example",
        industry: "Climate tech",
        location: "Austin, TX",
        notes: "Grid orchestration startup; values pragmatic product engineering.",
        userId: user.id,
      },
    }),
    prisma.company.create({
      data: {
        name: "Ledgerly",
        website: "https://ledgerly.example",
        industry: "Fintech",
        location: "San Francisco, CA",
        notes: "Accounting automation for mid-market finance teams.",
        userId: user.id,
      },
    }),
    prisma.company.create({
      data: {
        name: "Cobalt Health",
        website: "https://cobalthealth.example",
        industry: "Healthcare",
        location: "Boston, MA",
        notes: "Remote-first patient engagement platform.",
        userId: user.id,
      },
    }),
    prisma.company.create({
      data: {
        name: "BrightCart",
        website: "https://brightcart.example",
        industry: "Commerce",
        location: "Chicago, IL",
        notes: "Retail operations platform with complex workflow tooling.",
        userId: user.id,
      },
    }),
  ]);

  const [northstar, helio, ledgerly, cobalt, brightcart] = companies;

  const contacts = await Promise.all([
    prisma.contact.create({
      data: {
        name: "Maya Chen",
        title: "Engineering Manager",
        email: "maya.chen@northstar.example",
        linkedinUrl: "https://linkedin.com/in/mayachen",
        companyId: northstar.id,
        userId: user.id,
      },
    }),
    prisma.contact.create({
      data: {
        name: "Jordan Patel",
        title: "Technical Recruiter",
        email: "jordan.patel@heliogrid.example",
        companyId: helio.id,
        userId: user.id,
      },
    }),
    prisma.contact.create({
      data: {
        name: "Samira Khan",
        title: "Director of Product Engineering",
        email: "samira.khan@ledgerly.example",
        companyId: ledgerly.id,
        userId: user.id,
      },
    }),
  ]);

  const [maya, jordan, samira] = contacts;
  const today = new Date();
  const daysFromNow = (days: number) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + days, 9, 0, 0);

  const applications = await Promise.all([
    prisma.application.create({
      data: {
        title: "Senior Full-Stack Engineer",
        location: "New York, NY",
        workMode: "HYBRID",
        jobUrl: "https://northstar.example/careers/senior-full-stack-engineer",
        salaryMin: 165000,
        salaryMax: 195000,
        status: "INTERVIEW",
        priority: "HIGH",
        deadline: daysFromNow(7),
        followUpDate: daysFromNow(2),
        notes: "Second technical round scheduled. Emphasize data-heavy React and API design.",
        jobDescription:
          "Build customer-facing analytics workflows with Next.js, TypeScript, PostgreSQL, and distributed data services. Partner with product and design to ship reliable B2B dashboard experiences.",
        companyId: northstar.id,
        contactId: maya.id,
        userId: user.id,
      },
    }),
    prisma.application.create({
      data: {
        title: "Product Engineer, Platform",
        location: "Remote - US",
        workMode: "REMOTE",
        jobUrl: "https://heliogrid.example/jobs/platform-product-engineer",
        salaryMin: 150000,
        salaryMax: 180000,
        status: "SCREENING",
        priority: "HIGH",
        followUpDate: daysFromNow(4),
        notes: "Recruiter screen completed. Send architecture examples before follow-up.",
        jobDescription:
          "Own internal and external workflow tooling for energy operators. Strong React, API, cloud, and data modeling skills required. Climate domain interest preferred.",
        companyId: helio.id,
        contactId: jordan.id,
        userId: user.id,
      },
    }),
    prisma.application.create({
      data: {
        title: "Staff Frontend Engineer",
        location: "San Francisco, CA",
        workMode: "ONSITE",
        jobUrl: "https://ledgerly.example/careers/staff-frontend-engineer",
        salaryMin: 190000,
        salaryMax: 230000,
        status: "APPLIED",
        priority: "MEDIUM",
        followUpDate: daysFromNow(6),
        notes: "Strong match on design systems and enterprise workflow experience.",
        jobDescription:
          "Lead the frontend architecture for finance automation products. Experience with TypeScript, React, design systems, accessibility, and high-scale data entry workflows.",
        companyId: ledgerly.id,
        contactId: samira.id,
        userId: user.id,
      },
    }),
    prisma.application.create({
      data: {
        title: "Full-Stack Developer",
        location: "Remote",
        workMode: "REMOTE",
        jobUrl: "https://cobalthealth.example/jobs/full-stack-developer",
        salaryMin: 135000,
        salaryMax: 160000,
        status: "OFFER",
        priority: "HIGH",
        deadline: daysFromNow(5),
        followUpDate: daysFromNow(1),
        notes: "Verbal offer received. Ask about on-call expectations and equity details.",
        jobDescription:
          "Ship patient and clinic-facing features with Next.js, Node, PostgreSQL, and healthcare integrations. Reliability, security, and accessibility are central.",
        companyId: cobalt.id,
        userId: user.id,
      },
    }),
    prisma.application.create({
      data: {
        title: "Frontend Platform Engineer",
        location: "Chicago, IL",
        workMode: "HYBRID",
        jobUrl: "https://brightcart.example/jobs/frontend-platform-engineer",
        salaryMin: 145000,
        salaryMax: 170000,
        status: "REJECTED",
        priority: "LOW",
        notes: "Rejected after recruiter screen due to relocation expectations.",
        jobDescription:
          "Improve shared frontend infrastructure, component quality, and developer experience for retail operations products.",
        companyId: brightcart.id,
        userId: user.id,
      },
    }),
    prisma.application.create({
      data: {
        title: "Founding Product Engineer",
        location: "Remote - North America",
        workMode: "REMOTE",
        jobUrl: "https://northstar.example/careers/founding-product-engineer",
        salaryMin: 140000,
        salaryMax: 175000,
        status: "SAVED",
        priority: "MEDIUM",
        deadline: daysFromNow(10),
        notes: "Worth tailoring. Requires strong founder-style product judgment.",
        jobDescription:
          "Join a small team building new analytics products from zero to one. Requires full-stack TypeScript, customer discovery, and strong UX instincts.",
        companyId: northstar.id,
        userId: user.id,
      },
    }),
  ]);

  await Promise.all(
    applications.flatMap((application) => {
      const baseEvents = [
        prisma.timelineEvent.create({
          data: {
            type: "CREATED",
            title: "Application added",
            body: `${application.title} at ${companies.find((company) => company.id === application.companyId)?.name ?? "company"} was added to the tracker.`,
            applicationId: application.id,
            occurredAt: new Date(application.createdAt.getTime() - 1000 * 60 * 60 * 24 * 3),
          },
        }),
      ];

      if (application.status !== "SAVED") {
        baseEvents.push(
          prisma.timelineEvent.create({
            data: {
              type: "STATUS_CHANGE",
              title: `Moved to ${application.status.toLowerCase()}`,
              body: "Pipeline stage updated during seed data setup.",
              applicationId: application.id,
              occurredAt: new Date(application.createdAt.getTime() - 1000 * 60 * 60 * 24),
            },
          }),
        );
      }

      if (application.status === "INTERVIEW") {
        baseEvents.push(
          prisma.timelineEvent.create({
            data: {
              type: "INTERVIEW",
              title: "Technical interview scheduled",
              body: "Prepare examples around React performance, API boundaries, and prioritization tradeoffs.",
              applicationId: application.id,
              occurredAt: daysFromNow(-1),
            },
          }),
        );
      }

      return baseEvents;
    }),
  );

  await prisma.tailoringResult.create({
    data: {
      source: "mock",
      cvBullets: [
        "Led full-stack TypeScript delivery for workflow-heavy SaaS dashboards used by operations teams.",
        "Modeled PostgreSQL-backed product data and built reliable REST endpoints with strong validation.",
        "Improved application usability by tightening filtering, status visibility, and action-oriented detail views.",
      ],
      coverLetter:
        "I am excited about the Senior Full-Stack Engineer role because it combines product-minded dashboard work with rigorous data modeling. My background shipping TypeScript, React, and PostgreSQL systems maps directly to the analytics workflows your team is building.",
      interviewNotes: [
        "Prepare a concise story about dashboard performance and query design.",
        "Review tradeoffs between optimistic updates and server-confirmed state.",
        "Ask how product, design, and engineering prioritize workflow quality.",
      ],
      keywordSummary:
        "Strong overlap on TypeScript, React, PostgreSQL, B2B dashboards, workflow design, and cross-functional product delivery.",
      rawJobDescription: applications[0].jobDescription ?? "",
      applicationId: applications[0].id,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
