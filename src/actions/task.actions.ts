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

export async function createTask(projectId: string, formData: FormData) {
  const userId = await requireUser();

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  if (!member) return;

  const title = formData.get("title") as string;
  if (!title?.trim()) return;

  await prisma.task.create({
    data: {
      title: title.trim(),
      description: (formData.get("description") as string) || null,
      priority: (formData.get("priority") as string) || "MEDIUM",
      dueDate: formData.get("dueDate")
        ? new Date(formData.get("dueDate") as string)
        : null,
      projectId,
      assigneeId: (formData.get("assigneeId") as string) || null,
    },
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function updateTaskStatus(taskId: string, status: string) {
  const userId = await requireUser();

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { members: { some: { userId } } } },
  });
  if (!task) return;

  await prisma.task.update({
    where: { id: taskId },
    data: { status },
  });

  revalidatePath(`/dashboard/projects/${task.projectId}`);
}

export async function deleteTask(taskId: string) {
  const userId = await requireUser();

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { members: { some: { userId } } } },
  });
  if (!task) return;

  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath(`/dashboard/projects/${task.projectId}`);
}

export async function updateTask(taskId: string, formData: FormData) {
  const userId = await requireUser();

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { members: { some: { userId } } } },
  });
  if (!task) return;

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title: (formData.get("title") as string) || task.title,
      description: (formData.get("description") as string) || null,
      priority: (formData.get("priority") as string) || task.priority,
      status: (formData.get("status") as string) || task.status,
      dueDate: formData.get("dueDate")
        ? new Date(formData.get("dueDate") as string)
        : null,
    },
  });

  revalidatePath(`/dashboard/projects/${task.projectId}`);
}
