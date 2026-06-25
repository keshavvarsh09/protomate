#!/usr/bin/env python3
# =====================================================================
# COMET WORKER (runs on the GPU box, NOT on vercel)
# what it does:
#   1. polls supabase for any project whose status = 'running'
#   2. runs your existing pipeline (pipeline_v67.py) for that project stage
#   3. writes scene status, logs, cost, and stage progress back to supabase
#   4. the vercel frontend shows all of it live via supabase realtime
#
# why this exists: vercel cannot run gpu / ffmpeg / long jobs. this can.
#
# setup:
#   pip install -r requirements.txt
#   put pipeline_v67.py next to this file
#   set the env vars in .env (see .env.example)
#   python worker.py
# =====================================================================

import os
import time
import traceback
import subprocess
from pathlib import Path

import requests

# ---- config from env ----
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
# IMPORTANT: the worker uses the SERVICE ROLE key (full write access).
# this key stays ONLY on the gpu box. never put it in the frontend.
SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
POLL_SECONDS = int(os.environ.get("POLL_SECONDS", "5"))

HEAD = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


# ---- tiny supabase REST helpers (no SDK needed) ----
def sb_get(table, query=""):
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{table}?{query}", headers=HEAD, timeout=30)
    r.raise_for_status()
    return r.json()

def sb_patch(table, query, body):
    r = requests.patch(f"{SUPABASE_URL}/rest/v1/{table}?{query}", headers=HEAD, json=body, timeout=30)
    r.raise_for_status()
    return r.json()

def sb_insert(table, body):
    r = requests.post(f"{SUPABASE_URL}/rest/v1/{table}", headers=HEAD, json=body, timeout=30)
    r.raise_for_status()
    return r.json()


def log(project_id, level, message):
    print(f"[{level}] {message}")
    try:
        sb_insert("logs", {"project_id": project_id, "level": level, "message": message})
    except Exception as e:
        print("log write failed:", e)

def set_project(project_id, **fields):
    sb_patch("projects", f"id=eq.{project_id}", fields)

def add_cost(project_id, provider, amount, ref_id=None):
    sb_insert("costs", {"project_id": project_id, "provider": provider,
                        "amount": amount, "ref_id": ref_id})
    # bump the project total
    rows = sb_get("projects", f"id=eq.{project_id}&select=total_cost")
    cur = float(rows[0]["total_cost"]) if rows else 0.0
    set_project(project_id, total_cost=round(cur + amount, 4))


# ---- alibaba cloud dashscope (qwen) compatible mode ----
def generate_qwen_text(prompt, system_instruction="You are a helpful assistant."):
    api_key = os.environ.get("DASHSCOPE_API_KEY")
    if not api_key:
        return None
    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        # Using qwen2.5-7b-instruct for token efficiency and cost optimization
        payload = {
            "model": "qwen2.5-7b-instruct",
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 1000,
            "temperature": 0.3
        }
        r = requests.post(
            "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        r.raise_for_status()
        res = r.json()
        return res["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"Alibaba Qwen call failed: {e}")
        return None


# ---- the actual run, using your existing pipeline ----
def run_project(project):
    pid = project["id"]
    log(pid, "info", f"worker picked up project: {project['name']}")

    # budget guard before doing anything paid
    if float(project["total_cost"]) >= float(project["budget_cap"]):
        log(pid, "err", "budget guard: cap reached or exceeded. pausing project.")
        set_project(pid, status="paused")
        return

    try:
        # Check if pipeline_v67 exists
        pipeline_path = Path(__file__).parent / "pipeline_v67.py"
        if not pipeline_path.exists():
            msg = "Error: pipeline_v67.py not found in the worker directory. Please place your pipeline file in the same folder as worker.py."
            log(pid, "err", msg)
            set_project(pid, status="failed")
            return

        # import your pipeline (pipeline_v67.py must sit next to this file)
        from pipeline_v67 import VideoPipeline_V67

        # keys come from THIS box's env, never from the browser
        os.environ.setdefault("WAVESPEED_API_KEY", os.environ.get("WAVESPEED_API_KEY", ""))
        os.environ.setdefault("GROQ_API_KEY", os.environ.get("GROQ_API_KEY", ""))

        stage = project.get("current_stage", "script")

        # ------------------- STAGE: script -------------------
        if stage == "script":
            raw = project.get("script_text")
            topic = project.get("topic")

            # Generate script using Alibaba Qwen if script is empty but topic exists
            if (not raw or not raw.strip()) and topic and topic.strip():
                log(pid, "run", f"Generating script from topic using Alibaba Qwen: '{topic}'...")
                prompt = f"Write an engaging video script about: '{topic}'. Organize it into exactly 4 scenes. For each scene, write a visual B-roll prompt and the narration text. Output ONLY the scenes in this format:\n\n**SCENE 1**\n**VISUAL:** [description]\n**NARRATION:** [narration]\n\nDo not write any introductory or concluding remarks. Keep it concise."
                qwen_script = generate_qwen_text(prompt, "You are a professional video scriptwriter. Output strictly formatted scenes.")
                if qwen_script:
                    raw = qwen_script
                    set_project(pid, script_text=raw)
                    log(pid, "ok", "Script successfully generated via Alibaba Qwen.")
                else:
                    log(pid, "info", "Alibaba Qwen script gen failed. Using default fallback script.")
                    raw = f"**SCENE 1**\n**VISUAL:** A simple sketch of the concept: {topic}\n**NARRATION:** Today we are exploring {topic}."

            if not raw or not raw.strip():
                raw = "This is a placeholder scene narration because no script or topic was provided."

            set_project(pid, current_stage="scenes")
            log(pid, "run", "building scenes from script...")

            # Parse paragraphs to build scenes
            paragraphs = [p.strip() for p in raw.split("\n\n") if p.strip()]
            if not paragraphs:
                paragraphs = [p.strip() for p in raw.split("\n") if p.strip()]
            
            # Clear existing scenes (in case of retry)
            try:
                requests.delete(f"{SUPABASE_URL}/rest/v1/scenes?project_id=eq.{pid}", headers=HEAD, timeout=15)
            except Exception as e:
                print("Failed to clear old scenes:", e)

            # Pre-populate scenes
            for idx, para in enumerate(paragraphs):
                narration = para
                visual_prompt = "a visual representation of this scene"
                
                # Simple bold-tag parsing or line split
                if "VISUAL:" in para.upper() and "NARRATION:" in para.upper():
                    try:
                        parts = [line.strip() for line in para.split("\n") if line.strip()]
                        vis_line = [l for l in parts if "VISUAL:" in l.upper()][0]
                        nar_line = [l for l in parts if "NARRATION:" in l.upper()][0]
                        visual_prompt = vis_line.split(":", 1)[1].strip()
                        narration = nar_line.split(":", 1)[1].strip()
                    except Exception:
                        pass

                scene_body = {
                    "project_id": pid,
                    "order_index": idx + 1,
                    "narration": narration,
                    "visual_prompt": visual_prompt,
                    "image_status": "pending",
                    "cost": 0.0
                }
                try:
                    sb_insert("scenes", scene_body)
                except Exception as e:
                    print("Failed to insert scene:", e)

            log(pid, "ok", f"split script into {len(paragraphs)} scenes.")
            set_project(pid, current_stage="images")
            stage = "images"

        # Initialize the pipeline for subsequent stages
        pipe = VideoPipeline_V67(
            project_name=f"comet_{pid[:8]}",
            image_source=project.get("image_source", "zimage_hosted"),
            hosted_provider=project.get("hosted_provider", "wavespeed"),
            caption_style=str(project.get("caption_style", "2")),
            font_style=project.get("font_style", "opensans"),
            highlight_color=project.get("highlight", "blue"),
            fps=int(project.get("fps", 30)),
            zoom_total=float(project.get("zoom_total", 0.06)),
        )

        # ------------------- STAGE: images -------------------
        if stage == "images" or stage == "scenes":
            scenes_data = sb_get("scenes", f"project_id=eq.{pid}&order=order_index")
            if not scenes_data:
                log(pid, "info", "No scenes found. Resetting stage to script to recreate.")
                set_project(pid, current_stage="script")
                return

            pending_scenes = [s for s in scenes_data if s["image_status"] == "pending"]
            if pending_scenes:
                log(pid, "run", f"generating {len(pending_scenes)} pending B-roll images...")
                for s in pending_scenes:
                    # check if paused between scenes
                    if check_paused(pid):
                        log(pid, "info", "Pipeline paused by user request.")
                        return

                    sid = s["id"]
                    idx = s["order_index"]
                    
                    # Mark scene as running
                    sb_patch("scenes", f"id=eq.{sid}", {"image_status": "running"})
                    
                    style = project.get("style", "")
                    prompt = ", ".join(["keep margins of 8% from top and below and left and right, putting the content in the center", s["visual_prompt"]] + ([] if not style else [style]))
                    
                    log(pid, "info", f"Generating image for scene {idx}...")
                    success = pipe.fetch_image_single(idx, prompt)
                    
                    if success:
                        sb_patch("scenes", f"id=eq.{sid}", {"image_status": "done", "cost": 0.005})
                        add_cost(pid, "zimage_hosted", 0.005, f"scene_{sid}")
                        log(pid, "ok", f"Scene {idx} image generated.")
                    else:
                        sb_patch("scenes", f"id=eq.{sid}", {"image_status": "failed", "error_msg": "Image generation failed."})
                        log(pid, "err", f"Scene {idx} image generation failed.")
                        set_project(pid, status="failed")
                        return

            # Check if all scenes are done
            current_scenes = sb_get("scenes", f"project_id=eq.{pid}")
            undone = [s for s in current_scenes if s["image_status"] in ["pending", "running", "failed"]]
            if not undone:
                set_project(pid, current_stage="render")
                stage = "render"
            else:
                log(pid, "info", "Awaiting fix for failed or undone scenes.")
                set_project(pid, status="paused")
                return

        # ------------------- STAGE: render -------------------
        if stage == "render":
            scenes_data = sb_get("scenes", f"project_id=eq.{pid}&order=order_index")
            if not scenes_data:
                log(pid, "err", "No scenes found to compile.")
                set_project(pid, status="failed")
                return

            log(pid, "run", "generating narration audio and compiling video...")
            # format scenes for pipeline
            pipe_scenes = []
            for s in scenes_data:
                pipe_scenes.append({
                    "index": s["order_index"],
                    "visual_prompt": s["visual_prompt"],
                    "narration": s["narration"]
                })

            amp3 = pipe.generate_narration_oneshot(pipe_scenes)
            if not amp3 or not Path(amp3).exists() or Path(amp3).stat().st_size == 0:
                raise RuntimeError(f"Audio generation failed or empty: {amp3}")

            wav = pipe.audio_path / "oneshot_audio.wav"
            subprocess.run(["ffmpeg", "-y", "-i", str(amp3), "-ac", "1", "-ar", "16000", str(wav)], capture_output=True)

            video_path = pipe.assemble_reactive_video(
                pipe_scenes,
                amp3,
                wav,
                project.get("layout", "fullscreen")
            )

            if video_path:
                log(pid, "ok", f"Render complete: {Path(video_path).name}")
                set_project(pid, status="done", current_stage="export")
            else:
                log(pid, "err", "Rendering compiled no output video file.")
                set_project(pid, status="failed")

    except Exception as e:
        log(pid, "err", f"Run failed: {e}")
        traceback.print_exc()
        set_project(pid, status="failed")


def check_paused(project_id):
    """call this between scenes inside the pipeline to support pause."""
    rows = sb_get("projects", f"id=eq.{project_id}&select=status")
    return rows and rows[0]["status"] == "paused"


def main():
    print("comet worker online. polling supabase for 'running' projects...")
    while True:
        try:
            running = sb_get("projects", "status=eq.running&order=created_at.asc")
            for project in running:
                run_project(project)
        except Exception as e:
            print("poll error:", e)
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
