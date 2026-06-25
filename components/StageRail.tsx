"use client";

import { Project, StageName } from "@/lib/types";

const STAGES: { name: StageName; label: string; icon: string }[] = [
  { name: "script", label: "Script", icon: "description" },
  { name: "scenes", label: "Scenes", icon: "movie" },
  { name: "images", label: "Images", icon: "image" },
  { name: "voice", label: "Voice", icon: "mic" },
  { name: "captions", label: "Captions", icon: "subtitles" },
  { name: "render", label: "Render", icon: "memory" },
  { name: "export", label: "Export", icon: "ios_share" },
];

export default function StageRail({ project, onRender }: { project: Project; onRender?: () => void }) {
  const currentIdx = STAGES.findIndex((s) => s.name === project.current_stage);

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 pt-20 bg-surface/85 backdrop-blur-2xl border-r border-outline/5 shadow-sm flex flex-col p-4 space-y-2 z-40">
      <div className="px-4 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-primary-container/20 flex items-center justify-center border border-primary/10">
          <span className="material-symbols-outlined text-primary">movie_filter</span>
        </div>
        <div className="overflow-hidden">
          <p className="text-[10px] text-on-surface-variant tracking-widest">CURRENT PROJECT</p>
          <p className="font-headline text-lg text-primary leading-tight truncate">{project.name}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {STAGES.map((s, i) => {
          const isCurrent = i === currentIdx;
          const isDone = i < currentIdx || project.status === "done";
          const isFuture = i > currentIdx && project.status !== "done";
          return (
            <div
              key={s.name}
              className={
                "flex items-center justify-between px-4 py-3 rounded-full transition-all " +
                (isCurrent
                  ? "bg-primary-container text-on-primary-container shadow-md"
                  : "text-on-surface-variant hover:bg-surface-container-high") +
                (isFuture ? " opacity-50" : "")
              }
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                <span className="text-label-caps">{s.label}</span>
              </div>
              {isCurrent && project.status === "running" && (
                <span className="w-2 h-2 rounded-full bg-primary status-pulse" />
              )}
              {isDone && <span className="material-symbols-outlined text-[18px] text-primary">check</span>}
            </div>
          );
        })}
      </nav>

      <div className="pt-4 mt-auto border-t border-outline/5">
        <button 
          onClick={onRender}
          className="w-full py-3 bg-primary text-on-primary text-label-caps rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95"
        >
          RENDER FINAL
        </button>
      </div>
    </aside>
  );
}
