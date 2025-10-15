import { prisma } from "@/lib/db";

export async function getCurrentUser() {
  const email = process.env.MOCK_USER_EMAIL ?? "alex.rivera@example.com";

  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Alex Rivera",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
    },
  });
}
