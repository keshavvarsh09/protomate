"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import StageRail from "@/components/StageRail";
import SceneCard from "@/components/SceneCard";
import ControlMonitor from "@/components/ControlMonitor";
import {
  getProject,
  getScenes,
  getLogs,
  updateProjectStatus,
  updateProjectStage,
  updateSceneStatus,
  updateScenePrompt,
  addProjectCost,
} from "@/lib/data";
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

  // Live updates from Supabase Realtime (if Supabase is active)
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

  // Local simulation runner (runs only if hasSupabase is false and project is running)
  useEffect(() => {
    if (hasSupabase || !project || project.status !== "running") return;

    const timer = setTimeout(async () => {
      const currentStage = project.current_stage;

      if (currentStage === "script") {
        // Move to scenes stage
        const updatedProj = { ...project, current_stage: "scenes" as const };
        setProject(updatedProj);
        await updateProjectStage(id, "scenes");

        const newLog: LogLine = {
          id: Math.random().toString(),
          project_id: id,
          level: "info",
          message: "worker picked up project locally",
          created_at: new Date().toLocaleTimeString(),
        };
        setLogs((prev) => [...prev, newLog]);
      } else if (currentStage === "scenes") {
        // Move to images stage
        const updatedProj = { ...project, current_stage: "images" as const };
        setProject(updatedProj);
        await updateProjectStage(id, "images");

        const newLog: LogLine = {
          id: Math.random().toString(),
          project_id: id,
          level: "run",
          message: "generating images + voice...",
          created_at: new Date().toLocaleTimeString(),
        };
        setLogs((prev) => [...prev, newLog]);
      } else if (currentStage === "images") {
        // Find first pending or running scene
        const nextScene = scenes.find((s) => s.image_status === "pending" || s.image_status === "running");
        if (nextScene) {
          if (nextScene.image_status === "pending") {
            // Mark running
            setScenes((arr) =>
              arr.map((s) => (s.id === nextScene.id ? { ...s, image_status: "running" } : s))
            );
            await updateSceneStatus(nextScene.id, "running", null);
          } else {
            // Mark done
            setScenes((arr) =>
              arr.map((s) => (s.id === nextScene.id ? { ...s, image_status: "done", cost: 0.005 } : s))
            );
            await updateSceneStatus(nextScene.id, "done", null);
            await addProjectCost(id, 0.005);
            setProject((p) => p ? { ...p, total_cost: p.total_cost + 0.005 } : null);

            const newLog: LogLine = {
              id: Math.random().toString(),
              project_id: id,
              level: "ok",
              message: `scene ${nextScene.order_index} generated in 3s`,
              created_at: new Date().toLocaleTimeString(),
            };
            setLogs((prev) => [...prev, newLog]);
          }
        } else {
          // All scenes done, move to render
          const updatedProj = { ...project, current_stage: "render" as const };
          setProject(updatedProj);
          await updateProjectStage(id, "render");
        }
      } else if (currentStage === "render") {
        // Move to export / done
        const updatedProj = { ...project, current_stage: "export" as const, status: "done" as const };
        setProject(updatedProj);
        await updateProjectStage(id, "export");
        await updateProjectStatus(id, "done");

        const newLog: LogLine = {
          id: Math.random().toString(),
          project_id: id,
          level: "ok",
          message: "render complete: comet_local.mp4",
          created_at: new Date().toLocaleTimeString(),
        };
        setLogs((prev) => [...prev, newLog]);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [project, scenes, hasSupabase, id]);

  // Actions: write intent to database (or localStorage fallsback)
  async function setStatus(status: Project["status"]) {
    await updateProjectStatus(id, status);
    setProject((p) => (p ? { ...p, status } : p));

    // Log the change locally
    if (!hasSupabase) {
      const msg = status === "running" ? "Project execution started / resumed." : "Project execution paused.";
      const newLog: LogLine = {
        id: Math.random().toString(),
        project_id: id,
        level: (status === "running" ? "run" : "info") as any,
        message: msg,
        created_at: new Date().toLocaleTimeString(),
      };
      setLogs((prev) => [...prev, newLog]);
    }
  }

  async function handleGenerate() {
    await updateProjectStage(id, "script");
    await updateProjectStatus(id, "running");
    setProject((p) => p ? { ...p, status: "running", current_stage: "script", total_cost: 0 } : null);
    if (!hasSupabase) {
      const newLog: LogLine = {
        id: Math.random().toString(),
        project_id: id,
        level: "run",
        message: "Starting full generation pipeline...",
        created_at: new Date().toLocaleTimeString(),
      };
      setLogs([newLog]);
    }
  }

  async function handleRender() {
    await updateProjectStage(id, "render");
    await updateProjectStatus(id, "running");
    setProject((p) => p ? { ...p, status: "running", current_stage: "render" } : null);
    if (!hasSupabase) {
      const newLog: LogLine = {
        id: Math.random().toString(),
        project_id: id,
        level: "run",
        message: "Compiling and rendering final video...",
        created_at: new Date().toLocaleTimeString(),
      };
      setLogs((prev) => [...prev, newLog]);
    }
  }

  async function regenerate(sceneId: string) {
    await updateSceneStatus(sceneId, "pending", null);
    await updateProjectStage(id, "images");
    setScenes((arr) =>
      arr.map((s) => (s.id === sceneId ? { ...s, image_status: "pending", error_msg: null } : s))
    );
    setProject((p) => p ? { ...p, current_stage: "images" } : null);
    if (!hasSupabase) {
      const newLog: LogLine = {
        id: Math.random().toString(),
        project_id: id,
        level: "info",
        message: `Scene regeneration requested.`,
        created_at: new Date().toLocaleTimeString(),
      };
      setLogs((prev) => [...prev, newLog]);
    }
  }

  async function editPrompt(sceneId: string) {
    const scene = scenes.find((s) => s.id === sceneId);
    const next = window.prompt("Edit the visual prompt for this scene:", scene?.visual_prompt ?? "");
    if (next == null) return;
    await updateScenePrompt(sceneId, next);
    setScenes((arr) => arr.map((s) => (s.id === sceneId ? { ...s, visual_prompt: next } : s)));
    if (window.confirm("Do you want to regenerate the image for this scene now?")) {
      await regenerate(sceneId);
    }
  }

  if (!project) {
    return <div className="ml-64 p-10 text-on-surface-variant">loading project...</div>;
  }

  const stageIndex =
    ["script", "scenes", "images", "voice", "captions", "render", "export"].indexOf(project.current_stage) + 1;
  const doneImages = scenes.filter((s) => s.image_status === "done").length;

  return (
    <>
      <StageRail project={project} onRender={handleRender} />

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
        onGenerate={handleGenerate}
        onPause={() => setStatus("paused")}
        onResume={() => setStatus("running")}
        onRender={handleRender}
      />
    </>
  );
}
