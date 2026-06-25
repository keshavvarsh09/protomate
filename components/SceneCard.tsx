"use client";

import { Scene } from "@/lib/types";

function fmt(t: number | null) {
  if (t == null) return "--:--";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SceneCard({
  scene,
  onRegenerate,
  onEdit,
}: {
  scene: Scene;
  onRegenerate: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const failed = scene.image_status === "failed";
  const running = scene.image_status === "running";

  return (
    <div
      className={
        "glass-panel rounded-xl overflow-hidden flex flex-col group transition-all hover:border-primary/20 hover:shadow-xl " +
        (failed ? "scene-card-error" : "")
      }
    >
      <div className="relative aspect-video bg-surface-container-low overflow-hidden flex items-center justify-center">
        {scene.image_url && !failed && !running && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={scene.image_url}
            alt={`scene ${scene.order_index}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        )}

        {!scene.image_url && !failed && !running && (
          <span className="material-symbols-outlined text-outline/40 text-[40px]">image</span>
        )}

        {failed && (
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-error text-[44px]">warning</span>
            <span className="text-label-caps text-error">GENERATION FAILED</span>
          </div>
        )}

        {running && (
          <div className="absolute inset-0 bg-surface/50 flex items-center justify-center backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-3 w-1/2">
              <div className="w-full h-1 rounded-full bg-outline/10 overflow-hidden">
                <div className="h-full shimmer" style={{ width: "65%" }} />
              </div>
              <span className="text-label-caps text-primary text-[10px]">GENERATING</span>
            </div>
          </div>
        )}

        <div className="absolute top-4 left-4 px-3 py-1 bg-surface/90 backdrop-blur-md rounded-full font-mono text-[10px] text-on-surface-variant">
          {fmt(scene.start_time)} - {fmt(scene.end_time)}
        </div>
        {scene.image_status === "done" && (
          <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface/90 backdrop-blur-md flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
          </div>
        )}
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <p className="text-label-caps text-on-surface-variant mb-2">
          SCENE {String(scene.order_index).padStart(2, "0")}
        </p>
        <p className="text-body-md text-on-surface mb-4 italic font-headline">{scene.narration}</p>

        {failed && scene.error_msg && (
          <div className="mb-4 p-4 bg-error/5 rounded-lg border border-error/10">
            <p className="font-mono text-[11px] text-error">{scene.error_msg}</p>
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-outline/5 flex justify-between items-center">
          <span className="font-mono text-[10px] text-outline truncate max-w-[45%]">
            {scene.image_provider ?? "no provider"}
          </span>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => onEdit(scene.id)}
              className="p-2 hover:bg-primary-container/20 rounded-full transition-colors text-primary"
              title="Edit prompt"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button
              onClick={() => onRegenerate(scene.id)}
              className={
                "flex items-center gap-2 text-label-caps hover:opacity-80 transition-opacity " +
                (failed ? "text-error" : "text-primary")
              }
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              REGENERATE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
