# Comet — video pipeline app

a web app around your existing video pipeline (`pipeline_v67.py`). paste a
script, pick a preset, press generate, watch it run, fix only the scenes that
fail, pause any time, and never spend past a budget cap.

---

## the most important thing to understand first

**vercel cannot run your pipeline.** vercel runs the frontend and short
functions only — no gpu, and a hard time limit far shorter than a render. your
pipeline needs a gpu (local z-image, sdxl, whisper, nvenc) and runs for minutes
to hours. so the app is in three parts:

```
  frontend (vercel)   <-- reads/writes -->   supabase (db + storage + realtime)
                                                   ^
                                                   |  writes scenes, cost, logs
                                            worker (your gpu box / runpod)
                                            = pipeline_v67.py, wrapped by worker.py
```

supabase is the shared brain. the worker writes progress to supabase; the
frontend shows it live via supabase realtime.

---

## recommended for 0 users: start local, go cloud later

at 0 users you do not need vercel or supabase yet. the worker has to be on the
gpu box anyway, so the simplest real product is to run **everything on the gpu
box** and open `localhost`. this app is built so the **same frontend works both
ways**: if the two supabase env vars are missing, it runs on built-in mock data
and local state. add supabase + vercel the day you want it reachable from your
phone or by a second person.

- **local-first (simplest):** run the frontend with `npm run dev` on the gpu box,
  run the worker next to it, skip supabase. zero hosting cost.
- **cloud (when you need remote access):** the full github + vercel + supabase
  setup below.

---

## what runs where

| part      | where it runs            | what it does                          |
|-----------|--------------------------|---------------------------------------|
| frontend  | vercel (or localhost)    | the screens you click                 |
| database  | supabase (or skip)       | projects, scenes, cost, logs          |
| worker    | your gpu box / runpod     | the actual pipeline (gpu + ffmpeg)    |

---

## setup A — local-first (no cloud, recommended to start)

```bash
# 1. frontend
cd comet
npm install
npm run dev            # opens http://localhost:3000  (runs on mock data)

# 2. worker (new terminal, on the same gpu box)
cd comet/worker
pip install -r requirements.txt
# put pipeline_v67.py in this folder
# (worker needs supabase to feed the UI; for pure-local you can run the
#  pipeline directly as before, and use the UI just to drive settings)
```

for a true local database without supabase, swap the worker's REST calls for a
local sqlite file. that is the next step if you want fully offline; ask and it
can be added.

---

## setup B — cloud (github + vercel + supabase)

### 1. supabase (the database)
1. go to supabase.com, create a project (free tier).
2. open **SQL Editor -> New query**, paste all of `supabase/schema.sql`, run it.
3. open **Project Settings -> API** and copy two values:
   - Project URL
   - `anon` public key (for the frontend)
   - `service_role` key (for the worker only — keep secret)

### 2. github (the code)
```bash
cd comet
git init
git add .
git commit -m "comet video pipeline app"
# make an empty repo on github first, then:
git remote add origin https://github.com/YOUR-NAME/comet.git
git branch -M main
git push -u origin main
```

### 3. vercel (the frontend)
1. go to vercel.com -> **Add New -> Project** -> import your github repo.
2. framework preset: **Next.js** (auto-detected).
3. add two environment variables (Settings -> Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL` = your supabase project url
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your supabase anon key
4. deploy. you get a public url.

### 4. worker (the gpu box)
on your gpu machine (or a rented runpod/vast box):
```bash
cd comet/worker
cp ../.env.example .env      # fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, provider keys
pip install -r requirements.txt
# put pipeline_v67.py here
python worker.py             # it polls supabase and runs jobs
```

now: open the vercel url, create a project, press generate. the worker picks it
up, runs the pipeline, and the page updates live.

---

## i could not do these for you

pushing to github, deploying to vercel, and creating the supabase project all
need your own accounts and logins, so you have to run those steps. the commands
above are exact. everything else (the app, the schema, the worker) is built.

---

## where to plug in per-scene live updates

`worker/worker.py` runs the pipeline straight through today. for the live
scene-by-scene grid, refactor `pipeline_v67.py` so each image call fires a
callback that writes a row to the `scenes` table and a row to `costs` on each
paid image, and calls `check_paused()` between scenes. the worker file shows
exactly where. this is the one piece of real wiring left to make the grid
update image-by-image instead of all at once.

---

## security notes

- the **service_role** key (full write) lives only on the gpu box, never in the
  frontend or git.
- provider API keys (wavespeed, groq, etc.) live in the worker's `.env` on the
  gpu box, never in the browser. the settings screen only shows whether a key
  exists and its balance, never the key itself.
- the cost ledger (`costs` table) records every paid call, so you have proof if a
  provider over-charges — the exact thing that caught the earlier wavespeed
  double-charge.
