import Link from "next/link";
import { Project } from "@/lib/types";

const statusStyle: Record<string, { dot: string; text: string; label: string }> = {
  running: { dot: "bg-status-running animate-pulse", text: "text-primary", label: "RUNNING" },
  done: { dot: "bg-status-done", text: "text-status-done", label: "COMPLETED" },
  paused: { dot: "bg-status-paused", text: "text-status-paused", label: "PAUSED" },
  failed: { dot: "bg-error", text: "text-error", label: "FAILED" },
  pending: { dot: "bg-outline", text: "text-on-surface-variant", label: "DRAFT" },
};

export default function ProjectCard({ project }: { project: Project }) {
  const s = statusStyle[project.status] ?? statusStyle.pending;
  return (
    <Link
      href={`/project/${project.id}`}
      className="glass-panel rounded-2xl overflow-hidden group cursor-pointer card-glow transition-all duration-500 flex flex-col border border-outline/5"
    >
      <div className="relative aspect-video overflow-hidden bg-surface-container-high flex items-center justify-center">
        {project.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.thumbnail_url} alt={project.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <span className="material-symbols-outlined text-outline/30 text-[48px]">movie</span>
        )}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-primary/10 shadow-sm">
          <span className={"w-2.5 h-2.5 rounded-full " + s.dot} />
          <span className={"text-label-caps text-[10px] " + s.text}>{s.label}</span>
        </div>
      </div>
      <div className="p-6 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="font-headline text-body-lg text-primary truncate mb-2">{project.name}</h3>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-label-caps text-[10px] text-on-surface-variant/50 uppercase">{project.current_stage}</span>
          </div>
        </div>
        <div className="flex justify-between items-center pt-5 border-t border-outline/5">
          <div className="flex flex-col">
            <span className="text-[9px] text-on-surface-variant/40 uppercase tracking-wide">Created</span>
            <span className="text-body-md text-on-surface">{project.created_at}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-on-surface-variant/40 uppercase tracking-wide">Total Cost</span>
            <span className="font-headline text-body-md text-primary">${project.total_cost.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
