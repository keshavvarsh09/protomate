"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/lib/data";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [inputType, setInputType] = useState<"script" | "topic">("script");
  const [scriptText, setScriptText] = useState("");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("");
  const [layout, setLayout] = useState("fullscreen");
  const [fontStyle, setFontStyle] = useState("opensans");
  const [highlight, setHighlight] = useState("blue");
  const [budgetCap, setBudgetCap] = useState(2.00);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Please enter a project name");
    setLoading(true);

    try {
      const proj = await createProject({
        name,
        script_text: inputType === "script" ? scriptText : "",
        topic: inputType === "topic" ? topic : "",
        style,
        layout,
        font_style: fontStyle,
        highlight,
        budget_cap: Number(budgetCap),
      });

      router.push(`/project/${proj.id}`);
    } catch (err: any) {
      console.error(err);
      alert("Failed to create project: " + (err.message || String(err)));
      setLoading(false);
    }
  };

  return (
    <main className="pt-16 pb-24 px-margin-desktop max-w-4xl mx-auto">
      <header className="mb-12">
        <h1 className="font-headline text-[48px] text-primary mb-4 leading-tight">Create new video</h1>
        <p className="text-on-surface-variant text-body-lg">
          Configure presets, paste your script, and kick off the automation pipeline.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Project Name */}
        <div className="glass-panel p-8 rounded-2xl border border-outline/5 space-y-4">
          <label className="block text-label-caps text-primary uppercase tracking-wide">Project Name</label>
          <input
            type="text"
            required
            placeholder="e.g. Roman Aqueducts Explained"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline/10 rounded-xl py-4 px-5 text-on-surface text-lg focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
          />
        </div>

        {/* Input Option Selection */}
        <div className="glass-panel p-8 rounded-2xl border border-outline/5 space-y-6">
          <div className="flex justify-between items-center">
            <label className="block text-label-caps text-primary uppercase tracking-wide">Script Input Mode</label>
            <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline/5">
              <button
                type="button"
                onClick={() => setInputType("script")}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  inputType === "script"
                    ? "bg-white text-primary shadow-sm"
                    : "text-on-surface-variant/60 hover:text-on-surface"
                }`}
              >
                Direct Script
              </button>
              <button
                type="button"
                onClick={() => setInputType("topic")}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  inputType === "topic"
                    ? "bg-white text-primary shadow-sm"
                    : "text-on-surface-variant/60 hover:text-on-surface"
                }`}
              >
                Topic / Idea
              </button>
            </div>
          </div>

          {inputType === "script" ? (
            <div className="space-y-3">
              <textarea
                required
                rows={8}
                placeholder="Paste your narration script here. Separate scenes with double line breaks. The worker will generate B-roll scenes and narrations from this script."
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline/10 rounded-xl py-4 px-5 text-on-surface text-base focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-sans leading-relaxed"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                required
                rows={4}
                placeholder="e.g. Write a script about how Roman aqueducts worked using gravity alone. Focus on the siphon mechanism and how clean it was."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline/10 rounded-xl py-4 px-5 text-on-surface text-base focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-sans leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Style & Presets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Visual Style Handbook */}
          <div className="glass-panel p-8 rounded-2xl border border-outline/5 space-y-4">
            <label className="block text-label-caps text-primary uppercase tracking-wide">Image Style Prompt</label>
            <input
              type="text"
              placeholder="e.g. flat minimal 2d vector art, pastel colors"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline/10 rounded-xl py-3 px-4 text-on-surface text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
            />
            <p className="text-[11px] text-on-surface-variant/60 font-mono">
              Appended to B-roll prompts to enforce a unified art style.
            </p>
          </div>

          {/* Budget Cap */}
          <div className="glass-panel p-8 rounded-2xl border border-outline/5 space-y-4">
            <label className="block text-label-caps text-primary uppercase tracking-wide">Budget Cap</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
              <input
                type="number"
                step="0.50"
                min="0.50"
                value={budgetCap}
                onChange={(e) => setBudgetCap(Number(e.target.value))}
                className="w-full bg-surface-container-lowest border border-outline/10 rounded-xl py-3 pl-8 pr-4 text-on-surface font-mono text-base focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
              />
            </div>
            <p className="text-[11px] text-on-surface-variant/60 font-mono">
              Maximum spend limit. Run pauses automatically once reached.
            </p>
          </div>
        </div>

        {/* Formatting Presets */}
        <div className="glass-panel p-8 rounded-2xl border border-outline/5 space-y-8">
          <h3 className="text-label-caps text-primary uppercase tracking-widest border-b border-outline/5 pb-4">
            Formatting &amp; Rendering Presets
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Layout */}
            <div className="space-y-3">
              <label className="block text-label-caps text-on-surface-variant/60 uppercase tracking-wide">Layout</label>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline/10 rounded-xl py-3 px-4 text-on-surface text-sm focus:border-primary outline-none transition-all"
              >
                <option value="fullscreen">Fullscreen B-Roll</option>
                <option value="split">Split Screen</option>
                <option value="storygrid">Story Grid</option>
              </select>
            </div>

            {/* Font Style */}
            <div className="space-y-3">
              <label className="block text-label-caps text-on-surface-variant/60 uppercase tracking-wide">Typography</label>
              <select
                value={fontStyle}
                onChange={(e) => setFontStyle(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline/10 rounded-xl py-3 px-4 text-on-surface text-sm focus:border-primary outline-none transition-all"
              >
                <option value="opensans">Open Sans (Sans)</option>
                <option value="montserrat">Montserrat (Geo)</option>
                <option value="classic">PT Serif (Classic)</option>
              </select>
            </div>

            {/* Highlight Color */}
            <div className="space-y-3">
              <label className="block text-label-caps text-on-surface-variant/60 uppercase tracking-wide">Active Subtitle Highlight</label>
              <select
                value={highlight}
                onChange={(e) => setHighlight(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline/10 rounded-xl py-3 px-4 text-on-surface text-sm focus:border-primary outline-none transition-all"
              >
                <option value="blue">Blue</option>
                <option value="yellow">Yellow</option>
                <option value="pink">Pink</option>
                <option value="green">Green</option>
                <option value="orange">Orange</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="border border-outline/20 px-8 py-4 rounded-xl text-label-caps hover:bg-surface-variant transition-all font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-on-primary px-10 py-4 rounded-xl text-label-caps font-headline text-lg hover:shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-3 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">auto_awesome</span>
                <span>Generate Video</span>
              </>
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
