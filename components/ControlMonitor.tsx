"use client";

import { Project, LogLine } from "@/lib/types";

const levelColor: Record<LogLine["level"], string> = {
  ok: "text-primary",
  err: "text-error",
  run: "text-primary",
  info: "text-on-surface-variant",
};
const levelTag: Record<LogLine["level"], string> = {
  ok: "OK",
  err: "ERR",
  run: "RUN",
  info: "INFO",
};

export default function ControlMonitor({
  project,
  logs,
  onGenerate,
  onPause,
  onResume,
  onRender,
}: {
  project: Project;
  logs: LogLine[];
  onGenerate: () => void;
  onPause: () => void;
  onResume: () => void;
  onRender: () => void;
}) {
  const pct = project.budget_cap > 0 ? Math.min(100, (project.total_cost / project.budget_cap) * 100) : 0;
  const over = project.total_cost >= project.budget_cap;
  const running = project.status === "running";
  const paused = project.status === "paused";

  return (
    <aside className="fixed right-0 top-16 bottom-0 w-[340px] border-l border-outline/5 glass-panel flex flex-col p-8 overflow-hidden z-30">
      <h3 className="text-label-caps text-on-surface-variant mb-8 tracking-widest">CONTROL &amp; MONITOR</h3>

      <div className="space-y-3 mb-8">
        {!running && !paused && (
          <button
            onClick={onGenerate}
            className="w-full py-5 bg-primary text-on-primary rounded-xl hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined">auto_awesome</span>
            <span className="font-headline text-xl">Generate</span>
          </button>
        )}
        {running && (
          <button
            onClick={onPause}
            className="w-full py-5 bg-status-paused text-on-secondary rounded-xl hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined">pause</span>
            <span className="font-headline text-xl">Pause</span>
          </button>
        )}
        {paused && (
          <button
            onClick={onResume}
            className="w-full py-5 bg-primary text-on-primary rounded-xl hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined">play_arrow</span>
            <span className="font-headline text-xl">Resume</span>
          </button>
        )}
        <button
          onClick={onRender}
          className="w-full py-5 bg-surface border border-primary/10 text-primary rounded-xl hover:bg-primary-container/20 transition-colors flex items-center justify-center gap-3"
        >
          <span className="material-symbols-outlined">media_output</span>
          <span className="font-headline text-xl">Render</span>
        </button>
      </div>

      {/* cost meter */}
      <div className="mb-8 p-6 bg-surface-container-lowest rounded-2xl border border-outline/5 shadow-sm">
        <div className="flex justify-between items-end mb-4">
          <span className="text-label-caps text-on-surface-variant">PROJECT BUDGET</span>
          <span className="font-mono text-on-surface">
            ${project.total_cost.toFixed(2)}{" "}
            <span className="text-outline text-[11px]">/ ${project.budget_cap.toFixed(2)}</span>
          </span>
        </div>
        <div className="h-2 w-full bg-outline/10 rounded-full overflow-hidden">
          <div
            className={"h-full " + (over ? "bg-error" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
        {over && (
          <p className="mt-3 font-mono text-[10px] text-error text-center">
            budget cap reached. generation auto-paused.
          </p>
        )}
      </div>

      {/* live log */}
      <div className="flex-1 flex flex-col bg-surface-container-low rounded-2xl border border-outline/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-outline/5 bg-surface/50 backdrop-blur-md flex items-center justify-between">
          <span className="font-mono text-[11px] text-primary flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary status-pulse" />
            LIVE_LOG
          </span>
          <span className="material-symbols-outlined text-[16px] text-outline">terminal</span>
        </div>
        <div className="flex-1 p-5 font-mono text-[11px] space-y-2 overflow-y-auto terminal-scroll">
          {logs.length === 0 && <p className="opacity-40">no activity yet.</p>}
          {logs.map((l) => (
            <p key={l.id} className={levelColor[l.level]}>
              [{l.created_at}] <span className="font-bold">{levelTag[l.level]}</span> {l.message}
            </p>
          ))}
        </div>
      </div>
    </aside>
  );
}
