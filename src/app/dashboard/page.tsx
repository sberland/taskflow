import { getUserProjects } from "@/actions/project.actions";
import { createProject } from "@/actions/project.actions";
import Link from "next/link";

export default async function DashboardPage() {
  const projects = await getUserProjects();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mes projets</h1>
        <form action={createProject}>
          <div className="flex gap-2">
            <input
              name="name"
              type="text"
              placeholder="Nom du projet"
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Nouveau projet
            </button>
          </div>
        </form>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <p className="text-gray-400">
            Aucun projet pour l&apos;instant. Créez votre premier projet !
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <h2 className="mb-1 font-semibold text-gray-900 group-hover:text-blue-600">
                {project.name}
              </h2>
              {project.description && (
                <p className="mb-3 text-sm text-gray-500 line-clamp-2">
                  {project.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{project._count.tasks} tâche{project._count.tasks !== 1 ? "s" : ""}</span>
                <span>{project.members.length} membre{project.members.length !== 1 ? "s" : ""}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
