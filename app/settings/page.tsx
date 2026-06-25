import { getProviders } from "@/lib/data";

export const dynamic = "force-dynamic";

const dot: Record<string, string> = {
  good: "bg-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.3)]",
  low: "bg-secondary shadow-[0_0_10px_rgba(145,74,59,0.3)]",
  expired: "bg-error shadow-[0_0_10px_rgba(186,26,26,0.3)]",
  unknown: "bg-outline",
};

export default async function SettingsPage() {
  const providers = await getProviders();

  return (
    <main className="pt-16 px-margin-desktop pb-24 min-h-screen max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
        <div className="max-w-2xl">
          <h1 className="font-headline text-[48px] text-on-surface mb-4 leading-tight">API keys</h1>
          <p className="text-on-surface-variant text-body-lg">
            Enter each provider key once. Set a budget cap so a run can never spend past it.
          </p>
        </div>
        <div className="glass-panel p-8 rounded-2xl w-full lg:w-[400px] border border-primary/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-label-caps text-primary uppercase tracking-wider">Budget cap per video</span>
            <span className="font-mono text-xs text-on-surface-variant">USD</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
              <input
                className="w-full bg-surface-container-lowest border border-outline/10 rounded-xl py-3 pl-8 pr-4 text-on-surface font-mono text-lg focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
                type="number"
                defaultValue="2.00"
                step="0.50"
              />
            </div>
            <button className="bg-primary-container text-on-primary-container px-6 py-3 rounded-xl text-label-caps hover:opacity-90 transition-opacity">
              Save
            </button>
          </div>
          <p className="mt-3 font-mono text-[11px] text-on-surface-variant">
            crossing this auto-pauses the run and asks before spending more.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-label-caps text-on-surface-variant uppercase tracking-widest">Providers</h2>
        <div className="h-px flex-1 bg-outline/10" />
      </div>

      <div className="grid gap-6">
        {providers.map((p) => (
          <div
            key={p.provider}
            className="glass-panel rounded-2xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center border border-outline/5"
          >
            <div className="md:col-span-3 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-surface-container-lowest border border-outline/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">vpn_key</span>
              </div>
              <span className="font-headline text-xl text-on-surface">{p.label}</span>
            </div>
            <div className="md:col-span-5">
              <label className="block text-[11px] text-on-surface-variant mb-2 uppercase tracking-wide">Key</label>
              <input
                className="w-full bg-surface-container-lowest border border-outline/10 rounded-xl py-3 px-4 text-on-surface font-mono text-sm mask-field focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
                type="password"
                placeholder={p.has_key ? "•••••••••••••••" : "paste key"}
                defaultValue={p.has_key ? "saved-in-vault" : ""}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] text-on-surface-variant mb-2 uppercase tracking-wide">Status</label>
              <div className="flex items-center gap-2">
                <div className={"w-2.5 h-2.5 rounded-full " + (dot[p.balance_state] ?? dot.unknown)} />
                <span className="font-mono text-sm text-on-surface">{p.balance_text}</span>
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <button className="border border-outline/20 px-5 py-2.5 rounded-xl text-label-caps hover:bg-primary/5 transition-all">
                Test
              </button>
            </div>
          </div>
        ))}

        <button className="w-full border-2 border-dashed border-outline/20 py-10 rounded-2xl flex flex-col items-center justify-center gap-3 text-on-surface-variant hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all group">
          <span className="material-symbols-outlined text-[36px] group-hover:scale-110 transition-transform">add_circle</span>
          <span className="text-label-caps tracking-widest">Add a provider</span>
        </button>
      </div>
    </main>
  );
}
