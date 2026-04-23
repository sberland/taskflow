import { getProject } from "@/actions/project.actions";
import { createTask, updateTaskStatus, deleteTask } from "@/actions/task.actions";
import { DeleteProjectButton } from "@/components/delete-project-button";
import { Suspense } from "react";

const STATUS_COLUMNS = [
  { key: "TODO", label: "À faire", color: "bg-gray-100" },
  { key: "IN_PROGRESS", label: "En cours", color: "bg-blue-50" },
  { key: "DONE", label: "Terminé", color: "bg-green-50" },
] as const;

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-gray-400",
  MEDIUM: "text-yellow-500",
  HIGH: "text-orange-500",
  URGENT: "text-red-600",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Basse",
  MEDIUM: "Normale",
  HIGH: "Haute",
  URGENT: "Urgente",
};

async function ProjectContent({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const project = await getProject(projectId);

  const tasksByStatus = STATUS_COLUMNS.reduce(
    (acc, col) => {
      acc[col.key] = project.tasks.filter((t) => t.status === col.key);
      return acc;
    },
    {} as Record<string, typeof project.tasks>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          {project.description && (
            <p className="mt-1 text-sm text-gray-500">{project.description}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            {project.members.length} membre
            {project.members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <DeleteProjectButton projectId={project.id} />
      </div>

      {/* Formulaire nouvelle tâche */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700">Ajouter une tâche</h2>
        <form
          action={createTask.bind(null, project.id)}
          className="flex flex-wrap gap-3"
        >
          <input
            name="title"
            type="text"
            required
            placeholder="Titre de la tâche"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <select
            name="priority"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="LOW">Basse</option>
            <option value="MEDIUM" selected>
              Normale
            </option>
            <option value="HIGH">Haute</option>
            <option value="URGENT">Urgente</option>
          </select>
          <input
            name="dueDate"
            type="date"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Ajouter
          </button>
        </form>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {STATUS_COLUMNS.map((col) => (
          <div key={col.key} className={`rounded-xl p-4 ${col.color}`}>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
              {col.label}
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500 shadow-sm">
                {tasksByStatus[col.key].length}
              </span>
            </h3>
            <div className="flex flex-col gap-3">
              {tasksByStatus[col.key].map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">
                      {task.title}
                    </p>
                    <form action={deleteTask.bind(null, task.id)}>
                      <button
                        type="submit"
                        className="shrink-0 text-gray-300 hover:text-red-500"
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </form>
                  </div>
                  {task.description && (
                    <p className="mb-2 text-xs text-gray-500">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}
                    >
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                    {task.dueDate && (
                      <span className="text-xs text-gray-400">
                        {new Date(task.dueDate).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </div>
                  {/* Changer le statut */}
                  <div className="mt-3 flex gap-1">
                    {STATUS_COLUMNS.filter((s) => s.key !== col.key).map(
                      (s) => (
                        <form
                          key={s.key}
                          action={updateTaskStatus.bind(null, task.id, s.key)}
                        >
                          <button
                            type="submit"
                            className="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100"
                          >
                            → {s.label}
                          </button>
                        </form>
                      )
                    )}
                  </div>
                </div>
              ))}
              {tasksByStatus[col.key].length === 0 && (
                <p className="py-4 text-center text-xs text-gray-400">
                  Aucune tâche
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-10 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
          <div className="grid grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-xl bg-gray-100"
              />
            ))}
          </div>
        </div>
      }
    >
      <ProjectContent params={params} />
    </Suspense>
  );
}
