"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, hasSupabase } from "@/lib/supabase";

export default function TopNav() {
  const router = useRouter();

  async function handleLogout() {
    if (hasSupabase && supabase) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem("comet_user");
      window.location.href = "/login";
    }
  }

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-margin-desktop py-4 h-16 border-b border-outline/5 bg-surface/80 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-12">
        <Link href="/" className="font-headline text-headline-md text-primary leading-none">
          Comet
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-on-surface-variant/70 hover:text-primary transition-colors text-body-md">
            Dashboard
          </Link>
          <Link href="/" className="text-on-surface-variant/70 hover:text-primary transition-colors text-body-md">
            Workspaces
          </Link>
          <Link href="/" className="text-on-surface-variant/70 hover:text-primary transition-colors text-body-md">
            History
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="bg-primary-container text-on-primary-container px-6 py-2.5 rounded-full text-label-caps flex items-center gap-2 hover:shadow-lg active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">key</span>
          API Keys
        </Link>
        <Link href="/settings" className="text-on-surface-variant hover:text-primary p-2 rounded-full transition-colors" title="Settings">
          <span className="material-symbols-outlined">settings</span>
        </Link>
        <button
          onClick={handleLogout}
          className="text-on-surface-variant hover:text-error p-2 rounded-full transition-colors"
          title="Log out"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
        <div className="w-9 h-9 rounded-full bg-surface-variant border border-outline/10" />
      </div>
    </header>
  );
}
