// these match the supabase tables in supabase/schema.sql

export type StageName =
  | "script"
  | "scenes"
  | "images"
  | "voice"
  | "captions"
  | "render"
  | "export";

export type Status = "pending" | "running" | "paused" | "done" | "failed";

export interface Project {
  id: string;
  name: string;
  status: Status;
  current_stage: StageName;
  total_cost: number;
  budget_cap: number;
  thumbnail_url: string | null;
  created_at: string;
}

export interface Scene {
  id: string;
  project_id: string;
  order_index: number;
  narration: string;
  visual_prompt: string;
  image_url: string | null;
  image_provider: string | null;
  image_status: Status;
  error_msg: string | null;
  cost: number;
  start_time: number | null; // seconds into the video
  end_time: number | null;
}

export interface LogLine {
  id: string;
  project_id: string;
  level: "ok" | "err" | "run" | "info";
  message: string;
  created_at: string;
}

export interface ProviderKey {
  provider: string;
  label: string;
  has_key: boolean;
  balance_text: string | null;
  balance_state: "good" | "low" | "expired" | "unknown";
}
