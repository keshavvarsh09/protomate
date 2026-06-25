"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase, hasSupabase } from "@/lib/supabase";
import TopNav from "./TopNav";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    async function checkAuth() {
      if (hasSupabase && supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          if (isLoginPage) {
            router.push("/");
          }
        } else {
          setUser(null);
          if (!isLoginPage) {
            router.push("/login");
          }
        }
      } else {
        // Mock / local storage mode
        const mockUser = localStorage.getItem("comet_user");
        if (mockUser) {
          setUser(JSON.parse(mockUser));
          if (isLoginPage) {
            router.push("/");
          }
        } else {
          setUser(null);
          if (!isLoginPage) {
            router.push("/login");
          }
        }
      }
      setLoading(false);
    }

    checkAuth();

    // Listen for auth changes if Supabase is active
    if (hasSupabase && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            setUser(session.user);
            if (pathname === "/login") {
              router.push("/");
            }
          } else {
            setUser(null);
            if (pathname !== "/login") {
              router.push("/login");
            }
          }
        }
      );
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [pathname, router, isLoginPage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-xs text-on-surface-variant uppercase tracking-wider">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  // Render TopNav and main content only if logged in
  if (user || !hasSupabase) {
    return (
      <>
        <TopNav />
        <div className="pt-16">{children}</div>
      </>
    );
  }

  return null;
}
