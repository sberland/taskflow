"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function createProject(formData: FormData) {
  const userId = await requireUser();
  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;

  if (!name?.trim()) redirect("/dashboard");

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      members: {
        create: { userId, role: "ADMIN" },
      },
    },
  });

  revalidatePath("/dashboard");
  redirect(`/dashboard/projects/${project.id}`);
}

export async function deleteProject(projectId: string) {
  const userId = await requireUser();

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  if (member?.role !== "ADMIN") redirect("/dashboard");

  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function getUserProjects() {
  const userId = await requireUser();
  return prisma.project.findMany({
    where: { members: { some: { userId } } },
    include: {
      _count: { select: { tasks: true } },
      members: { include: { user: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getProject(projectId: string) {
  const userId = await requireUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, members: { some: { userId } } },
    include: {
      tasks: {
        include: { assignee: true },
        orderBy: { createdAt: "asc" },
      },
      members: { include: { user: true } },
    },
  });
  if (!project) redirect("/dashboard");
  return project;
}
