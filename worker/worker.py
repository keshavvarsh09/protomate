#!/usr/bin/env python3
# =====================================================================
# COMET WORKER (runs on the GPU box, NOT on vercel)
# what it does:
#   1. polls supabase for any project whose status = 'running'
#   2. runs your existing pipeline (pipeline_v67.py) for that project
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


# ---- the actual run, using your existing pipeline ----
def run_project(project):
    pid = project["id"]
    log(pid, "info", f"worker picked up project: {project['name']}")

    # budget guard before doing anything paid
    if float(project["total_cost"]) >= float(project["budget_cap"]):
        log(pid, "err", "budget cap already reached. pausing.")
        set_project(pid, status="paused")
        return

    try:
        # import your pipeline (pipeline_v67.py must sit next to this file)
        from pipeline_v67 import VideoPipeline_V67

        # keys come from THIS box's env, never from the browser
        os.environ.setdefault("WAVESPEED_API_KEY", os.environ.get("WAVESPEED_API_KEY", ""))
        os.environ.setdefault("GROQ_API_KEY", os.environ.get("GROQ_API_KEY", ""))

        raw = project.get("script_text") or f"Generate a video script about: {project.get('topic','')}"

        set_project(pid, status="running", current_stage="scenes")
        log(pid, "run", "building scenes from script...")

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

        # ---- this is where you wire per-scene callbacks ----
        # the simplest integration: run the whole pipeline, then mark done.
        # the better integration (recommended): refactor pipeline_v67 so each
        # scene image calls a callback that does:
        #     sb_insert("scenes", {...})  on create
        #     sb_patch("scenes", ...)     on done/fail
        #     add_cost(pid, provider, 0.005, prediction_id)  on each paid image
        #     check_paused(pid)           between scenes for pause support
        #
        # for now we run it straight through:
        set_project(pid, current_stage="images")
        log(pid, "run", "generating images + voice...")

        video_path = pipe.run(
            transcript=raw,
            style_handbook=project.get("style", ""),
            layout_option=project.get("layout", "fullscreen"),
        )

        set_project(pid, current_stage="render")
        if video_path:
            log(pid, "ok", f"render complete: {Path(video_path).name}")
            set_project(pid, status="done", current_stage="export")
        else:
            log(pid, "err", "render returned no file")
            set_project(pid, status="failed")

    except Exception as e:
        log(pid, "err", f"run failed: {e}")
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
