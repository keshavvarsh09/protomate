import { supabase, hasSupabase } from "./supabase";
import { Project, Scene, LogLine, ProviderKey, Status, StageName } from "./types";

// ---------------- mock data (used when supabase is not configured) -------------
const mockProjects: Project[] = [
  {
    id: "1",
    name: "We Heat the Person, Not the Room",
    status: "running",
    current_stage: "images",
    total_cost: 0.21,
    budget_cap: 2.0,
    thumbnail_url: null,
    created_at: "2026-06-25",
  },
  {
    id: "2",
    name: "Roman Aqueducts Explained",
    status: "done",
    current_stage: "export",
    total_cost: 0.53,
    budget_cap: 2.0,
    thumbnail_url: null,
    created_at: "2026-06-22",
  },
  {
    id: "3",
    name: "Why Old Homes Stay Cool",
    status: "paused",
    current_stage: "images",
    total_cost: 0.18,
    budget_cap: 1.0,
    thumbnail_url: null,
    created_at: "2026-06-20",
  },
];

const mockScenes: Scene[] = [
  {
    id: "s1", project_id: "1", order_index: 1,
    narration: "You can hear it. The low rumble, the click, the warm air pushing through the vents.",
    visual_prompt: "a cozy japanese room at night, warm air rising, soft lamp light",
    image_url: null, image_provider: "zimage_hosted", image_status: "done",
    error_msg: null, cost: 0.005, start_time: 0, end_time: 5,
  },
  {
    id: "s2", project_id: "1", order_index: 2,
    narration: "The thermostat says 70. You set it to 70. And your feet are still cold.",
    visual_prompt: "close up of a wall thermostat reading 70, warm dim interior",
    image_url: null, image_provider: "zimage_hosted", image_status: "done",
    error_msg: null, cost: 0.005, start_time: 5, end_time: 9,
  },
  {
    id: "s3", project_id: "1", order_index: 3,
    narration: "You pull the blanket tighter, and you do the math you do not want to do.",
    visual_prompt: "person under a blanket, heating bill on the table, soft window light",
    image_url: null, image_provider: "zimage_hosted", image_status: "failed",
    error_msg: "429 rate-limited by provider. retry, or lower request speed in settings.",
    cost: 0.0, start_time: 9, end_time: 14,
  },
  {
    id: "s4", project_id: "1", order_index: 4,
    narration: "So you turn the thermostat down, put on a sweater, and sit a little cold on purpose.",
    visual_prompt: "person adjusting a sweater near a window, calm winter mood",
    image_url: null, image_provider: "zimage_hosted", image_status: "running",
    error_msg: null, cost: 0.0, start_time: 14, end_time: 18,
  },
];

const mockLogs: LogLine[] = [
  { id: "l1", project_id: "1", level: "info", message: "project loaded: We Heat the Person", created_at: "14:22:01" },
  { id: "l2", project_id: "1", level: "ok", message: "scene 01 generated in 4s", created_at: "14:23:45" },
  { id: "l3", project_id: "1", level: "ok", message: "scene 02 generated in 3s", created_at: "14:24:30" },
  { id: "l4", project_id: "1", level: "err", message: "scene 03: provider 429 rate-limited", created_at: "14:25:12" },
  { id: "l5", project_id: "1", level: "run", message: "generating scene 04 ...", created_at: "14:26:00" },
];

const mockProviders: ProviderKey[] = [
  { provider: "groq", label: "Groq (script)", has_key: true, balance_text: "free tier active", balance_state: "good" },
  { provider: "zimage_hosted", label: "Z-Image (WaveSpeed)", has_key: true, balance_text: "$0.72 remaining", balance_state: "good" },
  { provider: "genaipro", label: "GenAIPro (voice)", has_key: false, balance_text: "not connected", balance_state: "unknown" },
  { provider: "gemini", label: "Gemini (imglink)", has_key: false, balance_text: "free tier", balance_state: "low" },
];

// ---------------- fetchers -----------------------------------------------------
export async function getProjects(): Promise<Project[]> {
  if (!hasSupabase || !supabase) {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("comet_projects");
      if (stored) return JSON.parse(stored);
    }
    return mockProjects;
  }
  const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
  return (data as Project[]) ?? mockProjects;
}

export async function getProject(id: string): Promise<Project | null> {
  if (!hasSupabase || !supabase) {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("comet_projects");
      if (stored) {
        const list = JSON.parse(stored) as Project[];
        return list.find((p) => p.id === id) ?? null;
      }
    }
    return mockProjects.find((p) => p.id === id) ?? null;
  }
  const { data } = await supabase.from("projects").select("*").eq("id", id).single();
  return (data as Project) ?? null;
}

export async function getScenes(projectId: string): Promise<Scene[]> {
  if (!hasSupabase || !supabase) {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("comet_scenes");
      if (stored) {
        const list = JSON.parse(stored) as Scene[];
        return list.filter((s) => s.project_id === projectId);
      }
    }
    return mockScenes.filter((s) => s.project_id === projectId);
  }
  const { data } = await supabase.from("scenes").select("*").eq("project_id", projectId).order("order_index");
  return (data as Scene[]) ?? [];
}

export async function getLogs(projectId: string): Promise<LogLine[]> {
  if (!hasSupabase || !supabase) {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("comet_logs");
      if (stored) {
        const list = JSON.parse(stored) as LogLine[];
        return list.filter((l) => l.project_id === projectId);
      }
    }
    return mockLogs.filter((l) => l.project_id === projectId);
  }
  const { data } = await supabase.from("logs").select("*").eq("project_id", projectId).order("created_at").limit(50);
  return (data as LogLine[]) ?? [];
}

export async function getProviders(): Promise<ProviderKey[]> {
  if (!hasSupabase || !supabase) return mockProviders;
  const { data } = await supabase.from("provider_status").select("*");
  return (data as ProviderKey[]) ?? mockProviders;
}

export async function createProject(project: {
  name: string;
  script_text: string;
  topic: string;
  style: string;
  layout: string;
  font_style: string;
  highlight: string;
  budget_cap: number;
}): Promise<Project> {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: project.name,
        script_text: project.script_text,
        topic: project.topic,
        style: project.style,
        layout: project.layout,
        font_style: project.font_style,
        highlight: project.highlight,
        budget_cap: project.budget_cap,
        status: "running",
        current_stage: "script",
      })
      .select()
      .single();
    if (error) throw error;
    return data as Project;
  } else {
    const id = Math.random().toString(36).substring(2, 9);
    const newProj: Project = {
      id,
      name: project.name || "Untitled Video",
      status: "running",
      current_stage: "script",
      total_cost: 0,
      budget_cap: project.budget_cap || 2.0,
      thumbnail_url: null,
      created_at: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("comet_projects");
      const list = stored ? JSON.parse(stored) : [...mockProjects];
      list.unshift(newProj);
      localStorage.setItem("comet_projects", JSON.stringify(list));

      // Parse paragraphs to make actual scenes if they pasted a script
      let paragraphs = (project.script_text || "")
        .split("\n\n")
        .map((p) => p.trim())
        .filter(Boolean);
      if (paragraphs.length === 0) {
        paragraphs = (project.script_text || "")
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean);
      }
      if (paragraphs.length === 0) {
        paragraphs = ["This is a mock scene narration generated locally."];
      }

      const mockScenesForNew = paragraphs.map((para, index) => {
        let narration = para;
        let visual_prompt = "a clean simple sketch style illustration of the concept";
        if (para.toUpperCase().includes("VISUAL:") && para.toUpperCase().includes("NARRATION:")) {
          try {
            const parts = para.split("\n").map(l => l.trim()).filter(Boolean);
            const vis_line = parts.find(l => l.toUpperCase().includes("VISUAL:"));
            const nar_line = parts.find(l => l.toUpperCase().includes("NARRATION:"));
            if (vis_line) visual_prompt = vis_line.split(":", 2)[1].trim();
            if (nar_line) narration = nar_line.split(":", 2)[1].trim();
          } catch (e) {}
        }
        return {
          id: `s-${id}-${index + 1}`,
          project_id: id,
          order_index: index + 1,
          narration,
          visual_prompt,
          image_url: null,
          image_provider: "zimage_hosted",
          image_status: "pending" as const,
          error_msg: null,
          cost: 0.0,
          start_time: index * 5,
          end_time: (index + 1) * 5,
        };
      });

      const scenesStored = localStorage.getItem("comet_scenes");
      const scenesList = scenesStored ? JSON.parse(scenesStored) : [...mockScenes];
      scenesList.push(...mockScenesForNew);
      localStorage.setItem("comet_scenes", JSON.stringify(scenesList));
    }

    return newProj;
  }
}

// ---------------- mutations -----------------------------------------------------

export async function updateProjectStatus(id: string, status: Status): Promise<void> {
  if (hasSupabase && supabase) {
    await supabase.from("projects").update({ status }).eq("id", id);
  } else {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("comet_projects");
      if (stored) {
        const list = JSON.parse(stored) as Project[];
        const updated = list.map((p) => (p.id === id ? { ...p, status } : p));
        localStorage.setItem("comet_projects", JSON.stringify(updated));
      }
    }
  }
}

export async function updateProjectStage(id: string, stage: StageName): Promise<void> {
  if (hasSupabase && supabase) {
    await supabase.from("projects").update({ current_stage: stage }).eq("id", id);
  } else {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("comet_projects");
      if (stored) {
        const list = JSON.parse(stored) as Project[];
        const updated = list.map((p) => (p.id === id ? { ...p, current_stage: stage } : p));
        localStorage.setItem("comet_projects", JSON.stringify(updated));
      }
    }
  }
}

export async function addProjectCost(id: string, amount: number): Promise<void> {
  if (hasSupabase && supabase) {
    // handled on supabase / worker side, but we can do an optimistic write
    const { data } = await supabase.from("projects").select("total_cost").eq("id", id).single();
    const cur = data ? Number(data.total_cost) : 0;
    await supabase.from("projects").update({ total_cost: cur + amount }).eq("id", id);
  } else {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("comet_projects");
      if (stored) {
        const list = JSON.parse(stored) as Project[];
        const updated = list.map((p) => (p.id === id ? { ...p, total_cost: Number((p.total_cost + amount).toFixed(4)) } : p));
        localStorage.setItem("comet_projects", JSON.stringify(updated));
      }
    }
  }
}

export async function updateSceneStatus(sceneId: string, image_status: Status, error_msg: string | null): Promise<void> {
  if (hasSupabase && supabase) {
    await supabase.from("scenes").update({ image_status, error_msg }).eq("id", sceneId);
  } else {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("comet_scenes");
      if (stored) {
        const list = JSON.parse(stored) as Scene[];
        const updated = list.map((s) => (s.id === sceneId ? { ...s, image_status, error_msg } : s));
        localStorage.setItem("comet_scenes", JSON.stringify(updated));
      }
    }
  }
}

export async function updateScenePrompt(sceneId: string, visual_prompt: string): Promise<void> {
  if (hasSupabase && supabase) {
    await supabase.from("scenes").update({ visual_prompt }).eq("id", sceneId);
  } else {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("comet_scenes");
      if (stored) {
        const list = JSON.parse(stored) as Scene[];
        const updated = list.map((s) => (s.id === sceneId ? { ...s, visual_prompt } : s));
        localStorage.setItem("comet_scenes", JSON.stringify(updated));
      }
    }
  }
}
