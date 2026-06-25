import { supabase, hasSupabase } from "./supabase";
import { Project, Scene, LogLine, ProviderKey } from "./types";

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
  if (!hasSupabase || !supabase) return mockProjects;
  const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
  return (data as Project[]) ?? mockProjects;
}

export async function getProject(id: string): Promise<Project | null> {
  if (!hasSupabase || !supabase) return mockProjects.find((p) => p.id === id) ?? mockProjects[0];
  const { data } = await supabase.from("projects").select("*").eq("id", id).single();
  return (data as Project) ?? null;
}

export async function getScenes(projectId: string): Promise<Scene[]> {
  if (!hasSupabase || !supabase) return mockScenes.filter((s) => s.project_id === projectId);
  const { data } = await supabase.from("scenes").select("*").eq("project_id", projectId).order("order_index");
  return (data as Scene[]) ?? [];
}

export async function getLogs(projectId: string): Promise<LogLine[]> {
  if (!hasSupabase || !supabase) return mockLogs.filter((l) => l.project_id === projectId);
  const { data } = await supabase.from("logs").select("*").eq("project_id", projectId).order("created_at").limit(50);
  return (data as LogLine[]) ?? [];
}

export async function getProviders(): Promise<ProviderKey[]> {
  if (!hasSupabase || !supabase) return mockProviders;
  const { data } = await supabase.from("provider_status").select("*");
  return (data as ProviderKey[]) ?? mockProviders;
}
