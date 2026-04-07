import { signIn } from "@/lib/auth";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <Logo size={36} />
          <h1 className="text-2xl font-bold text-gray-900">TaskFlow</h1>
        </div>
        <p className="mb-6 text-sm text-gray-500">
          Connectez-vous pour accéder à vos projets
        </p>
        <form
          action={async (formData) => {
            "use server";
            await signIn("credentials", {
              email: formData.get("email"),
              name: formData.get("name"),
              redirectTo: "/dashboard",
            });
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nom
            </label>
            <input
              name="name"
              type="text"
              placeholder="Jean Dupont"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="jean@example.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button
            type="submit"
            className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Se connecter / S&apos;inscrire
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-gray-400">
          MVP — pas de mot de passe requis pour l&apos;instant
        </p>
      </div>
    </div>
  );
}
