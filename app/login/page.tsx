"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, hasSupabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setMessage("");
    setLoading(true);

    try {
      if (hasSupabase && supabase) {
        if (isSignUp) {
          const { error } = await supabase.auth.signUp({
            email,
            password,
          });
          if (error) throw error;
          setMessage("Signup successful! Please check your email to confirm.");
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          router.push("/");
        }
      } else {
        // Mock Mode auth bypass
        const mockUser = { email, id: "mock-user-id" };
        localStorage.setItem("comet_user", JSON.stringify(mockUser));
        router.push("/");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center overflow-hidden px-margin-desktop">
      {/* Decorative background blur shapes */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8s]" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[12s]" />

      <div className="w-full max-w-[440px] glass-panel p-10 rounded-3xl border border-outline/5 relative z-10 shadow-2xl">
        <header className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 mx-auto mb-5">
            <span className="material-symbols-outlined text-primary text-[36px]">movie_filter</span>
          </div>
          <h1 className="font-headline text-4xl text-on-surface tracking-tight leading-none mb-3">
            Comet
          </h1>
          <p className="text-on-surface-variant text-body-sm leading-relaxed">
            {hasSupabase 
              ? "Sign in to manage and render your video pipelines" 
              : "Running in Local-First Mock Mode. Any credentials will work."
            }
          </p>
        </header>

        {errorMsg && (
          <div className="mb-6 p-4 bg-error/5 rounded-xl border border-error/10 flex gap-3 items-start animate-fade-in">
            <span className="material-symbols-outlined text-error text-[20px]">warning</span>
            <p className="font-mono text-[11px] text-error leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-primary/5 rounded-xl border border-primary/10 flex gap-3 items-start animate-fade-in">
            <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
            <p className="font-mono text-[11px] text-primary leading-relaxed">{message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-label-caps text-[10px] text-on-surface-variant/60 uppercase tracking-widest font-mono">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline/10 rounded-xl py-3.5 px-4 text-on-surface text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-label-caps text-[10px] text-on-surface-variant/60 uppercase tracking-widest font-mono">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline/10 rounded-xl py-3.5 px-4 text-on-surface text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-on-primary rounded-xl font-headline text-lg hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:pointer-events-none mt-6"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">key</span>
                <span>{isSignUp ? "Create Account" : "Sign In"}</span>
              </>
            )}
          </button>
        </form>

        {hasSupabase && (
          <footer className="mt-8 pt-6 border-t border-outline/5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg("");
                setMessage("");
              }}
              className="text-primary hover:underline text-xs font-semibold"
            >
              {isSignUp 
                ? "Already have an account? Sign In" 
                : "New to Comet? Create an account"
              }
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
