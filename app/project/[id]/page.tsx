"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import StageRail from "@/components/StageRail";
import SceneCard from "@/components/SceneCard";
import ControlMonitor from "@/components/ControlMonitor";
import { getProject, getScenes, getLogs } from "@/lib/data";
import { supabase, hasSupabase } from "@/lib/supabase";
import { Project, Scene, LogLine } from "@/lib/types";

export default function WorkspacePage() {
  const params = useParams();
  const id = String(params.id);
  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);

  const load = useCallback(async () => {
    setProject(await getProject(id));
    setScenes(await getScenes(id));
    setLogs(await getLogs(id));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // live updates from supabase realtime (no websocket server needed)
  useEffect(() => {
    if (!hasSupabase || !supabase) return;
    const ch = supabase
      .channel(`project-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "scenes", filter: `project_id=eq.${id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "projects", filter: `id=eq.${id}` }, load)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "logs", filter: `project_id=eq.${id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, load]);

  // actions: write intent to supabase; the gpu worker polls and acts.
  async function setStatus(status: Project["status"]) {
    if (hasSupabase && supabase) {
      await supabase.from("projects").update({ status }).eq("id", id);
    }
    setProject((p) => (p ? { ...p, status } : p));
  }

  async function regenerate(sceneId: string) {
    if (hasSupabase && supabase) {
      await supabase.from("scenes").update({ image_status: "pending", error_msg: null }).eq("id", sceneId);
    }
    setScenes((arr) =>
      arr.map((s) => (s.id === sceneId ? { ...s, image_status: "pending", error_msg: null } : s))
    );
  }

  function editPrompt(sceneId: string) {
    const scene = scenes.find((s) => s.id === sceneId);
    const next = window.prompt("Edit the visual prompt for this scene:", scene?.visual_prompt ?? "");
    if (next == null) return;
    if (hasSupabase && supabase) {
      supabase.from("scenes").update({ visual_prompt: next }).eq("id", sceneId);
    }
    setScenes((arr) => arr.map((s) => (s.id === sceneId ? { ...s, visual_prompt: next } : s)));
  }

  if (!project) {
    return <div className="ml-64 p-10 text-on-surface-variant">loading project...</div>;
  }

  const stageIndex =
    ["script", "scenes", "images", "voice", "captions", "render", "export"].indexOf(project.current_stage) + 1;
  const doneImages = scenes.filter((s) => s.image_status === "done").length;

  return (
    <>
      <StageRail project={project} />

      <main className="ml-64 mr-[340px] p-10 overflow-y-auto bg-background min-h-screen">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <p className="text-label-caps text-primary mb-2">
              STAGE {String(stageIndex).padStart(2, "0")} / 07
            </p>
            <h2 className="font-headline text-6xl text-on-surface tracking-tight capitalize">
              {project.current_stage === "images" ? "Scene grid" : project.current_stage}
            </h2>
            <p className="mt-3 text-on-surface-variant font-mono text-[11px]">
              images {doneImages} / {scenes.length}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-gutter pb-12">
          {scenes.map((s) => (
            <SceneCard key={s.id} scene={s} onRegenerate={regenerate} onEdit={editPrompt} />
          ))}
          {scenes.length === 0 && (
            <div className="col-span-full glass-panel rounded-xl p-12 text-center text-on-surface-variant">
              no scenes yet. press Generate to build them from the script.
            </div>
          )}
        </div>
      </main>

      <ControlMonitor
        project={project}
        logs={logs}
        onGenerate={() => setStatus("running")}
        onPause={() => setStatus("paused")}
        onResume={() => setStatus("running")}
        onRender={() => setStatus("running")}
      />
    </>
  );
}
