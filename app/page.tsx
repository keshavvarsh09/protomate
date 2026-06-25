import Link from "next/link";
import ProjectCard from "@/components/ProjectCard";
import { getProjects } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const projects = await getProjects();
  const running = projects.filter((p) => p.status === "running").length;
  const spend = projects.reduce((a, p) => a + p.total_cost, 0);

  return (
    <main className="pt-16 pb-24 px-margin-desktop max-w-container-max mx-auto">
      <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="max-w-2xl">
          <h1 className="font-headline text-[56px] text-primary mb-4 leading-tight">Your videos</h1>
          <p className="text-on-surface-variant text-body-lg">
            Paste a script, pick a preset, and let the pipeline build it. Fix only the scenes that need it.
          </p>
        </div>
        <div className="flex items-center gap-6 glass-panel px-6 py-4 rounded-xl">
          <div className="flex flex-col">
            <span className="text-[10px] text-on-surface-variant/60 uppercase tracking-wide">Running now</span>
            <span className="font-headline text-body-lg text-primary">{running}</span>
          </div>
          <div className="h-10 w-px bg-outline/10" />
          <div className="flex flex-col">
            <span className="text-[10px] text-on-surface-variant/60 uppercase tracking-wide">Spent this view</span>
            <span className="font-headline text-body-lg text-secondary">${spend.toFixed(2)}</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}

        <Link
          href="/project/new"
          className="border-2 border-dashed border-outline/10 rounded-2xl flex flex-col items-center justify-center p-12 text-center hover:bg-white/40 hover:border-primary/20 transition-all duration-500 group cursor-pointer h-full min-h-[300px]"
        >
          <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/10 transition-all">
            <span className="material-symbols-outlined text-primary text-[40px]">add_circle</span>
          </div>
          <h3 className="font-headline text-body-lg text-primary">New video</h3>
          <p className="text-body-md text-on-surface-variant/60 mt-3 max-w-[200px]">
            Start from a script or a topic.
          </p>
        </Link>
      </div>
    </main>
  );
}
