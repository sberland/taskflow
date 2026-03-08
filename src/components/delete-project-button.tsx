"use client";

import { deleteProject } from "@/actions/project.actions";

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  return (
    <form
      action={async () => {
        if (!confirm("Supprimer ce projet et toutes ses tâches ?")) return;
        await deleteProject(projectId);
      }}
    >
      <button type="submit" className="text-xs text-gray-400 hover:text-red-500">
        Supprimer le projet
      </button>
    </form>
  );
}
